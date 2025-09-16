// Unified Video Service Provider
// Single point to get the configured video service (Zoom or Agora)

import { IVideoService, VideoServiceError, VIDEO_ERROR_CODES } from '../types/video-service';
import { VIDEO_SERVICE, validateVideoConfig, getVideoConfigInfo } from '../config/video.config';
import { ZoomVideoService } from './zoomVideoService';
import { AgoraVideoService } from './agoraVideoService';

// Service factory functions
const createZoomService = (): IVideoService => new ZoomVideoService();
const createAgoraService = (): IVideoService => new AgoraVideoService();

// Service registry
const SERVICE_REGISTRY = {
  zoom: createZoomService,
  agora: createAgoraService
} as const;

/**
 * Video Service Provider - Creates the configured video service
 * This is the single point where video service selection happens
 */
export class VideoServiceProvider {
  private static instance: VideoServiceProvider | null = null;
  private currentService: IVideoService | null = null;
  private fallbackService: IVideoService | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): VideoServiceProvider {
    if (!VideoServiceProvider.instance) {
      VideoServiceProvider.instance = new VideoServiceProvider();
    }
    return VideoServiceProvider.instance;
  }

  /**
   * Get the primary configured video service
   */
  async getPrimaryService(): Promise<IVideoService> {
    if (this.currentService) {
      return this.currentService;
    }

    // Validate configuration
    if (!validateVideoConfig()) {
      throw new VideoServiceError(
        `Video service configuration invalid for ${VIDEO_SERVICE}`,
        VIDEO_SERVICE,
        VIDEO_ERROR_CODES.INITIALIZATION_FAILED
      );
    }

    try {
      // Create the configured service
      const serviceFactory = SERVICE_REGISTRY[VIDEO_SERVICE];
      this.currentService = serviceFactory();

      console.log(`📹 Video Service Provider: Using ${this.currentService.serviceName} as primary service`);

      return this.currentService;
    } catch (error) {
      throw new VideoServiceError(
        `Failed to create ${VIDEO_SERVICE} service`,
        VIDEO_SERVICE,
        VIDEO_ERROR_CODES.INITIALIZATION_FAILED,
        error
      );
    }
  }

  /**
   * Get the fallback video service
   */
  async getFallbackService(): Promise<IVideoService> {
    if (this.fallbackService) {
      return this.fallbackService;
    }

    const fallbackType = VIDEO_SERVICE === 'zoom' ? 'agora' : 'zoom';

    try {
      const serviceFactory = SERVICE_REGISTRY[fallbackType];
      this.fallbackService = serviceFactory();

      console.log(`📹 Video Service Provider: ${this.fallbackService.serviceName} available as fallback`);

      return this.fallbackService;
    } catch (error) {
      console.warn(`⚠️ Video Service Provider: Fallback service ${fallbackType} unavailable:`, error);
      throw new VideoServiceError(
        `Failed to create fallback ${fallbackType} service`,
        fallbackType,
        VIDEO_ERROR_CODES.SERVICE_UNAVAILABLE,
        error
      );
    }
  }

  /**
   * Switch to fallback service (useful for error recovery)
   */
  async switchToFallback(): Promise<IVideoService> {
    console.log('🔄 Video Service Provider: Switching to fallback service...');

    // Clean up current service
    if (this.currentService) {
      try {
        await this.currentService.destroy();
      } catch (error) {
        console.warn('⚠️ Error cleaning up current service:', error);
      }
    }

    // Move fallback to primary
    this.currentService = await this.getFallbackService();
    this.fallbackService = null;

    console.log(`✅ Video Service Provider: Switched to ${this.currentService.serviceName}`);

    return this.currentService;
  }

  /**
   * Get current service info for debugging
   */
  getServiceInfo() {
    const configInfo = getVideoConfigInfo();

    return {
      ...configInfo,
      currentService: this.currentService?.serviceName || null,
      fallbackService: this.fallbackService?.serviceName || null,
      hasCurrentService: !!this.currentService,
      hasFallbackService: !!this.fallbackService
    };
  }

  /**
   * Reset provider (for testing or service switching)
   */
  reset() {
    console.log('🔄 Video Service Provider: Resetting...');

    if (this.currentService) {
      this.currentService.destroy().catch(console.warn);
      this.currentService = null;
    }

    if (this.fallbackService) {
      this.fallbackService.destroy().catch(console.warn);
      this.fallbackService = null;
    }
  }

  /**
   * Cleanup all services
   */
  async cleanup() {
    console.log('🧹 Video Service Provider: Cleaning up...');

    const cleanupPromises = [];

    if (this.currentService) {
      cleanupPromises.push(this.currentService.destroy());
    }

    if (this.fallbackService) {
      cleanupPromises.push(this.fallbackService.destroy());
    }

    await Promise.allSettled(cleanupPromises);

    this.currentService = null;
    this.fallbackService = null;
  }
}

// Convenience functions for getting services
export const getVideoService = () => VideoServiceProvider.getInstance().getPrimaryService();
export const getFallbackVideoService = () => VideoServiceProvider.getInstance().getFallbackService();
export const switchToFallbackService = () => VideoServiceProvider.getInstance().switchToFallback();
export const getVideoServiceInfo = () => VideoServiceProvider.getInstance().getServiceInfo();

// Export singleton instance
export const videoServiceProvider = VideoServiceProvider.getInstance();