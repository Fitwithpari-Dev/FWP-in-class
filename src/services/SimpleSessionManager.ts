/**
 * Simple Session Manager
 *
 * Lightweight session manager that focuses on immediate coach-student coordination
 * without database dependencies. Integrates with the existing Zoom SDK hook.
 *
 * This is a simpler alternative to the full SessionManager for immediate session sharing needs.
 */

import {
  SessionMetadata,
  SessionJoinRequest,
  SessionJoinResponse,
  UserRole
} from '../types/fitness-platform';
import { SessionCoordinator } from './SessionCoordinator';

export interface SimpleSessionManagerConfig {
  maxParticipantsPerSession: number;
  sessionTimeoutMs: number;
}

export class SimpleSessionManager {
  private static instance: SimpleSessionManager | null = null;
  private coordinator: SessionCoordinator;
  private config: SimpleSessionManagerConfig;

  private constructor(config: Partial<SimpleSessionManagerConfig> = {}) {
    this.config = {
      maxParticipantsPerSession: 100,
      sessionTimeoutMs: 90 * 60 * 1000, // 90 minutes
      ...config
    };

    this.coordinator = new SessionCoordinator(this.config);
  }

  /**
   * Singleton pattern for global session management
   */
  public static getInstance(config?: Partial<SimpleSessionManagerConfig>): SimpleSessionManager {
    if (!SimpleSessionManager.instance) {
      SimpleSessionManager.instance = new SimpleSessionManager(config);
    }
    return SimpleSessionManager.instance;
  }

  /**
   * Join or create session with intelligent role-based logic
   */
  public async joinOrCreateSession(
    sessionTopic: string,
    userName: string,
    userRole: UserRole
  ): Promise<SessionJoinResponse> {
    try {
      console.log('🎯 Processing join/create request:', {
        sessionTopic,
        userName,
        userRole
      });

      // Get or create session based on role
      const session = await this.coordinator.getOrCreateSession(
        sessionTopic,
        userName,
        userRole
      );

      // Add user as participant
      await this.coordinator.addParticipant(session.id, userName, userRole);

      console.log('✅ Session join/create successful:', {
        sessionId: session.id,
        sessionName: session.name,
        userRole,
        participantCount: session.participantCount
      });

      return {
        success: true,
        sessionMetadata: session
      };

    } catch (error) {
      console.error('❌ Session join/create failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle the specific case from the existing hook
   * Simplified for cross-device compatibility - bypasses complex session discovery
   */
  public async handleRoleBasedJoin(
    sessionTopic: string,
    userName: string,
    userRole: UserRole
  ): Promise<{
    sessionId: string;
    sessionName: string;
    shouldRetry: boolean;
    error?: string;
  }> {
    try {
      // SIMPLIFIED CROSS-DEVICE APPROACH:
      // Skip complex localStorage-based discovery and use sessionTopic directly
      console.log('🎯 Cross-device session join: Using direct topic approach', {
        sessionTopic,
        userName,
        userRole
      });

      // All participants (coach + students from any device) use the same topic
      const sessionId = sessionTopic;
      const sessionName = `Live Fitness Session - ${sessionTopic}`;

      console.log('✅ Direct session assignment (cross-device compatible):', {
        sessionId,
        sessionName,
        userRole
      });

      return {
        sessionId,
        sessionName,
        shouldRetry: false
      };

    } catch (error) {
      console.error('❌ Direct session assignment failed:', error);

      return {
        sessionId: sessionTopic,
        sessionName: sessionTopic,
        shouldRetry: false,
        error: error instanceof Error ? error.message : 'Cross-device session assignment error'
      };
    }
  }

  /**
   * Leave session
   */
  public async leaveSession(sessionId: string, userId: string): Promise<void> {
    await this.coordinator.removeParticipant(sessionId, userId);
  }

  /**
   * Get available sessions for discovery
   */
  public async getAvailableSessions(): Promise<SessionMetadata[]> {
    return await this.coordinator.findJoinableSessions();
  }

  /**
   * Check if user can join session
   */
  public async canUserJoinSession(
    sessionId: string,
    userRole: UserRole
  ): Promise<{ canJoin: boolean; reason?: string }> {
    return await this.coordinator.canUserJoinSession(sessionId, userRole);
  }

  /**
   * Get session statistics
   */
  public getStats(): ReturnType<SessionCoordinator['getCoordinationStats']> {
    return this.coordinator.getCoordinationStats();
  }

  /**
   * Subscribe to session events
   */
  public onSessionEvent(
    eventType: string,
    callback: (event: any) => void
  ): void {
    this.coordinator.on(eventType, callback);
  }

  /**
   * Unsubscribe from session events
   */
  public offSessionEvent(
    eventType: string,
    callback: (event: any) => void
  ): void {
    this.coordinator.off(eventType, callback);
  }
}

// Export singleton instance
export const simpleSessionManager = SimpleSessionManager.getInstance();