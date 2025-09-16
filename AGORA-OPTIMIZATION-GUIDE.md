# Agora Interactive Live Streaming - Production Optimization Guide

## Current Status Assessment

### ✅ What's Working
- **App ID**: `39a27953242243799ea996e3f460a22a` (Configured correctly)
- **SDK Mode**: Using `live` mode with proper role management
- **Token Service**: Implemented with testing mode fallback
- **Architecture**: Clean separation of concerns with unified video service

### ⚠️ Immediate Action Items

#### 1. **App Certificate Configuration** (CRITICAL for Production)
Currently NOT configured - running in testing mode. To enable secure token authentication:

1. Go to [Agora Console](https://console.agora.io/)
2. Select your project
3. Navigate to **Config → Basic Info**
4. Enable **App Certificate** if not already enabled
5. Copy the App Certificate (32 characters)
6. Add to `.env`:
   ```
   VITE_AGORA_APP_CERTIFICATE=your_certificate_here
   AGORA_APP_CERTIFICATE=your_certificate_here
   ```
7. Restart development server

**Why this matters**: Without App Certificate, anyone with your App ID can join any channel - major security risk in production.

## Performance Optimizations for Fitness Streaming

### Video Encoder Settings

Update `src/services/agoraSDKService.ts` for optimal fitness streaming:

```typescript
// For Coach (High Quality)
this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
  optimizationMode: 'detail', // Better for stationary coaching position
  encoderConfig: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrateMin: 1000,
    bitrateMax: 2500
  }
});

// For Students (Balanced)
this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
  optimizationMode: 'motion', // Better for exercise movements
  encoderConfig: {
    width: 640,
    height: 480,
    frameRate: 24,  // Increased for smoother movement
    bitrateMin: 600,
    bitrateMax: 1200
  }
});
```

### Audio Configuration for Fitness Classes

```typescript
// Enhanced audio for coach with music
this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
  encoderConfig: {
    sampleRate: 48000,
    stereo: true,
    bitrate: 128
  },
  AEC: true,  // Echo cancellation
  ANS: true,  // Noise suppression
  AGC: true,  // Automatic gain control
  audioProfile: 'music_high_quality_stereo'
});
```

## Token Renewal Implementation

Add to `src/services/agoraVideoService.ts`:

```typescript
private tokenRenewalTimer: NodeJS.Timeout | null = null;

private async scheduleTokenRenewal() {
  // Renew token 30 seconds before expiration
  const renewalTime = (3600 - 30) * 1000; // 59.5 minutes

  this.tokenRenewalTimer = setTimeout(async () => {
    try {
      const newToken = await this.generateNewToken();
      await agoraService.renewToken(newToken);
      console.log('✅ Token renewed successfully');
      this.scheduleTokenRenewal(); // Schedule next renewal
    } catch (error) {
      console.error('❌ Token renewal failed:', error);
      this.onError?.(new Error('Token renewal failed'));
    }
  }, renewalTime);
}

async joinSession(...) {
  // ... existing code ...

  // Schedule token renewal after joining
  if (token) {
    this.scheduleTokenRenewal();
  }
}

async leaveSession() {
  // Clear renewal timer
  if (this.tokenRenewalTimer) {
    clearTimeout(this.tokenRenewalTimer);
    this.tokenRenewalTimer = null;
  }

  // ... existing cleanup code ...
}
```

## Network Quality Monitoring

Add real-time quality monitoring:

```typescript
// In agoraSDKService.ts setupEventListeners()
this.client.on('network-quality', (stats) => {
  const { uplinkNetworkQuality, downlinkNetworkQuality } = stats;

  // Quality levels: 0 (unknown), 1 (excellent), 2 (good),
  // 3 (poor), 4 (bad), 5 (very bad), 6 (disconnected)

  if (uplinkNetworkQuality >= 4 || downlinkNetworkQuality >= 4) {
    console.warn('⚠️ Poor network quality detected');

    // Auto-adjust video quality
    if (this.localVideoTrack) {
      this.localVideoTrack.setEncoderConfiguration({
        width: 480,
        height: 360,
        frameRate: 15,
        bitrateMax: 500
      });
    }
  }
});
```

## CDN Live Streaming for Scale

For classes with 100+ participants, enable CDN streaming:

```typescript
// Start CDN streaming for large classes
async enableCDNStreaming(streamUrl: string) {
  if (!this.client) return;

  // Configure transcoding for CDN
  const transcodingConfig = {
    width: 1280,
    height: 720,
    videoBitrate: 2000,
    videoFramerate: 30,
    audioSampleRate: 48000,
    audioBitrate: 128,
    audioChannels: 2,
    videoGop: 30,
    videoCodecProfile: 100,
    userCount: 1,
    backgroundColor: 0x000000,
    transcodingUsers: [{
      uid: this.currentUID,
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      zOrder: 0,
      alpha: 1.0,
      audioChannel: 2
    }]
  };

  await this.client.setLiveTranscoding(transcodingConfig);
  await this.client.startLiveStreaming(streamUrl, true);
}
```

## Testing Checklist

### Phase 1: Basic Functionality (Current)
- [x] Single user can join channel
- [x] Video/Audio tracks can be created
- [ ] Test with 2 participants (coach + student)
- [ ] Verify role-based permissions work

### Phase 2: Multi-User Testing
- [ ] Test with 5+ participants
- [ ] Monitor bandwidth usage
- [ ] Check video quality adaptation
- [ ] Verify audio mixing for fitness music

### Phase 3: Production Readiness
- [ ] Enable App Certificate
- [ ] Implement token renewal
- [ ] Add network quality indicators
- [ ] Set up error recovery mechanisms
- [ ] Configure CDN for large classes

## Quick Test Commands

```bash
# Test Agora configuration
node test-agora-setup.js

# Run development server with Agora
npm run dev

# Monitor browser console for Agora logs
# Filter by: "Agora" or "🚀"
```

## Production Deployment Checklist

1. **Security**
   - [ ] App Certificate configured
   - [ ] Token generation server-side only
   - [ ] Channel names are unique per session
   - [ ] Implement user authentication before joining

2. **Performance**
   - [ ] Video encoder settings optimized for fitness
   - [ ] Audio configured for music + voice
   - [ ] Network quality monitoring active
   - [ ] Adaptive bitrate enabled

3. **Scalability**
   - [ ] CDN streaming configured for large classes
   - [ ] Regional deployment considered
   - [ ] Fallback to Zoom SDK if needed
   - [ ] Load testing completed

4. **Monitoring**
   - [ ] Agora Analytics dashboard configured
   - [ ] Error tracking implemented
   - [ ] User experience metrics tracked
   - [ ] Network quality alerts set up

## Support Resources

- [Agora Console](https://console.agora.io/)
- [Interactive Live Streaming Docs](https://docs.agora.io/en/interactive-live-streaming/overview/product-overview)
- [Token Generation Guide](https://docs.agora.io/en/interactive-live-streaming/get-started/authentication-workflow)
- [Best Practices](https://docs.agora.io/en/interactive-live-streaming/develop/best-practices)

## Next Immediate Steps

1. **Get App Certificate from Agora Console** (5 minutes)
2. **Test with multiple devices** (15 minutes)
3. **Implement token renewal** (30 minutes)
4. **Add network quality UI indicators** (1 hour)
5. **Configure CDN for production** (2 hours)

---

*Last Updated: 2025-09-16*
*Status: Testing Mode - Awaiting App Certificate for Production*