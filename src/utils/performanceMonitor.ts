/**
 * Performance Monitoring for Zoom Video SDK Sessions
 * Tracks and optimizes performance for large fitness classes
 */

import { ZOOM_CONFIG } from '../config/zoom.config';

export interface PerformanceMetrics {
  videoFrameRate: number;
  audioLatency: number;
  networkRTT: number;
  packetLoss: number;
  cpuUsage: number;
  memoryUsage: number;
  participantCount: number;
  renderingParticipants: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxCPU: number;
  maxMemory: number;
  maxPacketLoss: number;
  maxLatency: number;
  minFrameRate: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  // Default thresholds for fitness classes
  private thresholds: PerformanceThresholds = {
    maxCPU: 80, // %
    maxMemory: 1024, // MB
    maxPacketLoss: 5, // %
    maxLatency: 300, // ms
    minFrameRate: 24, // fps
  };

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }
  }

  /**
   * Start monitoring performance
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupPerformanceObserver();

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs) as any;
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  /**
   * Setup Performance Observer for detailed metrics
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Process performance entries if needed
      });

      // Observe different performance entry types
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const metrics = await this.getCurrentMetrics();
    this.metrics.push(metrics);

    // Keep only last 100 metrics (to prevent memory issues)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check thresholds and trigger optimizations
    this.checkThresholds(metrics);

    // Notify callbacks
    this.callbacks.forEach(callback => callback(metrics));
  }

  /**
   * Get current performance metrics
   */
  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      videoFrameRate: this.getVideoFrameRate(),
      audioLatency: this.getAudioLatency(),
      networkRTT: await this.getNetworkRTT(),
      packetLoss: this.getPacketLoss(),
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      participantCount: 0, // Will be set by the SDK
      renderingParticipants: 0, // Will be set by the SDK
      timestamp: Date.now(),
    };

    return metrics;
  }

  /**
   * Get video frame rate
   */
  private getVideoFrameRate(): number {
    // This would ideally come from the Zoom SDK stats
    // For now, we'll estimate based on requestAnimationFrame
    let fps = 30; // Default

    if ('performance' in window && performance.now) {
      // Simple FPS calculation
      const now = performance.now();
      if (this.lastFrameTime) {
        const delta = now - this.lastFrameTime;
        fps = Math.round(1000 / delta);
      }
      this.lastFrameTime = now;
    }

    return fps;
  }
  private lastFrameTime?: number;

  /**
   * Get audio latency
   */
  private getAudioLatency(): number {
    // This would come from WebRTC stats
    // For now, return a placeholder
    return 50; // ms
  }

  /**
   * Get network RTT (Round Trip Time)
   */
  private async getNetworkRTT(): Promise<number> {
    try {
      const start = performance.now();
      await fetch('https://zoom.us/test', {
        mode: 'no-cors',
        cache: 'no-cache'
      }).catch(() => {});
      const end = performance.now();
      return Math.round(end - start);
    } catch {
      return 0;
    }
  }

  /**
   * Get packet loss percentage
   */
  private getPacketLoss(): number {
    // This would come from WebRTC stats
    // For now, return a placeholder
    return 0.5; // %
  }

  /**
   * Get CPU usage
   */
  private async getCPUUsage(): Promise<number> {
    // This is an approximation based on main thread blocking
    return new Promise((resolve) => {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        const blockingTime = end - start - 0; // Expected 0ms
        const usage = Math.min(100, blockingTime * 10); // Rough estimate
        resolve(usage);
      }, 0);
    });
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }

  /**
   * Check thresholds and trigger optimizations
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const recommendations: string[] = [];

    // Check frame rate
    if (metrics.videoFrameRate < this.thresholds.minFrameRate) {
      recommendations.push('Low frame rate detected. Consider reducing video quality or participant count.');
    }

    // Check CPU usage
    if (metrics.cpuUsage > this.thresholds.maxCPU) {
      recommendations.push('High CPU usage. Consider disabling virtual backgrounds and reducing rendered videos.');
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemory) {
      recommendations.push('High memory usage. Consider paginating participant videos.');
    }

    // Check network conditions
    if (metrics.networkRTT > this.thresholds.maxLatency) {
      recommendations.push('High network latency detected. Video quality may be affected.');
    }

    if (metrics.packetLoss > this.thresholds.maxPacketLoss) {
      recommendations.push('High packet loss detected. Connection may be unstable.');
    }

    if (recommendations.length > 0) {
      console.warn('Performance recommendations:', recommendations);
      this.triggerOptimizations(metrics);
    }
  }

  /**
   * Trigger automatic optimizations based on performance
   */
  private triggerOptimizations(metrics: PerformanceMetrics): void {
    // These would be implemented by calling SDK methods
    const optimizations: any = {};

    // Optimize based on participant count
    if (metrics.participantCount > 50) {
      optimizations.videoQuality = '360p';
      optimizations.maxRenderingParticipants = 16;
    } else if (metrics.participantCount > 25) {
      optimizations.videoQuality = '480p';
      optimizations.maxRenderingParticipants = 25;
    }

    // Optimize based on CPU
    if (metrics.cpuUsage > this.thresholds.maxCPU) {
      optimizations.enableHardwareAcceleration = true;
      optimizations.disableVirtualBackground = true;
    }

    // Optimize based on network
    if (metrics.networkRTT > this.thresholds.maxLatency ||
        metrics.packetLoss > this.thresholds.maxPacketLoss) {
      optimizations.enableSimulcast = true;
      optimizations.audioOnly = metrics.packetLoss > 10;
    }

    // Emit optimization event
    if (Object.keys(optimizations).length > 0) {
      console.log('Applying performance optimizations:', optimizations);
      // This would trigger SDK optimizations
    }
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(periodMs: number = 60000): PerformanceMetrics | null {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= periodMs);

    if (recentMetrics.length === 0) return null;

    const avg: PerformanceMetrics = {
      videoFrameRate: 0,
      audioLatency: 0,
      networkRTT: 0,
      packetLoss: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      participantCount: 0,
      renderingParticipants: 0,
      timestamp: now,
    };

    recentMetrics.forEach(m => {
      avg.videoFrameRate += m.videoFrameRate;
      avg.audioLatency += m.audioLatency;
      avg.networkRTT += m.networkRTT;
      avg.packetLoss += m.packetLoss;
      avg.cpuUsage += m.cpuUsage;
      avg.memoryUsage += m.memoryUsage;
      avg.participantCount = Math.max(avg.participantCount, m.participantCount);
      avg.renderingParticipants = Math.max(avg.renderingParticipants, m.renderingParticipants);
    });

    const count = recentMetrics.length;
    avg.videoFrameRate /= count;
    avg.audioLatency /= count;
    avg.networkRTT /= count;
    avg.packetLoss /= count;
    avg.cpuUsage /= count;
    avg.memoryUsage /= count;

    return avg;
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const avg = this.getAverageMetrics(30000); // Last 30 seconds
    if (!avg) return 100;

    let score = 100;

    // Deduct points for poor metrics
    if (avg.videoFrameRate < this.thresholds.minFrameRate) {
      score -= (this.thresholds.minFrameRate - avg.videoFrameRate) * 2;
    }

    if (avg.cpuUsage > this.thresholds.maxCPU) {
      score -= (avg.cpuUsage - this.thresholds.maxCPU);
    }

    if (avg.networkRTT > this.thresholds.maxLatency) {
      score -= (avg.networkRTT - this.thresholds.maxLatency) / 10;
    }

    if (avg.packetLoss > this.thresholds.maxPacketLoss) {
      score -= (avg.packetLoss - this.thresholds.maxPacketLoss) * 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Subscribe to performance updates
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get recommended settings based on participant count
   */
  static getRecommendedSettings(participantCount: number): any {
    if (participantCount <= 10) {
      return {
        videoQuality: '720p',
        maxRenderingParticipants: 10,
        enableVirtualBackground: true,
        layout: 'gallery',
      };
    } else if (participantCount <= 25) {
      return {
        videoQuality: '480p',
        maxRenderingParticipants: 25,
        enableVirtualBackground: false,
        layout: 'gallery',
      };
    } else if (participantCount <= 50) {
      return {
        videoQuality: '360p',
        maxRenderingParticipants: 25,
        enableVirtualBackground: false,
        layout: 'paginated-gallery',
      };
    } else {
      return {
        videoQuality: '360p',
        maxRenderingParticipants: 16,
        enableVirtualBackground: false,
        layout: 'paginated-gallery',
        enableSimulcast: true,
        prioritizeHost: true,
      };
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}