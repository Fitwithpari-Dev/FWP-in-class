/**
 * Complete Session Manager for Zoom Video SDK Integration
 * This service orchestrates all aspects of session management for the fitness platform
 */

import { ZoomSDKService } from './zoomSDKService';
import { tokenService } from './tokenService';
import { supabase } from '@/lib/supabase/supabase-client';
import { z } from 'zod';

// Types and Interfaces
export interface SessionConfig {
  title: string;
  scheduledTime: Date;
  duration: number; // minutes
  maxParticipants: number;
  workoutType: 'yoga' | 'hiit' | 'dance' | 'strength' | 'cardio';
  enableRecording: boolean;
  isPublic: boolean;
}

export interface SessionState {
  id: string;
  status: 'scheduled' | 'initializing' | 'active' | 'paused' | 'ended' | 'error';
  participantCount: number;
  isRecording: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: SessionMetrics;
}

export interface SessionMetrics {
  averageVideoQuality: string;
  averageAudioQuality: string;
  connectionIssues: number;
  peakParticipants: number;
  duration: number;
}

// Session Manager Class
export class SessionManager {
  private static instance: SessionManager;
  private zoomService: ZoomSDKService;
  private currentSession: SessionState | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {
    this.zoomService = new ZoomSDKService();
    this.setupEventHandlers();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // ============= Session Creation =============

  /**
   * Create a new fitness session
   */
  public async createSession(config: SessionConfig, coachId: string): Promise<string> {
    try {
      // Validate configuration
      this.validateSessionConfig(config);

      // Generate unique session identifiers
      const sessionName = this.generateSessionName(config.workoutType);
      const sessionKey = this.generateSessionKey();

      // Create database record
      const { data: classSession, error: classError } = await supabase
        .from('class_sessions')
        .insert({
          title: config.title,
          coach_id: coachId,
          scheduled_start_time: config.scheduledTime.toISOString(),
          scheduled_duration: config.duration,
          max_participants: config.maxParticipants,
          is_recording: config.enableRecording,
          is_public: config.isPublic,
          zoom_meeting_id: sessionName,
          status: 'scheduled',
          tags: [config.workoutType]
        })
        .select()
        .single();

      if (classError) throw classError;

      // Create Zoom session record
      const { data: zoomSession, error: zoomError } = await supabase
        .from('zoom_sessions')
        .insert({
          class_session_id: classSession.id,
          zoom_session_name: sessionName,
          zoom_session_key: sessionKey,
          max_participants: config.maxParticipants,
          video_quality: this.getOptimalVideoQuality(config.maxParticipants),
          enable_recording: config.enableRecording,
          state: 'scheduled'
        })
        .select()
        .single();

      if (zoomError) throw zoomError;

      // Schedule notifications
      await this.scheduleSessionNotifications(classSession.id, config.scheduledTime);

      return classSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Unable to create fitness session. Please try again.');
    }
  }

  /**
   * Join an existing session
   */
  public async joinSession(
    sessionId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      // Verify access
      const hasAccess = await this.verifySessionAccess(userId, sessionId);
      if (!hasAccess) {
        throw new Error('You do not have access to this session');
      }

      // Get session details
      const session = await this.getSessionDetails(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Determine user role
      const role = session.coach_id === userId ? 1 : 0;

      // Generate token
      const token = await tokenService.generateToken(
        session.zoom_session_name,
        role,
        session.zoom_session_key,
        userId
      );

      // Store token record
      await this.recordTokenUsage(session.id, userId, token, role);

      // Initialize current session state
      this.currentSession = {
        id: sessionId,
        status: 'initializing',
        participantCount: 0,
        isRecording: false,
        connectionQuality: 'good',
        metrics: {
          averageVideoQuality: 'good',
          averageAudioQuality: 'good',
          connectionIssues: 0,
          peakParticipants: 0,
          duration: 0
        }
      };

      // Join Zoom session
      await this.zoomService.joinSession(
        session.zoom_session_name,
        token,
        userName,
        role === 1
      );

      // Update session state
      this.updateSessionState('active');

      // Start monitoring
      this.startSessionMonitoring();

      // Record participant join
      await this.recordParticipantJoin(session.id, userId);

    } catch (error) {
      console.error('Failed to join session:', error);
      this.updateSessionState('error');
      throw error;
    }
  }

  // ============= Session Lifecycle Management =============

  /**
   * Start a scheduled session (host only)
   */
  public async startSession(sessionId: string, coachId: string): Promise<void> {
    try {
      // Verify host permission
      const isHost = await this.verifyHostPermission(coachId, sessionId);
      if (!isHost) {
        throw new Error('Only the coach can start the session');
      }

      // Update database status
      await supabase
        .from('class_sessions')
        .update({
          status: 'live',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      await supabase
        .from('zoom_sessions')
        .update({
          state: 'active'
        })
        .eq('class_session_id', sessionId);

      // Start recording if enabled
      const session = await this.getSessionDetails(sessionId);
      if (session?.enable_recording) {
        await this.startRecording(sessionId);
      }

      // Notify participants
      await this.notifyParticipants(sessionId, 'Session is starting now!');

      this.emit('sessionStarted', { sessionId });
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  /**
   * End an active session (host only)
   */
  public async endSession(sessionId: string, coachId: string): Promise<void> {
    try {
      // Verify host permission
      const isHost = await this.verifyHostPermission(coachId, sessionId);
      if (!isHost) {
        throw new Error('Only the coach can end the session');
      }

      // Stop recording if active
      if (this.currentSession?.isRecording) {
        await this.stopRecording(sessionId);
      }

      // Collect final metrics
      const metrics = await this.collectSessionMetrics();

      // Update database
      await supabase
        .from('class_sessions')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      await supabase
        .from('zoom_sessions')
        .update({
          state: 'ended',
          average_video_quality: metrics.averageVideoQuality,
          average_audio_quality: metrics.averageAudioQuality,
          connection_issues_count: metrics.connectionIssues,
          peak_participant_count: metrics.peakParticipants
        })
        .eq('class_session_id', sessionId);

      // Leave Zoom session
      await this.zoomService.leaveSession();

      // Send follow-up communications
      await this.sendPostSessionCommunications(sessionId);

      // Cleanup
      this.cleanup();

      this.emit('sessionEnded', { sessionId, metrics });
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Pause session (host only)
   */
  public async pauseSession(sessionId: string): Promise<void> {
    if (this.currentSession?.status !== 'active') {
      throw new Error('Can only pause active sessions');
    }

    this.updateSessionState('paused');

    await this.zoomService.sendChatMessage(
      '⏸️ Session paused by instructor. Please stand by.'
    );

    this.emit('sessionPaused', { sessionId });
  }

  /**
   * Resume session (host only)
   */
  public async resumeSession(sessionId: string): Promise<void> {
    if (this.currentSession?.status !== 'paused') {
      throw new Error('Can only resume paused sessions');
    }

    this.updateSessionState('active');

    await this.zoomService.sendChatMessage(
      '▶️ Session resumed. Let\'s continue!'
    );

    this.emit('sessionResumed', { sessionId });
  }

  // ============= Participant Management =============

  /**
   * Add participant to session
   */
  public async addParticipant(
    sessionId: string,
    userId: string,
    userDetails: any
  ): Promise<void> {
    try {
      // Check capacity
      const count = await this.getParticipantCount(sessionId);
      const session = await this.getSessionDetails(sessionId);

      if (count >= session.max_participants) {
        throw new Error('Session is at full capacity');
      }

      // Add to database
      await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: userId,
          status: 'registered',
          registered_at: new Date().toISOString()
        });

      // Send invitation
      await this.sendSessionInvitation(userId, sessionId);

      this.emit('participantAdded', { sessionId, userId });
    } catch (error) {
      console.error('Failed to add participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from session
   */
  public async removeParticipant(
    sessionId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Remove from Zoom if in session
      if (this.currentSession?.id === sessionId) {
        await this.zoomService.removeParticipant(userId);
      }

      // Update database
      await supabase
        .from('zoom_participants')
        .update({
          leave_time: new Date().toISOString()
        })
        .eq('zoom_session_id', sessionId)
        .eq('user_id', userId);

      // Log event
      await this.logSessionEvent(sessionId, 'participant_removed', {
        userId,
        reason
      });

      this.emit('participantRemoved', { sessionId, userId, reason });
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw error;
    }
  }

  // ============= Recording Management =============

  /**
   * Start session recording
   */
  public async startRecording(sessionId: string): Promise<void> {
    try {
      await this.zoomService.startRecording();

      await supabase
        .from('zoom_sessions')
        .update({
          recording_status: 'recording',
          recording_start_time: new Date().toISOString()
        })
        .eq('class_session_id', sessionId);

      if (this.currentSession) {
        this.currentSession.isRecording = true;
      }

      await this.zoomService.sendChatMessage(
        '🔴 Recording has started'
      );

      this.emit('recordingStarted', { sessionId });
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop session recording
   */
  public async stopRecording(sessionId: string): Promise<string> {
    try {
      await this.zoomService.stopRecording();

      const recordingUrl = await this.processRecording(sessionId);

      await supabase
        .from('zoom_sessions')
        .update({
          recording_status: 'available',
          recording_url: recordingUrl
        })
        .eq('class_session_id', sessionId);

      if (this.currentSession) {
        this.currentSession.isRecording = false;
      }

      await this.zoomService.sendChatMessage(
        '⏹️ Recording has stopped'
      );

      this.emit('recordingStopped', { sessionId, recordingUrl });

      return recordingUrl;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  // ============= Connection Management =============

  /**
   * Handle disconnection with automatic reconnection
   */
  private async handleDisconnection(reason: string): Promise<void> {
    console.log(`Disconnected: ${reason}`);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.updateSessionState('reconnecting');
      this.reconnectAttempts++;

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

      setTimeout(async () => {
        try {
          await this.reconnect();
          this.reconnectAttempts = 0;
          this.updateSessionState('active');
        } catch (error) {
          await this.handleDisconnection('Reconnection failed');
        }
      }, delay);
    } else {
      this.updateSessionState('error');
      this.emit('reconnectionFailed', {
        sessionId: this.currentSession?.id,
        attempts: this.reconnectAttempts
      });
    }
  }

  private async reconnect(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to reconnect');
    }

    // Get fresh token
    const session = await this.getSessionDetails(this.currentSession.id);
    const userId = await this.getCurrentUserId();
    const role = session.coach_id === userId ? 1 : 0;

    const token = await tokenService.generateToken(
      session.zoom_session_name,
      role,
      session.zoom_session_key,
      userId
    );

    // Rejoin session
    await this.zoomService.joinSession(
      session.zoom_session_name,
      token,
      session.coach_name || 'User',
      role === 1
    );
  }

  // ============= Monitoring and Analytics =============

  /**
   * Start monitoring session health
   */
  private startSessionMonitoring(): void {
    // Monitor connection quality
    const qualityInterval = setInterval(async () => {
      if (this.currentSession?.status !== 'active') {
        clearInterval(qualityInterval);
        return;
      }

      const quality = await this.assessConnectionQuality();
      this.currentSession.connectionQuality = quality;

      if (quality === 'poor') {
        await this.optimizeForPoorConnection();
      }
    }, 5000);

    // Update metrics
    const metricsInterval = setInterval(async () => {
      if (this.currentSession?.status !== 'active') {
        clearInterval(metricsInterval);
        return;
      }

      const participants = this.zoomService.getAllParticipants();
      this.currentSession.participantCount = participants.length;
      this.currentSession.metrics.peakParticipants = Math.max(
        this.currentSession.metrics.peakParticipants,
        participants.length
      );
    }, 10000);
  }

  private async assessConnectionQuality(): Promise<'excellent' | 'good' | 'fair' | 'poor'> {
    // This would integrate with actual network quality metrics
    // For now, return a mock value
    return 'good';
  }

  private async optimizeForPoorConnection(): Promise<void> {
    // Reduce video quality
    await this.zoomService.setVideoQuality('360p');

    // Notify user
    this.emit('connectionQualityChanged', {
      quality: 'poor',
      actions: ['Video quality reduced']
    });
  }

  private async collectSessionMetrics(): Promise<SessionMetrics> {
    return {
      averageVideoQuality: this.currentSession?.metrics.averageVideoQuality || 'unknown',
      averageAudioQuality: this.currentSession?.metrics.averageAudioQuality || 'unknown',
      connectionIssues: this.currentSession?.metrics.connectionIssues || 0,
      peakParticipants: this.currentSession?.metrics.peakParticipants || 0,
      duration: this.currentSession?.metrics.duration || 0
    };
  }

  // ============= Helper Methods =============

  private validateSessionConfig(config: SessionConfig): void {
    const schema = z.object({
      title: z.string().min(1).max(200),
      scheduledTime: z.date().min(new Date()),
      duration: z.number().min(15).max(180),
      maxParticipants: z.number().min(1).max(100),
      workoutType: z.enum(['yoga', 'hiit', 'dance', 'strength', 'cardio']),
      enableRecording: z.boolean(),
      isPublic: z.boolean()
    });

    schema.parse(config);
  }

  private generateSessionName(workoutType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `fitness_${workoutType}_${timestamp}_${random}`;
  }

  private generateSessionKey(): string {
    return crypto.randomUUID();
  }

  private getOptimalVideoQuality(participantCount: number): string {
    if (participantCount <= 10) return '720p';
    if (participantCount <= 25) return '480p';
    return '360p';
  }

  private async verifySessionAccess(userId: string, sessionId: string): Promise<boolean> {
    // Check if user is registered for session
    const { data: participant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (participant) return true;

    // Check if user is the coach
    const { data: session } = await supabase
      .from('class_sessions')
      .select('coach_id')
      .eq('id', sessionId)
      .single();

    return session?.coach_id === userId;
  }

  private async verifyHostPermission(userId: string, sessionId: string): Promise<boolean> {
    const { data: session } = await supabase
      .from('class_sessions')
      .select('coach_id')
      .eq('id', sessionId)
      .single();

    return session?.coach_id === userId;
  }

  private async getSessionDetails(sessionId: string): Promise<any> {
    const { data } = await supabase
      .from('zoom_sessions')
      .select(`
        *,
        class_sessions (*)
      `)
      .eq('class_session_id', sessionId)
      .single();

    return data;
  }

  private async getParticipantCount(sessionId: string): Promise<number> {
    const { count } = await supabase
      .from('session_participants')
      .select('id', { count: 'exact' })
      .eq('session_id', sessionId);

    return count || 0;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  private async recordTokenUsage(
    zoomSessionId: string,
    userId: string,
    token: string,
    role: number
  ): Promise<void> {
    const tokenHash = await this.hashToken(token);

    await supabase
      .from('session_tokens')
      .insert({
        zoom_session_id: zoomSessionId,
        user_id: userId,
        token_hash: tokenHash,
        role,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      });
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async recordParticipantJoin(
    zoomSessionId: string,
    userId: string
  ): Promise<void> {
    await supabase
      .from('zoom_participants')
      .upsert({
        zoom_session_id: zoomSessionId,
        user_id: userId,
        zoom_user_id: userId,
        join_time: new Date().toISOString()
      });
  }

  private async logSessionEvent(
    sessionId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await supabase
      .from('session_events')
      .insert({
        zoom_session_id: sessionId,
        user_id: await this.getCurrentUserId(),
        event_type: eventType,
        event_data: eventData
      });
  }

  private async scheduleSessionNotifications(
    sessionId: string,
    scheduledTime: Date
  ): Promise<void> {
    // 15 minutes before
    const reminder15 = new Date(scheduledTime.getTime() - 15 * 60 * 1000);

    // 1 hour before
    const reminder60 = new Date(scheduledTime.getTime() - 60 * 60 * 1000);

    // Schedule notifications (would integrate with notification service)
    console.log(`Notifications scheduled for session ${sessionId}`);
  }

  private async notifyParticipants(sessionId: string, message: string): Promise<void> {
    // Get all participants
    const { data: participants } = await supabase
      .from('session_participants')
      .select('user_id')
      .eq('session_id', sessionId);

    // Send notifications (would integrate with notification service)
    console.log(`Notifying ${participants?.length} participants: ${message}`);
  }

  private async sendSessionInvitation(userId: string, sessionId: string): Promise<void> {
    // Send invitation (would integrate with email service)
    console.log(`Invitation sent to user ${userId} for session ${sessionId}`);
  }

  private async sendPostSessionCommunications(sessionId: string): Promise<void> {
    // Send follow-up emails, surveys, etc.
    console.log(`Post-session communications sent for session ${sessionId}`);
  }

  private async processRecording(sessionId: string): Promise<string> {
    // Process and upload recording (mock implementation)
    return `https://recordings.example.com/${sessionId}`;
  }

  private updateSessionState(status: SessionState['status']): void {
    if (this.currentSession) {
      this.currentSession.status = status;
      this.emit('sessionStateChanged', {
        sessionId: this.currentSession.id,
        status
      });
    }
  }

  private setupEventHandlers(): void {
    this.zoomService.setEventHandlers({
      onConnectionChange: (state) => {
        if (state === 'disconnected') {
          this.handleDisconnection('Connection lost');
        }
      },
      onUserJoin: (userId, user) => {
        this.emit('participantJoined', { userId, user });
      },
      onUserLeave: (userId) => {
        this.emit('participantLeft', { userId });
      },
      onSessionClosed: () => {
        this.cleanup();
      }
    });
  }

  private cleanup(): void {
    this.currentSession = null;
    this.reconnectAttempts = 0;
    this.listeners.clear();
  }

  // ============= Event System =============

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();