# Zoom Video SDK Integration Guide for FitWithPari

## Overview
This guide provides step-by-step instructions for transitioning from the mock Zoom SDK implementation to the real Zoom Video SDK in the FitWithPari fitness platform.

## Prerequisites

### 1. Zoom Video SDK Account Setup
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/develop/create)
2. Create a new Video SDK App (not Meeting SDK)
3. Note down your credentials:
   - SDK Key (Client ID)
   - SDK Secret (Client Secret)

### 2. Environment Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Zoom credentials to `.env`:
   ```
   VITE_ZOOM_SDK_KEY=your_actual_sdk_key
   VITE_ZOOM_SDK_SECRET=your_actual_sdk_secret
   ```

### 3. Install Dependencies
```bash
npm install
```

## Architecture Overview

### Key Components

1. **ZoomSDKService** (`src/services/zoomSDKService.ts`)
   - Core SDK wrapper with fitness-specific optimizations
   - Handles all Zoom Video SDK interactions
   - Optimized for 50+ participant sessions
   - Implements single canvas rendering for performance

2. **FitnessPlatformContext** (`src/context/FitnessPlatformContext.tsx`)
   - React Context providing SDK access throughout the app
   - Manages global state for session, participants, and controls
   - Handles real-time events and updates

3. **VideoCanvas** (`src/components/VideoCanvas.tsx`)
   - Individual participant video renderer
   - Optimized for fitness class requirements
   - Shows health considerations and rep counts

4. **VideoGallery** (`src/components/VideoGallery.tsx`)
   - Gallery view optimized for large classes
   - Pagination for 50+ participants
   - Level-based grouping for fitness classes

## Migration Steps

### Step 1: Update Your Components

Replace the mock hook import in your components:

```typescript
// OLD - Remove this
import { useFitnessPlatform } from '../hooks/useFitnessPlatform';

// NEW - Use this
import { useFitnessPlatform } from '../context/FitnessPlatformContext';
```

### Step 2: Wrap Your App with Context Provider

Update your main App component:

```typescript
import { FitnessPlatformProvider } from './context/FitnessPlatformContext';

function App() {
  return (
    <FitnessPlatformProvider>
      {/* Your existing app components */}
    </FitnessPlatformProvider>
  );
}
```

### Step 3: Update Video Rendering

Replace mock video tiles with real video components:

```typescript
import { VideoGallery } from './components/VideoGallery';
import { VideoCanvas } from './components/VideoCanvas';

// For gallery view
<VideoGallery
  participants={participants}
  zoomSDK={zoomSDK}
  highlightedLevel={highlightedLevel}
  onSpotlightParticipant={handleSpotlight}
/>

// For individual video
<VideoCanvas
  participant={participant}
  width={640}
  height={360}
  isSpotlight={true}
  zoomSDK={zoomSDK}
/>
```

### Step 4: Update Control Functions

The SDK methods are now accessible through the context:

```typescript
const {
  joinSession,
  leaveSession,
  toggleVideo,
  toggleAudio,
  muteParticipant,
  muteAllParticipants,
  startRecording,
  // ... other methods
} = useFitnessPlatform();

// Join a session
await joinSession('Coach Sarah', 'coach', 'morning-hiit-class');

// Control video/audio
await toggleVideo();
await toggleAudio();

// Coach controls
await muteAllParticipants();
await startRecording();
```

## Performance Optimization

### For 50+ Participants

1. **Automatic Quality Adjustment**
   - SDK automatically reduces video quality when participant count > 25
   - Spotlight view maintains higher quality for featured participant

2. **Pagination**
   - Gallery view shows max 25 video tiles per page
   - Automatic pagination for larger classes

3. **Single Canvas Rendering**
   - Efficient rendering using Zoom's canvas approach
   - Reduced memory usage for large sessions

### Network Optimization

1. **Adaptive Bitrate**
   - Configured in `zoom.config.ts`
   - Uplink: 1500 kbps max
   - Downlink: 3000 kbps max

2. **Simulcast Enabled**
   - Multiple quality streams for better performance
   - Participants receive appropriate quality based on their bandwidth

## Fitness-Specific Features

### 1. Level-Based Grouping
```typescript
// Highlight a specific fitness level
highlightLevel('beginner');

// Get participants by level
const beginners = getParticipantsByLevel('beginner');
```

### 2. Exercise Targeting
```typescript
// Set exercise content for specific level
setExerciseContent({
  name: 'Modified Push-ups',
  targetAudience: 'beginner',
  benefits: 'Builds upper body strength',
  gifUrl: 'exercise-demo.gif',
  keyPoints: ['Keep knees on ground', 'Maintain straight back']
});
```

### 3. Health Considerations
Participants with health considerations are automatically flagged in the UI for coach visibility.

### 4. Rep Counting
Rep counts are displayed on participant tiles during workout mode.

## Testing

### Local Development
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open two browser windows (one as coach, one as student)

3. Join the same session with different roles

### Testing Checklist
- [ ] Join session as coach
- [ ] Join session as student
- [ ] Toggle video on/off
- [ ] Toggle audio on/off
- [ ] Gallery view with 10+ participants
- [ ] Spotlight participant
- [ ] Mute individual participant (coach)
- [ ] Mute all participants (coach)
- [ ] Start/stop recording (coach)
- [ ] Switch between teach and workout modes
- [ ] Test with 50+ participants (load testing)

## Production Deployment

### Security Considerations

1. **JWT Token Generation**
   - Never expose SDK Secret in client code
   - Implement server-side token generation endpoint
   - Update `generateSessionToken` to call your backend

2. **Example Backend Endpoint** (Node.js/Express)
```javascript
const jwt = require('jsonwebtoken');

app.post('/api/zoom/token', (req, res) => {
  const { sessionName, role, userName } = req.body;

  const payload = {
    app_key: process.env.ZOOM_SDK_KEY,
    tpc: sessionName,
    role_type: role,
    user_identity: userName,
    version: 1,
    iat: Math.floor(Date.now() / 1000) - 30,
    exp: Math.floor(Date.now() / 1000) + 7200
  };

  const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET, {
    algorithm: 'HS256'
  });

  res.json({ token });
});
```

### Performance Monitoring

Monitor these metrics in production:
- Connection quality distribution
- Video rendering performance
- Participant drop rates
- Audio/video quality issues
- Memory usage patterns

## Troubleshooting

### Common Issues

1. **"SDK not initialized" error**
   - Ensure Zoom credentials are properly set in `.env`
   - Check browser console for initialization errors

2. **Video not rendering**
   - Verify participant has granted camera permissions
   - Check canvas element is properly mounted
   - Ensure participant.isVideoOn is true

3. **Poor video quality**
   - Check network bandwidth
   - Verify quality settings in `zoom.config.ts`
   - Consider reducing max participants per page

4. **Audio echo/feedback**
   - Ensure echo cancellation is enabled
   - Participants should use headphones
   - Check audio settings in SDK configuration

### Debug Mode

Enable debug logging:
```typescript
// In zoomSDKService.ts constructor
this.client.init('en-US', 'Global', {
  debug: true, // Add this
  enforceMultipleVideos: true,
  // ... other options
});
```

## Support

For Zoom Video SDK specific issues:
- [Zoom Video SDK Documentation](https://developers.zoom.us/docs/video-sdk/)
- [Zoom Developer Forum](https://devforum.zoom.us/)

For FitWithPari platform issues:
- Check the console for error messages
- Review network tab for failed API calls
- Ensure all environment variables are set correctly