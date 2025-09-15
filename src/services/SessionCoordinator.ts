/**
 * Session Coordinator
 *
 * Handles the coordination between coaches and students for session joining.
 * Implements the logic for:
 * - Coach creates session → becomes discoverable
 * - Student discovers session → joins existing session
 * - Real-time participant management
 */

import {
  SessionMetadata,
  SessionCoordinationEvent,
  UserRole
} from '../types/fitness-platform';
import { SessionDiscoveryService } from './SessionDiscovery';

export interface SessionCoordinatorConfig {
  maxParticipantsPerSession: number;
  sessionTimeoutMs: number;
}

export class SessionCoordinator {
  private discoveryService: SessionDiscoveryService;
  private config: SessionCoordinatorConfig;
  private eventListeners: Map<string, ((event: SessionCoordinationEvent) => void)[]> = new Map();

  constructor(config: SessionCoordinatorConfig) {
    this.config = config;
    this.discoveryService = new SessionDiscoveryService();
  }

  /**
   * Add participant to a session with role-based logic
   */
  public async addParticipant(
    sessionId: string,
    userName: string,
    userRole: UserRole
  ): Promise<void> {
    console.log('👤 Adding participant to session:', {
      sessionId,
      userName,
      userRole
    });

    const userId = this.generateUserId(userName, userRole);

    // Check if session exists
    let session = await this.discoveryService.getSessionById(sessionId);

    if (!session && userRole === 'coach') {
      // Coach creates the session if it doesn't exist
      session = await this.createSessionForCoach(sessionId, userName);
    } else if (!session && userRole === 'student') {
      // Student cannot join non-existent session
      throw new Error('Session not found. Please wait for the instructor to start the class.');
    }

    if (!session) {
      throw new Error('Unable to create or find session');
    }

    // Check capacity
    if (session.participantCount >= session.maxParticipants) {
      throw new Error('Session is at full capacity');
    }

    // Add user to session tracking
    await this.discoveryService.addUserToSession(userId, sessionId);

    // Update session status if this is the first participant (coach)
    if (userRole === 'coach' && session.status === 'waiting') {
      await this.discoveryService.updateSessionStatus(sessionId, 'active');
    }

    // Emit event
    this.emitEvent({
      type: 'session_joined',
      sessionId,
      userId,
      userRole,
      timestamp: new Date(),
      metadata: { userName }
    });

    console.log('✅ Participant added successfully:', {
      sessionId,
      userName,
      userRole,
      participantCount: session.participantCount + 1
    });
  }

  /**
   * Remove participant from session
   */
  public async removeParticipant(sessionId: string, userId: string): Promise<void> {
    console.log('👤 Removing participant from session:', {
      sessionId,
      userId
    });

    // Remove user from session tracking
    await this.discoveryService.removeUserFromSession(userId);

    // Check if session should be ended (no participants left)
    const session = await this.discoveryService.getSessionById(sessionId);
    if (session && session.participantCount === 0) {
      await this.endSession(sessionId);
    }

    // Emit event
    this.emitEvent({
      type: 'session_left',
      sessionId,
      userId,
      userRole: 'student', // Will be determined properly in full implementation
      timestamp: new Date()
    });

    console.log('✅ Participant removed successfully:', {
      sessionId,
      userId
    });
  }

  /**
   * End a session
   */
  public async endSession(sessionId: string): Promise<void> {
    console.log('🏁 Ending session:', sessionId);

    const session = await this.discoveryService.getSessionById(sessionId);
    if (session) {
      // Update session status
      await this.discoveryService.updateSessionStatus(sessionId, 'ended');

      // Emit event
      this.emitEvent({
        type: 'session_ended',
        sessionId,
        userId: session.coachId,
        userRole: 'coach',
        timestamp: new Date()
      });

      // Clean up after a delay
      setTimeout(async () => {
        await this.discoveryService.unregisterSession(sessionId);
      }, 5000); // 5 second delay for cleanup
    }

    console.log('✅ Session ended successfully:', sessionId);
  }

  /**
   * Get or create session for coach-student coordination
   */
  public async getOrCreateSession(
    sessionTopic: string,
    coachName: string,
    userRole: UserRole
  ): Promise<SessionMetadata> {
    console.log('🔍 Getting or creating session:', {
      sessionTopic,
      coachName,
      userRole
    });

    // First, try to find existing session by topic
    let session = await this.discoveryService.getSessionByTopic(sessionTopic);

    if (!session && userRole === 'coach') {
      // Coach creates new session
      session = await this.createSessionForCoach(sessionTopic, coachName);
    } else if (!session && userRole === 'student') {
      // Student waits for coach to create session
      throw new Error('Session not available yet. Please wait for the instructor to start the class.');
    } else if (session && userRole === 'student' && session.status === 'waiting') {
      // Session exists but coach hasn't fully joined yet
      throw new Error('Session is starting. Please wait for the instructor to be ready...');
    }

    if (!session) {
      throw new Error('Unable to access session');
    }

    console.log('✅ Session ready:', {
      sessionId: session.id,
      sessionName: session.name,
      status: session.status,
      participantCount: session.participantCount
    });

    return session;
  }

  /**
   * Find available sessions for students to join
   */
  public async findJoinableSessions(): Promise<SessionMetadata[]> {
    const sessions = await this.discoveryService.getAvailableSessions(false);

    // Filter sessions that are active and have space
    const joinableSessions = sessions.filter(session => {
      return session.status === 'active' &&
             session.participantCount < session.maxParticipants;
    });

    console.log('📋 Found joinable sessions:', {
      total: sessions.length,
      joinable: joinableSessions.length,
      sessions: joinableSessions.map(s => ({
        id: s.id,
        name: s.name,
        participants: s.participantCount,
        maxParticipants: s.maxParticipants
      }))
    });

    return joinableSessions;
  }

  /**
   * Check if user can join a specific session
   */
  public async canUserJoinSession(
    sessionId: string,
    userRole: UserRole
  ): Promise<{ canJoin: boolean; reason?: string }> {
    const session = await this.discoveryService.getSessionById(sessionId);

    if (!session) {
      return {
        canJoin: false,
        reason: 'Session not found'
      };
    }

    if (session.status === 'ended') {
      return {
        canJoin: false,
        reason: 'Session has ended'
      };
    }

    if (session.participantCount >= session.maxParticipants) {
      return {
        canJoin: false,
        reason: 'Session is at full capacity'
      };
    }

    // Check if coach is trying to join their own session
    if (userRole === 'coach') {
      // For now, allow coach to rejoin their session
      return { canJoin: true };
    }

    // Student can join if session is active or waiting
    if (session.status === 'active' || session.status === 'waiting') {
      return { canJoin: true };
    }

    return {
      canJoin: false,
      reason: `Session is ${session.status}`
    };
  }

  /**
   * Event subscription
   */
  public on(eventType: string, listener: (event: SessionCoordinationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public off(eventType: string, listener: (event: SessionCoordinationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get coordination statistics
   */
  public getCoordinationStats(): {
    discovery: ReturnType<SessionDiscoveryService['getStats']>;
    totalEvents: number;
  } {
    return {
      discovery: this.discoveryService.getStats(),
      totalEvents: Array.from(this.eventListeners.values())
        .reduce((total, listeners) => total + listeners.length, 0)
    };
  }

  // Private helper methods

  private async createSessionForCoach(
    sessionTopic: string,
    coachName: string
  ): Promise<SessionMetadata> {
    console.log('🎯 Creating new session for coach:', {
      sessionTopic,
      coachName
    });

    const sessionId = this.generateSessionId(sessionTopic);
    const coachId = this.generateUserId(coachName, 'coach');

    const metadata: SessionMetadata = {
      id: sessionId,
      name: sessionTopic,
      topic: sessionTopic,
      coachId,
      coachName,
      createdAt: new Date(),
      status: 'waiting',
      participantCount: 0,
      maxParticipants: this.config.maxParticipantsPerSession,
      isPrivate: false,
      sessionKey: sessionTopic // Use topic as session key for simplicity
    };

    // Register session
    await this.discoveryService.registerSession(metadata);

    // Emit creation event
    this.emitEvent({
      type: 'session_created',
      sessionId,
      userId: coachId,
      userRole: 'coach',
      timestamp: new Date(),
      metadata: { sessionTopic, coachName }
    });

    console.log('✅ Session created successfully:', {
      sessionId,
      sessionTopic,
      coachName
    });

    return metadata;
  }

  private emitEvent(event: SessionCoordinationEvent): void {
    // Emit to specific event type listeners
    const typeListeners = this.eventListeners.get(event.type) || [];
    typeListeners.forEach(listener => listener(event));

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(listener => listener(event));

    console.log('📡 Event emitted:', {
      type: event.type,
      sessionId: event.sessionId,
      userRole: event.userRole,
      listeners: typeListeners.length + wildcardListeners.length
    });
  }

  private generateSessionId(topic: string): string {
    // Use topic directly as session ID for consistency across coach/student
    // This ensures both coach and student use the same session ID
    const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return sanitizedTopic || 'default-session';
  }

  private generateUserId(userName: string, role: UserRole): string {
    const sanitizedName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now();
    return `${role}_${sanitizedName}_${timestamp}`;
  }
}

