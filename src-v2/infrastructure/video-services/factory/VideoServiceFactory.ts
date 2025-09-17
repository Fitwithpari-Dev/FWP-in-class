import { IVideoServiceFactory, VideoServiceInfo, UnsupportedVideoServiceError, VideoServiceConfigurationError } from '../../../core/interfaces/video-service/IVideoServiceFactory';
import { IVideoService, VideoServiceType, VideoServiceConfig } from '../../../core/interfaces/video-service/IVideoService';
import { ZoomVideoService } from '../zoom/ZoomVideoService';
import { AgoraVideoService } from '../agora/AgoraVideoService';
import { WebRTCVideoService } from '../webrtc/WebRTCVideoService';

/**
 * Concrete Video Service Factory
 * Creates and configures video service instances based on type and configuration
 * Handles service availability validation and configuration requirements
 */
export class VideoServiceFactory implements IVideoServiceFactory {
  private static instance: VideoServiceFactory;
  private serviceInstances: Map<VideoServiceType, IVideoService> = new Map();

  private constructor() {}

  static getInstance(): VideoServiceFactory {
    if (!VideoServiceFactory.instance) {
      VideoServiceFactory.instance = new VideoServiceFactory();
    }
    return VideoServiceFactory.instance;
  }

  async createService(type: VideoServiceType, config: VideoServiceConfig): Promise<IVideoService> {
    if (!this.isServiceAvailable(type)) {
      throw new UnsupportedVideoServiceError(type);
    }

    const serviceInfo = this.getServiceInfo(type);
    if (serviceInfo) {
      const missingFields = this.validateConfiguration(serviceInfo, config);
      if (missingFields.length > 0) {
        throw new VideoServiceConfigurationError(type, missingFields);
      }
    }

    // Check if service is already created (singleton pattern for performance)
    if (this.serviceInstances.has(type)) {
      const existingService = this.serviceInstances.get(type)!;
      if (existingService.isInitialized) {
        return existingService;
      }
    }

    let service: IVideoService;

    switch (type) {
      case 'zoom':
        service = new ZoomVideoService();
        break;
      case 'agora':
        service = new AgoraVideoService();
        break;
      case 'webrtc':
        service = new WebRTCVideoService();
        break;
      default:
        throw new UnsupportedVideoServiceError(type);
    }

    await service.initialize(config);
    this.serviceInstances.set(type, service);

    return service;
  }

  getSupportedServices(): VideoServiceInfo[] {
    return [
      {
        type: 'zoom',
        name: 'Zoom Video SDK',
        description: 'Enterprise-grade video conferencing with advanced features',
        maxParticipants: 1000,
        supportsScaling: true,
        recommended: true,
        requiresConfiguration: ['appId']
      },
      {
        type: 'agora',
        name: 'Agora RTC',
        description: 'Real-time communication with global reach and low latency',
        maxParticipants: 10000,
        supportsScaling: true,
        recommended: false,
        requiresConfiguration: ['appId']
      },
      {
        type: 'webrtc',
        name: 'Native WebRTC',
        description: 'Direct peer-to-peer communication for small groups',
        maxParticipants: 50,
        supportsScaling: false,
        recommended: false,
        requiresConfiguration: ['serverUrl']
      }
    ];
  }

  getServiceInfo(type: VideoServiceType): VideoServiceInfo | null {
    return this.getSupportedServices().find(service => service.type === type) || null;
  }

  isServiceAvailable(type: VideoServiceType): boolean {
    const serviceInfo = this.getServiceInfo(type);
    if (!serviceInfo) {
      console.warn(`[VideoServiceFactory] Service info not found for type: ${type}`);
      return false;
    }

    // In development mode, allow all services for testing
    const isDevelopment = import.meta.env?.DEV === true;

    // Check if required environment variables are available
    let available = false;
    switch (type) {
      case 'zoom':
        // Check for Zoom SDK credentials
        const hasZoomKey = this.hasEnvironmentVariable('VITE_ZOOM_SDK_KEY');
        const hasZoomSecret = this.hasEnvironmentVariable('VITE_ZOOM_SDK_SECRET');

        // For production, require both key and secret
        // For development, only require the key (token service handles authentication)
        available = isDevelopment ? hasZoomKey : (hasZoomKey && hasZoomSecret);

        console.log(`[VideoServiceFactory] Zoom availability check:`, {
          hasKey: hasZoomKey,
          hasSecret: hasZoomSecret,
          isDevelopment,
          available,
          keyValue: import.meta.env?.VITE_ZOOM_SDK_KEY ? 'present' : 'missing',
          secretValue: import.meta.env?.VITE_ZOOM_SDK_SECRET ? 'present' : 'missing'
        });
        break;
      case 'agora':
        available = this.hasEnvironmentVariable('VITE_AGORA_APP_ID');
        console.log(`[VideoServiceFactory] Agora availability check:`, {
          hasAppId: this.hasEnvironmentVariable('VITE_AGORA_APP_ID'),
          available
        });
        break;
      case 'webrtc':
        // WebRTC always available in development (uses mock service)
        available = isDevelopment || this.hasEnvironmentVariable('VITE_WEBRTC_SIGNALING_SERVER');
        console.log(`[VideoServiceFactory] WebRTC availability check:`, {
          hasServer: this.hasEnvironmentVariable('VITE_WEBRTC_SIGNALING_SERVER'),
          isDevelopment,
          available
        });
        break;
      default:
        console.warn(`[VideoServiceFactory] Unknown service type: ${type}`);
        return false;
    }

    return available;
  }

  // Cleanup method for proper resource management
  async destroyAllServices(): Promise<void> {
    const destroyPromises = Array.from(this.serviceInstances.values())
      .map(service => service.destroy());

    await Promise.all(destroyPromises);
    this.serviceInstances.clear();
  }

  // Get active service instance (for switching between services)
  getActiveService(): IVideoService | null {
    const activeServices = Array.from(this.serviceInstances.values())
      .filter(service => service.isInitialized);

    return activeServices.length > 0 ? activeServices[0] : null;
  }

  private validateConfiguration(serviceInfo: VideoServiceInfo, config: VideoServiceConfig): string[] {
    const missingFields: string[] = [];

    for (const field of serviceInfo.requiresConfiguration) {
      if (!config[field as keyof VideoServiceConfig]) {
        missingFields.push(field);
      }
    }

    return missingFields;
  }

  private hasEnvironmentVariable(key: string): boolean {
    // Check Vite environment variables (import.meta.env is available in Vite)
    const viteValue = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
    const processValue = process.env?.[key];
    const globalValue = globalThis[key as any];

    const hasValue = !!(viteValue || processValue || globalValue);

    console.log(`[VideoServiceFactory] Environment check for ${key}:`, {
      viteValue: viteValue ? 'present' : 'missing',
      processValue: processValue ? 'present' : 'missing',
      globalValue: globalValue ? 'present' : 'missing',
      hasValue,
      viteEnvKeys: typeof import.meta !== 'undefined' && import.meta.env ? Object.keys(import.meta.env) : 'no-import-meta'
    });

    return hasValue;
  }
}