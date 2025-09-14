/**
 * Environment Security Configuration for FitWithPari
 * Secure environment variable handling, secrets management, and configuration validation
 */

import { SecurityLogger } from './security-logger';

export interface SecurityConfig {
  // Environment settings
  environment: 'development' | 'staging' | 'production';
  debugMode: boolean;

  // API Security
  apiRateLimit: {
    requests: number;
    windowMs: number;
  };

  // Session Security
  sessionTimeout: number; // minutes
  tokenRefreshThreshold: number; // minutes
  maxConcurrentSessions: number;

  // Data Security
  encryptionEnabled: boolean;
  dataRetentionDays: number;
  backupEncryption: boolean;

  // Video Security
  maxSessionDuration: number; // minutes
  maxParticipants: number;
  recordingRetentionDays: number;

  // HIPAA Compliance
  auditLogRetention: number; // days
  dataMinimization: boolean;
  consentRequired: boolean;

  // Security Headers
  contentSecurityPolicy: string;
  strictTransportSecurity: boolean;
  frameOptions: string;

  // Monitoring
  securityAlerts: boolean;
  anomalyDetection: boolean;
  intrusionDetection: boolean;
}

export interface EnvironmentSecrets {
  // Database
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;

  // Video Services
  zoomSdkKey?: string;
  zoomSdkSecret?: string;

  // Third-party Integrations
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;

  // Email Services
  smtpPassword?: string;
  sendgridApiKey?: string;

  // Storage
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;

  // Security
  jwtSecret?: string;
  encryptionKey?: string;
  hashingSalt?: string;

  // Monitoring
  sentryDsn?: string;
  datadogApiKey?: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number; // 0-100
  recommendations: string[];
}

export class EnvironmentSecurity {
  private static config: SecurityConfig | null = null;
  private static secrets: EnvironmentSecrets = {};
  private static validationCache: Map<string, SecurityValidationResult> = new Map();

  /**
   * Initialize environment security with validation
   */
  static async initialize(): Promise<SecurityValidationResult> {
    try {
      // Load configuration
      this.config = this.loadSecurityConfig();

      // Load and validate secrets
      this.secrets = this.loadSecrets();

      // Validate environment security
      const validation = await this.validateEnvironment();

      // Log security initialization
      await SecurityLogger.logSecurityEvent(
        null,
        validation.securityScore >= 80 ? 'SECURITY_INITIALIZED' : 'SECURITY_WARNING',
        {
          severity: validation.securityScore >= 80 ? 'low' : 'medium',
          description: `Environment security initialized with score: ${validation.securityScore}`,
          metadata: {
            environment: this.config.environment,
            errors: validation.errors.length,
            warnings: validation.warnings.length
          }
        }
      );

      return validation;
    } catch (error) {
      console.error('Environment security initialization failed:', error);

      await SecurityLogger.logSecurityEvent(
        null,
        'SECURITY_INITIALIZATION_FAILED',
        {
          severity: 'critical',
          description: 'Environment security initialization failed',
          metadata: { error: error.message }
        }
      );

      throw error;
    }
  }

  /**
   * Get security configuration
   */
  static getConfig(): SecurityConfig {
    if (!this.config) {
      throw new Error('Environment security not initialized');
    }
    return this.config;
  }

  /**
   * Get secret value securely
   */
  static getSecret(key: keyof EnvironmentSecrets): string | undefined {
    const value = this.secrets[key];

    if (!value) {
      console.warn(`Secret '${key}' not found or empty`);
      return undefined;
    }

    // Log secret access for audit (without logging the value)
    SecurityLogger.logSecurityEvent(
      null,
      'SECRET_ACCESSED',
      {
        severity: 'low',
        description: `Environment secret accessed: ${key}`,
        metadata: { secretKey: key, hasValue: !!value }
      }
    ).catch(console.error);

    return value;
  }

  /**
   * Validate environment security configuration
   */
  static async validateEnvironment(): Promise<SecurityValidationResult> {
    const cacheKey = `validation_${Date.now()}`;

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityScore: 100,
      recommendations: []
    };

    // Validate required secrets for production
    if (this.config?.environment === 'production') {
      const requiredSecrets: (keyof EnvironmentSecrets)[] = [
        'supabaseUrl',
        'supabaseAnonKey',
        'jwtSecret',
        'encryptionKey'
      ];

      for (const secret of requiredSecrets) {
        if (!this.secrets[secret]) {
          result.errors.push(`Missing required production secret: ${secret}`);
          result.securityScore -= 20;
        }
      }
    }

    // Validate JWT secret strength
    const jwtSecret = this.secrets.jwtSecret;
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        result.warnings.push('JWT secret should be at least 32 characters long');
        result.securityScore -= 10;
      }

      if (!/[A-Z]/.test(jwtSecret) || !/[a-z]/.test(jwtSecret) || !/[0-9]/.test(jwtSecret)) {
        result.warnings.push('JWT secret should contain uppercase, lowercase, and numeric characters');
        result.securityScore -= 5;
      }
    } else {
      result.errors.push('JWT secret is required');
      result.securityScore -= 25;
    }

    // Validate encryption key
    const encryptionKey = this.secrets.encryptionKey;
    if (encryptionKey && encryptionKey.length < 32) {
      result.warnings.push('Encryption key should be at least 32 characters long');
      result.securityScore -= 10;
    }

    // Validate Supabase configuration
    if (!this.secrets.supabaseUrl || !this.secrets.supabaseUrl.startsWith('https://')) {
      result.errors.push('Supabase URL must be HTTPS');
      result.securityScore -= 15;
    }

    // Validate security configuration
    if (this.config) {
      // Check session timeout
      if (this.config.sessionTimeout > 480) { // 8 hours
        result.warnings.push('Session timeout is very long, consider reducing for better security');
        result.securityScore -= 5;
      }

      // Check rate limiting
      if (this.config.apiRateLimit.requests > 1000) {
        result.warnings.push('API rate limit is very high, consider reducing to prevent abuse');
        result.securityScore -= 5;
      }

      // Check debug mode in production
      if (this.config.environment === 'production' && this.config.debugMode) {
        result.errors.push('Debug mode should be disabled in production');
        result.securityScore -= 30;
      }
    }

    // Generate recommendations
    if (result.securityScore < 80) {
      result.recommendations.push('Review and strengthen environment security configuration');
    }

    if (result.errors.length > 0) {
      result.recommendations.push('Fix critical security errors before deployment');
      result.isValid = false;
    }

    // Cache result
    this.validationCache.set(cacheKey, result);
    setTimeout(() => this.validationCache.delete(cacheKey), 60000); // Cache for 1 minute

    return result;
  }

  /**
   * Generate secure Content Security Policy
   */
  static generateCSP(additionalSources: Record<string, string[]> = {}): string {
    const baseCSP = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for React in development
        "'unsafe-eval'", // Required for React in development
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https://*.supabase.co',
        'https://*.amazonaws.com'
      ],
      'media-src': [
        "'self'",
        'https://*.zoom.us',
        'https://*.amazonaws.com'
      ],
      'connect-src': [
        "'self'",
        'https://*.supabase.co',
        'https://api.stripe.com',
        'https://*.zoom.us'
      ],
      'frame-src': [
        "'self'",
        'https://*.zoom.us'
      ]
    };

    // Merge with additional sources
    Object.entries(additionalSources).forEach(([directive, sources]) => {
      if (baseCSP[directive as keyof typeof baseCSP]) {
        baseCSP[directive as keyof typeof baseCSP].push(...sources);
      } else {
        (baseCSP as any)[directive] = sources;
      }
    });

    // Convert to CSP string
    return Object.entries(baseCSP)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  /**
   * Set security headers for HTTP responses
   */
  static getSecurityHeaders(): Record<string, string> {
    const config = this.getConfig();

    return {
      // Content Security Policy
      'Content-Security-Policy': config.contentSecurityPolicy || this.generateCSP(),

      // Strict Transport Security
      'Strict-Transport-Security': config.strictTransportSecurity
        ? 'max-age=31536000; includeSubDomains; preload'
        : 'max-age=0',

      // Frame Options
      'X-Frame-Options': config.frameOptions || 'DENY',

      // Content Type Options
      'X-Content-Type-Options': 'nosniff',

      // XSS Protection
      'X-XSS-Protection': '1; mode=block',

      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Permissions Policy
      'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=()',

      // Remove server information
      'Server': '',
      'X-Powered-By': ''
    };
  }

  /**
   * Rotate secrets (for production secret management)
   */
  static async rotateSecret(
    secretKey: keyof EnvironmentSecrets,
    newValue: string
  ): Promise<void> {
    try {
      // Validate new secret value
      if (!newValue || newValue.length < 16) {
        throw new Error('New secret value must be at least 16 characters long');
      }

      const oldValue = this.secrets[secretKey];

      // Update secret
      this.secrets[secretKey] = newValue;

      // Log secret rotation
      await SecurityLogger.logSecurityEvent(
        null,
        'SECRET_ROTATED',
        {
          severity: 'low',
          description: `Environment secret rotated: ${secretKey}`,
          metadata: {
            secretKey,
            rotatedAt: new Date().toISOString(),
            hasOldValue: !!oldValue
          }
        }
      );

      console.log(`Secret '${secretKey}' rotated successfully`);
    } catch (error) {
      console.error('Secret rotation failed:', error);

      await SecurityLogger.logSecurityEvent(
        null,
        'SECRET_ROTATION_FAILED',
        {
          severity: 'high',
          description: `Secret rotation failed: ${secretKey}`,
          metadata: { error: error.message }
        }
      );

      throw error;
    }
  }

  /**
   * Check for environment security threats
   */
  static async performSecurityScan(): Promise<{
    threats: string[];
    vulnerabilities: string[];
    recommendations: string[];
  }> {
    const threats: string[] = [];
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Check for common security issues
    if (this.config?.debugMode && this.config.environment === 'production') {
      threats.push('Debug mode enabled in production');
    }

    if (!this.secrets.jwtSecret || this.secrets.jwtSecret === 'your-secret-key') {
      vulnerabilities.push('Weak or default JWT secret');
      recommendations.push('Generate a strong, unique JWT secret');
    }

    if (!this.config?.encryptionEnabled) {
      vulnerabilities.push('Data encryption disabled');
      recommendations.push('Enable data encryption for sensitive information');
    }

    // Check for exposed secrets in client-side code
    const clientSideSecrets = ['supabaseAnonKey', 'stripePublishableKey'];
    clientSideSecrets.forEach(secret => {
      if (this.secrets[secret as keyof EnvironmentSecrets]?.includes('sk_') ||
          this.secrets[secret as keyof EnvironmentSecrets]?.includes('secret')) {
        vulnerabilities.push(`Potential secret key exposed in client: ${secret}`);
      }
    });

    // Log security scan
    await SecurityLogger.logSecurityEvent(
      null,
      'SECURITY_SCAN_COMPLETED',
      {
        severity: threats.length > 0 ? 'high' : vulnerabilities.length > 0 ? 'medium' : 'low',
        description: 'Environment security scan completed',
        metadata: {
          threats: threats.length,
          vulnerabilities: vulnerabilities.length,
          recommendations: recommendations.length
        }
      }
    );

    return { threats, vulnerabilities, recommendations };
  }

  /**
   * Load security configuration
   */
  private static loadSecurityConfig(): SecurityConfig {
    return {
      environment: (import.meta.env.VITE_APP_ENVIRONMENT || 'development') as any,
      debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',

      apiRateLimit: {
        requests: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS || '100'),
        windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW || '60000')
      },

      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '120'),
      tokenRefreshThreshold: parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD || '5'),
      maxConcurrentSessions: parseInt(import.meta.env.VITE_MAX_CONCURRENT_SESSIONS || '3'),

      encryptionEnabled: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true',
      dataRetentionDays: parseInt(import.meta.env.VITE_DATA_RETENTION_DAYS || '365'),
      backupEncryption: import.meta.env.VITE_BACKUP_ENCRYPTION === 'true',

      maxSessionDuration: parseInt(import.meta.env.VITE_MAX_SESSION_DURATION || '120'),
      maxParticipants: parseInt(import.meta.env.VITE_MAX_PARTICIPANTS || '50'),
      recordingRetentionDays: parseInt(import.meta.env.VITE_RECORDING_RETENTION_DAYS || '90'),

      auditLogRetention: parseInt(import.meta.env.VITE_AUDIT_LOG_RETENTION || '2555'),
      dataMinimization: import.meta.env.VITE_DATA_MINIMIZATION === 'true',
      consentRequired: import.meta.env.VITE_CONSENT_REQUIRED !== 'false',

      contentSecurityPolicy: import.meta.env.VITE_CSP || '',
      strictTransportSecurity: import.meta.env.VITE_HSTS !== 'false',
      frameOptions: import.meta.env.VITE_FRAME_OPTIONS || 'DENY',

      securityAlerts: import.meta.env.VITE_SECURITY_ALERTS !== 'false',
      anomalyDetection: import.meta.env.VITE_ANOMALY_DETECTION === 'true',
      intrusionDetection: import.meta.env.VITE_INTRUSION_DETECTION === 'true'
    };
  }

  /**
   * Load secrets from environment variables
   */
  private static loadSecrets(): EnvironmentSecrets {
    return {
      // Database
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      supabaseServiceKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,

      // Video Services
      zoomSdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
      zoomSdkSecret: import.meta.env.ZOOM_SDK_SECRET,

      // Payment
      stripeSecretKey: import.meta.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: import.meta.env.STRIPE_WEBHOOK_SECRET,

      // Email
      smtpPassword: import.meta.env.SMTP_PASSWORD,
      sendgridApiKey: import.meta.env.SENDGRID_API_KEY,

      // Storage
      awsAccessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,

      // Security
      jwtSecret: import.meta.env.JWT_SECRET,
      encryptionKey: import.meta.env.ENCRYPTION_KEY,
      hashingSalt: import.meta.env.HASHING_SALT,

      // Monitoring
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
      datadogApiKey: import.meta.env.DATADOG_API_KEY
    };
  }
}

/**
 * React hook for environment security
 */
export function useEnvironmentSecurity() {
  const [securityStatus, setSecurityStatus] = useState<SecurityValidationResult | null>(null);

  useEffect(() => {
    EnvironmentSecurity.validateEnvironment()
      .then(setSecurityStatus)
      .catch(console.error);
  }, []);

  const performSecurityScan = async () => {
    return await EnvironmentSecurity.performSecurityScan();
  };

  return {
    securityStatus,
    config: EnvironmentSecurity.getConfig(),
    getSecret: EnvironmentSecurity.getSecret,
    performSecurityScan,
    getSecurityHeaders: EnvironmentSecurity.getSecurityHeaders
  };
}