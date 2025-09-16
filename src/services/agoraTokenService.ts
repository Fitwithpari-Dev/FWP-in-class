// Agora Token Generation Service
// Handles secure token generation for Agora Video SDK

import { RtcTokenBuilder, RtcRole } from 'agora-token';

export interface AgoraTokenRequest {
  channelName: string;
  uid: number | null;
  role: 'host' | 'audience';
  expirationTimeInSeconds?: number;
}

export class AgoraTokenService {
  private appId: string;
  private appCertificate: string;
  private defaultExpirationTime = 3600; // 1 hour

  constructor(appId?: string, appCertificate?: string) {
    // Use provided credentials or fall back to environment variables
    this.appId = appId || import.meta.env.VITE_AGORA_APP_ID || '';
    this.appCertificate = appCertificate || import.meta.env.VITE_AGORA_APP_CERTIFICATE || '';

    if (!this.appId) {
      throw new Error('Agora App ID is required. Set VITE_AGORA_APP_ID in environment or pass as parameter.');
    }
  }

  /**
   * Generate RTC Token for video streaming
   */
  async generateRtcToken(request: AgoraTokenRequest): Promise<string> {
    console.log('🔑 AgoraTokenService: Generating RTC token for:', {
      channel: request.channelName,
      uid: request.uid,
      role: request.role
    });

    if (!this.appCertificate) {
      console.warn('⚠️ AgoraTokenService: No App Certificate configured - using testing mode');
      return null; // Return null for testing mode (Agora requirement)
    }

    try {
      // Map role to Agora RTC role
      const agoraRole = request.role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

      // Calculate expiration timestamp
      const expirationTimeInSeconds = request.expirationTimeInSeconds || this.defaultExpirationTime;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      // Generate UID if not provided
      const uid = request.uid || 0;

      // Generate token
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        request.channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
      );

      console.log('✅ AgoraTokenService: Token generated successfully');
      console.log('🔍 AgoraTokenService: Token details:', {
        channel: request.channelName,
        uid,
        role: request.role,
        agoraRole,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
        tokenPreview: `${token.substring(0, 20)}...`
      });

      return token;

    } catch (error) {
      console.error('❌ AgoraTokenService: Failed to generate token:', error);
      throw new Error(`Failed to generate Agora token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate token configuration
   */
  validateConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.appId) {
      issues.push('App ID is missing');
    } else if (this.appId.length !== 32) {
      issues.push('App ID should be 32 characters long');
    }

    if (!this.appCertificate) {
      issues.push('App Certificate is missing (will use testing mode)');
    } else if (this.appCertificate.length !== 32) {
      issues.push('App Certificate should be 32 characters long');
    }

    return {
      isValid: issues.length === 0 || (issues.length === 1 && issues[0].includes('testing mode')),
      issues
    };
  }

  /**
   * Get service info for debugging
   */
  getServiceInfo() {
    const validation = this.validateConfiguration();

    return {
      appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'MISSING',
      hasCertificate: !!this.appCertificate,
      isTestingMode: !this.appCertificate,
      defaultExpirationTime: this.defaultExpirationTime,
      validation
    };
  }

  /**
   * Check if token is likely expired based on its structure
   * Note: This is a basic check, proper validation requires server-side verification
   */
  isTokenLikelyExpired(token: string): boolean {
    if (!token || token.length < 20) return true;

    // Basic heuristic: if token was generated more than default expiration time ago
    // In production, implement proper server-side token validation
    return false; // For now, assume tokens are valid
  }
}

// Singleton instance for convenience
let agoraTokenService: AgoraTokenService | null = null;

export function getAgoraTokenService(): AgoraTokenService {
  if (!agoraTokenService) {
    agoraTokenService = new AgoraTokenService();
  }
  return agoraTokenService;
}

// Export for direct usage
export default AgoraTokenService;