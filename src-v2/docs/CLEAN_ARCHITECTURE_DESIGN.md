# FitWithPari V2 - Clean Architecture Design

## 🎯 Architecture Overview

This document outlines the clean architecture design for FitWithPari V2, built to scale to 1000+ simultaneous participants with modular video service abstraction.

## 🏛️ Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │  React Components, Hooks, UI
├─────────────────────────────────────────┤
│           Application Layer             │  Use Cases, Commands, Queries
├─────────────────────────────────────────┤
│            Domain Layer                 │  Entities, Value Objects, Rules
├─────────────────────────────────────────┤
│          Infrastructure Layer           │  Video Services, API, Storage
└─────────────────────────────────────────┘
```

## 📁 Modern Project Structure

```
src-v2/
├── core/
│   ├── domain/                          # Domain Layer (Business Logic)
│   │   ├── entities/
│   │   │   ├── VideoSession.ts         # Core business entity
│   │   │   ├── Participant.ts          # Participant aggregate
│   │   │   ├── VideoStream.ts          # Video stream entity
│   │   │   └── ChatMessage.ts          # Chat functionality
│   │   ├── value-objects/
│   │   │   ├── SessionId.ts            # Strong typing
│   │   │   ├── ParticipantId.ts
│   │   │   └── ConnectionQuality.ts
│   │   ├── events/
│   │   │   ├── ParticipantJoinedEvent.ts
│   │   │   ├── VideoStateChangedEvent.ts
│   │   │   └── SessionEndedEvent.ts
│   │   └── repositories/               # Interface definitions
│   │       ├── IVideoSessionRepository.ts
│   │       └── IParticipantRepository.ts
│   │
│   ├── application/                     # Application Layer (Use Cases)
│   │   ├── use-cases/
│   │   │   ├── JoinSessionUseCase.ts
│   │   │   ├── LeaveSessionUseCase.ts
│   │   │   ├── ToggleVideoUseCase.ts
│   │   │   ├── ToggleAudioUseCase.ts
│   │   │   ├── SendChatMessageUseCase.ts
│   │   │   └── SpotlightParticipantUseCase.ts
│   │   ├── commands/
│   │   │   ├── JoinSessionCommand.ts
│   │   │   └── LeaveSessionCommand.ts
│   │   ├── queries/
│   │   │   ├── GetSessionParticipantsQuery.ts
│   │   │   └── GetParticipantStatsQuery.ts
│   │   └── services/                   # Application services
│   │       ├── SessionOrchestrator.ts  # Coordinates multiple use cases
│   │       └── ParticipantSynchronizer.ts
│   │
│   └── interfaces/                     # Interface Layer
│       ├── video-service/
│       │   ├── IVideoService.ts        # Main video service interface
│       │   ├── IVideoServiceFactory.ts # Factory pattern
│       │   └── VideoServiceTypes.ts    # Common types
│       ├── storage/
│       │   └── ISessionStorage.ts
│       └── events/
│           └── IEventBus.ts           # Event-driven architecture
│
├── infrastructure/                      # Infrastructure Layer
│   ├── video-services/
│   │   ├── zoom/
│   │   │   ├── ZoomVideoService.ts     # Zoom implementation
│   │   │   ├── ZoomParticipantAdapter.ts
│   │   │   └── ZoomEventMapper.ts
│   │   ├── agora/
│   │   │   ├── AgoraVideoService.ts    # Agora implementation
│   │   │   ├── AgoraParticipantAdapter.ts
│   │   │   └── AgoraEventMapper.ts
│   │   ├── webrtc/
│   │   │   └── WebRTCService.ts        # Pure WebRTC fallback
│   │   └── factory/
│   │       └── VideoServiceFactory.ts  # Service selection logic
│   │
│   ├── storage/
│   │   ├── SupabaseSessionStorage.ts   # Keep existing Supabase
│   │   └── LocalSessionStorage.ts      # Local fallback
│   │
│   ├── events/
│   │   ├── RxJSEventBus.ts            # RxJS-based event system
│   │   └── EventLogger.ts             # Structured logging
│   │
│   └── monitoring/
│       ├── PerformanceMonitor.ts      # Real-time performance
│       ├── ConnectionQualityMonitor.ts
│       └── ScaleMonitor.ts            # 1000+ participant monitoring
│
├── presentation/                       # Presentation Layer
│   ├── components/                     # Pure UI Components
│   │   ├── ui/                        # Base UI components
│   │   │   ├── VideoTile.tsx
│   │   │   ├── ParticipantGrid.tsx
│   │   │   ├── ControlBar.tsx
│   │   │   └── ChatPanel.tsx
│   │   ├── video/                     # Video-specific components
│   │   │   ├── VideoGallery.tsx
│   │   │   ├── VideoSpotlight.tsx
│   │   │   └── VideoControls.tsx
│   │   └── layout/                    # Layout components
│   │       ├── CoachLayout.tsx
│   │       └── StudentLayout.tsx
│   │
│   ├── containers/                    # Connected Components
│   │   ├── VideoSessionContainer.tsx  # Connects to use cases
│   │   ├── ParticipantContainer.tsx
│   │   └── ChatContainer.tsx
│   │
│   ├── hooks/                         # React Integration
│   │   ├── useVideoSession.ts         # Main session hook
│   │   ├── useParticipants.ts        # Participant management
│   │   ├── useVideoControls.ts       # Video/audio controls
│   │   ├── useChat.ts                # Chat functionality
│   │   └── useScaleOptimization.ts   # 1000+ participant optimization
│   │
│   └── providers/                     # Context Providers
│       ├── VideoSessionProvider.tsx
│       ├── ParticipantProvider.tsx
│       └── EventProvider.tsx
│
├── shared/                            # Shared Utilities
│   ├── types/
│   │   ├── CommonTypes.ts
│   │   ├── VideoTypes.ts
│   │   └── EventTypes.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── performance.ts
│   ├── constants/
│   │   ├── VideoConfig.ts
│   │   └── ScalingLimits.ts
│   └── errors/
│       ├── VideoServiceError.ts
│       └── ScalingError.ts
│
└── App.tsx                           # Main application entry
```

## 🎯 Scalability Architecture for 1000+ Participants

### 1. Participant Virtualization
```typescript
// Only render visible participants
interface ParticipantVirtualization {
  visibleParticipants: Participant[];  // Max 25 visible at once
  totalParticipants: number;           // Can be 1000+
  scrollOffset: number;
  chunkSize: number;                   // Load in chunks
}
```

### 2. Selective Video Streaming
```typescript
// Smart video streaming - only active speakers get full quality
interface VideoStreamStrategy {
  activeStreams: ParticipantId[];      // Max 4-6 high quality
  thumbnailStreams: ParticipantId[];   // Rest as low-res thumbnails
  audioOnlyParticipants: ParticipantId[]; // Audio-only for scale
}
```

### 3. Event Batching for Scale
```typescript
// Batch participant updates to prevent UI thrashing
interface EventBatcher {
  batchParticipantUpdates(updates: ParticipantUpdate[]): void;
  flushBatch(): void; // Called every 100ms
  maxBatchSize: 50;   // Process max 50 updates per batch
}
```

## 🔧 Video Service Abstraction

### Core Interface
```typescript
export interface IVideoService {
  readonly serviceName: VideoServiceType;
  readonly maxParticipants: number;
  readonly supportsScaling: boolean;

  // Core lifecycle
  initialize(config: VideoServiceConfig): Promise<void>;
  joinSession(request: JoinSessionRequest): Promise<SessionJoinResult>;
  leaveSession(): Promise<void>;
  destroy(): Promise<void>;

  // Participant management
  getParticipants(): Promise<Participant[]>;
  getParticipantCount(): Promise<number>;

  // Video/Audio controls
  toggleVideo(): Promise<void>;
  toggleAudio(): Promise<void>;
  setVideoQuality(quality: VideoQuality): Promise<void>;

  // Scaling optimizations
  enableSelectiveStreaming(participantIds: ParticipantId[]): Promise<void>;
  setParticipantLimit(limit: number): Promise<void>;

  // Event streams (reactive)
  participantEvents$: Observable<ParticipantEvent>;
  videoEvents$: Observable<VideoEvent>;
  scalingEvents$: Observable<ScalingEvent>;
}
```

### Service Factory Pattern
```typescript
export class VideoServiceFactory {
  static create(
    type: VideoServiceType,
    config: VideoServiceConfig
  ): IVideoService {
    const implementations = {
      zoom: () => new ZoomVideoService(config),
      agora: () => new AgoraVideoService(config),
      webrtc: () => new WebRTCService(config)
    };

    const implementation = implementations[type];
    if (!implementation) {
      throw new UnsupportedVideoServiceError(type);
    }

    return implementation();
  }

  static getSupportedServices(): VideoServiceInfo[] {
    return [
      { type: 'zoom', maxParticipants: 1000, supportsScaling: true },
      { type: 'agora', maxParticipants: 10000, supportsScaling: true },
      { type: 'webrtc', maxParticipants: 50, supportsScaling: false }
    ];
  }
}
```

## 📊 Scaling Strategies

### 1. Participant Chunking
```typescript
export class ParticipantChunkManager {
  private readonly chunkSize = 25; // Render 25 participants at a time
  private currentChunk = 0;

  getVisibleParticipants(allParticipants: Participant[]): Participant[] {
    const start = this.currentChunk * this.chunkSize;
    const end = start + this.chunkSize;
    return allParticipants.slice(start, end);
  }

  loadNextChunk(): void {
    this.currentChunk++;
  }
}
```

### 2. Smart Video Streaming
```typescript
export class VideoStreamOptimizer {
  optimizeStreams(participants: Participant[]): StreamConfiguration {
    // Only show video for active speakers + coach
    const activeStreams = participants
      .filter(p => p.isActiveSpeaker || p.isCoach)
      .slice(0, 6) // Max 6 high-quality streams
      .map(p => p.id);

    const thumbnailStreams = participants
      .filter(p => !activeStreams.includes(p.id))
      .slice(0, 50) // Max 50 thumbnails
      .map(p => p.id);

    return { activeStreams, thumbnailStreams };
  }
}
```

### 3. Memory Management
```typescript
export class MemoryOptimizer {
  private participantCache = new LRUCache<ParticipantId, Participant>(100);

  cacheParticipant(participant: Participant): void {
    this.participantCache.set(participant.id, participant);
  }

  cleanupInactiveParticipants(): void {
    // Remove participants who haven't been active for 5 minutes
    const cutoff = Date.now() - 5 * 60 * 1000;
    this.participantCache.forEach((participant, id) => {
      if (participant.lastActivity < cutoff) {
        this.participantCache.delete(id);
      }
    });
  }
}
```

## 🔄 Migration Strategy

### Phase 1: Create Clean V2 Structure
1. Create `src-v2/` alongside existing `src/`
2. Implement domain layer (entities, value objects)
3. Define interfaces for video services
4. Keep existing infrastructure running

### Phase 2: Video Service Implementation
1. Implement Zoom service with clean architecture
2. Add Agora service as alternative
3. Implement scaling optimizations
4. Add comprehensive testing

### Phase 3: React Layer
1. Build clean presentation components
2. Create optimized hooks for 1000+ participants
3. Implement virtualization
4. Connect to existing Supabase (new schema)

### Phase 4: Deployment Switch
1. Update build configuration to use `src-v2/`
2. Deploy to same AWS Amplify setup
3. Monitor performance and scaling
4. Remove old `src/` when stable

## 🎯 Key Benefits

1. **Zero Infrastructure Changes** - Same AWS Amplify + Supabase
2. **Modular Video Services** - Easy toggle between Zoom/Agora/WebRTC
3. **Massive Scalability** - Handle 1000+ participants efficiently
4. **Clean Architecture** - Maintainable, testable, extensible
5. **Performance Optimized** - Smart rendering, selective streaming
6. **Production Ready** - Comprehensive error handling, monitoring

## 📋 Next Steps

1. Create `src-v2/` folder structure
2. Implement domain layer entities
3. Build video service interfaces
4. Start with Zoom implementation
5. Add scaling optimizations
6. Create React presentation layer

This architecture will give you a production-ready, scalable fitness platform that can grow from 10 to 10,000 participants seamlessly.