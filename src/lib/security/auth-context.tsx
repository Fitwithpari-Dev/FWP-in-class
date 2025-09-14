/**
 * Comprehensive Authentication Context with Role-Based Access Control
 * Provides secure authentication state management for FitWithPari
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import { AuthService } from '../supabase/auth';
import { JWTManager, TokenData } from './jwt-manager';
import { SecurityLogger } from './security-logger';
import type { UserProfile, UserRole } from '../supabase/supabase-client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasValidSession: boolean;
}

export interface AuthContextValue extends AuthState {
  // Authentication methods
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (userData: SignUpData) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;

  // Role-based access control
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccessResource: (resourceType: string, resourceId?: string) => Promise<boolean>;

  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  uploadAvatar: (file: File) => Promise<string>;

  // Security features
  enableMFA: () => Promise<void>;
  disableMFA: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Video session access
  generateVideoToken: (sessionId: string, role: 'host' | 'participant') => Promise<string>;
  validateVideoAccess: (sessionId: string) => Promise<boolean>;

  // Health data access (HIPAA considerations)
  requestHealthDataAccess: (reason: string) => Promise<string>; // Returns audit ID
  logHealthDataAccess: (dataType: string, action: string) => Promise<void>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  needsEmailVerification?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  fitnessGoals?: string[];
}

// Permission definitions for role-based access control
const PERMISSIONS = {
  // Student permissions
  'fitness.view_own_data': ['student', 'coach', 'admin'],
  'fitness.update_own_profile': ['student', 'coach', 'admin'],
  'fitness.join_sessions': ['student', 'coach', 'admin'],
  'fitness.view_schedules': ['student', 'coach', 'admin'],

  // Coach permissions
  'fitness.manage_sessions': ['coach', 'admin'],
  'fitness.view_student_data': ['coach', 'admin'],
  'fitness.create_workouts': ['coach', 'admin'],
  'fitness.access_analytics': ['coach', 'admin'],

  // Admin permissions
  'fitness.manage_users': ['admin'],
  'fitness.system_settings': ['admin'],
  'fitness.audit_logs': ['admin'],
  'fitness.billing_management': ['admin'],

  // Health data permissions (HIPAA sensitive)
  'health.view_own_considerations': ['student', 'coach', 'admin'],
  'health.view_student_health': ['coach', 'admin'],
  'health.manage_health_data': ['coach', 'admin'],

  // Video session permissions
  'video.create_sessions': ['coach', 'admin'],
  'video.join_sessions': ['student', 'coach', 'admin'],
  'video.record_sessions': ['coach', 'admin'],
  'video.manage_recordings': ['coach', 'admin'],
} as const;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    hasValidSession: false,
  });

  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        await handleAuthStateChange(event, session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session initialization error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (session) {
        await updateAuthState(session);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    try {
      if (session) {
        await updateAuthState(session);

        // Log security events
        await SecurityLogger.logAuthEvent(session.user.id, event as any, {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ipAddress: 'client' // In production, get actual IP
        });
      } else {
        // Clear auth state on sign out
        await clearAuthState();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      await clearAuthState();
    }
  };

  // Update authentication state with user data
  const updateAuthState = async (session: Session) => {
    try {
      const profile = await AuthService.getUserProfile(session.user.id);

      if (!profile) {
        console.error('No user profile found');
        await clearAuthState();
        return;
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role,
        profile,
        permissions: getUserPermissions(profile.role)
      };

      // Store JWT tokens
      const tokens: TokenData = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + (60 * 60 * 1000),
        tokenType: 'bearer'
      };

      await JWTManager.storeTokens(tokens);
      setTokenData(tokens);

      setAuthState({
        user: authUser,
        session,
        isLoading: false,
        isAuthenticated: true,
        hasValidSession: true
      });
    } catch (error) {
      console.error('Failed to update auth state:', error);
      await clearAuthState();
    }
  };

  // Clear authentication state
  const clearAuthState = async () => {
    await JWTManager.clearTokens();
    setTokenData(null);
    setAuthState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      hasValidSession: false
    });
  };

  // Get user permissions based on role
  const getUserPermissions = (role: UserRole): string[] => {
    const permissions: string[] = [];

    for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
      if (allowedRoles.includes(role)) {
        permissions.push(permission);
      }
    }

    return permissions;
  };

  // Authentication methods
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await AuthService.signIn({ email, password });

      if (result.user && result.session) {
        await updateAuthState(result.session);

        // Log successful login
        await SecurityLogger.logAuthEvent(result.user.id, 'SIGN_IN', {
          timestamp: new Date().toISOString(),
          success: true
        });

        return {
          success: true,
          user: authState.user!
        };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  };

  const signUp = async (userData: SignUpData): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await AuthService.signUp(userData);

      if (result.user) {
        // Log successful registration
        await SecurityLogger.logAuthEvent(result.user.id, 'SIGN_UP', {
          timestamp: new Date().toISOString(),
          role: userData.role
        });

        return {
          success: true,
          needsEmailVerification: result.needsEmailConfirmation
        };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error('Sign up error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (authState.user) {
        // Log sign out event
        await SecurityLogger.logAuthEvent(authState.user.id, 'SIGN_OUT', {
          timestamp: new Date().toISOString()
        });
      }

      await AuthService.signOut();
      await clearAuthState();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear state even on error
      await clearAuthState();
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const newTokens = await JWTManager.refreshAccessToken();
      if (newTokens) {
        setTokenData(newTokens);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  // Role-based access control methods
  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;
    return authState.user.permissions.includes(permission);
  }, [authState.user]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(authState.user.role);
  }, [authState.user]);

  const canAccessResource = async (resourceType: string, resourceId?: string): Promise<boolean> => {
    if (!authState.user) return false;

    // Implement resource-specific access control logic
    switch (resourceType) {
      case 'health_data':
        return hasPermission('health.view_student_health') ||
               (hasPermission('health.view_own_considerations') && resourceId === authState.user.id);

      case 'fitness_session':
        return hasPermission('fitness.join_sessions') || hasPermission('fitness.manage_sessions');

      case 'user_profile':
        return resourceId === authState.user.id || hasRole(['coach', 'admin']);

      default:
        return false;
    }
  };

  // Profile management
  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!authState.user) throw new Error('Not authenticated');

    const updatedProfile = await AuthService.updateProfile(authState.user.id, updates);

    // Update auth state with new profile
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, profile: updatedProfile } : null
    }));

    return updatedProfile;
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!authState.user) throw new Error('Not authenticated');

    const avatarUrl = await AuthService.uploadAvatar(authState.user.id, file);

    // Update profile with new avatar
    await updateProfile({ avatarUrl });

    return avatarUrl;
  };

  // Security features
  const enableMFA = async (): Promise<void> => {
    // Implementation for MFA enablement
    throw new Error('MFA not implemented yet');
  };

  const disableMFA = async (): Promise<void> => {
    // Implementation for MFA disabling
    throw new Error('MFA not implemented yet');
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!authState.user) throw new Error('Not authenticated');

    // Verify current password first
    await AuthService.signIn({
      email: authState.user.email,
      password: currentPassword
    });

    // Update password
    await AuthService.updatePassword(newPassword);

    // Log password change
    await SecurityLogger.logSecurityEvent(authState.user.id, 'PASSWORD_CHANGED', {
      timestamp: new Date().toISOString()
    });
  };

  // Video session methods
  const generateVideoToken = async (sessionId: string, role: 'host' | 'participant'): Promise<string> => {
    if (!authState.user) throw new Error('Not authenticated');

    // Check video session permissions
    const canCreateSessions = hasPermission('video.create_sessions');
    const canJoinSessions = hasPermission('video.join_sessions');

    if (role === 'host' && !canCreateSessions) {
      throw new Error('Insufficient permissions to host video sessions');
    }

    if (!canJoinSessions) {
      throw new Error('Insufficient permissions to join video sessions');
    }

    const permissions = [];
    if (canCreateSessions) permissions.push('session.manage', 'recording.start');
    if (hasPermission('video.record_sessions')) permissions.push('recording.save');

    return await JWTManager.generateVideoSessionToken(
      sessionId,
      authState.user.id,
      role,
      permissions
    );
  };

  const validateVideoAccess = async (sessionId: string): Promise<boolean> => {
    if (!authState.user) return false;

    // Implement session access validation logic
    // This would typically check database for session permissions
    return hasPermission('video.join_sessions');
  };

  // Health data access methods (HIPAA compliance)
  const requestHealthDataAccess = async (reason: string): Promise<string> => {
    if (!authState.user) throw new Error('Not authenticated');

    // Log health data access request
    const auditId = await SecurityLogger.logHealthDataAccess(
      authState.user.id,
      'ACCESS_REQUESTED',
      {
        reason,
        timestamp: new Date().toISOString(),
        userRole: authState.user.role
      }
    );

    return auditId;
  };

  const logHealthDataAccess = async (dataType: string, action: string): Promise<void> => {
    if (!authState.user) return;

    await SecurityLogger.logHealthDataAccess(
      authState.user.id,
      action,
      {
        dataType,
        timestamp: new Date().toISOString(),
        userRole: authState.user.role
      }
    );
  };

  const contextValue: AuthContextValue = {
    // Auth state
    ...authState,

    // Auth methods
    signIn,
    signUp,
    signOut,
    refreshSession,

    // RBAC methods
    hasPermission,
    hasRole,
    canAccessResource,

    // Profile methods
    updateProfile,
    uploadAvatar,

    // Security methods
    enableMFA,
    disableMFA,
    changePassword,

    // Video session methods
    generateVideoToken,
    validateVideoAccess,

    // Health data methods
    requestHealthDataAccess,
    logHealthDataAccess
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for role-based route protection
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const { hasRole, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>; // Replace with proper loading component
    }

    if (!isAuthenticated) {
      return <div>Please sign in to access this page.</div>; // Replace with redirect
    }

    if (!hasRole(allowedRoles)) {
      return <div>Access denied. Insufficient permissions.</div>; // Replace with proper error page
    }

    return <Component {...props} />;
  };
}

// Hook for permission-based UI elements
export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}