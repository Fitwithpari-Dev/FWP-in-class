// Agora Token Service for V2 Clean Architecture
// Based on working V1 implementation with testing mode support

export interface AgoraTokenRequest {
  channelName: string;
  uid: number | null;
  role: 'host' | 'audience';
  expirationTimeInSeconds?: number;
}

export interface AgoraTokenValidation {
  isValid: boolean;
  issues: string[];
}

/**
 * Agora Token Service for V2 Clean Architecture
 * Handles token generation with proper testing mode fallback
 */
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
   * Returns null for testing mode when no certificate is configured
   */
  async generateRtcToken(request: AgoraTokenRequest): Promise<string | null> {
    console.log('🔑 AgoraTokenService: Generating RTC token for:', {
      channel: request.channelName,
      uid: request.uid,
      role: request.role
    });

    if (!this.appCertificate) {
      console.log('⚠️ AgoraTokenService: No App Certificate configured - using testing mode (null token)');
      return null; // Return null for testing mode (Agora requirement)
    }

    try {
      // Note: In production, use agora-token library for server-side token generation
      // For now, return null to maintain testing mode compatibility
      console.warn('⚠️ AgoraTokenService: App Certificate configured but server-side token generation not implemented');
      console.log('🔧 AgoraTokenService: Falling back to testing mode for development');
      return null;

      // TODO: Implement proper token generation for production
      // const token = RtcTokenBuilder.buildTokenWithUid(
      //   this.appId,
      //   this.appCertificate,
      //   request.channelName,
      //   request.uid || 0,
      //   agoraRole,
      //   privilegeExpiredTs
      // );

    } catch (error) {
      console.error('❌ AgoraTokenService: Failed to generate token:', error);
      console.log('🔧 AgoraTokenService: Falling back to testing mode');
      return null; // Fallback to testing mode on error
    }
  }

  /**
   * Validate token configuration
   */
  validateConfiguration(): AgoraTokenValidation {
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
   * Check if service is in testing mode
   */
  isTestingMode(): boolean {
    return !this.appCertificate;
  }
}

// Singleton instance for convenience (following V1 pattern)
let agoraTokenService: AgoraTokenService | null = null;

export function getAgoraTokenService(): AgoraTokenService {
  if (!agoraTokenService) {
    agoraTokenService = new AgoraTokenService();
  }
  return agoraTokenService;
}

// Export for direct usage
export default AgoraTokenService;