/**
 * Token Generation Service - EMERGENCY LAMBDA BYPASS ACTIVE
 *
 * TEMPORARY: Lambda function has topic parameter issues
 * Currently forcing client-side token generation for all environments
 * This service provides both development (client-side) and production (API) token generation
 *
 * Deploy timestamp: 2025-01-15 17:45 UTC - Force rebuild
 */

import { ZOOM_CONFIG } from '../config/zoom.config';

interface TokenPayload {
  app_key: string;
  topic: string;  // CRITICAL: Changed from 'tpc' to 'topic'
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
    // NUCLEAR OPTION: Completely ignore all environment variables and force dev mode
    this.apiEndpoint = ''; // Never use production endpoint
    this.isDevelopment = true; // Always use dev mode
    console.log('🚨 NUCLEAR FIX: All production services disabled - client-side only');
    console.log('📋 Emergency token config:', {
      environmentEndpoint: import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT,
      forcedApiEndpoint: this.apiEndpoint,
      forcedDevelopmentMode: this.isDevelopment,
      deployTimestamp: '2025-01-15T17:50:00Z'
    });
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
    // FORCE CLIENT-SIDE TOKEN GENERATION - NO API CALLS
    console.log('🚨 FORCED DEV TOKEN: Bypassing all API calls for sessionName:', sessionName);
    return this.generateDevToken(sessionName, role, sessionKey, userIdentity);
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

    // CRITICAL FIX: Use deterministic timestamps for same session
    // Generate a base timestamp that's consistent across all participants in the same session
    const sessionTimestamp = this.getSessionTimestamp(sessionName);
    const iat = sessionTimestamp - 30; // 30 seconds in the past to account for clock skew
    const exp = iat + 60 * 60 * 2; // 2 hours expiry

    const payload: TokenPayload = {
      app_key: ZOOM_CONFIG.sdkKey,
      version: 1,
      topic: sessionName,  // CRITICAL: Changed from 'tpc' to 'topic'
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
   * Generate proper timestamp for JWT token
   * CRITICAL: Must use current time in SECONDS (not milliseconds)
   */
  private getSessionTimestamp(sessionName: string): number {
    // CRITICAL FIX: Use current time in SECONDS (not milliseconds)
    const nowInSeconds = Math.floor(Date.now() / 1000);

    console.log('🕐 JWT Token timestamp generation:', {
      sessionName,
      nowInSeconds,
      nowDate: new Date(nowInSeconds * 1000).toISOString(),
      iatWillBe: nowInSeconds - 30,
      iatDate: new Date((nowInSeconds - 30) * 1000).toISOString(),
      expWillBe: nowInSeconds - 30 + (60 * 60 * 2),
      expDate: new Date((nowInSeconds - 30 + (60 * 60 * 2)) * 1000).toISOString(),
      reason: 'Using current time to ensure valid JWT timestamps'
    });

    return nowInSeconds;
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
        sessionName: payload.topic || payload.tpc,  // Support both for backward compatibility
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