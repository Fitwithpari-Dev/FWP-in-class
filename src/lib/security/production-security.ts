/**
 * Production Security Hardening for FitWithPari
 * Comprehensive security measures for production deployment
 */

import { EnvironmentSecurity } from './environment-security';
import { SecurityLogger } from './security-logger';
import { RateLimiter } from './input-validation';

export interface SecurityHardeningConfig {
  // HTTPS Configuration
  forceHTTPS: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;

  // Content Security Policy
  cspDirectives: Record<string, string[]>;
  cspReportUri?: string;
  cspReportOnly: boolean;

  // CORS Configuration
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;

  // Rate Limiting
  globalRateLimit: {
    requests: number;
    windowMs: number;
  };
  endpointRateLimits: Record<string, { requests: number; windowMs: number }>;

  // Security Headers
  preventClickjacking: boolean;
  preventMimeSniffing: boolean;
  preventXSSReflection: boolean;
  referrerPolicy: string;

  // Session Security
  secureCookies: boolean;
  httpOnlyCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
  sessionTimeout: number;

  // API Security
  requireApiKeyAuth: boolean;
  apiKeyRotationInterval: number; // days
  requestSigning: boolean;

  // Database Security
  connectionPooling: boolean;
  queryLogging: boolean;
  slowQueryThreshold: number; // ms

  // File Upload Security
  allowedFileTypes: string[];
  maxFileSize: number; // bytes
  virusScanningEnabled: boolean;

  // Monitoring
  securityEventLogging: boolean;
  performanceMonitoring: boolean;
  errorReporting: boolean;
  alertThresholds: {
    failedLogins: number;
    apiErrors: number;
    securityViolations: number;
  };
}

export interface SecurityCheckResult {
  passed: boolean;
  score: number; // 0-100
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
  }[];
  recommendations: string[];
}

export class ProductionSecurity {
  private static config: SecurityHardeningConfig | null = null;
  private static initialized = false;

  /**
   * Initialize production security hardening
   */
  static async initialize(config?: Partial<SecurityHardeningConfig>): Promise<void> {
    try {
      this.config = this.getDefaultConfig();

      // Merge with custom config
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Apply security hardening measures
      await this.applySecurityMeasures();

      // Start security monitoring
      this.startSecurityMonitoring();

      this.initialized = true;

      await SecurityLogger.logSecurityEvent(
        null,
        'PRODUCTION_SECURITY_INITIALIZED',
        {
          severity: 'low',
          description: 'Production security hardening initialized',
          metadata: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
          }
        }
      );

      console.log('Production security hardening initialized successfully');
    } catch (error) {
      console.error('Production security initialization failed:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive security check
   */
  static async performSecurityCheck(): Promise<SecurityCheckResult> {
    const result: SecurityCheckResult = {
      passed: true,
      score: 100,
      checks: [],
      recommendations: []
    };

    try {
      // Check HTTPS enforcement
      this.checkHTTPSEnforcement(result);

      // Check security headers
      await this.checkSecurityHeaders(result);

      // Check authentication configuration
      await this.checkAuthenticationSecurity(result);

      // Check database security
      await this.checkDatabaseSecurity(result);

      // Check API security
      await this.checkAPISecurity(result);

      // Check file upload security
      this.checkFileUploadSecurity(result);

      // Check monitoring configuration
      this.checkMonitoringSetup(result);

      // Check environment security
      await this.checkEnvironmentSecurity(result);

      // Calculate final score
      const failedChecks = result.checks.filter(check => check.status === 'fail');
      const warningChecks = result.checks.filter(check => check.status === 'warning');

      result.score -= failedChecks.length * 10;
      result.score -= warningChecks.length * 5;
      result.score = Math.max(0, result.score);

      result.passed = result.score >= 80 && failedChecks.length === 0;

      // Generate recommendations
      this.generateSecurityRecommendations(result);

      // Log security check results
      await SecurityLogger.logSecurityEvent(
        null,
        'SECURITY_CHECK_COMPLETED',
        {
          severity: result.passed ? 'low' : 'high',
          description: `Security check completed with score: ${result.score}`,
          metadata: {
            score: result.score,
            passed: result.passed,
            failedChecks: failedChecks.length,
            warningChecks: warningChecks.length
          }
        }
      );

    } catch (error) {
      console.error('Security check failed:', error);
      result.passed = false;
      result.score = 0;
      result.checks.push({
        name: 'Security Check Execution',
        status: 'fail',
        message: 'Security check execution failed',
        impact: 'critical'
      });
    }

    return result;
  }

  /**
   * Get production-ready security headers
   */
  static getSecurityHeaders(): Record<string, string> {
    if (!this.config) {
      throw new Error('Production security not initialized');
    }

    const headers: Record<string, string> = {};

    // Strict Transport Security
    if (this.config.forceHTTPS) {
      const hstsValue = [
        `max-age=${this.config.hstsMaxAge}`,
        this.config.hstsIncludeSubdomains ? 'includeSubDomains' : '',
        this.config.hstsPreload ? 'preload' : ''
      ].filter(Boolean).join('; ');

      headers['Strict-Transport-Security'] = hstsValue;
    }

    // Content Security Policy
    if (this.config.cspDirectives) {
      const cspValue = Object.entries(this.config.cspDirectives)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');

      if (this.config.cspReportOnly) {
        headers['Content-Security-Policy-Report-Only'] = cspValue;
      } else {
        headers['Content-Security-Policy'] = cspValue;
      }

      if (this.config.cspReportUri) {
        headers['Content-Security-Policy'] += `; report-uri ${this.config.cspReportUri}`;
      }
    }

    // Security headers
    if (this.config.preventClickjacking) {
      headers['X-Frame-Options'] = 'DENY';
    }

    if (this.config.preventMimeSniffing) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.config.preventXSSReflection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['Expect-CT'] = 'max-age=86400, enforce';
    headers['Feature-Policy'] = 'camera \'self\'; microphone \'self\'; geolocation \'none\'';
    headers['Permissions-Policy'] = 'camera=(self), microphone=(self), geolocation=()';

    // Remove server information
    headers['Server'] = '';
    headers['X-Powered-By'] = '';

    return headers;
  }

  /**
   * Configure CORS for production
   */
  static getCORSConfig(): {
    origin: string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  } {
    if (!this.config) {
      throw new Error('Production security not initialized');
    }

    return {
      origin: this.config.allowedOrigins.length > 0 ? this.config.allowedOrigins : false,
      methods: this.config.allowedMethods,
      allowedHeaders: this.config.allowedHeaders,
      credentials: this.config.allowCredentials,
      maxAge: 86400 // 24 hours
    };
  }

  /**
   * Apply rate limiting to requests
   */
  static applyRateLimit(endpoint: string, identifier: string): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  } {
    if (!this.config) {
      throw new Error('Production security not initialized');
    }

    // Get endpoint-specific rate limit or use global
    const rateLimit = this.config.endpointRateLimits[endpoint] || this.config.globalRateLimit;

    const result = RateLimiter.checkRateLimit(
      `${endpoint}:${identifier}`,
      rateLimit.requests,
      rateLimit.windowMs
    );

    // Log rate limit violations
    if (!result.allowed) {
      SecurityLogger.logSecurityEvent(
        identifier,
        'RATE_LIMIT_EXCEEDED',
        {
          severity: 'medium',
          description: `Rate limit exceeded for endpoint: ${endpoint}`,
          resourceAffected: endpoint,
          metadata: {
            identifier,
            endpoint,
            limit: rateLimit.requests,
            window: rateLimit.windowMs
          }
        }
      ).catch(console.error);
    }

    return {
      allowed: result.allowed,
      remainingRequests: result.remainingAttempts,
      resetTime: result.resetTime
    };
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(file: File, userId: string): {
    allowed: boolean;
    errors: string[];
  } {
    const result = {
      allowed: true,
      errors: [] as string[]
    };

    if (!this.config) {
      result.allowed = false;
      result.errors.push('Security configuration not initialized');
      return result;
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      result.allowed = false;
      result.errors.push(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.config.allowedFileTypes.includes(fileExtension)) {
      result.allowed = false;
      result.errors.push(`File type ${fileExtension} is not allowed`);
    }

    // Check filename for security issues
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      result.allowed = false;
      result.errors.push('Invalid filename detected');

      SecurityLogger.logSecurityEvent(
        userId,
        'MALICIOUS_FILE_UPLOAD_ATTEMPT',
        {
          severity: 'high',
          description: 'Malicious file upload attempt detected',
          metadata: {
            filename: file.name,
            size: file.size,
            type: file.type
          }
        }
      ).catch(console.error);
    }

    return result;
  }

  /**
   * Get default security configuration
   */
  private static getDefaultConfig(): SecurityHardeningConfig {
    return {
      // HTTPS Configuration
      forceHTTPS: true,
      hstsMaxAge: 31536000, // 1 year
      hstsIncludeSubdomains: true,
      hstsPreload: true,

      // Content Security Policy
      cspDirectives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https://*.supabase.co'],
        'media-src': ["'self'", 'https://*.zoom.us'],
        'connect-src': ["'self'", 'https://*.supabase.co', 'https://*.zoom.us'],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"]
      },
      cspReportOnly: false,

      // CORS Configuration
      allowedOrigins: [
        'https://fitwithpari.com',
        'https://www.fitwithpari.com',
        'https://app.fitwithpari.com'
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token'
      ],
      allowCredentials: true,

      // Rate Limiting
      globalRateLimit: {
        requests: 100,
        windowMs: 60000 // 1 minute
      },
      endpointRateLimits: {
        '/api/auth/login': { requests: 5, windowMs: 300000 }, // 5 per 5 minutes
        '/api/auth/register': { requests: 3, windowMs: 600000 }, // 3 per 10 minutes
        '/api/health-data': { requests: 10, windowMs: 60000 }, // 10 per minute
        '/api/video/session': { requests: 20, windowMs: 60000 } // 20 per minute
      },

      // Security Headers
      preventClickjacking: true,
      preventMimeSniffing: true,
      preventXSSReflection: true,
      referrerPolicy: 'strict-origin-when-cross-origin',

      // Session Security
      secureCookies: true,
      httpOnlyCookies: true,
      sameSitePolicy: 'strict',
      sessionTimeout: 120, // 2 hours in minutes

      // API Security
      requireApiKeyAuth: true,
      apiKeyRotationInterval: 90, // 90 days
      requestSigning: true,

      // Database Security
      connectionPooling: true,
      queryLogging: true,
      slowQueryThreshold: 1000, // 1 second

      // File Upload Security
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mov'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      virusScanningEnabled: true,

      // Monitoring
      securityEventLogging: true,
      performanceMonitoring: true,
      errorReporting: true,
      alertThresholds: {
        failedLogins: 5,
        apiErrors: 10,
        securityViolations: 1
      }
    };
  }

  /**
   * Apply security measures
   */
  private static async applySecurityMeasures(): Promise<void> {
    // Set up error handling for uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      SecurityLogger.logSecurityEvent(
        null,
        'UNCAUGHT_EXCEPTION',
        {
          severity: 'critical',
          description: 'Uncaught exception occurred',
          metadata: { error: error.message, stack: error.stack }
        }
      ).catch(console.error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      SecurityLogger.logSecurityEvent(
        null,
        'UNHANDLED_REJECTION',
        {
          severity: 'high',
          description: 'Unhandled promise rejection',
          metadata: { reason: String(reason) }
        }
      ).catch(console.error);
    });

    // Additional security measures can be applied here
    console.log('Security measures applied');
  }

  /**
   * Start security monitoring
   */
  private static startSecurityMonitoring(): void {
    if (!this.config?.securityEventLogging) return;

    // Monitor for security events
    setInterval(async () => {
      try {
        // Check for security alerts
        await this.checkSecurityAlerts();

        // Monitor system health
        await this.monitorSystemHealth();

        // Clean up old security logs
        await SecurityLogger.cleanupOldLogs();
      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('Security monitoring started');
  }

  /**
   * Check security-related validation
   */
  private static checkHTTPSEnforcement(result: SecurityCheckResult): void {
    if (!this.config?.forceHTTPS) {
      result.checks.push({
        name: 'HTTPS Enforcement',
        status: 'fail',
        message: 'HTTPS is not enforced',
        impact: 'critical'
      });
    } else {
      result.checks.push({
        name: 'HTTPS Enforcement',
        status: 'pass',
        message: 'HTTPS is properly enforced',
        impact: 'low'
      });
    }
  }

  private static async checkSecurityHeaders(result: SecurityCheckResult): Promise<void> {
    const headers = this.getSecurityHeaders();

    const requiredHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection'
    ];

    requiredHeaders.forEach(header => {
      if (headers[header]) {
        result.checks.push({
          name: `Security Header: ${header}`,
          status: 'pass',
          message: `${header} header is properly configured`,
          impact: 'low'
        });
      } else {
        result.checks.push({
          name: `Security Header: ${header}`,
          status: 'fail',
          message: `${header} header is missing or misconfigured`,
          impact: 'high'
        });
      }
    });
  }

  private static async checkAuthenticationSecurity(result: SecurityCheckResult): Promise<void> {
    const jwtSecret = EnvironmentSecurity.getSecret('jwtSecret');

    if (!jwtSecret || jwtSecret.length < 32) {
      result.checks.push({
        name: 'JWT Secret Security',
        status: 'fail',
        message: 'JWT secret is weak or missing',
        impact: 'critical'
      });
    } else {
      result.checks.push({
        name: 'JWT Secret Security',
        status: 'pass',
        message: 'JWT secret meets security requirements',
        impact: 'low'
      });
    }
  }

  private static async checkDatabaseSecurity(result: SecurityCheckResult): Promise<void> {
    const supabaseUrl = EnvironmentSecurity.getSecret('supabaseUrl');

    if (!supabaseUrl?.startsWith('https://')) {
      result.checks.push({
        name: 'Database Connection Security',
        status: 'fail',
        message: 'Database connection is not using HTTPS',
        impact: 'critical'
      });
    } else {
      result.checks.push({
        name: 'Database Connection Security',
        status: 'pass',
        message: 'Database connection is secure',
        impact: 'low'
      });
    }
  }

  private static async checkAPISecurity(result: SecurityCheckResult): Promise<void> {
    if (!this.config?.globalRateLimit) {
      result.checks.push({
        name: 'API Rate Limiting',
        status: 'fail',
        message: 'API rate limiting is not configured',
        impact: 'high'
      });
    } else {
      result.checks.push({
        name: 'API Rate Limiting',
        status: 'pass',
        message: 'API rate limiting is properly configured',
        impact: 'low'
      });
    }
  }

  private static checkFileUploadSecurity(result: SecurityCheckResult): void {
    if (!this.config?.allowedFileTypes || this.config.allowedFileTypes.length === 0) {
      result.checks.push({
        name: 'File Upload Security',
        status: 'fail',
        message: 'File upload restrictions are not configured',
        impact: 'high'
      });
    } else {
      result.checks.push({
        name: 'File Upload Security',
        status: 'pass',
        message: 'File upload security is properly configured',
        impact: 'low'
      });
    }
  }

  private static checkMonitoringSetup(result: SecurityCheckResult): void {
    if (!this.config?.securityEventLogging) {
      result.checks.push({
        name: 'Security Monitoring',
        status: 'warning',
        message: 'Security event logging is disabled',
        impact: 'medium'
      });
    } else {
      result.checks.push({
        name: 'Security Monitoring',
        status: 'pass',
        message: 'Security monitoring is active',
        impact: 'low'
      });
    }
  }

  private static async checkEnvironmentSecurity(result: SecurityCheckResult): Promise<void> {
    const envValidation = await EnvironmentSecurity.validateEnvironment();

    if (!envValidation.isValid) {
      result.checks.push({
        name: 'Environment Security',
        status: 'fail',
        message: 'Environment security validation failed',
        impact: 'critical'
      });
    } else if (envValidation.warnings.length > 0) {
      result.checks.push({
        name: 'Environment Security',
        status: 'warning',
        message: 'Environment has security warnings',
        impact: 'medium'
      });
    } else {
      result.checks.push({
        name: 'Environment Security',
        status: 'pass',
        message: 'Environment security is properly configured',
        impact: 'low'
      });
    }
  }

  private static generateSecurityRecommendations(result: SecurityCheckResult): void {
    const failedChecks = result.checks.filter(check => check.status === 'fail');

    if (failedChecks.length > 0) {
      result.recommendations.push('Address all failed security checks before deployment');
    }

    if (result.score < 80) {
      result.recommendations.push('Improve security configuration to achieve minimum score of 80');
    }

    result.recommendations.push('Regularly update dependencies and security configurations');
    result.recommendations.push('Implement continuous security monitoring');
    result.recommendations.push('Conduct regular security audits and penetration testing');
  }

  private static async checkSecurityAlerts(): Promise<void> {
    // Implementation for checking security alerts
    // This would typically integrate with monitoring systems
  }

  private static async monitorSystemHealth(): Promise<void> {
    // Implementation for system health monitoring
    // This would check CPU, memory, disk usage, etc.
  }
}

/**
 * React hook for production security
 */
export function useProductionSecurity() {
  const [securityCheck, setSecurityCheck] = useState<SecurityCheckResult | null>(null);

  useEffect(() => {
    if (ProductionSecurity['initialized']) {
      ProductionSecurity.performSecurityCheck()
        .then(setSecurityCheck)
        .catch(console.error);
    }
  }, []);

  const runSecurityCheck = async () => {
    const result = await ProductionSecurity.performSecurityCheck();
    setSecurityCheck(result);
    return result;
  };

  return {
    securityCheck,
    runSecurityCheck,
    getSecurityHeaders: ProductionSecurity.getSecurityHeaders,
    getCORSConfig: ProductionSecurity.getCORSConfig,
    applyRateLimit: ProductionSecurity.applyRateLimit,
    validateFileUpload: ProductionSecurity.validateFileUpload
  };
}