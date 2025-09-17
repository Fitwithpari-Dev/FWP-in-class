import { VideoServiceFactory } from '../../infrastructure/video-services/factory/VideoServiceFactory';
import { UnsupportedVideoServiceError, VideoServiceConfigurationError } from '../../core/interfaces/video-service/IVideoServiceFactory';

// Mock the video service implementations
jest.mock('../../infrastructure/video-services/zoom/ZoomVideoService');
jest.mock('../../infrastructure/video-services/agora/AgoraVideoService');
jest.mock('../../infrastructure/video-services/webrtc/WebRTCVideoService');

describe('VideoServiceFactory', () => {
  let factory: VideoServiceFactory;

  beforeEach(() => {
    // Reset singleton instance for each test
    (VideoServiceFactory as any).instance = undefined;
    factory = VideoServiceFactory.getInstance();

    // Mock environment variables
    process.env.ZOOM_SDK_KEY = 'test-zoom-key';
    process.env.ZOOM_SDK_SECRET = 'test-zoom-secret';
    process.env.AGORA_APP_ID = 'test-agora-id';
    process.env.WEBRTC_SIGNALING_SERVER = 'ws://test-server';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ZOOM_SDK_KEY;
    delete process.env.ZOOM_SDK_SECRET;
    delete process.env.AGORA_APP_ID;
    delete process.env.WEBRTC_SIGNALING_SERVER;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const factory1 = VideoServiceFactory.getInstance();
      const factory2 = VideoServiceFactory.getInstance();

      expect(factory1).toBe(factory2);
    });
  });

  describe('Service Information', () => {
    it('should return supported services', () => {
      const services = factory.getSupportedServices();

      expect(services).toHaveLength(3);

      const serviceTypes = services.map(s => s.type);
      expect(serviceTypes).toContain('zoom');
      expect(serviceTypes).toContain('agora');
      expect(serviceTypes).toContain('webrtc');
    });

    it('should return service info for valid types', () => {
      const zoomInfo = factory.getServiceInfo('zoom');
      expect(zoomInfo).toBeTruthy();
      expect(zoomInfo?.name).toBe('Zoom Video SDK');
      expect(zoomInfo?.maxParticipants).toBe(1000);
      expect(zoomInfo?.recommended).toBe(true);

      const agoraInfo = factory.getServiceInfo('agora');
      expect(agoraInfo?.maxParticipants).toBe(10000);

      const webrtcInfo = factory.getServiceInfo('webrtc');
      expect(webrtcInfo?.maxParticipants).toBe(50);
    });

    it('should return null for invalid service types', () => {
      const invalidInfo = factory.getServiceInfo('invalid' as any);
      expect(invalidInfo).toBeNull();
    });
  });

  describe('Service Availability', () => {
    it('should check zoom service availability', () => {
      expect(factory.isServiceAvailable('zoom')).toBe(true);

      delete process.env.ZOOM_SDK_KEY;
      expect(factory.isServiceAvailable('zoom')).toBe(false);
    });

    it('should check agora service availability', () => {
      expect(factory.isServiceAvailable('agora')).toBe(true);

      delete process.env.AGORA_APP_ID;
      expect(factory.isServiceAvailable('agora')).toBe(false);
    });

    it('should check webrtc service availability', () => {
      expect(factory.isServiceAvailable('webrtc')).toBe(true);

      delete process.env.WEBRTC_SIGNALING_SERVER;
      expect(factory.isServiceAvailable('webrtc')).toBe(false);
    });
  });

  describe('Service Creation', () => {
    const validConfig = {
      appId: 'test-app-id',
      appSecret: 'test-secret',
      maxParticipants: 100,
      enableLogging: true,
      serverUrl: 'ws://test-server'
    };

    it('should throw error for unsupported service type', async () => {
      delete process.env.ZOOM_SDK_KEY;

      await expect(
        factory.createService('zoom', validConfig)
      ).rejects.toThrow(UnsupportedVideoServiceError);
    });

    it('should throw error for missing configuration', async () => {
      const invalidConfig = {
        maxParticipants: 100,
        enableLogging: true
      } as any;

      await expect(
        factory.createService('zoom', invalidConfig)
      ).rejects.toThrow(VideoServiceConfigurationError);
    });

    it('should validate required configuration fields', async () => {
      const zoomInfo = factory.getServiceInfo('zoom');
      expect(zoomInfo?.requiresConfiguration).toContain('appId');
      expect(zoomInfo?.requiresConfiguration).toContain('appSecret');

      const agoraInfo = factory.getServiceInfo('agora');
      expect(agoraInfo?.requiresConfiguration).toContain('appId');

      const webrtcInfo = factory.getServiceInfo('webrtc');
      expect(webrtcInfo?.requiresConfiguration).toContain('serverUrl');
    });
  });

  describe('Error Handling', () => {
    it('should create UnsupportedVideoServiceError with correct message', () => {
      const error = new UnsupportedVideoServiceError('invalidType' as any);

      expect(error.message).toContain('invalidType');
      expect(error.serviceType).toBe('invalidType');
      expect(error.name).toBe('UnsupportedVideoServiceError');
    });

    it('should create VideoServiceConfigurationError with missing fields', () => {
      const error = new VideoServiceConfigurationError('zoom', ['appId', 'appSecret']);

      expect(error.message).toContain('zoom');
      expect(error.message).toContain('appId, appSecret');
      expect(error.serviceType).toBe('zoom');
      expect(error.missingFields).toEqual(['appId', 'appSecret']);
      expect(error.name).toBe('VideoServiceConfigurationError');
    });
  });

  describe('Service Management', () => {
    it('should manage service lifecycle', async () => {
      // This would require mocking the actual service implementations
      // and testing the singleton behavior of created services
      expect(factory.getActiveService()).toBeNull();

      // After creating a service, getActiveService should return it
      // This would be tested with proper mocks of the service classes
    });
  });

  describe('Performance Considerations', () => {
    it('should provide service metadata for capacity planning', () => {
      const services = factory.getSupportedServices();

      // Zoom: Best for enterprise, 1000 participants
      const zoom = services.find(s => s.type === 'zoom');
      expect(zoom?.maxParticipants).toBe(1000);
      expect(zoom?.supportsScaling).toBe(true);

      // Agora: Best for massive scale, 10000 participants
      const agora = services.find(s => s.type === 'agora');
      expect(agora?.maxParticipants).toBe(10000);
      expect(agora?.supportsScaling).toBe(true);

      // WebRTC: Best for small groups, 50 participants
      const webrtc = services.find(s => s.type === 'webrtc');
      expect(webrtc?.maxParticipants).toBe(50);
      expect(webrtc?.supportsScaling).toBe(false);
    });

    it('should recommend appropriate service based on requirements', () => {
      const services = factory.getSupportedServices();
      const recommended = services.filter(s => s.recommended);

      expect(recommended).toHaveLength(1);
      expect(recommended[0].type).toBe('zoom');
    });
  });
});