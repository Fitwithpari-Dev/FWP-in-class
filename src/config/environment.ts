/**
 * Environment Configuration for FitWithPari
 * Centralizes all environment variable access with type safety
 */

export interface EnvironmentConfig {
  // Application
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';

  // API Configuration
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;

  // Video Streaming
  zoomSdkKey?: string;
  videoCdnUrl?: string;

  // Analytics
  googleAnalyticsId?: string;
  sentryDsn?: string;
  hotjarId?: string;

  // Feature Flags
  enableLiveStreaming: boolean;
  enableRecordedClasses: boolean;
  enablePaymentIntegration: boolean;
  enableSocialLogin: boolean;

  // Payment
  stripePublishableKey?: string;

  // Performance
  performanceMonitoring: boolean;
  errorReporting: boolean;
  debugMode: boolean;
}

/**
 * Get environment configuration with type safety and defaults
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    // Application
    appName: import.meta.env.VITE_APP_NAME || 'FitWithPari',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: (import.meta.env.VITE_APP_ENVIRONMENT || 'development') as 'development' | 'staging' | 'production',

    // API Configuration
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,

    // Video Streaming
    zoomSdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
    videoCdnUrl: import.meta.env.VITE_VIDEO_CDN_URL,

    // Analytics
    googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    hotjarId: import.meta.env.VITE_HOTJAR_ID,

    // Feature Flags
    enableLiveStreaming: import.meta.env.VITE_ENABLE_LIVE_STREAMING === 'true',
    enableRecordedClasses: import.meta.env.VITE_ENABLE_RECORDED_CLASSES === 'true',
    enablePaymentIntegration: import.meta.env.VITE_ENABLE_PAYMENT_INTEGRATION === 'true',
    enableSocialLogin: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',

    // Payment
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,

    // Performance
    performanceMonitoring: import.meta.env.VITE_PERFORMANCE_MONITORING === 'true',
    errorReporting: import.meta.env.VITE_ERROR_REPORTING === 'true',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  };
};

/**
 * Validate that required environment variables are set
 */
export const validateEnvironment = (config: EnvironmentConfig): void => {
  const requiredInProduction = [
    // Add required variables for production here
  ];

  if (config.environment === 'production') {
    const missing = requiredInProduction.filter(key => {
      const value = (config as any)[key];
      return !value || value === '';
    });

    if (missing.length > 0) {
      console.warn('Missing required production environment variables:', missing);
      // In a real application, you might want to throw an error here
    }
  }
};

// Export singleton instance
export const env = getEnvironmentConfig();

// Validate environment on load
validateEnvironment(env);

// Development helper
if (env.debugMode) {
  console.log('Environment Configuration:', {
    ...env,
    // Redact sensitive information in logs
    supabaseAnonKey: env.supabaseAnonKey ? '***' : undefined,
    zoomSdkKey: env.zoomSdkKey ? '***' : undefined,
    stripePublishableKey: env.stripePublishableKey ? '***' : undefined,
  });
}