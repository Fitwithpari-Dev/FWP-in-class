/**
 * Session Discovery Service
 *
 * Lightweight service for discovering and managing active Zoom sessions
 * without requiring database dependencies. Uses in-memory storage with
 * localStorage persistence for immediate session sharing needs.
 *
 * This complements the existing SessionManager for immediate coach-student coordination.
 */

import {
  SessionMetadata,
  SessionRegistry,
  UserRole
} from '../types/fitness-platform';

export class SessionDiscoveryService {
  private registry: SessionRegistry;
  private storageKey = 'fitwithpari_session_registry';

  constructor() {
    this.registry = {
      activeSessions: new Map(),
      userSessions: new Map()
    };

    // Load from localStorage if available
    this.loadFromStorage();

    // Set up periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Register a new session (called by coaches)
   */
  public async registerSession(metadata: SessionMetadata): Promise<void> {
    console.log('📝 Registering session:', metadata);

    // Add to active sessions
    this.registry.activeSessions.set(metadata.id, metadata);

    // Associate coach with session
    this.registry.userSessions.set(metadata.coachId, metadata.id);

    // Persist to storage
    this.saveToStorage();

    console.log('✅ Session registered successfully:', {
      sessionId: metadata.id,
      sessionName: metadata.name,
      coach: metadata.coachName
    });
  }

  /**
   * Find session by ID
   */
  public async getSessionById(sessionId: string): Promise<SessionMetadata | null> {
    const session = this.registry.activeSessions.get(sessionId);

    if (session) {
      console.log('🔍 Found session:', {
        sessionId,
        name: session.name,
        status: session.status,
        participants: session.participantCount
      });
    } else {
      console.log('❌ Session not found:', sessionId);
    }

    return session || null;
  }

  /**
   * Find session by topic/name (for joining by name)
   */
  public async getSessionByTopic(topic: string): Promise<SessionMetadata | null> {
    for (const [id, session] of this.registry.activeSessions.entries()) {
      if (session.topic === topic || session.name === topic) {
        console.log('🎯 Found session by topic:', {
          topic,
          sessionId: id,
          status: session.status
        });
        return session;
      }
    }

    console.log('❌ No session found for topic:', topic);
    return null;
  }

  /**
   * Get all available sessions (for session discovery)
   */
  public async getAvailableSessions(includePrivate: boolean = false): Promise<SessionMetadata[]> {
    const sessions = Array.from(this.registry.activeSessions.values())
      .filter(session => {
        // Only include active or waiting sessions
        if (session.status === 'ended') return false;

        // Filter private sessions unless requested
        if (!includePrivate && session.isPrivate) return false;

        return true;
      });

    console.log('📋 Available sessions:', {
      count: sessions.length,
      includePrivate,
      sessions: sessions.map(s => ({ id: s.id, name: s.name, status: s.status }))
    });

    return sessions;
  }

  /**
   * Update session status
   */
  public async updateSessionStatus(
    sessionId: string,
    status: SessionMetadata['status']
  ): Promise<void> {
    const session = this.registry.activeSessions.get(sessionId);

    if (session) {
      session.status = status;
      this.registry.activeSessions.set(sessionId, session);
      this.saveToStorage();

      console.log('🔄 Session status updated:', {
        sessionId,
        newStatus: status
      });
    }
  }

  /**
   * Update participant count
   */
  public async updateParticipantCount(
    sessionId: string,
    count: number
  ): Promise<void> {
    const session = this.registry.activeSessions.get(sessionId);

    if (session) {
      session.participantCount = count;
      this.registry.activeSessions.set(sessionId, session);
      this.saveToStorage();

      console.log('👥 Participant count updated:', {
        sessionId,
        count
      });
    }
  }

  /**
   * Add user to session tracking
   */
  public async addUserToSession(userId: string, sessionId: string): Promise<void> {
    this.registry.userSessions.set(userId, sessionId);

    // Increment participant count
    const session = this.registry.activeSessions.get(sessionId);
    if (session) {
      session.participantCount++;
      this.registry.activeSessions.set(sessionId, session);
    }

    this.saveToStorage();

    console.log('➕ User added to session:', {
      userId,
      sessionId
    });
  }

  /**
   * Remove user from session tracking
   */
  public async removeUserFromSession(userId: string): Promise<void> {
    const sessionId = this.registry.userSessions.get(userId);

    if (sessionId) {
      // Remove user mapping
      this.registry.userSessions.delete(userId);

      // Decrement participant count
      const session = this.registry.activeSessions.get(sessionId);
      if (session) {
        session.participantCount = Math.max(0, session.participantCount - 1);
        this.registry.activeSessions.set(sessionId, session);
      }

      this.saveToStorage();

      console.log('➖ User removed from session:', {
        userId,
        sessionId
      });
    }
  }

  /**
   * Unregister session (cleanup)
   */
  public async unregisterSession(sessionId: string): Promise<void> {
    const session = this.registry.activeSessions.get(sessionId);

    if (session) {
      // Remove session
      this.registry.activeSessions.delete(sessionId);

      // Remove coach mapping
      this.registry.userSessions.delete(session.coachId);

      // Remove any user mappings for this session
      for (const [userId, userSessionId] of this.registry.userSessions.entries()) {
        if (userSessionId === sessionId) {
          this.registry.userSessions.delete(userId);
        }
      }

      this.saveToStorage();

      console.log('🗑️ Session unregistered:', {
        sessionId,
        sessionName: session.name
      });
    }
  }

  /**
   * Get session for a specific user
   */
  public async getUserSession(userId: string): Promise<SessionMetadata | null> {
    const sessionId = this.registry.userSessions.get(userId);

    if (sessionId) {
      return this.getSessionById(sessionId);
    }

    return null;
  }

  /**
   * Clean up expired sessions
   */
  public async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.registry.activeSessions.entries()) {
      // Consider sessions older than 2 hours as expired
      const sessionAge = now.getTime() - session.createdAt.getTime();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      if (sessionAge > maxAge) {
        expiredSessions.push(sessionId);
      }
    }

    // Remove expired sessions
    for (const sessionId of expiredSessions) {
      await this.unregisterSession(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log('🧹 Cleaned up expired sessions:', {
        count: expiredSessions.length,
        sessionIds: expiredSessions
      });
    }
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    activeSessions: number;
    totalParticipants: number;
    sessionsByStatus: Record<string, number>;
  } {
    const sessions = Array.from(this.registry.activeSessions.values());

    const stats = {
      activeSessions: sessions.length,
      totalParticipants: sessions.reduce((total, session) => total + session.participantCount, 0),
      sessionsByStatus: sessions.reduce((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }

  // Private helper methods

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);

        // Restore sessions map
        if (data.activeSessions) {
          this.registry.activeSessions = new Map(
            Object.entries(data.activeSessions).map(([id, session]: [string, any]) => [
              id,
              {
                ...session,
                createdAt: new Date(session.createdAt)
              }
            ])
          );
        }

        // Restore user sessions map
        if (data.userSessions) {
          this.registry.userSessions = new Map(Object.entries(data.userSessions));
        }

        console.log('📚 Session registry loaded from storage:', {
          sessions: this.registry.activeSessions.size,
          users: this.registry.userSessions.size
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to load session registry from storage:', error);
      // Continue with empty registry
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        activeSessions: Object.fromEntries(this.registry.activeSessions),
        userSessions: Object.fromEntries(this.registry.userSessions)
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save session registry to storage:', error);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired sessions every 10 minutes
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }
}

// Export singleton instance
export const sessionDiscovery = new SessionDiscoveryService();