/**
 * Session Validation Utilities
 * Provides validation and security checks for Zoom Video SDK sessions
 */

import { ZOOM_CONFIG } from '../config/zoom.config';

export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates session name according to Zoom SDK requirements
 */
export function validateSessionName(sessionName: string): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if session name exists
  if (!sessionName || sessionName.trim().length === 0) {
    errors.push('Session name is required');
    return { isValid: false, errors, warnings };
  }

  // Check length (must be between 1-200 characters)
  if (sessionName.length > 200) {
    errors.push('Session name must be 200 characters or less');
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(sessionName)) {
    errors.push('Session name can only contain letters, numbers, hyphens, and underscores');
  }

  // Check for reserved keywords
  const reservedKeywords = ['test', 'demo', 'admin', 'zoom'];
  if (reservedKeywords.some(keyword => sessionName.toLowerCase().includes(keyword))) {
    warnings.push('Session name contains reserved keywords which may cause issues');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates user identity/name
 */
export function validateUserIdentity(userIdentity: string): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if user identity exists
  if (!userIdentity || userIdentity.trim().length === 0) {
    errors.push('User name is required');
    return { isValid: false, errors, warnings };
  }

  // Check length (must be between 1-128 characters)
  if (userIdentity.length > 128) {
    errors.push('User name must be 128 characters or less');
  }

  // Check for minimum length
  if (userIdentity.length < 2) {
    warnings.push('User name should be at least 2 characters for better identification');
  }

  // Check for special characters that might cause display issues
  const problematicChars = /[<>\"']/;
  if (problematicChars.test(userIdentity)) {
    warnings.push('User name contains special characters that may not display correctly');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates session password
 */
export function validateSessionPassword(password: string): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!password || password.trim().length === 0) {
    // Password is optional but recommended
    warnings.push('No session password set. Consider adding one for better security');
    return { isValid: true, errors, warnings };
  }

  // Check length (10 characters max for Zoom SDK)
  if (password.length > 10) {
    errors.push('Session password must be 10 characters or less');
  }

  // Check for minimum security
  if (password.length < 6) {
    warnings.push('Session password should be at least 6 characters for better security');
  }

  // Check complexity
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  if (!(hasLetter && (hasNumber || hasSpecial))) {
    warnings.push('Consider using a mix of letters, numbers, and special characters for stronger security');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates role type
 */
export function validateRole(role: number): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (role !== 0 && role !== 1) {
    errors.push('Invalid role. Must be 0 (participant) or 1 (host)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates JWT token structure (basic validation without verification)
 */
export function validateTokenStructure(token: string): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!token) {
    errors.push('Token is required');
    return { isValid: false, errors, warnings };
  }

  // Check JWT structure (three parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    errors.push('Invalid token format. Expected JWT with header.payload.signature');
    return { isValid: false, errors, warnings };
  }

  try {
    // Try to decode header and payload (without verification)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Check required fields in header
    if (!header.alg || !header.typ) {
      errors.push('Token header missing required fields');
    }

    // Check required fields in payload
    const requiredFields = ['app_key', 'tpc', 'role_type', 'user_identity', 'iat', 'exp'];
    const missingFields = requiredFields.filter(field => !(field in payload));

    if (missingFields.length > 0) {
      errors.push(`Token payload missing required fields: ${missingFields.join(', ')}`);
    }

    // Check token expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        errors.push('Token has expired');
      } else if (payload.exp - now < 300) { // Less than 5 minutes
        warnings.push('Token will expire soon. Consider refreshing');
      }
    }

    // Check iat (issued at) is not in the future
    if (payload.iat) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.iat > now + 60) { // Allow 1 minute clock skew
        errors.push('Token issued in the future. Check system clock');
      }
    }

  } catch (e) {
    errors.push('Failed to parse token. Invalid JWT format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive session validation before joining
 */
export function validateSessionConfig(config: {
  sessionName: string;
  userName: string;
  role: number;
  password?: string;
  token?: string;
}): SessionValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate session name
  const sessionValidation = validateSessionName(config.sessionName);
  allErrors.push(...sessionValidation.errors);
  allWarnings.push(...sessionValidation.warnings);

  // Validate user name
  const userValidation = validateUserIdentity(config.userName);
  allErrors.push(...userValidation.errors);
  allWarnings.push(...userValidation.warnings);

  // Validate role
  const roleValidation = validateRole(config.role);
  allErrors.push(...roleValidation.errors);
  allWarnings.push(...roleValidation.warnings);

  // Validate password if provided
  if (config.password) {
    const passwordValidation = validateSessionPassword(config.password);
    allErrors.push(...passwordValidation.errors);
    allWarnings.push(...passwordValidation.warnings);
  }

  // Validate token if provided
  if (config.token) {
    const tokenValidation = validateTokenStructure(config.token);
    allErrors.push(...tokenValidation.errors);
    allWarnings.push(...tokenValidation.warnings);
  }

  // Check for participant limits
  const maxParticipants = ZOOM_CONFIG.limits?.maxParticipants || 100;
  if (maxParticipants > 100) {
    allWarnings.push(`Session configured for ${maxParticipants} participants. Performance may degrade with > 50 participants`);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Generate a secure session name with timestamp
 */
export function generateSecureSessionName(prefix: string = 'fitness'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Check if browser is supported
 */
export function checkBrowserSupport(): {
  isSupported: boolean;
  browser: string;
  version: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let version = '0';
  let isSupported = false;

  // Detect Chrome
  if (/Chrome\/(\d+)/.test(userAgent)) {
    browser = 'Chrome';
    version = RegExp.$1;
    isSupported = parseInt(version) >= 88;
    if (parseInt(version) < 100) {
      warnings.push('Consider updating Chrome to version 100+ for best performance');
    }
  }
  // Detect Firefox
  else if (/Firefox\/(\d+)/.test(userAgent)) {
    browser = 'Firefox';
    version = RegExp.$1;
    isSupported = parseInt(version) >= 78;
    if (parseInt(version) < 100) {
      warnings.push('Consider updating Firefox to version 100+ for best performance');
    }
  }
  // Detect Safari
  else if (/Version\/(\d+).*Safari/.test(userAgent)) {
    browser = 'Safari';
    version = RegExp.$1;
    isSupported = parseInt(version) >= 13;
    if (parseInt(version) < 15) {
      warnings.push('Consider updating Safari to version 15+ for best performance');
    }
  }
  // Detect Edge
  else if (/Edg\/(\d+)/.test(userAgent)) {
    browser = 'Edge';
    version = RegExp.$1;
    isSupported = parseInt(version) >= 88;
    if (parseInt(version) < 100) {
      warnings.push('Consider updating Edge to version 100+ for best performance');
    }
  }

  if (!isSupported) {
    warnings.push(`${browser} ${version} is not supported. Please use Chrome 88+, Firefox 78+, Safari 13+, or Edge 88+`);
  }

  return {
    isSupported,
    browser,
    version,
    warnings
  };
}