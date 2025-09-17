// FitWithPari Service Worker - Optimized for Video Fitness Platform
// Version 1.0 - Video Calling & Offline Support

const CACHE_NAME = 'fitwithpari-v2-v1.0';
const VIDEO_CACHE = 'fitwithpari-video-assets-v1.0';
const DYNAMIC_CACHE = 'fitwithpari-dynamic-v1.0';

// Critical assets for video calling functionality
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Video SDK and real-time assets (cache with special strategies)
const VIDEO_ASSETS = [
  // Zoom SDK assets
  'https://source.zoom.us/2.18.0/lib/av/zmssdk.js',
  'https://source.zoom.us/videosdk/ZoomVideo.js',
  // Agora SDK assets
  'https://download.agora.io/sdk/web/AgoraRTC_N.js'
];

// Network-first resources (always fresh when online)
const NETWORK_FIRST = [
  '/api/',
  'lambda-url.ap-south-1.on.aws',
  'supabase.co'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('🚀 FitWithPari SW: Installing service worker for video platform');

  event.waitUntil(
    Promise.all([
      // Cache critical app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 SW: Caching critical app assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),

      // Cache video SDK assets with error handling
      caches.open(VIDEO_CACHE).then((cache) => {
        console.log('🎥 SW: Caching video SDK assets');
        return Promise.allSettled(
          VIDEO_ASSETS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`⚠️ SW: Failed to cache ${url}:`, err)
            )
          )
        );
      })
    ]).then(() => {
      console.log('✅ SW: Installation complete - video platform ready');
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 FitWithPari SW: Activating new service worker');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME &&
              cacheName !== VIDEO_CACHE &&
              cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ SW: Activation complete - taking control');
      return self.clients.claim();
    })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Video SDK assets - Cache first with network fallback
  if (VIDEO_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(cacheFirstStrategy(request, VIDEO_CACHE));
    return;
  }

  // API calls - Network first (real-time data)
  if (NETWORK_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // WebRTC/Socket connections - Pass through (no caching)
  if (request.url.includes('socket.io') ||
      request.url.includes('websocket') ||
      request.url.includes('webrtc')) {
    return; // Don't intercept real-time connections
  }

  // App shell and static assets - Cache first
  event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
});

// Cache-first strategy (for app shell and video SDKs)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log(`📦 SW: Serving from cache: ${request.url.substring(0, 50)}...`);

      // Update cache in background if online
      if (navigator.onLine) {
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {/* Silent fail for background updates */});
      }

      return cachedResponse;
    }

    // Not in cache - fetch and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log(`🌐 SW: Fetched and cached: ${request.url.substring(0, 50)}...`);
    }
    return networkResponse;

  } catch (error) {
    console.error('❌ SW: Cache-first strategy failed:', error);

    // Fallback for critical navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/') || new Response('App offline', { status: 503 });
    }

    throw error;
  }
}

// Network-first strategy (for API calls and real-time data)
async function networkFirstStrategy(request) {
  try {
    console.log(`🌐 SW: Network-first for: ${request.url.substring(0, 50)}...`);
    const networkResponse = await fetch(request);

    // Cache successful responses for offline fallback
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.warn(`⚠️ SW: Network failed, trying cache: ${request.url.substring(0, 50)}...`);

    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Background sync for video session recovery
self.addEventListener('sync', (event) => {
  if (event.tag === 'video-session-recovery') {
    console.log('🔄 SW: Background sync - video session recovery');
    event.waitUntil(handleVideoSessionRecovery());
  }
});

async function handleVideoSessionRecovery() {
  try {
    // Notify all clients that network is back
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_RECOVERY',
        message: 'Connection restored - attempting to rejoin video session'
      });
    });
  } catch (error) {
    console.error('❌ SW: Video session recovery failed:', error);
  }
}

// Push notifications for session invites
self.addEventListener('push', (event) => {
  const options = {
    body: 'Your fitness class is starting soon!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/?notification=session-starting'
    },
    actions: [
      {
        action: 'join',
        title: 'Join Now',
        icon: '/icons/join-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FitWithPari - Session Starting', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'join') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_VIDEO_ASSETS':
      console.log('📥 SW: Received request to cache video assets');
      event.waitUntil(cacheVideoAssets(data.assets));
      break;

    case 'CLEAR_CACHE':
      console.log('🗑️ SW: Received request to clear cache');
      event.waitUntil(clearAllCaches());
      break;

    case 'GET_CACHE_STATUS':
      event.waitUntil(sendCacheStatus(event.source));
      break;
  }
});

async function cacheVideoAssets(assets) {
  try {
    const cache = await caches.open(VIDEO_CACHE);
    await Promise.allSettled(
      assets.map(asset => cache.add(asset).catch(err =>
        console.warn(`⚠️ SW: Failed to cache asset ${asset}:`, err)
      ))
    );
    console.log('✅ SW: Video assets cached successfully');
  } catch (error) {
    console.error('❌ SW: Failed to cache video assets:', error);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('✅ SW: All caches cleared');
  } catch (error) {
    console.error('❌ SW: Failed to clear caches:', error);
  }
}

async function sendCacheStatus(client) {
  try {
    const cacheNames = await caches.keys();
    const status = {
      caches: cacheNames,
      online: navigator.onLine,
      ready: true
    };
    client.postMessage({ type: 'CACHE_STATUS', data: status });
  } catch (error) {
    console.error('❌ SW: Failed to send cache status:', error);
  }
}

console.log('🎯 FitWithPari Service Worker loaded - Video platform PWA ready!');