/**
 * Input Validation and Sanitization Utilities for FitWithPari
 * Comprehensive security utilities to prevent XSS, SQL injection, and other attacks
 */

import DOMPurify from 'dompurify';
import { SecurityLogger } from './security-logger';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean | string;
  sanitizer?: (value: string) => string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
  securityThreats?: string[];
}

export interface FieldValidationRules {
  [fieldName: string]: ValidationRule;
}

export class InputValidator {
  // Common patterns for validation
  private static readonly PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[\d\s\-\(\)]{10,}$/,
    name: /^[a-zA-Z\s'-]{2,50}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    url: /^https?:\/\/.+/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    numeric: /^\d+$/,
    decimal: /^\d+(\.\d+)?$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  };

  // Dangerous patterns that indicate potential security threats
  private static readonly THREAT_PATTERNS = {
    sqlInjection: [
      /('\s*(or|and)\s*')|('.*'.*=.*')/i,
      /(union|select|insert|update|delete|drop|create|alter)\s+/i,
      /(\b(exec|execute|sp_)\b)/i
    ],
    xss: [
      /<script[^>]*>[\s\S]*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i
    ],
    pathTraversal: [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i
    ],
    commandInjection: [
      /[;&|`$()]/,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat)\b/i
    ]
  };

  /**
   * Validate and sanitize a single field
   */
  static validateField(
    fieldName: string,
    value: any,
    rules: ValidationRule,
    userId?: string
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      securityThreats: []
    };

    // Convert value to string for validation
    const stringValue = value?.toString() || '';

    try {
      // Check for security threats
      const threats = this.detectSecurityThreats(stringValue);
      if (threats.length > 0) {
        result.securityThreats = threats;
        result.isValid = false;
        result.errors.push('Input contains potential security threats');

        // Log security threat
        SecurityLogger.logSecurityEvent(
          userId || null,
          'MALICIOUS_INPUT_DETECTED',
          {
            severity: 'high',
            description: `Malicious input detected in field: ${fieldName}`,
            resourceAffected: fieldName,
            metadata: {
              threats,
              input: stringValue.substring(0, 100) // Log first 100 chars only
            }
          }
        ).catch(console.error);
      }

      // Required field validation
      if (rules.required && (!value || stringValue.trim() === '')) {
        result.errors.push(`${fieldName} is required`);
        result.isValid = false;
      }

      // Skip further validation if field is empty and not required
      if (!stringValue && !rules.required) {
        result.sanitizedValue = '';
        return result;
      }

      // Length validation
      if (rules.minLength && stringValue.length < rules.minLength) {
        result.errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
        result.isValid = false;
      }

      if (rules.maxLength && stringValue.length > rules.maxLength) {
        result.errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
        result.isValid = false;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(stringValue)) {
        result.errors.push(`${fieldName} format is invalid`);
        result.isValid = false;
      }

      // Custom validation
      if (rules.customValidator) {
        const customResult = rules.customValidator(value);
        if (customResult !== true) {
          result.errors.push(typeof customResult === 'string' ? customResult : `${fieldName} is invalid`);
          result.isValid = false;
        }
      }

      // Sanitize value
      let sanitizedValue = stringValue;
      if (rules.sanitizer) {
        sanitizedValue = rules.sanitizer(sanitizedValue);
      } else {
        sanitizedValue = this.sanitizeString(sanitizedValue);
      }

      result.sanitizedValue = sanitizedValue;
    } catch (error) {
      console.error('Field validation error:', error);
      result.errors.push(`Validation error for ${fieldName}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate multiple fields according to rules
   */
  static validateForm(
    data: Record<string, any>,
    rules: FieldValidationRules,
    userId?: string
  ): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedData: Record<string, any>;
    securityThreats: string[];
  } {
    const result = {
      isValid: true,
      errors: {} as Record<string, string[]>,
      sanitizedData: {} as Record<string, any>,
      securityThreats: [] as string[]
    };

    Object.entries(rules).forEach(([fieldName, fieldRules]) => {
      const fieldResult = this.validateField(
        fieldName,
        data[fieldName],
        fieldRules,
        userId
      );

      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors[fieldName] = fieldResult.errors;
      }

      if (fieldResult.securityThreats && fieldResult.securityThreats.length > 0) {
        result.securityThreats.push(...fieldResult.securityThreats);
      }

      result.sanitizedData[fieldName] = fieldResult.sanitizedValue;
    });

    return result;
  }

  /**
   * Detect potential security threats in input
   */
  private static detectSecurityThreats(input: string): string[] {
    const threats: string[] = [];

    // Check SQL injection patterns
    this.THREAT_PATTERNS.sqlInjection.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('SQL_INJECTION');
      }
    });

    // Check XSS patterns
    this.THREAT_PATTERNS.xss.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('XSS');
      }
    });

    // Check path traversal patterns
    this.THREAT_PATTERNS.pathTraversal.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('PATH_TRAVERSAL');
      }
    });

    // Check command injection patterns
    this.THREAT_PATTERNS.commandInjection.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('COMMAND_INJECTION');
      }
    });

    return [...new Set(threats)]; // Remove duplicates
  }

  /**
   * Sanitize string input to prevent XSS
   */
  private static sanitizeString(input: string): string {
    // Use DOMPurify to sanitize HTML content
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed by default
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Additional sanitization for special characters
    return sanitized
      .replace(/[<>'"]/g, '') // Remove HTML-related characters
      .trim();
  }

  /**
   * Pre-defined validation rules for common fitness platform fields
   */
  static getFitnessFieldRules(): FieldValidationRules {
    return {
      // User profile fields
      fullName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: this.PATTERNS.name,
        sanitizer: (value) => this.sanitizeString(value)
      },

      email: {
        required: true,
        maxLength: 254,
        pattern: this.PATTERNS.email,
        sanitizer: (value) => value.toLowerCase().trim()
      },

      phone: {
        required: false,
        pattern: this.PATTERNS.phone,
        sanitizer: (value) => value.replace(/\D/g, '') // Keep only digits
      },

      password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        pattern: this.PATTERNS.password,
        customValidator: (value) => {
          const strength = this.calculatePasswordStrength(value);
          return strength >= 80 ? true : 'Password is too weak';
        }
      },

      dateOfBirth: {
        required: false,
        customValidator: (value) => {
          const date = new Date(value);
          const now = new Date();
          const age = now.getFullYear() - date.getFullYear();
          return age >= 13 && age <= 120 ? true : 'Invalid age';
        }
      },

      // Health-related fields (HIPAA sensitive)
      medicalConditions: {
        required: false,
        maxLength: 1000,
        sanitizer: (value) => this.sanitizeHealthData(value)
      },

      medications: {
        required: false,
        maxLength: 500,
        sanitizer: (value) => this.sanitizeHealthData(value)
      },

      injuryHistory: {
        required: false,
        maxLength: 1000,
        sanitizer: (value) => this.sanitizeHealthData(value)
      },

      emergencyContactName: {
        required: false,
        minLength: 2,
        maxLength: 100,
        pattern: this.PATTERNS.name,
        sanitizer: (value) => this.sanitizeString(value)
      },

      emergencyContactPhone: {
        required: false,
        pattern: this.PATTERNS.phone,
        sanitizer: (value) => value.replace(/\D/g, '')
      },

      // Fitness-related fields
      fitnessGoals: {
        required: false,
        maxLength: 500,
        sanitizer: (value) => this.sanitizeString(value)
      },

      workoutNotes: {
        required: false,
        maxLength: 1000,
        sanitizer: (value) => this.sanitizeString(value)
      },

      // Video session fields
      sessionTitle: {
        required: true,
        minLength: 3,
        maxLength: 100,
        sanitizer: (value) => this.sanitizeString(value)
      },

      sessionDescription: {
        required: false,
        maxLength: 500,
        sanitizer: (value) => this.sanitizeString(value)
      }
    };
  }

  /**
   * Validate health data with extra security measures
   */
  static validateHealthData(
    data: Record<string, any>,
    userId: string
  ): ValidationResult & { requiresConsent: boolean } {
    const healthRules: FieldValidationRules = {
      medicalConditions: this.getFitnessFieldRules().medicalConditions,
      medications: this.getFitnessFieldRules().medications,
      injuryHistory: this.getFitnessFieldRules().injuryHistory
    };

    const result = this.validateForm(data, healthRules, userId);

    // Check if health data requires additional consent
    const sensitiveFields = ['medicalConditions', 'medications', 'injuryHistory'];
    const hasSensitiveData = sensitiveFields.some(field =>
      data[field] && data[field].toString().trim() !== ''
    );

    return {
      ...result,
      requiresConsent: hasSensitiveData
    };
  }

  /**
   * Calculate password strength score
   */
  private static calculatePasswordStrength(password: string): number {
    let score = 0;

    // Length bonus
    score += Math.min(password.length * 4, 40);

    // Character variety bonuses
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    // Complexity bonuses
    if (password.length >= 12) score += 10;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) score += 15;

    // Common pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/(123|abc|qwe)/i.test(password)) score -= 20; // Sequential patterns
    if (/(password|123456|qwerty)/i.test(password)) score -= 30; // Common passwords

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Sanitize health data with extra care
   */
  private static sanitizeHealthData(input: string): string {
    // First apply general sanitization
    let sanitized = this.sanitizeString(input);

    // Remove any potential medical record numbers or IDs
    sanitized = sanitized.replace(/\b\d{6,}\b/g, '[REDACTED]');

    // Remove potential social security numbers
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');

    return sanitized;
  }
}

/**
 * Rate limiting utility to prevent abuse
 */
export class RateLimiter {
  private static attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  static checkRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // Clean up old records
    if (record && now - record.lastAttempt > windowMs) {
      this.attempts.delete(identifier);
    }

    const currentRecord = this.attempts.get(identifier) || { count: 0, lastAttempt: now };

    // Check if within rate limit
    if (currentRecord.count >= maxAttempts && now - currentRecord.lastAttempt < windowMs) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: currentRecord.lastAttempt + windowMs
      };
    }

    // Update attempt count
    if (now - currentRecord.lastAttempt < windowMs) {
      currentRecord.count++;
    } else {
      currentRecord.count = 1;
    }
    currentRecord.lastAttempt = now;

    this.attempts.set(identifier, currentRecord);

    return {
      allowed: true,
      remainingAttempts: maxAttempts - currentRecord.count,
      resetTime: currentRecord.lastAttempt + windowMs
    };
  }

  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * CSRF protection utility
 */
export class CSRFProtection {
  private static tokens: Map<string, { token: string; expires: number }> = new Map();

  static generateToken(sessionId: string): string {
    const token = btoa(`${sessionId}_${Date.now()}_${Math.random()}`);
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour

    this.tokens.set(sessionId, { token, expires });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    const record = this.tokens.get(sessionId);

    if (!record || record.token !== token || Date.now() > record.expires) {
      return false;
    }

    return true;
  }

  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, record] of this.tokens.entries()) {
      if (now > record.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * React hook for input validation
 */
export function useInputValidation() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateField = (fieldName: string, value: any, rules: ValidationRule, userId?: string) => {
    const result = InputValidator.validateField(fieldName, value, rules, userId);

    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? [] : result.errors
    }));

    return result;
  };

  const validateForm = (data: Record<string, any>, rules: FieldValidationRules, userId?: string) => {
    const result = InputValidator.validateForm(data, rules, userId);
    setValidationErrors(result.errors);
    return result;
  };

  const clearErrors = (fieldName?: string) => {
    if (fieldName) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: [] }));
    } else {
      setValidationErrors({});
    }
  };

  return {
    validationErrors,
    validateField,
    validateForm,
    clearErrors,
    getFitnessFieldRules: InputValidator.getFitnessFieldRules,
    validateHealthData: InputValidator.validateHealthData
  };
}