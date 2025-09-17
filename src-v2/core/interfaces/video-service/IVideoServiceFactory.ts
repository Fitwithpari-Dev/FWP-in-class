import { IVideoService, VideoServiceType, VideoServiceConfig } from './IVideoService';

// Service information for UI selection
export interface VideoServiceInfo {
  type: VideoServiceType;
  name: string;
  description: string;
  maxParticipants: number;
  supportsScaling: boolean;
  recommended: boolean;
  requiresConfiguration: string[];
}

// Factory interface for creating video services
export interface IVideoServiceFactory {
  createService(type: VideoServiceType, config: VideoServiceConfig): Promise<IVideoService>;
  getSupportedServices(): VideoServiceInfo[];
  getServiceInfo(type: VideoServiceType): VideoServiceInfo | null;
  isServiceAvailable(type: VideoServiceType): boolean;
}

// Error for unsupported video services
export class UnsupportedVideoServiceError extends Error {
  constructor(public readonly serviceType: VideoServiceType) {
    super(`Video service '${serviceType}' is not supported or not properly configured`);
    this.name = 'UnsupportedVideoServiceError';
  }
}

// Error for missing configuration
export class VideoServiceConfigurationError extends Error {
  constructor(
    public readonly serviceType: VideoServiceType,
    public readonly missingFields: string[]
  ) {
    super(
      `Video service '${serviceType}' requires configuration for: ${missingFields.join(', ')}`
    );
    this.name = 'VideoServiceConfigurationError';
  }
}