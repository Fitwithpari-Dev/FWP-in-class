/**
 * Secure Video Session Management for FitWithPari
 * Handles Zoom Video SDK integration with comprehensive security measures
 */

import { JWTManager } from './jwt-manager';
import { SecurityLogger } from './security-logger';
import { supabase } from '../supabase/supabase-client';

export interface VideoSessionConfig {
  sessionId: string;
  topic: string;
  password?: string;
  duration: number; // minutes
  maxParticipants: number;
  recordingEnabled: boolean;
  waitingRoomEnabled: boolean;
  muteOnEntry: boolean;
  hostId: string;
  allowedParticipants?: string[];
  encryptionLevel: 'standard' | 'enhanced';
}

export interface VideoParticipant {
  userId: string;
  role: 'host' | 'cohost' | 'participant';
  permissions: VideoPermission[];
  joinedAt?: string;
  leftAt?: string;
  connectionQuality?: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface VideoPermission {
  type: 'video' | 'audio' | 'screen_share' | 'recording' | 'chat' | 'annotation';
  allowed: boolean;
  grantedBy?: string;
  grantedAt?: string;
}

export interface VideoSessionSecurity {
  endToEndEncryption: boolean;
  participantAuthentication: boolean;
  sessionRecording: boolean;
  accessLogging: boolean;
  dataRetention: number; // days
  complianceLevel: 'basic' | 'hipaa' | 'enterprise';
}

export interface VideoAccessToken {
  token: string;
  sessionId: string;
  userId: string;
  role: 'host' | 'participant';
  permissions: string[];
  expiresAt: number;
  signature: string;
}

export class VideoSecurity {
  private static readonly SDK_SECRET = process.env.ZOOM_SDK_SECRET || 'your-zoom-sdk-secret';
  private static readonly DEFAULT_PERMISSIONS: Record<string, VideoPermission[]> = {
    host: [
      { type: 'video', allowed: true },
      { type: 'audio', allowed: true },
      { type: 'screen_share', allowed: true },
      { type: 'recording', allowed: true },
      { type: 'chat', allowed: true },
      { type: 'annotation', allowed: true }
    ],
    cohost: [
      { type: 'video', allowed: true },
      { type: 'audio', allowed: true },
      { type: 'screen_share', allowed: true },
      { type: 'recording', allowed: false },
      { type: 'chat', allowed: true },
      { type: 'annotation', allowed: true }
    ],
    participant: [
      { type: 'video', allowed: true },
      { type: 'audio', allowed: true },
      { type: 'screen_share', allowed: false },
      { type: 'recording', allowed: false },
      { type: 'chat', allowed: true },
      { type: 'annotation', allowed: false }
    ]
  };

  /**
   * Create secure video session with comprehensive security settings
   */
  static async createSecureSession(
    config: VideoSessionConfig,
    creatorId: string,
    securitySettings: Partial<VideoSessionSecurity> = {}
  ): Promise<{
    sessionId: string;
    joinUrl: string;
    hostToken: string;
    security: VideoSessionSecurity;
  }> {
    try {
      // Validate creator permissions
      await this.validateSessionCreationPermissions(creatorId);

      // Generate secure session configuration
      const sessionSecurity: VideoSessionSecurity = {
        endToEndEncryption: true,
        participantAuthentication: true,
        sessionRecording: config.recordingEnabled,
        accessLogging: true,
        dataRetention: 90, // days
        complianceLevel: 'hipaa',
        ...securitySettings
      };

      // Create session in database with security settings
      const { data: session, error } = await supabase
        .from('video_sessions')
        .insert({
          id: config.sessionId,
          topic: config.topic,
          host_id: config.hostId,
          max_participants: config.maxParticipants,
          duration_minutes: config.duration,
          password: config.password ? await this.hashPassword(config.password) : null,
          recording_enabled: config.recordingEnabled,
          waiting_room_enabled: config.waitingRoomEnabled,
          mute_on_entry: config.muteOnEntry,
          encryption_level: config.encryptionLevel,
          security_settings: sessionSecurity,
          allowed_participants: config.allowedParticipants,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + config.duration * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Generate host access token
      const hostToken = await this.generateSecureAccessToken(
        config.sessionId,
        config.hostId,
        'host',
        this.DEFAULT_PERMISSIONS.host
      );

      // Log session creation
      await SecurityLogger.logVideoSessionEvent(
        creatorId,
        config.sessionId,
        'SESSION_CREATED',
        {
          topic: config.topic,
          securityLevel: sessionSecurity.complianceLevel,
          encryption: sessionSecurity.endToEndEncryption
        }
      );

      const joinUrl = await this.generateSecureJoinUrl(config.sessionId, hostToken);

      return {
        sessionId: config.sessionId,
        joinUrl,
        hostToken,
        security: sessionSecurity
      };
    } catch (error) {
      console.error('Secure session creation failed:', error);
      throw error;
    }
  }

  /**
   * Generate secure access token for video session participant
   */
  static async generateParticipantToken(
    sessionId: string,
    userId: string,
    role: 'host' | 'cohost' | 'participant' = 'participant'
  ): Promise<VideoAccessToken> {
    try {
      // Validate session exists and user has access
      await this.validateSessionAccess(sessionId, userId);

      // Get session details
      const { data: session } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session || session.status === 'ended') {
        throw new Error('Session not available');
      }

      // Check if user is in allowed participants list
      if (session.allowed_participants && !session.allowed_participants.includes(userId)) {
        await SecurityLogger.logSecurityEvent(
          userId,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          {
            severity: 'medium',
            description: `Unauthorized video session access attempt: ${sessionId}`,
            resourceAffected: `video_session_${sessionId}`
          }
        );
        throw new Error('User not authorized for this session');
      }

      // Generate access token
      const permissions = this.DEFAULT_PERMISSIONS[role] || this.DEFAULT_PERMISSIONS.participant;
      const token = await this.generateSecureAccessToken(sessionId, userId, role, permissions);

      // Log token generation
      await SecurityLogger.logVideoSessionEvent(
        userId,
        sessionId,
        'TOKEN_GENERATED',
        {
          role,
          permissions: permissions.map(p => p.type)
        }
      );

      return token;
    } catch (error) {
      console.error('Participant token generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate video session access token
   */
  static async validateAccessToken(token: string): Promise<VideoAccessToken | null> {
    try {
      const videoToken = await JWTManager.validateVideoSessionToken(token);

      if (!videoToken) {
        return null;
      }

      // Additional validation for video-specific constraints
      const { data: session } = await supabase
        .from('video_sessions')
        .select('status, expires_at')
        .eq('id', videoToken.sessionId)
        .single();

      if (!session || session.status === 'ended') {
        return null;
      }

      if (new Date(session.expires_at) < new Date()) {
        return null;
      }

      // Convert to VideoAccessToken format
      return {
        token,
        sessionId: videoToken.sessionId,
        userId: videoToken.userId,
        role: videoToken.role as 'host' | 'participant',
        permissions: videoToken.permissions,
        expiresAt: videoToken.expiresAt,
        signature: 'validated'
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Handle participant joining video session
   */
  static async handleParticipantJoin(
    sessionId: string,
    userId: string,
    connectionInfo: Record<string, any>
  ): Promise<VideoParticipant> {
    try {
      // Get participant role from session
      const { data: sessionParticipant } = await supabase
        .from('session_participants')
        .select('role, permissions')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      const role = sessionParticipant?.role || 'participant';
      const permissions = sessionParticipant?.permissions || this.DEFAULT_PERMISSIONS[role];

      // Record participant join
      const { data: participant, error } = await supabase
        .from('session_participants')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          role,
          permissions,
          joined_at: new Date().toISOString(),
          connection_info: connectionInfo,
          status: 'joined'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log join event
      await SecurityLogger.logVideoSessionEvent(
        userId,
        sessionId,
        'PARTICIPANT_JOINED',
        {
          role,
          ipAddress: connectionInfo.ipAddress,
          userAgent: connectionInfo.userAgent,
          connectionQuality: connectionInfo.connectionQuality
        }
      );

      return {
        userId,
        role: role as 'host' | 'cohost' | 'participant',
        permissions,
        joinedAt: participant.joined_at,
        connectionQuality: connectionInfo.connectionQuality
      };
    } catch (error) {
      console.error('Participant join handling failed:', error);
      throw error;
    }
  }

  /**
   * Handle participant leaving video session
   */
  static async handleParticipantLeave(
    sessionId: string,
    userId: string,
    reason: 'user_left' | 'kicked' | 'connection_lost' | 'session_ended'
  ): Promise<void> {
    try {
      // Update participant status
      await supabase
        .from('session_participants')
        .update({
          left_at: new Date().toISOString(),
          status: 'left',
          leave_reason: reason
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      // Log leave event
      await SecurityLogger.logVideoSessionEvent(
        userId,
        sessionId,
        'PARTICIPANT_LEFT',
        {
          reason,
          duration: 'calculated-duration' // Calculate based on join/leave times
        }
      );
    } catch (error) {
      console.error('Participant leave handling failed:', error);
    }
  }

  /**
   * Monitor video session for security threats
   */
  static async monitorSessionSecurity(
    sessionId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      const suspiciousEvents = [
        'multiple_failed_joins',
        'unauthorized_recording',
        'screen_sharing_violation',
        'excessive_chat_activity',
        'connection_anomaly'
      ];

      if (suspiciousEvents.includes(eventType)) {
        await SecurityLogger.logSecurityEvent(
          eventData.userId || null,
          'SUSPICIOUS_ACTIVITY',
          {
            severity: this.getEventSeverity(eventType),
            description: `Suspicious video session activity: ${eventType}`,
            resourceAffected: `video_session_${sessionId}`,
            actionTaken: 'monitoring'
          }
        );

        // Take automatic action for critical events
        if (eventType === 'unauthorized_recording') {
          await this.terminateSession(sessionId, 'security_violation');
        }
      }

      // Log all session events for audit
      await SecurityLogger.logVideoSessionEvent(
        eventData.userId || 'system',
        sessionId,
        eventType.toUpperCase(),
        eventData
      );
    } catch (error) {
      console.error('Session security monitoring failed:', error);
    }
  }

  /**
   * Generate secure Zoom SDK signature for client initialization
   */
  static async generateZoomSDKSignature(
    meetingNumber: string,
    role: number // 0 for participant, 1 for host
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const msg = `${process.env.ZOOM_SDK_KEY}${meetingNumber}${timestamp}${role}`;

      // In production, use proper HMAC-SHA256 signing
      // This is a simplified version for demo
      const signature = btoa(`signature_${msg}_${this.SDK_SECRET}`);

      // Log signature generation for audit
      await SecurityLogger.logVideoSessionEvent(
        'system',
        meetingNumber,
        'SDK_SIGNATURE_GENERATED',
        {
          role,
          timestamp
        }
      );

      return signature;
    } catch (error) {
      console.error('Zoom SDK signature generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate session creation permissions
   */
  private static async validateSessionCreationPermissions(creatorId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', creatorId)
      .single();

    if (!profile || !['coach', 'admin'].includes(profile.role)) {
      throw new Error('Insufficient permissions to create video session');
    }
  }

  /**
   * Validate session access for user
   */
  private static async validateSessionAccess(sessionId: string, userId: string): Promise<void> {
    const { data: session } = await supabase
      .from('video_sessions')
      .select('host_id, allowed_participants, status')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'ended') {
      throw new Error('Session has ended');
    }

    // Host always has access
    if (session.host_id === userId) {
      return;
    }

    // Check if user is in allowed participants
    if (session.allowed_participants && !session.allowed_participants.includes(userId)) {
      throw new Error('User not authorized for this session');
    }
  }

  /**
   * Generate secure access token with JWT
   */
  private static async generateSecureAccessToken(
    sessionId: string,
    userId: string,
    role: string,
    permissions: VideoPermission[]
  ): Promise<VideoAccessToken> {
    const token = await JWTManager.generateVideoSessionToken(
      sessionId,
      userId,
      role as 'host' | 'participant',
      permissions.filter(p => p.allowed).map(p => p.type)
    );

    return {
      token,
      sessionId,
      userId,
      role: role as 'host' | 'participant',
      permissions: permissions.filter(p => p.allowed).map(p => p.type),
      expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      signature: await this.signToken(token)
    };
  }

  /**
   * Generate secure join URL for session
   */
  private static async generateSecureJoinUrl(sessionId: string, token: string): Promise<string> {
    const baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/video/join/${sessionId}?token=${encodeURIComponent(token)}`;
  }

  /**
   * Hash session password for secure storage
   */
  private static async hashPassword(password: string): Promise<string> {
    // In production, use proper password hashing like bcrypt
    return btoa(`hashed_${password}_${Date.now()}`);
  }

  /**
   * Sign token for additional security
   */
  private static async signToken(token: string): Promise<string> {
    // In production, use proper HMAC signing
    return btoa(`signed_${token}_${Date.now()}`);
  }

  /**
   * Get event severity level for security monitoring
   */
  private static getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'multiple_failed_joins': 'medium',
      'unauthorized_recording': 'critical',
      'screen_sharing_violation': 'high',
      'excessive_chat_activity': 'low',
      'connection_anomaly': 'medium'
    };

    return severityMap[eventType] || 'medium';
  }

  /**
   * Terminate session for security violations
   */
  private static async terminateSession(sessionId: string, reason: string): Promise<void> {
    try {
      await supabase
        .from('video_sessions')
        .update({
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          termination_reason: reason
        })
        .eq('id', sessionId);

      // Kick all participants
      await supabase
        .from('session_participants')
        .update({
          status: 'kicked',
          left_at: new Date().toISOString(),
          leave_reason: reason
        })
        .eq('session_id', sessionId)
        .eq('status', 'joined');

      await SecurityLogger.logVideoSessionEvent(
        'system',
        sessionId,
        'SESSION_TERMINATED',
        {
          reason,
          terminatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Session termination failed:', error);
    }
  }
}

/**
 * React hook for secure video session management
 */
export function useVideoSecurity() {
  const createSession = async (config: VideoSessionConfig) => {
    const userId = 'current-user-id'; // Replace with actual auth context
    return await VideoSecurity.createSecureSession(config, userId);
  };

  const joinSession = async (sessionId: string, userId: string) => {
    const token = await VideoSecurity.generateParticipantToken(sessionId, userId);
    return token;
  };

  const monitorSecurity = async (sessionId: string, eventType: string, eventData: any) => {
    return await VideoSecurity.monitorSessionSecurity(sessionId, eventType, eventData);
  };

  return {
    createSession,
    joinSession,
    monitorSecurity,
    validateToken: VideoSecurity.validateAccessToken,
    generateSDKSignature: VideoSecurity.generateZoomSDKSignature
  };
}