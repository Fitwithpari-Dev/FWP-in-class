/**
 * Performance Monitoring React Hook for FitWithPari
 * Provides React-specific performance monitoring capabilities
 */

import { useEffect, useRef, useCallback } from 'react';
import { monitoring, trackEvent } from '../utils/monitoring';
import { env } from '../config/environment';

interface UsePerformanceMonitoringOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackEffects?: boolean;
  trackUserInteractions?: boolean;
}

interface PerformanceData {
  renderTime: number;
  effectTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const {
    componentName = 'Unknown',
    trackRenders = true,
    trackEffects = true,
    trackUserInteractions = true,
  } = options;

  const renderStartTime = useRef<number>(0);
  const effectStartTime = useRef<number>(0);
  const interactionStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Track component mount/unmount
  useEffect(() => {
    if (!env.performanceMonitoring) return;

    const mountTime = performance.now();

    trackEvent('component_mount', {
      componentName,
      timestamp: mountTime,
    });

    return () => {
      const unmountTime = performance.now();
      const lifespan = unmountTime - mountTime;

      trackEvent('component_unmount', {
        componentName,
        lifespan,
        renderCount: renderCount.current,
        timestamp: unmountTime,
      });
    };
  }, [componentName]);

  // Track render performance
  useEffect(() => {
    if (!env.performanceMonitoring || !trackRenders) return;

    renderCount.current += 1;
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    if (renderTime > 16) { // Alert for renders taking longer than one frame (16ms)
      monitoring.trackPerformanceMetric({
        name: `${componentName}_Slow_Render`,
        value: renderTime,
        unit: 'ms',
        timestamp: Date.now(),
      });
    }

    monitoring.trackPerformanceMetric({
      name: `${componentName}_Render_Time`,
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
    });
  });

  // Start render timing before each render
  renderStartTime.current = performance.now();

  // Track effect performance
  const trackEffectPerformance = useCallback((effectName: string, effectFn: () => void | (() => void)) => {
    if (!env.performanceMonitoring || !trackEffects) {
      return effectFn();
    }

    const startTime = performance.now();
    const result = effectFn();
    const endTime = performance.now();
    const effectTime = endTime - startTime;

    monitoring.trackPerformanceMetric({
      name: `${componentName}_${effectName}_Effect_Time`,
      value: effectTime,
      unit: 'ms',
      timestamp: Date.now(),
    });

    return result;
  }, [componentName, trackEffects]);

  // Track user interaction performance
  const trackInteractionPerformance = useCallback((interactionName: string, interactionFn: () => void) => {
    if (!env.performanceMonitoring || !trackUserInteractions) {
      return interactionFn();
    }

    const startTime = performance.now();
    interactionFn();
    const endTime = performance.now();
    const interactionTime = endTime - startTime;

    trackEvent('user_interaction', {
      componentName,
      interactionName,
      interactionTime,
      timestamp: Date.now(),
    });

    if (interactionTime > 100) { // Alert for interactions taking longer than 100ms
      monitoring.trackPerformanceMetric({
        name: `${componentName}_Slow_Interaction`,
        value: interactionTime,
        unit: 'ms',
        timestamp: Date.now(),
      });
    }
  }, [componentName, trackUserInteractions]);

  // Memory usage tracking
  const trackMemoryUsage = useCallback(() => {
    if (!env.performanceMonitoring || typeof window === 'undefined') return;

    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      monitoring.trackPerformanceMetric({
        name: `${componentName}_Memory_Used`,
        value: memoryInfo.usedJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now(),
      });

      monitoring.trackPerformanceMetric({
        name: `${componentName}_Memory_Total`,
        value: memoryInfo.totalJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now(),
      });
    }
  }, [componentName]);

  // Get current performance data
  const getPerformanceData = useCallback((): PerformanceData => {
    const currentTime = performance.now();

    return {
      renderTime: currentTime - renderStartTime.current,
      effectTime: currentTime - effectStartTime.current,
      interactionTime: currentTime - interactionStartTime.current,
      memoryUsage: typeof window !== 'undefined' && (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize
        : undefined,
    };
  }, []);

  return {
    trackEffectPerformance,
    trackInteractionPerformance,
    trackMemoryUsage,
    getPerformanceData,
    renderCount: renderCount.current,
  };
};

// Hook for monitoring video performance specifically
export const useVideoPerformanceMonitoring = (videoId: string) => {
  const bufferingStartTime = useRef<number>(0);
  const playbackStartTime = useRef<number>(0);

  const trackVideoLoad = useCallback((loadTime: number) => {
    monitoring.trackPerformanceMetric({
      name: 'Video_Load_Time',
      value: loadTime,
      unit: 'ms',
      timestamp: Date.now(),
    });

    trackEvent('video_load', {
      videoId,
      loadTime,
      timestamp: Date.now(),
    });
  }, [videoId]);

  const trackVideoBuffer = useCallback((isBuffering: boolean) => {
    if (isBuffering) {
      bufferingStartTime.current = performance.now();
    } else {
      const bufferTime = performance.now() - bufferingStartTime.current;
      monitoring.trackPerformanceMetric({
        name: 'Video_Buffer_Time',
        value: bufferTime,
        unit: 'ms',
        timestamp: Date.now(),
      });

      trackEvent('video_buffer', {
        videoId,
        bufferTime,
        timestamp: Date.now(),
      });
    }
  }, [videoId]);

  const trackVideoQuality = useCallback((quality: string, bitrate?: number) => {
    trackEvent('video_quality_change', {
      videoId,
      quality,
      bitrate,
      timestamp: Date.now(),
    });
  }, [videoId]);

  const trackVideoError = useCallback((error: string, errorCode?: number) => {
    monitoring.trackError({
      message: `Video Error: ${error}`,
      timestamp: Date.now(),
    });

    trackEvent('video_error', {
      videoId,
      error,
      errorCode,
      timestamp: Date.now(),
    });
  }, [videoId]);

  const trackPlaybackMetrics = useCallback((metrics: {
    duration?: number;
    currentTime?: number;
    bufferedPercentage?: number;
    droppedFrames?: number;
  }) => {
    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== undefined) {
        monitoring.trackPerformanceMetric({
          name: `Video_${key}`,
          value,
          unit: key === 'duration' || key === 'currentTime' ? 'ms' : 'count',
          timestamp: Date.now(),
        });
      }
    });
  }, []);

  return {
    trackVideoLoad,
    trackVideoBuffer,
    trackVideoQuality,
    trackVideoError,
    trackPlaybackMetrics,
  };
};

// Hook for monitoring network performance
export const useNetworkMonitoring = () => {
  const trackNetworkRequest = useCallback((url: string, method: string, duration: number, status: number) => {
    monitoring.trackPerformanceMetric({
      name: 'Network_Request_Duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
    });

    trackEvent('network_request', {
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    // Track slow requests
    if (duration > 5000) {
      monitoring.trackError({
        message: `Slow network request: ${method} ${url}`,
        timestamp: Date.now(),
      });
    }

    // Track error responses
    if (status >= 400) {
      monitoring.trackError({
        message: `Network request failed: ${status} ${method} ${url}`,
        timestamp: Date.now(),
      });
    }
  }, []);

  const getNetworkInfo = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    if (!env.performanceMonitoring) return;

    const networkInfo = getNetworkInfo();
    if (networkInfo) {
      trackEvent('network_info', {
        ...networkInfo,
        timestamp: Date.now(),
      });
    }
  }, [getNetworkInfo]);

  return {
    trackNetworkRequest,
    getNetworkInfo,
  };
};