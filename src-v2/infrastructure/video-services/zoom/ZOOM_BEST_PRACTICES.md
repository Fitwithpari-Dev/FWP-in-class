# Zoom Video SDK Best Practices Implementation

## Key Findings from Official Documentation

### 1. Proper Video Rendering Flow
```javascript
// CORRECT: Let SDK provide video elements
stream.startVideo().then(() => {
  stream.attachVideo(userId, RESOLUTION).then((userVideo) => {
    videoContainer.appendChild(userVideo);
  });
});

// WRONG: Creating our own video elements
const videoElement = document.createElement('video');
stream.attachVideo(userId, RESOLUTION, videoElement);
```

### 2. Best Practices Summary

1. **Video Rendering Capabilities:**
   - Desktop: Up to 25 simultaneous videos
   - Mobile: Up to 9 simultaneous videos
   - Maximum quality: 720p
   - Use 16:9 aspect ratio by default

2. **Camera Management:**
   - Tie `startVideo()` to user interactions (browser requirement)
   - Use `switchCamera(deviceId)` for device switching
   - Listen for `device-change` events for hot-plugging

3. **Permission Handling:**
   - Listen for `permission-change` events
   - Handle system and browser permission errors
   - Show error messages and action prompts to users

4. **Mobile Considerations:**
   - Video turns off when app is backgrounded
   - Audio remains active
   - Use `leaveOnPageUnload` for optimal session management

### 3. Event Listeners Required

```javascript
// Device management
client.on('device-change', (payload) => {
  // Handle camera/microphone hot-plugging
});

// Permission management
client.on('permission-change', (payload) => {
  // Handle permission state changes
});

// Video state changes
client.on('peer-video-state-change', (payload) => {
  // Handle remote participant video on/off
});

// Active speaker detection
client.on('video-active-change', (payload) => {
  // Better than audio events for speaker tracking
});
```

### 4. Current Implementation Issues

❌ **Wrong Pattern**: We create video elements and pass them to attachVideo()
✅ **Correct Pattern**: Let attachVideo() return the video element

❌ **Missing**: Permission and device event listeners
✅ **Need**: Comprehensive error handling for permissions

❌ **Wrong**: Manual dimension forcing on our elements
✅ **Correct**: Let SDK handle video element sizing

### 5. Implementation Plan

1. Modify `enableVideo()` to use SDK-provided elements
2. Add device and permission event listeners
3. Implement proper error handling for camera access
4. Test with Zoom SDK best practices