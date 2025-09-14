/**
 * Secure JWT Token Management System for FitWithPari
 * Handles JWT token lifecycle, refresh, validation, and secure storage
 * Implements security best practices for fitness platform authentication
 */

import { supabase } from '../supabase/supabase-client';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: 'student' | 'coach' | 'admin';
  sessionId: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface VideoSessionToken {
  sessionId: string;
  userId: string;
  role: 'host' | 'participant';
  expiresAt: number;
  permissions: string[];
}

export class JWTManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static refreshPromise: Promise<TokenData | null> | null = null;

  /**
   * Securely store tokens using httpOnly approach when possible
   */
  static async storeTokens(tokenData: TokenData): Promise<void> {
    try {
      // In production, tokens should be stored in httpOnly cookies
      // For now, using secure localStorage with encryption
      const encryptedTokens = await this.encryptTokenData(tokenData);

      // Store with expiration metadata
      const tokenWrapper = {
        data: encryptedTokens,
        expiresAt: tokenData.expiresAt,
        storedAt: Date.now()
      };

      localStorage.setItem('fitwithpari_auth', JSON.stringify(tokenWrapper));

      // Set up automatic refresh before expiration
      this.scheduleTokenRefresh(tokenData.expiresAt);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Token storage failed');
    }
  }

  /**
   * Retrieve and decrypt stored tokens
   */
  static async getStoredTokens(): Promise<TokenData | null> {
    try {
      const stored = localStorage.getItem('fitwithpari_auth');
      if (!stored) return null;

      const tokenWrapper = JSON.parse(stored);

      // Check if tokens have expired
      if (Date.now() >= tokenWrapper.expiresAt) {
        await this.clearTokens();
        return null;
      }

      // Decrypt token data
      const tokenData = await this.decryptTokenData(tokenWrapper.data);
      return tokenData;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Validate JWT token structure and signature
   */
  static async validateToken(token: string): Promise<JWTPayload | null> {
    try {
      // Use Supabase's built-in JWT validation
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        return null;
      }

      // Extract payload from token
      const payload = this.decodeJWTPayload(token);
      if (!payload) return null;

      // Additional validation checks
      if (!this.isTokenValid(payload)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<TokenData | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private static async performTokenRefresh(): Promise<TokenData | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        await this.clearTokens();
        return null;
      }

      const tokenData: TokenData = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + (60 * 60 * 1000),
        tokenType: data.session.token_type || 'bearer'
      };

      await this.storeTokens(tokenData);
      return tokenData;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  static async ensureValidToken(): Promise<string | null> {
    try {
      const currentTokens = await this.getStoredTokens();

      if (!currentTokens) {
        return null;
      }

      // Check if token needs refresh
      const timeUntilExpiry = currentTokens.expiresAt - Date.now();

      if (timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD) {
        console.log('Token expiring soon, refreshing...');
        const refreshedTokens = await this.refreshAccessToken();

        if (!refreshedTokens) {
          return null;
        }

        return refreshedTokens.accessToken;
      }

      return currentTokens.accessToken;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Generate secure video session JWT for Zoom SDK
   */
  static async generateVideoSessionToken(
    sessionId: string,
    userId: string,
    role: 'host' | 'participant',
    permissions: string[] = []
  ): Promise<string> {
    try {
      const payload: VideoSessionToken = {
        sessionId,
        userId,
        role,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
        permissions: [
          'video.start',
          'audio.start',
          'screen.share',
          ...permissions
        ]
      };

      // In production, this should use your server-side JWT signing
      // For now, using Supabase functions or client-side generation
      const token = await this.signVideoToken(payload);

      return token;
    } catch (error) {
      console.error('Video token generation failed:', error);
      throw new Error('Failed to generate video session token');
    }
  }

  /**
   * Validate video session token
   */
  static async validateVideoSessionToken(token: string): Promise<VideoSessionToken | null> {
    try {
      const payload = this.decodeVideoTokenPayload(token);

      if (!payload || Date.now() >= payload.expiresAt) {
        return null;
      }

      // Additional validation logic
      return payload;
    } catch (error) {
      console.error('Video token validation failed:', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      localStorage.removeItem('fitwithpari_auth');
      sessionStorage.clear();

      // Clear any scheduled refreshes
      this.cancelScheduledRefresh();
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get authorization header for API requests
   */
  static async getAuthHeader(): Promise<string | null> {
    const token = await this.ensureValidToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Decode JWT payload without verification (for client-side inspection only)
   */
  private static decodeJWTPayload(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload as JWTPayload;
    } catch (error) {
      console.error('Failed to decode JWT payload:', error);
      return null;
    }
  }

  /**
   * Validate token payload
   */
  private static isTokenValid(payload: JWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return false;
    }

    // Check required fields
    if (!payload.sub || !payload.email || !payload.role) {
      return false;
    }

    // Check allowed roles
    const allowedRoles = ['student', 'coach', 'admin'];
    if (!allowedRoles.includes(payload.role)) {
      return false;
    }

    return true;
  }

  /**
   * Schedule automatic token refresh
   */
  private static scheduleTokenRefresh(expiresAt: number): void {
    const refreshTime = expiresAt - this.TOKEN_REFRESH_THRESHOLD;
    const delay = refreshTime - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        this.refreshAccessToken().catch(console.error);
      }, delay);
    }
  }

  /**
   * Cancel scheduled token refresh
   */
  private static cancelScheduledRefresh(): void {
    // Clear any existing timers - implementation depends on how you track timers
  }

  /**
   * Encrypt token data for storage
   */
  private static async encryptTokenData(tokenData: TokenData): Promise<string> {
    // Implement encryption - for demo using base64 encoding
    // In production, use proper encryption like AES-256-GCM
    const jsonString = JSON.stringify(tokenData);
    return btoa(jsonString);
  }

  /**
   * Decrypt token data from storage
   */
  private static async decryptTokenData(encryptedData: string): Promise<TokenData> {
    // Implement decryption - for demo using base64 decoding
    // In production, use proper decryption
    const jsonString = atob(encryptedData);
    return JSON.parse(jsonString);
  }

  /**
   * Sign video session token
   */
  private static async signVideoToken(payload: VideoSessionToken): Promise<string> {
    // This should be done server-side in production
    // For demo purposes, creating a simple token structure
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));

    // In production, this would be a proper HMAC signature
    const signature = btoa(`${encodedHeader}.${encodedPayload}.signature`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Decode video token payload
   */
  private static decodeVideoTokenPayload(token: string): VideoSessionToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload as VideoSessionToken;
    } catch (error) {
      console.error('Failed to decode video token:', error);
      return null;
    }
  }
}

/**
 * React hook for JWT token management
 */
export function useJWTManager() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Load initial tokens
    JWTManager.getStoredTokens().then(setTokenData);
  }, []);

  const refreshToken = async (): Promise<boolean> => {
    setIsRefreshing(true);
    try {
      const newTokenData = await JWTManager.refreshAccessToken();
      setTokenData(newTokenData);
      return !!newTokenData;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearTokens = async (): Promise<void> => {
    await JWTManager.clearTokens();
    setTokenData(null);
  };

  return {
    tokenData,
    isRefreshing,
    refreshToken,
    clearTokens,
    getAuthHeader: JWTManager.getAuthHeader,
    ensureValidToken: JWTManager.ensureValidToken
  };
}