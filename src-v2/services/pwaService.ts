/**
 * PWA Service Manager for FitWithPari V2
 * Handles service worker registration, app installation, and offline capabilities
 */

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isOfflineCapable: boolean;
  hasNotifications: boolean;
  hasCameraAccess: boolean;
  hasMicrophoneAccess: boolean;
}

export class PWAService {
  private static instance: PWAService;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private isRegistered = false;

  private constructor() {
    this.initializePWA();
  }

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  /**
   * Initialize PWA functionality
   */
  private async initializePWA(): Promise<void> {
    try {
      console.log('🚀 PWA: Initializing FitWithPari PWA service');

      // Register service worker
      await this.registerServiceWorker();

      // Setup install prompt handling
      this.setupInstallPrompt();

      // Setup notification permissions
      this.setupNotifications();

      // Setup media permissions for video calling
      this.setupMediaPermissions();

      // Handle app updates
      this.setupUpdateHandling();

      console.log('✅ PWA: FitWithPari PWA service initialized');

    } catch (error) {
      console.error('❌ PWA: Failed to initialize PWA service:', error);
    }
  }

  /**
   * Register service worker for caching and offline support
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ PWA: Service workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      this.serviceWorker = registration;
      this.isRegistered = true;

      console.log('✅ PWA: Service worker registered successfully');

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 PWA: New service worker version found');
        this.handleServiceWorkerUpdate(registration);
      });

    } catch (error) {
      console.error('❌ PWA: Service worker registration failed:', error);
    }
  }

  /**
   * Setup app installation prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('📱 PWA: Install prompt available');
      event.preventDefault();
      this.installPrompt = event as any;

      // Notify the app that installation is available
      this.dispatchPWAEvent('install-available', { canInstall: true });
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA: App installed successfully');
      this.installPrompt = null;
      this.dispatchPWAEvent('app-installed', { installed: true });
    });
  }

  /**
   * Setup notification permissions for session alerts
   */
  private async setupNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('⚠️ PWA: Notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 PWA: Notification permission:', permission);

      if (permission === 'granted') {
        this.dispatchPWAEvent('notifications-enabled', { enabled: true });
      }
    } catch (error) {
      console.error('❌ PWA: Failed to setup notifications:', error);
    }
  }

  /**
   * Setup media permissions for video calling
   */
  private async setupMediaPermissions(): Promise<void> {
    try {
      // Check if we can access camera and microphone
      const capabilities = await this.checkMediaCapabilities();
      console.log('🎥 PWA: Media capabilities:', capabilities);

      this.dispatchPWAEvent('media-capabilities', capabilities);

    } catch (error) {
      console.error('❌ PWA: Failed to check media capabilities:', error);
    }
  }

  /**
   * Setup update handling for new app versions
   */
  private setupUpdateHandling(): void {
    // Listen for app update events
    window.addEventListener('beforeunload', () => {
      if (this.serviceWorker) {
        console.log('🔄 PWA: Checking for updates before unload');
      }
    });

    // Setup periodic update checks
    if (this.serviceWorker) {
      setInterval(() => {
        this.serviceWorker?.update().catch(() => {
          // Silent fail for background updates
        });
      }, 60000); // Check every minute
    }
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('🔄 PWA: New version available - prompting user');
        this.dispatchPWAEvent('update-available', {
          canUpdate: true,
          version: 'latest'
        });
      }
    });
  }

  /**
   * Prompt user to install the app
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('⚠️ PWA: Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;

      console.log('📱 PWA: User install choice:', choice.outcome);
      this.installPrompt = null;

      return choice.outcome === 'accepted';

    } catch (error) {
      console.error('❌ PWA: Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.serviceWorker) {
      console.warn('⚠️ PWA: No service worker to update');
      return;
    }

    try {
      await this.serviceWorker.update();
      window.location.reload();
    } catch (error) {
      console.error('❌ PWA: Service worker update failed:', error);
    }
  }

  /**
   * Send notification for session reminders
   */
  async sendSessionNotification(title: string, body: string, sessionUrl?: string): Promise<void> {
    if (!this.serviceWorker || Notification.permission !== 'granted') {
      console.warn('⚠️ PWA: Cannot send notification - permission denied or no SW');
      return;
    }

    try {
      await this.serviceWorker.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // vibrate: [200, 100, 200], // Not supported in all browsers
        data: { url: sessionUrl || '/' },
        actions: sessionUrl ? [
          { action: 'join', title: 'Join Session', icon: '/icons/join-icon.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss-icon.png' }
        ] : undefined
      });

      console.log('🔔 PWA: Notification sent:', title);

    } catch (error) {
      console.error('❌ PWA: Failed to send notification:', error);
    }
  }

  /**
   * Check current PWA capabilities
   */
  async getCapabilities(): Promise<PWACapabilities> {
    const mediaCapabilities = await this.checkMediaCapabilities();

    return {
      isInstallable: !!this.installPrompt,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isOfflineCapable: this.isRegistered,
      hasNotifications: Notification.permission === 'granted',
      hasCameraAccess: mediaCapabilities.camera,
      hasMicrophoneAccess: mediaCapabilities.microphone
    };
  }

  /**
   * Check media device capabilities
   */
  private async checkMediaCapabilities(): Promise<{ camera: boolean; microphone: boolean }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      return {
        camera: devices.some(device => device.kind === 'videoinput'),
        microphone: devices.some(device => device.kind === 'audioinput')
      };

    } catch (error) {
      console.warn('⚠️ PWA: Could not check media capabilities:', error);
      return { camera: false, microphone: false };
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.serviceWorker) {
      console.warn('⚠️ PWA: No service worker to clear cache');
      return;
    }

    try {
      // Send message to service worker to clear caches
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller?.postMessage({
          type: 'CLEAR_CACHE'
        });
      }

      console.log('🗑️ PWA: Cache clear requested');

    } catch (error) {
      console.error('❌ PWA: Failed to clear cache:', error);
    }
  }

  /**
   * Get cache status and size
   */
  async getCacheStatus(): Promise<any> {
    if (!this.serviceWorker || !navigator.serviceWorker.controller) {
      return { available: false };
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATUS') {
          resolve(event.data.data);
        }
      };

      navigator.serviceWorker.controller?.postMessage({
        type: 'GET_CACHE_STATUS'
      }, [messageChannel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => resolve({ available: false, timeout: true }), 5000);
    });
  }

  /**
   * Dispatch PWA-related events to the application
   */
  private dispatchPWAEvent(type: string, detail: any): void {
    const event = new CustomEvent(`pwa-${type}`, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Add message listener for service worker communications
   */
  setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'NETWORK_RECOVERY':
          console.log('🌐 PWA: Network recovered');
          this.dispatchPWAEvent('network-recovery', data);
          break;

        case 'CACHE_STATUS':
          this.dispatchPWAEvent('cache-status', data);
          break;

        default:
          console.log('📨 PWA: Received message from SW:', type, data);
      }
    });
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();