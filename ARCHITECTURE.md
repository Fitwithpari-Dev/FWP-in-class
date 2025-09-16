# FWP-in-Class Architecture Documentation

## Overview

FWP-in-Class (Fit With Pari - In Class) is a real-time video fitness platform built with React and TypeScript, supporting both Zoom and Agora video SDKs for scalable online fitness classes. The platform enables coaches to conduct live fitness sessions with students, supporting features like role-based access, real-time participant management, and adaptive video streaming.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Token Server  │    │   Video SDKs    │
│   React/TypeScript  │    │   Node.js      │    │   Agora/Zoom    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   AWS Amplify   │
                    │   (Deployment)  │
                    └─────────────────┘
```

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Video SDKs**: Agora Video SDK, Zoom Video SDK
- **UI Framework**: Tailwind CSS + Shadcn/UI
- **State Management**: React Context + Custom Hooks
- **Deployment**: AWS Amplify
- **Token Server**: Node.js + Express

## Core Architecture Patterns

### 1. Service Layer Pattern

The application uses a layered architecture with clear separation of concerns:

#### Video Service Abstraction Layer
```typescript
// Unified interface for video services
interface IVideoService {
  initialize(): Promise<void>;
  joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void>;
  leaveSession(): Promise<void>;
  getParticipants(): VideoParticipant[];
  // ... other methods
}
```

#### Implementation Hierarchy
```
IVideoService (Interface)
    ├── AgoraVideoService (Implementation)
    │   └── AgoraSDKService (Low-level SDK wrapper)
    └── ZoomVideoService (Implementation)
        └── ZoomSDKService (Low-level SDK wrapper)
```

### 2. Provider Pattern for Video Service Selection

```typescript
// Video service provider - factory pattern
export const getVideoService = async (): Promise<IVideoService> => {
  const service = VIDEO_SERVICE === 'agora'
    ? new AgoraVideoService()
    : new ZoomVideoService();

  return service;
};
```

### 3. Event-Driven Architecture (WebRTC Best Practices)

Following WebRTC industry standards, the system uses pure event-driven state management:

```typescript
// Event-driven participant state updates
service.onParticipantJoined = (participant: VideoParticipant) => {
  // Reactive state update triggered by WebRTC events
  const allParticipants = service.getParticipants();
  setParticipants(allParticipants.map(convertToFitnessParticipant));
};
```

**Key Benefits:**
- ✅ No polling/intervals (performance-efficient)
- ✅ Real-time responsiveness to WebRTC events
- ✅ Consistent state across all clients
- ✅ Follows SFU (Selective Forwarding Unit) patterns

## Directory Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (Shadcn)
│   ├── AgoraVideoTile.tsx
│   ├── UnifiedVideoTile.tsx
│   ├── CoachView.tsx
│   ├── StudentView.tsx
│   └── ...
├── services/            # Business logic & SDK wrappers
│   ├── agoraSDKService.ts      # Low-level Agora SDK wrapper
│   ├── agoraVideoService.ts    # Business logic for Agora
│   ├── zoomSDKService.ts       # Low-level Zoom SDK wrapper
│   ├── zoomVideoService.ts     # Business logic for Zoom
│   ├── videoServiceProvider.ts # Service factory
│   └── tokenService.ts         # Authentication tokens
├── hooks/               # React hooks for state management
│   ├── useVideoFitnessPlatform.ts  # Main video platform hook
│   ├── useFitnessPlatform.ts       # Legacy Zoom hook
│   └── usePerformanceMonitoring.ts
├── types/               # TypeScript type definitions
│   ├── video-service.ts        # Video service interfaces
│   └── fitness-platform.ts     # Domain types
├── config/              # Configuration files
│   ├── video.config.ts         # Video service selection
│   ├── agora.config.ts         # Agora configuration
│   └── zoom.config.ts          # Zoom configuration
├── context/             # React Context providers
│   └── FitnessPlatformContext.tsx
└── utils/               # Utility functions
    └── agoraDebugger.ts        # Development debugging tools
```

## Key Architectural Components

### 1. Unified Video Service Interface

**Purpose**: Abstract away differences between Zoom and Agora SDKs

**Key Files**:
- `src/types/video-service.ts` - Interface definitions
- `src/services/videoServiceProvider.ts` - Service factory
- `src/hooks/useVideoFitnessPlatform.ts` - React integration

**Design Pattern**: Strategy + Factory Pattern

```typescript
// Unified participant model
interface VideoParticipant {
  id: string;
  name: string;
  isHost: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  role: UserRole;
}
```

### 2. State Management Architecture

**Primary Hook**: `useVideoFitnessPlatform`

**State Synchronization Strategy**:
```typescript
// Single source of truth from video service
const synchronizeParticipantState = (): VideoParticipant[] => {
  const remoteUsers = agoraService.getRemoteUsers();
  const participants = remoteUsers.map(user => ({
    id: String(user.uid),
    name: participantNames.get(String(user.uid)) || `User ${user.uid}`,
    isVideoOn: !!user.videoTrack && user.videoTrack.enabled,
    isAudioOn: !!user.audioTrack && user.audioTrack.enabled,
    // ... other properties
  }));
  return participants;
};
```

**Key State Variables**:
- `participants: VideoParticipant[]` - All session participants
- `currentUser: VideoParticipant | null` - Current user info
- `connectionState: ConnectionState` - WebRTC connection status
- `isLocalVideoOn: boolean` - Local video state
- `isLocalAudioOn: boolean` - Local audio state

### 3. Component Architecture

#### View Components (Role-based)
```
App.tsx
├── RoleSelection.tsx (Initial role selection)
├── CoachView.tsx (Coach-specific interface)
│   ├── TeachModeView.tsx
│   ├── ExerciseTargetSelector.tsx
│   └── StudentLevelGroups.tsx
├── StudentView.tsx (Student-specific interface)
└── Shared Components:
    ├── UnifiedVideoTile.tsx (Works with both SDKs)
    ├── ControlBar.tsx (Audio/Video controls)
    ├── TopBar.tsx (Session info)
    └── SessionManager.tsx (Session coordination)
```

#### Video Rendering Components
```
UnifiedVideoTile.tsx (Universal)
├── AgoraVideoTile.tsx (Agora-specific optimizations)
└── ParticipantTile.tsx (Legacy Zoom support)
```

## WebRTC Integration Patterns

### 1. SFU Architecture (Agora)

```
Coach ────┐
          │
Student A ├─── Agora SFU Server ───── Media Distribution
          │
Student B ─┘
```

**Benefits**:
- Scalable to 50+ participants
- Centralized media processing
- Adaptive bitrate streaming
- Lower client-side resource usage

### 2. P2P Architecture (Zoom SDK)

```
Coach ↔ Student A
  ↕       ↕
Student B ↔ Student C
```

**Benefits**:
- Lower latency for small groups
- Direct peer connections
- Built-in Zoom ecosystem features

### 3. Event Flow Architecture

```
WebRTC SDK Events → Service Layer → React Hooks → Component State → UI Updates
```

**Event Types Handled**:
- `user-joined` → `onParticipantJoined`
- `user-left` → `onParticipantLeft`
- `user-published` → `onVideoStateChanged`
- `user-unpublished` → `onAudioStateChanged`

## Token Management Architecture

### Token Server (Node.js)
```
GET /rtc-token?channelName=<channel>&uid=<uid>&role=<role>
```

**Security Features**:
- CORS configuration for development/production
- Token expiration (1 hour default)
- Role-based token generation
- Environment-based configuration

### Client Token Flow
```
1. Join Session Request
2. Generate Channel Name (session-based)
3. Request Token from Server
4. Use Token for WebRTC Connection
5. Handle Token Expiration
```

## Configuration Management

### Environment-Based Configuration

```typescript
// Production vs Development
const config = {
  agora: {
    appId: process.env.VITE_AGORA_APP_ID,
    tokenServer: process.env.VITE_TOKEN_SERVER_URL,
  },
  deployment: {
    aws: process.env.VITE_AWS_REGION,
  }
};
```

### Feature Flags
```typescript
// Video service selection
export const VIDEO_SERVICE: 'agora' | 'zoom' = 'agora';
```

## Performance Optimizations

### 1. Video Quality Adaptation
```typescript
// Network-based quality adjustment
if (networkQuality >= 4) { // Poor network
  videoTrack.setEncoderConfiguration({
    width: 480, height: 360,
    frameRate: 15, bitrateMax: 500
  });
}
```

### 2. Component Optimization Patterns
```typescript
// Memoized video rendering
const UnifiedVideoTile = React.memo(({ participant, isLocal }) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only re-render when participant video state changes
    renderVideo(participant.id, videoRef.current);
  }, [participant.id, participant.isVideoOn]);
});
```

### 3. State Update Optimization
```typescript
// Batch state updates for performance
setParticipants(prev => {
  const allParticipants = service.getParticipants();
  return allParticipants.map(convertToFitnessParticipant);
});
```

## Error Handling & Resilience

### 1. Service-Level Error Handling
```typescript
class VideoServiceError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public errorCode: string,
    public originalError?: any
  ) {
    super(message);
  }
}
```

### 2. Connection Recovery Patterns
```typescript
// Auto-reconnection logic
service.onConnectionStateChanged = (state: ConnectionState) => {
  if (state === 'Disconnected') {
    // Attempt reconnection
    setTimeout(() => attemptReconnection(), 3000);
  }
};
```

### 3. Fallback Service Support
```typescript
// Switch between video services
export const switchToFallbackService = async (): Promise<IVideoService> => {
  const fallbackService = VIDEO_SERVICE === 'agora'
    ? new ZoomVideoService()
    : new AgoraVideoService();

  return fallbackService;
};
```

## Development & Debugging

### Development Tools
```typescript
// Global debugging interface
window.AgoraDebugger = {
  logCurrentState: () => console.log(participants),
  checkParticipantVisibility: () => { /* ... */ },
  healthCheck: () => { /* ... */ }
};
```

### Environment Setup
```bash
# Development
npm run dev              # Local development server
npm run dev:server      # Token server

# Production
npm run build           # Production build
npm run preview         # Preview production build
```

## Deployment Architecture

### AWS Amplify Integration
```yaml
# amplify.yml (simplified)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

### CI/CD Pipeline
1. Code commits to `master` branch
2. AWS Amplify auto-deployment
3. Build process includes type checking
4. Automatic deployment to production domain

## Security Considerations

### 1. Token Security
- Tokens expire after 1 hour
- Server-side token generation
- No sensitive credentials in client code

### 2. CORS Configuration
```javascript
// Development vs Production CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-production-domain.com']
  : ['http://localhost:3000', 'http://localhost:5173'];
```

### 3. Environment Variable Management
```
VITE_AGORA_APP_ID=xxx          # Public (Vite prefix for client access)
TOKEN_SERVER_SECRET=xxx        # Server-only
AGORA_APP_CERTIFICATE=xxx      # Server-only
```

## Scalability Considerations

### Current Capacity
- **Agora**: Up to 50+ participants per session
- **Zoom**: Optimized for smaller groups (< 20)

### Horizontal Scaling Strategies
1. **Multiple Session Support**: Each session is an independent channel
2. **Regional Token Servers**: Deploy token servers in multiple regions
3. **CDN Integration**: Static assets served via AWS CloudFront
4. **Database Integration**: Future support for persistent session data

## WebRTC Best Practices (Google web.dev Standards)

### Core WebRTC Implementation Principles

#### 1. MediaStream API Best Practices
```typescript
// Following Google's recommendations for device handling
const getUserMediaConstraints = {
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Proper error handling for device access
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  // Handle stream
} catch (error) {
  // Handle permission denied, device not found, etc.
  handleMediaError(error);
}
```

#### 2. RTCPeerConnection Management
Our Agora SDK abstracts RTCPeerConnection, but provides these WebRTC features:
- **Packet Loss Concealment**: Automatic recovery from network issues
- **Echo Cancellation**: Built-in audio processing
- **Bandwidth Adaptivity**: Dynamic quality adjustment
- **Dynamic Jitter Buffering**: Smooth playback despite network variations

#### 3. ICE Framework Implementation
```typescript
// Network traversal handled by Agora's infrastructure
// Equivalent to Google's ICE recommendations:
const iceServers = [
  { urls: 'stun:stun.agora.io:3478' },        // STUN for NAT traversal
  { urls: 'turn:turn.agora.io:3478', ... }    // TURN for firewall bypass
];
```

#### 4. Signaling Architecture (Token Server)
Following Google's signaling server pattern:
```typescript
// Session Discovery & Coordination
POST /rtc-token
{
  "channelName": "fitness-session-123",
  "uid": "user-456",
  "role": "host|audience",
  "expirationTimeInSeconds": 3600
}

// Response includes WebRTC connection credentials
{
  "token": "jwt-token-for-webrtc-auth",
  "channelName": "fitness-session-123",
  "uid": 789
}
```

### Performance Optimization (Google Standards)

#### 1. Adaptive Bitrate Streaming
```typescript
// Network-aware quality adjustment
const adaptVideoQuality = (networkStats: NetworkQualityStats) => {
  if (networkStats.uplink >= 4) { // Poor network
    videoTrack.setEncoderConfiguration({
      width: 480, height: 360,
      frameRate: 15, bitrateMax: 500  // Reduce for stability
    });
  } else if (networkStats.uplink <= 2) { // Good network
    videoTrack.setEncoderConfiguration({
      width: 1280, height: 720,
      frameRate: 30, bitrateMax: 2500  // Increase for quality
    });
  }
};
```

#### 2. Browser Compatibility (adapter.js pattern)
Our Agora SDK handles cross-browser compatibility internally, equivalent to:
```javascript
// What Agora SDK does internally (following Google's adapter.js pattern)
import adapter from 'webrtc-adapter';

// Normalizes browser differences for:
// - getUserMedia API variations
// - RTCPeerConnection implementation differences
// - ICE candidate handling
// - MediaStream track management
```

#### 3. Resource Management
```typescript
// Following Google's cleanup recommendations
const cleanupWebRTCResources = async () => {
  // Stop all tracks
  localStream?.getTracks().forEach(track => track.stop());

  // Close peer connections
  await peerConnection?.close();

  // Clear event handlers
  peerConnection = null;
  localStream = null;
};
```

### Security Implementation (Google Standards)

#### 1. Mandatory Encryption
- ✅ All WebRTC communication encrypted by default (DTLS-SRTP)
- ✅ Agora handles encryption keys automatically
- ✅ No plaintext media transmission possible

#### 2. Permission Management
```typescript
// Explicit user consent following Google guidelines
const requestMediaPermissions = async () => {
  try {
    // Request permissions explicitly
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Show user what's being shared
    showLocalPreview(stream);

    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      showPermissionDeniedError();
    } else if (error.name === 'NotFoundError') {
      showDeviceNotFoundError();
    }
    throw error;
  }
};
```

#### 3. Sandboxed Execution
- ✅ All WebRTC APIs run in browser security sandbox
- ✅ No direct system access
- ✅ Origin-based security model

### Fitness Platform Specific Optimizations

#### 1. Multi-Participant Scaling (SFU Pattern)
Google recommends SFU for multi-party calls:
```
Coach ────┐
          │
Student A ├─── Agora SFU ───── Optimized Distribution
          │      (Handles)       - Bandwidth optimization
Student B ─┘                    - CPU offloading from clients
                                 - Adaptive quality per participant
```

#### 2. Fitness-Specific Media Handling
```typescript
// Optimized for fitness use cases
const fitnessVideoConstraints = {
  video: {
    width: { ideal: 1280 },      // Good for form checking
    height: { ideal: 720 },
    frameRate: { ideal: 30 },    // Smooth movement tracking
    facingMode: 'user'           // Front camera for demonstrations
  },
  audio: {
    echoCancellation: true,      // Critical for instruction clarity
    noiseSuppression: true,      // Filter background noise
    autoGainControl: true        // Consistent voice levels
  }
};
```

## Future Architecture Improvements

### Planned Enhancements
1. **Enhanced Signaling**: Custom WebSocket signaling for fitness-specific features
2. **Database Integration**: Persistent user and session management
3. **Recording Service**: Cloud-based session recording with fitness analytics
4. **Real-time Analytics**: Performance metrics and participant engagement
5. **Mobile SDK Integration**: React Native support for mobile fitness apps

### WebRTC Evolution Strategy
```
Current: Agora SFU + Token Server
Future: Custom WebRTC + Agora Hybrid + Analytics + Recording
```

### Microservices Evolution
```
Current: Monolithic Frontend + Token Server
Future: Frontend + Session Service + User Service + Recording Service + Analytics
```

## API Documentation

### Video Service Interface
```typescript
interface IVideoService {
  // Core lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Session management
  joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void>;
  leaveSession(): Promise<void>;

  // Media controls
  startVideo(): Promise<void>;
  stopVideo(): Promise<void>;
  startAudio(): Promise<void>;
  stopAudio(): Promise<void>;

  // State getters
  getParticipants(): VideoParticipant[];
  getCurrentUser(): VideoParticipant | null;
  getConnectionState(): ConnectionState;

  // Video rendering
  renderVideo(participantId: string, container: HTMLElement): Promise<void>;
  stopRenderingVideo(participantId: string): Promise<void>;
}
```

### Event Callbacks
```typescript
interface VideoServiceEvents {
  onParticipantJoined?: (participant: VideoParticipant) => void;
  onParticipantLeft?: (participant: VideoParticipant) => void;
  onVideoStateChanged?: (participantId: string, isVideoOn: boolean) => void;
  onAudioStateChanged?: (participantId: string, isAudioOn: boolean) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}
```

## Performance Monitoring

### Metrics Tracked
- Video rendering performance
- Connection state changes
- Participant join/leave latency
- Network quality indicators
- Error rates and types

### Monitoring Hook
```typescript
const { performance, networkQuality } = usePerformanceMonitoring({
  trackVideoRendering: true,
  trackNetworkQuality: true,
  reportingInterval: 30000 // 30 seconds
});
```

---

*This architecture document is maintained to reflect the current state of the FWP-in-Class platform. For implementation details, refer to the codebase and inline documentation.*