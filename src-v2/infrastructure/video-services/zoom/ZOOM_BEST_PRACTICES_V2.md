# Zoom Video SDK V2 Implementation - Best Practices

## 🚀 V2 Implementation Overview

This document outlines the **correct implementation** of Zoom Video SDK integration based on official Zoom documentation analysis.

### ❌ What Was Wrong in V1

1. **Custom Video Elements**: V1 tried to provide HTML video elements to Zoom SDK
2. **Manual Dimension Handling**: V1 manually set video element dimensions to prevent 0x0 errors
3. **Incorrect Video Rendering**: Used `attachVideo(userId, quality, element)` incorrectly
4. **No Pagination**: Attempted to render unlimited video streams without pagination

### ✅ What's Correct in V2

1. **Zoom-Provided Elements**: V2 lets Zoom SDK create and provide video elements
2. **Automatic Dimension Handling**: Zoom SDK handles all video sizing internally
3. **Correct Video Rendering**: Uses `attachVideo(userId, quality)` which returns a video element
4. **Built-in Pagination**: Implements 25/9 video limits with pagination

## 🔧 Core V2 API Changes

### Old V1 Pattern (INCORRECT)
```typescript
// ❌ V1 - We provide the element to Zoom
const videoElement = document.createElement('video');
await stream.attachVideo(userId, quality, videoElement); // Wrong parameter order
container.appendChild(videoElement);
```

### New V2 Pattern (CORRECT)
```typescript
// ✅ V2 - Zoom provides the element to us
const videoElement = await stream.attachVideo(userId, quality); // Returns element
container.appendChild(videoElement); // We just append it
```

## 📋 Key Implementation Details

### 1. Video Element Creation
```typescript
async getParticipantVideoElement(participantId: ParticipantId, quality: VideoQuality = 'medium'): Promise<HTMLVideoElement | null> {
  // CORRECT: attachVideo returns the video element created by Zoom SDK
  const videoElement = await this.stream.attachVideo(userId, qualityMap[quality]);

  // Configure the Zoom-provided element
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  if (isSelfView) {
    videoElement.muted = true; // Prevent echo
  }

  return videoElement;
}
```

### 2. Video Pagination (25 Desktop / 9 Mobile)
```typescript
// Auto-detect device type
getMaxVisibleVideos(): number {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile ? 9 : 25; // Zoom SDK limits
}

// Implement pagination
async setVideoPage(pageNumber: number): Promise<void> {
  this.currentVideoPage = Math.max(0, pageNumber);
  await this.updateVideoPagination();
}
```

### 3. Container Attachment Pattern
```typescript
async attachVideoToContainer(participantId: ParticipantId, container: HTMLElement, quality: VideoQuality = 'medium'): Promise<boolean> {
  const videoElement = await this.getParticipantVideoElement(participantId, quality);

  if (!videoElement) return false;

  // Clear existing content and append Zoom-provided element
  container.innerHTML = '';
  container.appendChild(videoElement);

  return true;
}
```

## 🎯 Zoom SDK Configuration

### Required Initialization Options
```typescript
await this.client.init('en-US', 'Global', {
  patchJsMedia: true,           // Required for proper media handling
  leaveOnPageUnload: true,      // Clean session management
  stayAwake: true,             // Prevent device sleep during fitness
  enforceMultipleVideos: true  // Required for 25+ videos (SharedArrayBuffer)
});
```

### Video Quality Mapping
```typescript
const qualityMap = {
  'low': 0,     // 90p
  'medium': 2,  // 360p (recommended for fitness)
  'high': 3,    // 720p
  'ultra': 4    // 1080p
};
```

## 🏗️ Architecture Improvements

### 1. Clean State Management
- **Zoom Elements Map**: Tracks SDK-provided video elements
- **Container Map**: Tracks UI containers for each participant
- **Visible Participants**: Tracks which participants are currently rendered
- **Video Pagination**: Current page and visible participant calculation

### 2. Event-Driven Updates
```typescript
// Participant changes trigger pagination updates
private handleUserEvent(payload: any, eventType: 'user-added' | 'user-removed'): void {
  // Process user addition/removal
  // ...

  // Update pagination when participants change
  this.updateVideoPagination();
}
```

### 3. Proper Cleanup
```typescript
private async cleanupAllVideoElements(): Promise<void> {
  // Stop rendering for all visible participants
  for (const participantId of this.visibleParticipants) {
    await this.stopRenderingVideo(ParticipantId.create(participantId));
  }

  // Clear all maps and reset pagination
  this.zoomVideoElements.clear();
  this.videoContainers.clear();
  this.visibleParticipants.clear();
  this.currentVideoPage = 0;
}
```

## 🔄 Migration from V1 to V2

### UI Layer Changes Required
```typescript
// OLD V1 Usage
await videoService.renderParticipantVideo(participantId, myVideoElement);

// NEW V2 Usage
await videoService.attachVideoToContainer(participantId, myContainer);
// OR still works for backward compatibility:
await videoService.renderParticipantVideo(participantId, myContainer);
```

### Container Requirements
```html
<!-- V2 requires containers with data attributes for pagination -->
<div data-participant-id="12345" class="video-container">
  <!-- Zoom-provided video element will be appended here -->
</div>
```

## 📊 Performance Benefits

### V1 Issues
- ❌ 0x0 dimension errors causing SDK failures
- ❌ Manual video element sizing conflicts with Zoom
- ❌ No pagination = poor performance with 25+ participants
- ❌ Custom video element management overhead

### V2 Improvements
- ✅ Zero dimension errors (Zoom handles sizing)
- ✅ Optimal video element configuration by Zoom SDK
- ✅ Automatic pagination for scalability
- ✅ Reduced complexity and better reliability

## 🧪 Testing Strategy

### 1. Single Participant Test
```typescript
const videoElement = await zoomService.getParticipantVideoElement(participantId);
expect(videoElement).toBeInstanceOf(HTMLVideoElement);
expect(videoElement.autoplay).toBe(true);
```

### 2. Pagination Test
```typescript
// Add 30 participants
for (let i = 0; i < 30; i++) {
  await addParticipant(`participant-${i}`);
}

// Check pagination
expect(zoomService.getMaxVisibleVideos()).toBe(25); // Desktop
await zoomService.setVideoPage(1);
expect(visibleParticipants.size).toBeLessThanOrEqual(25);
```

### 3. Cleanup Test
```typescript
await zoomService.leaveSession();
expect(zoomService.zoomVideoElements.size).toBe(0);
expect(zoomService.visibleParticipants.size).toBe(0);
```

## 🚨 Critical Migration Notes

1. **Remove all manual video element creation** from UI components
2. **Update container elements** to use data attributes for pagination
3. **Replace renderParticipantVideo calls** with attachVideoToContainer where possible
4. **Test pagination** with 25+ participants
5. **Verify cleanup** when participants leave or service destroys

## 📚 References

- [Zoom Video SDK Best Practices](https://developers.zoom.us/docs/video-sdk/web/video-best-practices/)
- [Zoom Video SDK Core Video Docs](https://developers.zoom.us/docs/video-sdk/web/video/)
- [Clean Architecture V2 Design](../../../docs/CLEAN_ARCHITECTURE_DESIGN.md)

---

**🎯 Result**: ZoomVideoServiceV2 provides a robust, scalable, and Zoom SDK-compliant video integration that eliminates the dimension errors and complexity of V1 while adding proper pagination for fitness platform scalability.