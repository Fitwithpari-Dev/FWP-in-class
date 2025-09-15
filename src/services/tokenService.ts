/**
 * Token Generation Service
 *
 * In production, JWT token generation should be done server-side
 * This service provides both development (client-side) and production (API) token generation
 */

import { ZOOM_CONFIG } from '../config/zoom.config';

interface TokenPayload {
  app_key: string;
  tpc: string;
  role_type: number;
  user_identity: string;
  session_key: string;
  version: number;
  iat: number;
  exp: number;
}

export class TokenService {
  private apiEndpoint: string;
  private isDevelopment: boolean;

  constructor() {
    this.apiEndpoint = import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT || '';
    // TEMPORARY: Force development mode to bypass Lambda issues
    this.isDevelopment = true; // import.meta.env.DEV || !this.apiEndpoint;
    console.log('🚨 TEMP FIX: Forced development mode for token generation');
  }

  /**
   * Generate or fetch a session token
   * In development: generates client-side (INSECURE - for development only)
   * In production: fetches from backend API
   */
  async generateToken(
    sessionName: string,
    role: number,
    sessionKey: string,
    userIdentity: string
  ): Promise<string> {
    if (this.isDevelopment) {
      console.warn(
        '⚠️ Using client-side token generation. This is INSECURE and should only be used in development.'
      );
      return this.generateDevToken(sessionName, role, sessionKey, userIdentity);
    }

    return this.fetchTokenFromAPI(sessionName, role, sessionKey, userIdentity);
  }

  /**
   * Development-only: Generate token client-side
   * WARNING: This exposes your SDK secret and should NEVER be used in production
   * For development, this creates a properly formatted JWT using HMAC-SHA256
   */
  private async generateDevToken(
    sessionName: string,
    role: number,
    sessionKey: string,
    userIdentity: string
  ): Promise<string> {
    if (!ZOOM_CONFIG.sdkKey || !ZOOM_CONFIG.sdkSecret) {
      throw new Error(
        'Zoom SDK credentials not configured. Please set VITE_ZOOM_SDK_KEY and VITE_ZOOM_SDK_SECRET in your .env file'
      );
    }

    // CRITICAL: Token generation times per Zoom SDK requirements
    const iat = Math.round(new Date().getTime() / 1000) - 30; // 30 seconds in the past to account for clock skew
    const exp = iat + 60 * 60 * 2; // 2 hours expiry

    const payload: TokenPayload = {
      app_key: ZOOM_CONFIG.sdkKey,
      version: 1,
      tpc: sessionName,
      role_type: role,
      user_identity: userIdentity,
      session_key: sessionKey,
      iat: iat,
      exp: exp,
    };

    // WARNING: This is a simplified JWT implementation for development only
    // In production, ALWAYS use server-side token generation with proper JWT libraries
    try {
      // Create JWT header
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };

      // Base64url encode (not base64)
      const base64url = (str: string): string => {
        return btoa(str)
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      };

      const encodedHeader = base64url(JSON.stringify(header));
      const encodedPayload = base64url(JSON.stringify(payload));
      const message = `${encodedHeader}.${encodedPayload}`;

      // Use Web Crypto API for HMAC-SHA256 signing
      const encoder = new TextEncoder();
      const keyData = encoder.encode(ZOOM_CONFIG.sdkSecret);
      const messageData = encoder.encode(message);

      // Import the secret key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Sign the message
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const signatureArray = Array.from(new Uint8Array(signature));
      const signatureBase64 = base64url(String.fromCharCode(...signatureArray));

      return `${message}.${signatureBase64}`;
    } catch (error) {
      console.error('Failed to generate dev token:', error);
      throw new Error('Unable to generate development token. Ensure your SDK credentials are correct.');
    }
  }

  /**
   * Production: Fetch token from backend API
   */
  private async fetchTokenFromAPI(
    sessionName: string,
    role: number,
    sessionKey: string,
    userIdentity: string
  ): Promise<string> {
    if (!this.apiEndpoint) {
      throw new Error(
        'API endpoint not configured. Please set VITE_API_ENDPOINT in your .env file'
      );
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any authentication headers your API requires
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          topic: sessionName,        // Lambda expects 'topic' parameter
          sessionName,               // Keep for backward compatibility
          role,
          sessionKey,
          userIdentity,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate token: ${error}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Failed to fetch token from API:', error);
      throw new Error('Unable to generate session token. Please try again.');
    }
  }

  /**
   * Validate if a token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      // Parse the token (assuming JWT format)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; // Invalid format
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return payload.exp ? payload.exp < now : true;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Get session info from token
   */
  getSessionInfoFromToken(token: string): {
    sessionName: string;
    userIdentity: string;
    role: number;
  } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return {
        sessionName: payload.tpc,
        userIdentity: payload.user_identity,
        role: payload.role_type,
      };
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();

// Export the main function for backward compatibility
export async function generateSessionToken(
  sessionName: string,
  role: number,
  sessionKey: string,
  userIdentity: string
): Promise<string> {
  return tokenService.generateToken(sessionName, role, sessionKey, userIdentity);
}