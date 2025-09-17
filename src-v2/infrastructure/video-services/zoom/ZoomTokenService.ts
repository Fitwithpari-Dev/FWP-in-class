import { SessionId } from '../../../core/domain/value-objects/SessionId';

/**
 * Zoom Token Service
 * Handles JWT token generation for Zoom Video SDK sessions
 * Uses existing Lambda endpoint for secure token generation
 */
export class ZoomTokenService {
  private tokenEndpoint: string;

  constructor(tokenEndpoint?: string) {
    // Use environment variable or fallback to existing Lambda endpoint
    this.tokenEndpoint = tokenEndpoint ||
                        import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT ||
                        'https://oorxo2zdkjrmmbzdfhaktk5ipa0phjlp.lambda-url.ap-south-1.on.aws';
  }

  /**
   * Generate JWT token for Zoom session
   * Based on Zoom SDK documentation requirements
   */
  async generateToken(
    sessionName: string,
    role: 'host' | 'participant',
    userIdentity: string,
    sessionKey?: string
  ): Promise<string> {
    try {
      const payload = {
        sessionName: this.sanitizeSessionName(sessionName),
        role: role === 'host' ? 1 : 0, // 1 = host, 0 = participant
        userIdentity: userIdentity,
        sessionKey: sessionKey || 'default-key',
        // Token expiration: 1 hour (minimum 1800s per Zoom requirements)
        expirationSeconds: 3600
      };

      console.log('[ZoomTokenService] Requesting token with payload:', {
        ...payload,
        endpoint: this.tokenEndpoint
      });

      const response = await fetch(`${this.tokenEndpoint}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token generation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('No token received from server');
      }

      console.log('[ZoomTokenService] Token generated successfully');
      return data.token;
    } catch (error) {
      console.error('[ZoomTokenService] Token generation error:', error);
      throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitize session name according to Zoom requirements
   * - Max 200 characters
   * - Alphanumeric, spaces, hyphens, underscores only
   */
  private sanitizeSessionName(sessionName: string): string {
    return sessionName
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .substring(0, 200) // Max 200 chars
      .trim();
  }

  /**
   * Validate session name format
   */
  static isValidSessionName(sessionName: string): boolean {
    if (!sessionName || sessionName.length === 0) return false;
    if (sessionName.length > 200) return false;
    return /^[a-zA-Z0-9\s\-_]+$/.test(sessionName);
  }

  /**
   * Generate session name from SessionId for fitness platform
   */
  static generateSessionName(sessionId: SessionId, prefix: string = 'fitwithpari'): string {
    // Defensive validation
    if (!sessionId) {
      throw new Error('SessionId is required for generating session name');
    }

    const sessionIdValue = sessionId.getValue();
    if (!sessionIdValue || sessionIdValue.trim().length === 0) {
      throw new Error(`SessionId value is empty or invalid: ${sessionIdValue}`);
    }

    const sessionName = `${prefix}_${sessionIdValue}`;
    const truncatedName = sessionName.substring(0, 200); // Ensure max length

    console.log('[ZoomTokenService] Generated session name:', {
      originalSessionId: sessionIdValue,
      prefix,
      generatedName: sessionName,
      truncatedName,
      isValid: this.isValidSessionName(truncatedName)
    });

    // Final validation
    if (!this.isValidSessionName(truncatedName)) {
      throw new Error(`Generated session name is invalid: ${truncatedName}`);
    }

    return truncatedName;
  }
}