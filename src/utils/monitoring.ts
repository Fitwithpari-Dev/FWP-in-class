/**
 * Monitoring and Analytics Setup for FitWithPari
 * Centralizes error tracking, performance monitoring, and user analytics
 */

import { env } from '../config/environment';

// Types for monitoring events
interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  userAgent?: string;
  url?: string;
  userId?: string;
  timestamp: number;
}

interface UserEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: number;
}

interface VideoEvent {
  eventType: 'play' | 'pause' | 'seek' | 'error' | 'buffer' | 'quality_change';
  videoId: string;
  currentTime?: number;
  duration?: number;
  quality?: string;
  error?: string;
  userId?: string;
  timestamp: number;
}

class MonitoringService {
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeMonitoring(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry for error tracking
      if (env.sentryDsn && env.errorReporting) {
        await this.initializeSentry();
      }

      // Initialize Google Analytics
      if (env.googleAnalyticsId && typeof window !== 'undefined') {
        this.initializeGoogleAnalytics();
      }

      // Initialize Hotjar
      if (env.hotjarId && typeof window !== 'undefined') {
        this.initializeHotjar();
      }

      // Set up performance monitoring
      if (env.performanceMonitoring) {
        this.initializePerformanceMonitoring();
      }

      // Set up error handling
      this.setupGlobalErrorHandling();

      // Set up video streaming monitoring
      this.setupVideoMonitoring();

      this.isInitialized = true;
      console.log('Monitoring services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring services:', error);
    }
  }

  private async initializeSentry(): Promise<void> {
    try {
      // Dynamic import for Sentry to reduce bundle size
      const { init, configureScope } = await import('@sentry/browser');
      const { Integrations } = await import('@sentry/tracing');

      init({
        dsn: env.sentryDsn,
        environment: env.environment,
        integrations: [
          new Integrations.BrowserTracing(),
        ],
        tracesSampleRate: env.environment === 'production' ? 0.1 : 1.0,
        beforeSend(event) {
          // Filter out irrelevant errors
          if (event.exception) {
            const error = event.exception.values?.[0];
            if (error?.type === 'NonError' ||
                error?.value?.includes('Script error') ||
                error?.value?.includes('Network request failed')) {
              return null;
            }
          }
          return event;
        },
      });

      configureScope((scope) => {
        scope.setTag('platform', 'fitwithpari');
        scope.setTag('version', env.appVersion);
        scope.setContext('session', {
          id: this.sessionId,
          timestamp: Date.now(),
        });
      });

    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  private initializeGoogleAnalytics(): void {
    try {
      // Load Google Analytics 4
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${env.googleAnalyticsId}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', env.googleAnalyticsId, {
        page_title: 'FitWithPari',
        custom_map: {
          custom_parameter_1: 'fitness_platform'
        }
      });

      console.log('Google Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  private initializeHotjar(): void {
    try {
      (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
        h.hj = h.hj || function(...args: any[]) { (h.hj.q = h.hj.q || []).push(args); };
        h._hjSettings = { hjid: env.hotjarId, hjsv: 6 };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script'); r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

      console.log('Hotjar initialized');
    } catch (error) {
      console.error('Failed to initialize Hotjar:', error);
    }
  }

  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Web Vitals monitoring
    this.monitorWebVitals();

    // Custom performance metrics
    this.monitorCustomMetrics();

    // Resource loading monitoring
    this.monitorResourceLoading();
  }

  private async monitorWebVitals(): Promise<void> {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

      getCLS((metric) => this.trackPerformanceMetric({
        name: 'CLS',
        value: metric.value,
        unit: 'count',
        timestamp: Date.now()
      }));

      getFID((metric) => this.trackPerformanceMetric({
        name: 'FID',
        value: metric.value,
        unit: 'ms',
        timestamp: Date.now()
      }));

      getFCP((metric) => this.trackPerformanceMetric({
        name: 'FCP',
        value: metric.value,
        unit: 'ms',
        timestamp: Date.now()
      }));

      getLCP((metric) => this.trackPerformanceMetric({
        name: 'LCP',
        value: metric.value,
        unit: 'ms',
        timestamp: Date.now()
      }));

      getTTFB((metric) => this.trackPerformanceMetric({
        name: 'TTFB',
        value: metric.value,
        unit: 'ms',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to initialize Web Vitals monitoring:', error);
    }
  }

  private monitorCustomMetrics(): void {
    // Monitor React render times
    if ((window as any).React) {
      const originalRender = (window as any).React.render;
      if (originalRender) {
        (window as any).React.render = function(...args: any[]) {
          const start = performance.now();
          const result = originalRender.apply(this, args);
          const end = performance.now();

          this.trackPerformanceMetric({
            name: 'React_Render_Time',
            value: end - start,
            unit: 'ms',
            timestamp: Date.now()
          });

          return result;
        }.bind(this);
      }
    }

    // Monitor bundle size
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => resource.name.includes('.js'));
      const totalJSSize = jsResources.reduce((total, resource) => total + (resource.transferSize || 0), 0);

      this.trackPerformanceMetric({
        name: 'JS_Bundle_Size',
        value: totalJSSize,
        unit: 'bytes',
        timestamp: Date.now()
      });
    }
  }

  private monitorResourceLoading(): void {
    if (typeof window === 'undefined' || !performance.getEntriesByType) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Monitor slow resources
          if (resourceEntry.duration > 2000) {
            this.trackError({
              message: `Slow resource loading: ${resourceEntry.name}`,
              timestamp: Date.now(),
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
      });
    });
  }

  private setupVideoMonitoring(): void {
    // This will be called when video elements are initialized
    // Implementation depends on the video player library used
  }

  // Public API methods
  public setUserId(userId: string): void {
    this.userId = userId;

    // Update Sentry user context
    if (env.sentryDsn && typeof window !== 'undefined') {
      import('@sentry/browser').then(({ configureScope }) => {
        configureScope((scope) => {
          scope.setUser({ id: userId });
        });
      });
    }

    // Update Google Analytics user ID
    if (env.googleAnalyticsId && (window as any).gtag) {
      (window as any).gtag('config', env.googleAnalyticsId, {
        user_id: userId
      });
    }
  }

  public trackEvent(event: UserEvent): void {
    if (!env.performanceMonitoring) return;

    const eventData = {
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    // Send to Google Analytics
    if (env.googleAnalyticsId && (window as any).gtag) {
      (window as any).gtag('event', event.event, {
        event_category: 'fitness_platform',
        event_label: event.properties?.label,
        value: event.properties?.value,
      });
    }

    // Send to custom analytics endpoint (if configured)
    this.sendToAnalytics('user_event', eventData);

    if (env.debugMode) {
      console.log('Event tracked:', eventData);
    }
  }

  public trackVideoEvent(event: VideoEvent): void {
    if (!env.performanceMonitoring) return;

    const eventData = {
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    // Send to analytics
    this.sendToAnalytics('video_event', eventData);

    if (env.debugMode) {
      console.log('Video event tracked:', eventData);
    }
  }

  public trackPerformanceMetric(metric: PerformanceMetric): void {
    if (!env.performanceMonitoring) return;

    // Send to analytics
    this.sendToAnalytics('performance_metric', {
      ...metric,
      sessionId: this.sessionId,
      userId: this.userId,
    });

    if (env.debugMode) {
      console.log('Performance metric tracked:', metric);
    }
  }

  public trackError(error: ErrorEvent): void {
    if (!env.errorReporting) return;

    const errorData = {
      ...error,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    // Send to Sentry
    if (env.sentryDsn) {
      import('@sentry/browser').then(({ captureException }) => {
        const errorObj = new Error(error.message);
        if (error.stack) {
          errorObj.stack = error.stack;
        }
        captureException(errorObj);
      });
    }

    // Send to custom error tracking
    this.sendToAnalytics('error_event', errorData);

    if (env.debugMode) {
      console.error('Error tracked:', errorData);
    }
  }

  private async sendToAnalytics(eventType: string, data: any): Promise<void> {
    if (!env.apiBaseUrl) return;

    try {
      // Send to custom analytics endpoint
      await fetch(`${env.apiBaseUrl}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: eventType,
          data,
          platform: 'web',
          version: env.appVersion,
        }),
      });
    } catch (error) {
      if (env.debugMode) {
        console.error('Failed to send analytics data:', error);
      }
    }
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Convenience functions
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  monitoring.trackEvent({ event, properties, timestamp: Date.now() });
};

export const trackVideoEvent = (eventType: VideoEvent['eventType'], videoId: string, additionalData?: Partial<VideoEvent>) => {
  monitoring.trackVideoEvent({
    eventType,
    videoId,
    ...additionalData,
    timestamp: Date.now(),
  });
};

export const trackError = (error: Error, additionalData?: Partial<ErrorEvent>) => {
  monitoring.trackError({
    message: error.message,
    stack: error.stack,
    ...additionalData,
    timestamp: Date.now(),
  });
};

export const setUserId = (userId: string) => {
  monitoring.setUserId(userId);
};