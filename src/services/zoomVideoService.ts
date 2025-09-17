// Zoom Video Service - Implements Unified Video Service Interface
// Wraps existing Zoom SDK to provide consistent interface

import { IVideoService, VideoParticipant, ConnectionState, VideoServiceCapabilities, VideoServiceError, VIDEO_ERROR_CODES } from '../types/video-service';
import { UserRole } from '../types/fitness-platform';

export class ZoomVideoService implements IVideoService {
  readonly serviceName = 'Zoom Video SDK';
  readonly capabilities: VideoServiceCapabilities = {
    maxParticipants: 100,
    supportsScreenShare: true,
    supportsRecording: true,
    supportsChat: true,
    name: 'Zoom Video SDK'
  };

  private participants: Map<string, VideoParticipant> = new Map();
  private currentUser: VideoParticipant | null = null;
  private connectionState: ConnectionState = 'Disconnected';
  private isVideoOn = false;
  private isAudioOn = false;
  private zoomSDK: any = null;

  // Event callbacks
  onParticipantJoined?: (participant: VideoParticipant) => void;
  onParticipantLeft?: (participant: VideoParticipant) => void;
  onVideoStateChanged?: (participantId: string, isVideoOn: boolean) => void;
  onAudioStateChanged?: (participantId: string, isAudioOn: boolean) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;

  async initialize(): Promise<void> {
    try {
      console.log('🚀 ZoomVideoService: Initializing...');

      // Import Zoom SDK dynamically
      const { default: ZoomVideo } = await import('@zoom/videosdk');

      this.zoomSDK = ZoomVideo.createClient();

      // Set up event handlers
      this.zoomSDK.on('connection-change', (payload: any) => {
        console.log('🔗 ZoomVideoService: Connection change:', payload.state);

        // Map Zoom states to unified states
        const stateMap: Record<string, ConnectionState> = {
          'Connecting': 'Connecting',
          'Connected': 'Connected',
          'Disconnected': 'Disconnected',
          'Reconnecting': 'Connecting',
          'Closed': 'Closed'
        };

        this.connectionState = stateMap[payload.state] || 'Disconnected';
        this.onConnectionStateChanged?.(this.connectionState);
      });

      this.zoomSDK.on('user-added', (payload: any) => {
        console.log('👤 ZoomVideoService: User added:', payload);

        payload.forEach((user: any) => {
          const participant: VideoParticipant = {
            id: String(user.userId),
            name: user.displayName || `User ${user.userId}`,
            isHost: user.isHost || false,
            isVideoOn: false, // Will be updated when video starts
            isAudioOn: false, // Will be updated when audio starts
            role: user.isHost ? 'coach' : 'student'
          };

          this.participants.set(participant.id, participant);
          this.onParticipantJoined?.(participant);
        });
      });

      this.zoomSDK.on('user-removed', (payload: any) => {
        console.log('👋 ZoomVideoService: User removed:', payload);

        payload.forEach((user: any) => {
          const participant = this.participants.get(String(user.userId));
          if (participant) {
            this.participants.delete(String(user.userId));
            this.onParticipantLeft?.(participant);
          }
        });
      });

      this.zoomSDK.on('user-updated', (payload: any) => {
        console.log('🔄 ZoomVideoService: User updated:', payload);

        payload.forEach((user: any) => {
          const participant = this.participants.get(String(user.userId));
          if (participant) {
            // Update video state
            if (user.bVideoOn !== undefined) {
              participant.isVideoOn = user.bVideoOn;
              this.onVideoStateChanged?.(participant.id, user.bVideoOn);
            }

            // Update audio state
            if (user.audio !== undefined) {
              participant.isAudioOn = user.audio;
              this.onAudioStateChanged?.(participant.id, user.audio);
            }
          }
        });
      });

      console.log('✅ ZoomVideoService: Initialized successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Initialization failed:', error);
      throw new VideoServiceError(
        'Failed to initialize Zoom service',
        this.serviceName,
        VIDEO_ERROR_CODES.INITIALIZATION_FAILED,
        error
      );
    }
  }

  async joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void> {
    try {
      console.log('🚪 ZoomVideoService: Joining session:', { userName, userRole, sessionId });

      if (!this.zoomSDK) {
        throw new Error('Zoom SDK not initialized');
      }

      // Generate JWT token (this should be done via your token server)
      const tokenEndpoint = import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT;
      if (!tokenEndpoint) {
        throw new Error('Zoom token endpoint not configured');
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionId,
          role: userRole === 'coach' ? 1 : 0
        })
      });

      if (!response.ok) {
        throw new Error(`Token generation failed: ${response.statusText}`);
      }

      const { signature } = await response.json();

      // Join the session
      await this.zoomSDK.join({
        signature,
        sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
        sessionName: sessionId,
        userName,
        password: import.meta.env.VITE_SESSION_PASSWORD || 'test123'
      });

      // Create current user participant
      const currentUserId = this.zoomSDK.getCurrentUserInfo()?.userId;
      this.currentUser = {
        id: String(currentUserId),
        name: userName,
        isHost: userRole === 'coach',
        isVideoOn: false,
        isAudioOn: false,
        role: userRole
      };

      // Add to participants
      this.participants.set(this.currentUser.id, this.currentUser);

      this.connectionState = 'Connected';
      this.onConnectionStateChanged?.(this.connectionState);

      console.log('✅ ZoomVideoService: Joined session successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to join session:', error);
      throw new VideoServiceError(
        'Failed to join session',
        this.serviceName,
        VIDEO_ERROR_CODES.CONNECTION_FAILED,
        error
      );
    }
  }

  async leaveSession(): Promise<void> {
    try {
      console.log('🚪 ZoomVideoService: Leaving session...');

      if (this.zoomSDK) {
        await this.zoomSDK.leave();
      }

      // Clean up state
      this.participants.clear();
      this.currentUser = null;
      this.isVideoOn = false;
      this.isAudioOn = false;
      this.connectionState = 'Disconnected';

      this.onConnectionStateChanged?.(this.connectionState);

      console.log('✅ ZoomVideoService: Left session successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to leave session:', error);
      throw new VideoServiceError(
        'Failed to leave session',
        this.serviceName,
        VIDEO_ERROR_CODES.CONNECTION_FAILED,
        error
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      console.log('🧹 ZoomVideoService: Destroying...');

      if (this.connectionState === 'Connected') {
        await this.leaveSession();
      }

      // Additional cleanup
      this.participants.clear();
      this.currentUser = null;
      this.zoomSDK = null;

      console.log('✅ ZoomVideoService: Destroyed successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Destroy failed:', error);
    }
  }

  async toggleVideo(): Promise<void> {
    if (this.isVideoOn) {
      await this.stopVideo();
    } else {
      await this.startVideo();
    }
  }

  async toggleAudio(): Promise<void> {
    if (this.isAudioOn) {
      await this.stopAudio();
    } else {
      await this.startAudio();
    }
  }

  async startVideo(): Promise<void> {
    try {
      console.log('🎥 ZoomVideoService: Starting video...');

      if (!this.zoomSDK) {
        throw new Error('Zoom SDK not initialized');
      }

      await this.zoomSDK.startVideo();
      this.isVideoOn = true;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isVideoOn = true;
        this.onVideoStateChanged?.(this.currentUser.id, true);
      }

      console.log('✅ ZoomVideoService: Video started successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to start video:', error);
      throw new VideoServiceError(
        'Failed to start video',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  async stopVideo(): Promise<void> {
    try {
      console.log('🛑 ZoomVideoService: Stopping video...');

      if (this.zoomSDK) {
        await this.zoomSDK.stopVideo();
      }

      this.isVideoOn = false;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isVideoOn = false;
        this.onVideoStateChanged?.(this.currentUser.id, false);
      }

      console.log('✅ ZoomVideoService: Video stopped successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to stop video:', error);
    }
  }

  async startAudio(): Promise<void> {
    try {
      console.log('🎤 ZoomVideoService: Starting audio...');

      if (!this.zoomSDK) {
        throw new Error('Zoom SDK not initialized');
      }

      await this.zoomSDK.startAudio();
      this.isAudioOn = true;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isAudioOn = true;
        this.onAudioStateChanged?.(this.currentUser.id, true);
      }

      console.log('✅ ZoomVideoService: Audio started successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to start audio:', error);
      throw new VideoServiceError(
        'Failed to start audio',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  async stopAudio(): Promise<void> {
    try {
      console.log('🔇 ZoomVideoService: Stopping audio...');

      if (this.zoomSDK) {
        await this.zoomSDK.stopAudio();
      }

      this.isAudioOn = false;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isAudioOn = false;
        this.onAudioStateChanged?.(this.currentUser.id, false);
      }

      console.log('✅ ZoomVideoService: Audio stopped successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to stop audio:', error);
    }
  }

  isVideoEnabled(): boolean {
    return this.isVideoOn;
  }

  isAudioEnabled(): boolean {
    return this.isAudioOn;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getCurrentUser(): VideoParticipant | null {
    return this.currentUser;
  }

  getParticipants(): VideoParticipant[] {
    return Array.from(this.participants.values());
  }

  async renderVideo(participantId: string, element: HTMLElement): Promise<void> {
    try {
      console.log('🎬 ZoomVideoService: Rendering video for participant:', participantId);

      if (!this.zoomSDK) {
        throw new Error('Zoom SDK not initialized');
      }

      // Wait for element to be properly sized with enhanced validation
      const elementReady = await this.waitForElementReady(element, participantId);
      if (!elementReady) {
        throw new Error(`Element not ready for video rendering after timeout`);
      }

      // PRODUCTION FIX: Get dimensions from multiple sources and use the best available
      const clientWidth = element.clientWidth;
      const clientHeight = element.clientHeight;
      const offsetWidth = element.offsetWidth;
      const offsetHeight = element.offsetHeight;
      const computedStyle = window.getComputedStyle(element);
      const computedWidth = parseInt(computedStyle.width) || 0;
      const computedHeight = parseInt(computedStyle.height) || 0;

      // Use the largest valid dimension from any source
      const width = Math.max(clientWidth, offsetWidth, computedWidth) || 300;
      const height = Math.max(clientHeight, offsetHeight, computedHeight) || 200;

      console.log(`🎬 ZoomVideoService: PRODUCTION Element ready - rendering video for ${participantId}:`, {
        elementWidth: width,
        elementHeight: height,
        clientDimensions: `${clientWidth}x${clientHeight}`,
        offsetDimensions: `${offsetWidth}x${offsetHeight}`,
        computedDimensions: `${computedWidth}x${computedHeight}`,
        hasStream: true,
        finalDimensions: `${width}x${height}`
      });

      // CRITICAL: Ensure we never pass 0 dimensions to Zoom SDK
      if (width <= 0 || height <= 0) {
        const fallbackWidth = 300;
        const fallbackHeight = 200;
        console.error(`🆘 CRITICAL: Zero dimensions detected, using fallback ${fallbackWidth}x${fallbackHeight}`);

        // Force the element to have valid dimensions
        element.style.width = `${fallbackWidth}px`;
        element.style.height = `${fallbackHeight}px`;

        // Use fallback dimensions for Zoom SDK
        await this.zoomSDK.renderVideo(
          element,
          participantId,
          fallbackWidth,
          fallbackHeight,
          0, // x
          0, // y
          3  // video quality
        );
      } else {
        // Use validated dimensions
        await this.zoomSDK.renderVideo(
          element,
          participantId,
          width,
          height,
          0, // x
          0, // y
          3  // video quality
        );
      }

      console.log('✅ ZoomVideoService: Video rendered successfully for', participantId);
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to render video:', {
        participantId,
        error: error?.message || 'Unknown error',
        errorMessage: error?.message || 'Unknown error'
      });
      throw new VideoServiceError(
        'Failed to render video',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  /**
   * PRODUCTION FIX: Waits for element and FORCES dimensions via JavaScript
   * This fixes the 0x0 dimension issue that causes Zoom SDK "Unknown error"
   */
  private async waitForElementReady(element: HTMLElement, participantId: string): Promise<boolean> {
    const maxWaitTime = 10000; // Increased to 10 seconds for production
    const checkInterval = 50; // More frequent checks (50ms)
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkElement = () => {
        const elapsed = Date.now() - startTime;

        // CRITICAL: Force element dimensions via JavaScript FIRST
        this.forceElementDimensions(element);

        // Then check both clientWidth and computed styles
        const clientWidth = element.clientWidth;
        const clientHeight = element.clientHeight;
        const computedStyle = window.getComputedStyle(element);
        const computedWidth = parseInt(computedStyle.width) || 0;
        const computedHeight = parseInt(computedStyle.height) || 0;
        const isInDOM = document.contains(element);

        // Enhanced debugging for production
        console.log(`🔍 PRODUCTION Element readiness check for ${participantId}:`, {
          clientWidth,
          clientHeight,
          computedWidth,
          computedHeight,
          isInDOM,
          elapsed: `${elapsed}ms`,
          hasParent: !!element.parentElement,
          offsetWidth: element.offsetWidth,
          offsetHeight: element.offsetHeight,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          boundingRect: element.getBoundingClientRect()
        });

        // Enhanced readiness check - accept ANY valid dimension source
        const hasValidWidth = clientWidth > 0 || computedWidth > 0 || element.offsetWidth > 0;
        const hasValidHeight = clientHeight > 0 || computedHeight > 0 || element.offsetHeight > 0;

        if (hasValidWidth && hasValidHeight && isInDOM) {
          console.log(`✅ PRODUCTION Element ready for ${participantId}: client(${clientWidth}x${clientHeight}) computed(${computedWidth}x${computedHeight}) offset(${element.offsetWidth}x${element.offsetHeight})`);
          resolve(true);
          return;
        }

        // EMERGENCY FALLBACK: After 3 seconds, force dimensions and proceed
        if (elapsed >= 3000) {
          console.warn(`⚠️ EMERGENCY FALLBACK: Forcing dimensions for ${participantId} after ${elapsed}ms`);
          this.emergencyForceDimensions(element);

          // Re-check after forcing
          const finalWidth = element.clientWidth || element.offsetWidth || 300;
          const finalHeight = element.clientHeight || element.offsetHeight || 200;

          if (finalWidth > 0 && finalHeight > 0) {
            console.log(`🆘 EMERGENCY SUCCESS: Forced dimensions ${finalWidth}x${finalHeight} for ${participantId}`);
            resolve(true);
            return;
          }
        }

        // Final timeout check
        if (elapsed >= maxWaitTime) {
          console.error(`❌ PRODUCTION Element readiness FAILED for ${participantId} after ${elapsed}ms:`, {
            finalClientWidth: clientWidth,
            finalClientHeight: clientHeight,
            finalComputedWidth: computedWidth,
            finalComputedHeight: computedHeight,
            isInDOM,
            elementHTML: element.outerHTML.substring(0, 200)
          });
          resolve(false);
          return;
        }

        // Continue checking with exponential backoff for production stability
        const nextInterval = Math.min(checkInterval * 1.1, 200);
        setTimeout(checkElement, nextInterval);
      };

      // Start immediately
      checkElement();
    });
  }

  /**
   * PRODUCTION FIX: Forces element dimensions via direct JavaScript manipulation
   */
  private forceElementDimensions(element: HTMLElement): void {
    try {
      // Force explicit pixel dimensions via JavaScript
      if (!element.style.width || element.style.width === '0px') {
        element.style.width = '300px';
      }
      if (!element.style.height || element.style.height === '0px') {
        element.style.height = '200px';
      }

      // Ensure display is not none
      if (element.style.display === 'none') {
        element.style.display = 'block';
      }

      // Force layout recalculation
      element.offsetHeight; // Force browser to recalculate layout

    } catch (error) {
      console.warn('Error forcing element dimensions:', error);
    }
  }

  /**
   * EMERGENCY FALLBACK: Nuclear option to force video element creation
   */
  private emergencyForceDimensions(element: HTMLElement): void {
    try {
      console.log('🆘 EMERGENCY: Applying nuclear dimension fix');

      // Set all possible dimension properties
      element.style.cssText = `
        width: 300px !important;
        height: 200px !important;
        min-width: 300px !important;
        min-height: 200px !important;
        max-width: none !important;
        max-height: none !important;
        display: block !important;
        position: relative !important;
        box-sizing: border-box !important;
      `;

      // Create inner container if needed
      if (!element.querySelector('.emergency-video-container')) {
        const innerContainer = document.createElement('div');
        innerContainer.className = 'emergency-video-container';
        innerContainer.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        `;
        element.appendChild(innerContainer);
      }

      // Force multiple layout recalculations
      element.offsetHeight;
      element.offsetWidth;
      element.getBoundingClientRect();

    } catch (error) {
      console.error('Emergency dimension forcing failed:', error);
    }
  }

  async stopRenderingVideo(participantId: string): Promise<void> {
    try {
      console.log('🛑 ZoomVideoService: Stopping video rendering for participant:', participantId);

      if (this.zoomSDK) {
        await this.zoomSDK.stopRenderVideo(participantId);
      }

      console.log('✅ ZoomVideoService: Video rendering stopped successfully');
    } catch (error) {
      console.error('❌ ZoomVideoService: Failed to stop video rendering:', error);
    }
  }
}