# FWP-in-Class Developer Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)
- Basic knowledge of React, TypeScript, and WebRTC concepts

### Environment Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd FWP-in-class
npm install
```

2. **Environment Variables Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
VITE_AGORA_APP_ID=your_agora_app_id
VITE_TOKEN_SERVER_URL=http://localhost:3001
```

3. **Start Development Servers**
```bash
# Terminal 1: Main application
npm run dev

# Terminal 2: Token server
npm run dev:server
```

4. **Access Application**
- Frontend: http://localhost:3000
- Token Server: http://localhost:3001

## Development Workflow

### Architecture Overview for Developers

```
📁 src/
├── 🎨 components/         # React UI components
├── ⚙️  services/          # Business logic & SDK wrappers
├── 🪝 hooks/             # React hooks for state management
├── 📝 types/             # TypeScript type definitions
├── ⚙️  config/            # Configuration files
├── 🌐 context/           # React Context providers
└── 🔧 utils/             # Utility functions
```

### Key Development Commands

```bash
# Development
npm run dev                 # Start development server
npm run dev:server         # Start token server
npm run type-check         # TypeScript validation

# Production
npm run build              # Production build
npm run preview            # Preview production build

# Debugging
npm run debug:agora        # Start with Agora debugging enabled
```

## Working with Video Services

### Understanding the Service Layer

The application uses a **strategy pattern** for video service abstraction:

```typescript
// All video services implement this interface
interface IVideoService {
  initialize(): Promise<void>;
  joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void>;
  getParticipants(): VideoParticipant[];
  // ... other methods
}
```

### Switching Between Video Services

```typescript
// In src/config/video.config.ts
export const VIDEO_SERVICE: 'agora' | 'zoom' = 'agora';
```

### Adding a New Video Service

1. **Create Service Implementation**
```typescript
// src/services/newVideoService.ts
export class NewVideoService implements IVideoService {
  async initialize(): Promise<void> {
    // Implementation
  }

  async joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void> {
    // Implementation
  }

  // ... implement all interface methods
}
```

2. **Add to Service Provider**
```typescript
// src/services/videoServiceProvider.ts
export const getVideoService = async (): Promise<IVideoService> => {
  switch (VIDEO_SERVICE) {
    case 'agora': return new AgoraVideoService();
    case 'zoom': return new ZoomVideoService();
    case 'new': return new NewVideoService(); // Add here
    default: throw new Error('Unknown video service');
  }
};
```

3. **Update Configuration**
```typescript
// src/config/video.config.ts
export const VIDEO_SERVICE: 'agora' | 'zoom' | 'new' = 'new';
```

## Component Development Patterns

### Creating UI Components

Follow the established patterns in the codebase:

```typescript
// Standard component structure
interface ComponentProps {
  participant: VideoParticipant;
  isLocal?: boolean;
  className?: string;
}

export const NewComponent: React.FC<ComponentProps> = ({
  participant,
  isLocal = false,
  className = ''
}) => {
  const { videoService } = useFitnessPlatformContext();

  // Component logic here

  return (
    <div className={`component-base ${className}`}>
      {/* Component JSX */}
    </div>
  );
};
```

### Using the Main Hook

```typescript
const {
  // Service instance
  videoService,

  // Connection state
  connectionState,
  isConnecting,
  error,

  // Participants
  participants,
  currentUser,

  // Media states
  isLocalVideoOn,
  isLocalAudioOn,

  // Actions
  joinSession,
  leaveSession,
  toggleVideo,
  toggleAudio,
} = useVideoFitnessPlatform();
```

## State Management Best Practices

### Event-Driven Updates

✅ **Do this** (Event-driven):
```typescript
service.onParticipantJoined = (participant: VideoParticipant) => {
  // Get fresh state from service
  const allParticipants = service.getParticipants();
  setParticipants(allParticipants.map(convertToFitnessParticipant));
};
```

❌ **Don't do this** (Manual state management):
```typescript
service.onParticipantJoined = (participant: VideoParticipant) => {
  // Manually updating state can cause inconsistencies
  setParticipants(prev => [...prev, participant]);
};
```

### Performance Optimization

✅ **Memoize expensive operations**:
```typescript
const ParticipantTile = React.memo(({ participant }) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only re-render when necessary
    renderVideo(participant.id, videoRef.current);
  }, [participant.id, participant.isVideoOn]);

  return <div ref={videoRef} />;
});
```

## Debugging Guide

### Development Tools

1. **Agora Debugger (Global)**
```javascript
// Available in browser console
window.AgoraDebugger.logCurrentState();
window.AgoraDebugger.checkParticipantVisibility();
window.AgoraDebugger.healthCheck();
```

2. **React DevTools**
- Install React DevTools browser extension
- Inspect component state and props
- Profile component performance

3. **Network Tab**
- Monitor WebRTC connections
- Check token server requests
- Analyze media stream quality

### Common Issues and Solutions

#### 1. Video Not Rendering
```typescript
// Check if video service is initialized
console.log('Video service:', videoService?.serviceName);
console.log('Connection state:', connectionState);
console.log('Participants:', participants);

// Verify video tracks
const remoteUsers = videoService?.getRemoteUsers?.();
console.log('Remote users:', remoteUsers);
```

#### 2. Participant State Inconsistencies
```typescript
// Force state synchronization
const syncedParticipants = videoService?.getParticipants();
console.log('Synced participants:', syncedParticipants);

// Check event handlers
console.log('Event handlers:', {
  onParticipantJoined: !!videoService?.onParticipantJoined,
  onParticipantLeft: !!videoService?.onParticipantLeft,
});
```

#### 3. Token Server Issues
```typescript
// Test token generation
fetch('http://localhost:3001/rtc-token?channelName=test&uid=12345&role=host')
  .then(res => res.json())
  .then(data => console.log('Token response:', data));
```

## Testing Strategy

### Unit Tests
```typescript
// Example test structure
describe('AgoraVideoService', () => {
  let service: AgoraVideoService;

  beforeEach(() => {
    service = new AgoraVideoService();
  });

  it('should initialize correctly', async () => {
    await service.initialize();
    expect(service.serviceName).toBe('Agora RTC SDK');
  });

  it('should handle participant join events', () => {
    const mockParticipant = { id: '123', name: 'Test User' };
    const joinHandler = jest.fn();

    service.onParticipantJoined = joinHandler;
    // Trigger join event
    expect(joinHandler).toHaveBeenCalledWith(mockParticipant);
  });
});
```

### Integration Tests
```typescript
// Test complete user flow
describe('Session Flow', () => {
  it('should complete coach session creation flow', async () => {
    const { result } = renderHook(() => useVideoFitnessPlatform());

    // Test session creation
    await act(async () => {
      await result.current.joinSession('Coach Name', 'coach', 'test-session');
    });

    expect(result.current.currentUser?.name).toBe('Coach Name');
    expect(result.current.currentUser?.isHost).toBe(true);
  });
});
```

### Manual Testing Checklist

**Pre-deployment Checklist:**
- [ ] Coach can create session
- [ ] Students can join session
- [ ] Video/audio controls work
- [ ] Participant lists are consistent
- [ ] Session sharing works
- [ ] Error handling graceful
- [ ] Performance acceptable (< 50% CPU)
- [ ] Network adaptation works

## Performance Guidelines

### Memory Management
```typescript
// Always cleanup resources
useEffect(() => {
  return () => {
    if (videoService) {
      videoService.destroy().catch(console.error);
    }
  };
}, []);
```

### Video Quality Optimization
```typescript
// Implement adaptive quality
const optimizeVideoQuality = (networkQuality: number) => {
  if (networkQuality >= 4) {
    // Reduce quality for poor network
    videoTrack.setEncoderConfiguration({
      width: 480,
      height: 360,
      frameRate: 15,
      bitrateMax: 500
    });
  }
};
```

### Bundle Size Optimization
```typescript
// Use dynamic imports for large dependencies
const importHeavyLibrary = async () => {
  const { default: HeavyLib } = await import('./heavy-library');
  return new HeavyLib();
};
```

## Security Best Practices

### Environment Variables
```bash
# Client-side (prefixed with VITE_)
VITE_AGORA_APP_ID=public_app_id        # Safe to expose

# Server-side only (no VITE_ prefix)
AGORA_APP_CERTIFICATE=secret_cert      # Keep secret
TOKEN_SERVER_SECRET=jwt_secret         # Keep secret
```

### Token Management
```typescript
// Tokens should expire and be refreshed
const generateToken = async (channelName: string, uid: string, role: string) => {
  const response = await fetch('/rtc-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, uid, role, expirationTimeInSeconds: 3600 })
  });

  if (!response.ok) {
    throw new Error('Token generation failed');
  }

  return response.json();
};
```

## Deployment Guide

### Development Deployment
```bash
# Build for development
npm run build:dev

# Test production build locally
npm run preview
```

### Production Deployment
1. **Prepare Environment**
```bash
# Ensure all environment variables are set
echo "VITE_AGORA_APP_ID=${VITE_AGORA_APP_ID}"
echo "VITE_TOKEN_SERVER_URL=${VITE_TOKEN_SERVER_URL}"
```

2. **Build and Deploy**
```bash
# Production build
npm run build

# Deploy to AWS Amplify (automatic on master branch push)
git push origin master
```

3. **Verify Deployment**
- Check Amplify build logs
- Test core functionality
- Monitor error rates

## Contributing Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use Prettier for code formatting

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-functionality

# Make changes and commit
git add .
git commit -m "Add new functionality

Detailed description of changes made."

# Push and create pull request
git push origin feature/new-functionality
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Changes Made
- Added new video service implementation
- Updated participant state management
- Fixed audio synchronization issue

## Testing
- [ ] Manual testing completed
- [ ] Unit tests pass
- [ ] Integration tests pass

## Deployment Notes
- Requires new environment variable: NEW_CONFIG
- Update documentation after merge
```

## Troubleshooting

### Common Development Issues

1. **Port Already in Use**
```bash
# Find process using port
lsof -i :3000
kill -9 <PID>

# Or use different port
npm run dev -- --port 3002
```

2. **TypeScript Errors**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

3. **Build Failures**
```bash
# Clear all caches
rm -rf node_modules dist .vite
npm install
npm run build
```

4. **WebRTC Connection Issues**
```javascript
// Check WebRTC support
console.log('WebRTC supported:', !!window.RTCPeerConnection);

// Check network connectivity
navigator.connection && console.log('Network:', navigator.connection);
```

---

*This developer guide covers the essential knowledge needed to work effectively with the FWP-in-Class codebase. For detailed API documentation, refer to ARCHITECTURE.md.*