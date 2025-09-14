# Developer Guide: FitWithPari Real-Time Video Platform

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Module Organization](#module-organization)
3. [Real-Time Video Streaming Management](#real-time-video-streaming-management)
4. [Testing Strategy](#testing-strategy)
5. [State Management Patterns](#state-management-patterns)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling & Recovery](#error-handling--recovery)
8. [Development Workflow](#development-workflow)
9. [Debugging Guidelines](#debugging-guidelines)
10. [Code Quality Standards](#code-quality-standards)

---

## Architecture Overview

### Core Design Principles
1. **Separation of Concerns**: Clear boundaries between video management, fitness logic, and UI components
2. **Testability**: All business logic isolated from video SDK dependencies
3. **Real-time Resilience**: Graceful handling of network failures and reconnections
4. **Performance First**: Optimized for 50+ concurrent video streams
5. **Type Safety**: Comprehensive TypeScript coverage for all video/audio states

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ CoachView   │  │ StudentView │  │ Shared Components   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Business Logic Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Fitness     │  │ Session     │  │ Participant         │ │
│  │ Management  │  │ Management  │  │ Management          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Video/Audio Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Zoom SDK    │  │ Stream      │  │ Quality             │ │
│  │ Adapter     │  │ Manager     │  │ Controller          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Supabase    │  │ Local State │  │ Cache Manager       │ │
│  │ Integration │  │ Management  │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Organization

### Recommended Directory Structure
```
src/
├── components/                    # UI Components
│   ├── video/                    # Video-specific components
│   │   ├── VideoTile.tsx
│   │   ├── VideoGrid.tsx
│   │   ├── VideoControls.tsx
│   │   └── QualityIndicator.tsx
│   ├── fitness/                  # Fitness-specific components
│   │   ├── RepCounter.tsx
│   │   ├── FormAlert.tsx
│   │   ├── LevelBadge.tsx
│   │   └── ExerciseOverlay.tsx
│   ├── session/                  # Session management components
│   │   ├── ParticipantManager.tsx
│   │   ├── SessionControls.tsx
│   │   └── ConnectionStatus.tsx
│   └── ui/                       # Shared UI components (shadcn)
├── hooks/                        # Custom React hooks
│   ├── video/                    # Video-related hooks
│   │   ├── useZoomSDK.ts
│   │   ├── useVideoStream.ts
│   │   ├── useAudioStream.ts
│   │   └── useConnectionQuality.ts
│   ├── fitness/                  # Fitness-related hooks
│   │   ├── useFitnessLevels.ts
│   │   ├── useRepCounter.ts
│   │   └── useExerciseTargeting.ts
│   └── session/                  # Session-related hooks
│       ├── useSessionState.ts
│       ├── useParticipants.ts
│       └── useRealTimeSync.ts
├── services/                     # Business logic services
│   ├── video/                    # Video service layer
│   │   ├── ZoomSDKService.ts
│   │   ├── StreamManager.ts
│   │   ├── QualityController.ts
│   │   └── NetworkMonitor.ts
│   ├── fitness/                  # Fitness business logic
│   │   ├── FitnessLevelService.ts
│   │   ├── ExerciseService.ts
│   │   └── ProgressService.ts
│   ├── session/                  # Session management
│   │   ├── SessionService.ts
│   │   ├── ParticipantService.ts
│   │   └── RecordingService.ts
│   └── database/                 # Data access layer
│       ├── SupabaseClient.ts
│       ├── CacheService.ts
│       └── SyncService.ts
├── utils/                        # Utility functions
│   ├── video/                    # Video utilities
│   │   ├── videoConstraints.ts
│   │   ├── codecUtils.ts
│   │   └── bandwidthCalculator.ts
│   ├── fitness/                  # Fitness utilities
│   │   ├── levelCalculator.ts
│   │   ├── exerciseValidator.ts
│   │   └── progressCalculator.ts
│   └── common/                   # Common utilities
│       ├── errorHandler.ts
│       ├── debounce.ts
│       └── eventEmitter.ts
├── types/                        # TypeScript definitions
│   ├── video.ts                  # Video/audio types
│   ├── fitness.ts                # Fitness-specific types
│   ├── session.ts                # Session types
│   └── api.ts                    # API response types
├── constants/                    # Application constants
│   ├── videoSettings.ts
│   ├── fitnessLevels.ts
│   └── errorCodes.ts
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests
│   └── mocks/                    # Mock implementations
└── config/                       # Configuration files
    ├── zoomConfig.ts
    ├── supabaseConfig.ts
    └── environmentConfig.ts
```

### Module Grouping Strategy

#### 1. Video Management Module (`services/video/`)
**Purpose**: Handle all Zoom SDK interactions and video streaming logic

**Key Components**:
```typescript
// ZoomSDKService.ts - Main SDK wrapper
export class ZoomSDKService {
  async initializeSDK(config: ZoomConfig): Promise<void>
  async createSession(sessionData: SessionConfig): Promise<ZoomSession>
  async joinSession(token: string): Promise<void>
  async leaveSession(): Promise<void>
  
  // Participant management
  async muteParticipant(participantId: string): Promise<void>
  async spotlightParticipant(participantId: string): Promise<void>
  async removeParticipant(participantId: string): Promise<void>
  
  // Video quality management
  async setVideoQuality(quality: VideoQuality): Promise<void>
  async enableAdaptiveStreaming(): Promise<void>
}

// StreamManager.ts - Stream lifecycle management
export class StreamManager {
  async startVideoStream(constraints: MediaStreamConstraints): Promise<MediaStream>
  async stopVideoStream(): Promise<void>
  async switchCamera(deviceId: string): Promise<void>
  async optimizeStreamForFitness(): Promise<void>
}

// QualityController.ts - Adaptive quality management
export class QualityController {
  async adjustQualityBasedOnNetwork(): Promise<void>
  async calculateOptimalSettings(participantCount: number): Promise<VideoSettings>
  async handleBandwidthLimitations(): Promise<void>
}
```

#### 2. Fitness Logic Module (`services/fitness/`)
**Purpose**: Manage fitness-specific business logic separate from video infrastructure

**Key Components**:
```typescript
// FitnessLevelService.ts
export class FitnessLevelService {
  assignFitnessLevel(userId: string, level: FitnessLevel): Promise<void>
  calculateLevelProgression(userId: string): Promise<LevelProgression>
  getGroupedParticipants(): Promise<GroupedParticipants>
}

// ExerciseService.ts
export class ExerciseService {
  assignExerciseToGroup(exerciseId: string, targetLevel: FitnessLevel): Promise<void>
  getExerciseVariations(baseExerciseId: string): Promise<ExerciseVariation[]>
  trackExerciseCompletion(userId: string, exerciseId: string): Promise<void>
}
```

#### 3. Session Management Module (`services/session/`)
**Purpose**: Coordinate session lifecycle and participant interactions

**Key Components**:
```typescript
// SessionService.ts
export class SessionService {
  async createFitnessSession(sessionData: FitnessSessionData): Promise<FitnessSession>
  async startSession(sessionId: string): Promise<void>
  async endSession(sessionId: string): Promise<SessionSummary>
  async switchMode(mode: 'teach' | 'workout'): Promise<void>
}

// ParticipantService.ts
export class ParticipantService {
  async addParticipant(sessionId: string, userData: UserData): Promise<void>
  async updateParticipantStatus(userId: string, status: ParticipantStatus): Promise<void>
  async highlightFitnessGroup(level: FitnessLevel): Promise<void>
}
```

---

## Real-Time Video Streaming Management

### Critical Challenges & Solutions

#### 1. **Network Resilience**
```typescript
// NetworkMonitor.ts
export class NetworkMonitor {
  private connectionQuality: number = 5;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  async monitorConnection(): Promise<void> {
    // Continuous monitoring with WebRTC stats
    const stats = await this.getRTCStats();
    this.connectionQuality = this.calculateQuality(stats);
    
    if (this.connectionQuality < 2) {
      await this.handlePoorConnection();
    }
  }
  
  private async handlePoorConnection(): Promise<void> {
    // Graceful degradation strategy
    await this.reduceVideoQuality();
    await this.optimizeBandwidth();
    
    if (this.connectionQuality < 1) {
      await this.attemptReconnection();
    }
  }
  
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      await this.reconnectWithBackoff();
    } else {
      await this.fallbackToAudioOnly();
    }
  }
}
```

#### 2. **State Synchronization**
```typescript
// RealTimeSyncService.ts
export class RealTimeSyncService {
  private eventQueue: SyncEvent[] = [];
  private isProcessing: boolean = false;
  
  async syncParticipantState(event: ParticipantStateEvent): Promise<void> {
    // Queue events to prevent race conditions
    this.eventQueue.push(event);
    
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }
  
  private async processEventQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.processEvent(event);
      
      // Small delay to prevent overwhelming the system
      await this.delay(10);
    }
    
    this.isProcessing = false;
  }
  
  private async processEvent(event: SyncEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'participant_joined':
          await this.handleParticipantJoin(event.data);
          break;
        case 'fitness_level_changed':
          await this.handleFitnessLevelChange(event.data);
          break;
        case 'exercise_assigned':
          await this.handleExerciseAssignment(event.data);
          break;
      }
    } catch (error) {
      await this.handleSyncError(event, error);
    }
  }
}
```

#### 3. **Video Quality Optimization**
```typescript
// AdaptiveQualityManager.ts
export class AdaptiveQualityManager {
  private qualityMetrics: QualityMetrics = {};
  private adaptationTimer: NodeJS.Timeout | null = null;
  
  async startQualityAdaptation(): Promise<void> {
    this.adaptationTimer = setInterval(async () => {
      await this.evaluateAndAdjustQuality();
    }, 5000); // Check every 5 seconds
  }
  
  private async evaluateAndAdjustQuality(): Promise<void> {
    const currentStats = await this.getVideoStats();
    const participantCount = await this.getActiveParticipantCount();
    const networkQuality = await this.getNetworkQuality();
    
    const optimalSettings = this.calculateOptimalSettings(
      currentStats,
      participantCount,
      networkQuality
    );
    
    if (this.shouldAdjustQuality(optimalSettings)) {
      await this.applyQualitySettings(optimalSettings);
    }
  }
  
  private calculateOptimalSettings(
    stats: VideoStats,
    participantCount: number,
    networkQuality: number
  ): VideoQualitySettings {
    // Algorithm for fitness platform optimization
    if (participantCount > 25 || networkQuality < 3) {
      return {
        resolution: '360p',
        frameRate: 15,
        bitrate: 500,
        enableHardwareAcceleration: true
      };
    } else if (participantCount > 10 || networkQuality < 4) {
      return {
        resolution: '720p',
        frameRate: 24,
        bitrate: 1000,
        enableHardwareAcceleration: true
      };
    } else {
      return {
        resolution: '1080p',
        frameRate: 30,
        bitrate: 2500,
        enableHardwareAcceleration: true
      };
    }
  }
}
```

---

## Testing Strategy

### 1. Unit Testing Framework

#### Video Service Testing
```typescript
// tests/unit/services/video/ZoomSDKService.test.ts
import { ZoomSDKService } from '../../../../services/video/ZoomSDKService';
import { mockZoomSDK } from '../../../mocks/zoomSDKMock';

describe('ZoomSDKService', () => {
  let zoomService: ZoomSDKService;
  let mockSDK: jest.Mocked<typeof mockZoomSDK>;
  
  beforeEach(() => {
    mockSDK = mockZoomSDK as jest.Mocked<typeof mockZoomSDK>;
    zoomService = new ZoomSDKService(mockSDK);
  });
  
  describe('Session Management', () => {
    it('should create session with fitness-specific settings', async () => {
      const sessionConfig = {
        sessionName: 'fitness-class-001',
        maxParticipants: 50,
        fitnessMode: true
      };
      
      await zoomService.createSession(sessionConfig);
      
      expect(mockSDK.createSession).toHaveBeenCalledWith({
        ...sessionConfig,
        videoOptimization: 'fitness',
        audioProfile: 'speech'
      });
    });
    
    it('should handle session creation failure gracefully', async () => {
      mockSDK.createSession.mockRejectedValue(new Error('Network error'));
      
      await expect(zoomService.createSession({})).rejects.toThrow('Failed to create session');
      expect(zoomService.getConnectionState()).toBe('disconnected');
    });
  });
  
  describe('Quality Management', () => {
    it('should adapt quality based on participant count', async () => {
      await zoomService.setParticipantCount(30);
      await zoomService.optimizeQuality();
      
      expect(mockSDK.setVideoQuality).toHaveBeenCalledWith({
        resolution: '360p',
        frameRate: 15,
        bitrate: 500
      });
    });
  });
});
```

#### Fitness Logic Testing
```typescript
// tests/unit/services/fitness/FitnessLevelService.test.ts
describe('FitnessLevelService', () => {
  let fitnessService: FitnessLevelService;
  let mockDatabase: jest.Mocked<DatabaseService>;
  
  beforeEach(() => {
    mockDatabase = createMockDatabase();
    fitnessService = new FitnessLevelService(mockDatabase);
  });
  
  describe('Level Assignment', () => {
    it('should assign correct fitness level based on assessment', () => {
      const assessmentData = {
        pushUps: 15,
        squats: 25,
        planDuration: 60,
        experience: 'beginner'
      };
      
      const level = fitnessService.calculateFitnessLevel(assessmentData);
      expect(level).toBe('intermediate');
    });
    
    it('should update level progression correctly', async () => {
      const userId = 'user-123';
      const newProgress = { sessions: 10, improvements: ['strength', 'endurance'] };
      
      await fitnessService.updateProgression(userId, newProgress);
      
      expect(mockDatabase.updateUserProgress).toHaveBeenCalledWith(userId, newProgress);
    });
  });
});
```

### 2. Integration Testing

#### Real-Time Video Integration
```typescript
// tests/integration/videoStream.integration.test.ts
describe('Video Stream Integration', () => {
  let testEnvironment: TestEnvironment;
  
  beforeAll(async () => {
    testEnvironment = await createTestEnvironment({
      mockZoomSDK: true,
      mockSupabase: true,
      participantCount: 5
    });
  });
  
  it('should handle multiple participants joining simultaneously', async () => {
    const participants = Array.from({ length: 5 }, (_, i) => ({
      id: `participant-${i}`,
      fitnessLevel: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced'
    }));
    
    // Simulate simultaneous joins
    const joinPromises = participants.map(p => 
      testEnvironment.simulateParticipantJoin(p)
    );
    
    await Promise.all(joinPromises);
    
    // Verify state consistency
    const sessionState = testEnvironment.getSessionState();
    expect(sessionState.participants).toHaveLength(5);
    expect(sessionState.fitnessGroups.beginner).toHaveLength(2);
    expect(sessionState.fitnessGroups.intermediate).toHaveLength(2);
    expect(sessionState.fitnessGroups.advanced).toHaveLength(1);
  });
  
  it('should maintain video quality during network fluctuations', async () => {
    await testEnvironment.startSession();
    
    // Simulate network degradation
    await testEnvironment.simulateNetworkCondition('poor');
    
    // Quality should adapt
    const qualityMetrics = await testEnvironment.getQualityMetrics();
    expect(qualityMetrics.resolution).toBe('360p');
    expect(qualityMetrics.frameRate).toBeLessThanOrEqual(15);
    
    // Simulate network recovery
    await testEnvironment.simulateNetworkCondition('excellent');
    
    // Quality should improve
    const improvedMetrics = await testEnvironment.getQualityMetrics();
    expect(improvedMetrics.resolution).toBe('720p');
  });
});
```

### 3. End-to-End Testing

#### Complete User Journey
```typescript
// tests/e2e/fitnessSession.e2e.test.ts
describe('Complete Fitness Session E2E', () => {
  let browser: Browser;
  let coachPage: Page;
  let studentPages: Page[];
  
  beforeAll(async () => {
    browser = await chromium.launch();
    coachPage = await browser.newPage();
    studentPages = await Promise.all(
      Array.from({ length: 3 }, () => browser.newPage())
    );
  });
  
  it('should complete full fitness session workflow', async () => {
    // Step 1: Coach creates session
    await coachPage.goto('/coach');
    await coachPage.click('[data-testid="create-session"]');
    await coachPage.fill('[data-testid="session-name"]', 'Morning Workout');
    await coachPage.click('[data-testid="start-session"]');
    
    // Step 2: Students join session
    const sessionUrl = await coachPage.evaluate(() => window.location.href);
    
    for (let i = 0; i < studentPages.length; i++) {
      await studentPages[i].goto(sessionUrl.replace('/coach', '/student'));
      await studentPages[i].click('[data-testid="join-session"]');
      
      // Verify video tile appears
      await studentPages[i].waitForSelector(`[data-testid="participant-tile-student-${i}"]`);
    }
    
    // Step 3: Coach assigns fitness levels
    await coachPage.click('[data-testid="participant-management"]');
    await coachPage.selectOption('[data-testid="student-0-level"]', 'beginner');
    await coachPage.selectOption('[data-testid="student-1-level"]', 'intermediate');
    await coachPage.selectOption('[data-testid="student-2-level"]', 'advanced');
    
    // Step 4: Coach switches to teach mode
    await coachPage.click('[data-testid="teach-mode"]');
    
    // Verify coach video is prominent
    await coachPage.waitForSelector('[data-testid="coach-spotlight"]');
    
    // Step 5: Coach assigns targeted exercise
    await coachPage.click('[data-testid="exercise-selector"]');
    await coachPage.selectOption('[data-testid="target-level"]', 'beginner');
    await coachPage.click('[data-testid="assign-pushup-variation"]');
    
    // Verify only beginner student sees exercise
    await studentPages[0].waitForSelector('[data-testid="exercise-content"]');
    
    // Advanced student should see placeholder
    await studentPages[2].waitForSelector('[data-testid="exercise-placeholder"]');
    
    // Step 6: Switch to workout mode and monitor
    await coachPage.click('[data-testid="workout-mode"]');
    
    // Verify grid layout for monitoring
    await coachPage.waitForSelector('[data-testid="workout-grid"]');
    
    // Step 7: Students interact with rep counter
    await studentPages[0].click('[data-testid="rep-increment"]');
    await studentPages[0].click('[data-testid="rep-increment"]');
    
    // Verify rep count is synchronized
    await coachPage.waitForSelector('[data-testid="student-0-reps"][data-count="2"]');
    
    // Step 8: End session
    await coachPage.click('[data-testid="end-session"]');
    
    // Verify session summary
    await coachPage.waitForSelector('[data-testid="session-summary"]');
    
    // Verify students are disconnected
    for (const studentPage of studentPages) {
      await studentPage.waitForSelector('[data-testid="session-ended"]');
    }
  });
});
```

### 4. Performance Testing

#### Video Streaming Load Testing
```typescript
// tests/performance/videoLoad.test.ts
describe('Video Streaming Performance', () => {
  it('should maintain performance with 50 concurrent participants', async () => {
    const loadTest = new VideoLoadTest({
      maxParticipants: 50,
      duration: 300000, // 5 minutes
      rampUpTime: 60000  // 1 minute ramp up
    });
    
    const results = await loadTest.run();
    
    // Performance assertions
    expect(results.averageLatency).toBeLessThan(500); // < 500ms
    expect(results.videoDropRate).toBeLessThan(0.02); // < 2% drop rate
    expect(results.audioDropRate).toBeLessThan(0.01); // < 1% drop rate
    expect(results.cpuUsage).toBeLessThan(80); // < 80% CPU
    expect(results.memoryUsage).toBeLessThan(2048); // < 2GB RAM
  });
  
  it('should gracefully degrade quality under high load', async () => {
    const stressTest = new VideoStressTest({
      participantCount: 100, // Beyond normal limits
      networkCondition: 'poor'
    });
    
    const results = await stressTest.run();
    
    // Should automatically reduce quality
    expect(results.finalResolution).toBeLessThanOrEqual('360p');
    expect(results.finalFrameRate).toBeLessThanOrEqual(15);
    expect(results.sessionStability).toBeGreaterThan(0.95); // 95% stability
  });
});
```

---

## State Management Patterns

### 1. Real-Time State Architecture

#### Context-Based State Management
```typescript
// contexts/FitnessSessionContext.tsx
interface FitnessSessionState {
  session: FitnessSession | null;
  participants: Map<string, Participant>;
  fitnessGroups: FitnessGroups;
  currentMode: 'teach' | 'workout';
  activeExercise: Exercise | null;
  connectionStates: Map<string, ConnectionState>;
  videoStreams: Map<string, MediaStream>;
  audioStates: Map<string, AudioState>;
}

type FitnessSessionAction = 
  | { type: 'SESSION_STARTED'; payload: FitnessSession }
  | { type: 'PARTICIPANT_JOINED'; payload: Participant }
  | { type: 'PARTICIPANT_LEFT'; payload: string }
  | { type: 'FITNESS_LEVEL_ASSIGNED'; payload: { userId: string; level: FitnessLevel } }
  | { type: 'MODE_SWITCHED'; payload: 'teach' | 'workout' }
  | { type: 'EXERCISE_ASSIGNED'; payload: { exercise: Exercise; targetLevel: FitnessLevel } }
  | { type: 'VIDEO_STREAM_ADDED'; payload: { userId: string; stream: MediaStream } }
  | { type: 'CONNECTION_QUALITY_CHANGED'; payload: { userId: string; quality: number } };

const fitnessSessionReducer = (
  state: FitnessSessionState,
  action: FitnessSessionAction
): FitnessSessionState => {
  switch (action.type) {
    case 'PARTICIPANT_JOINED':
      return {
        ...state,
        participants: new Map(state.participants).set(action.payload.id, action.payload),
        fitnessGroups: updateFitnessGroups(state.fitnessGroups, action.payload)
      };
      
    case 'FITNESS_LEVEL_ASSIGNED':
      const updatedParticipant = {
        ...state.participants.get(action.payload.userId)!,
        fitnessLevel: action.payload.level
      };
      
      return {
        ...state,
        participants: new Map(state.participants).set(action.payload.userId, updatedParticipant),
        fitnessGroups: recalculateFitnessGroups(state.participants, action.payload)
      };
      
    case 'VIDEO_STREAM_ADDED':
      return {
        ...state,
        videoStreams: new Map(state.videoStreams).set(action.payload.userId, action.payload.stream)
      };
      
    default:
      return state;
  }
};
```

#### Real-Time Synchronization Hook
```typescript
// hooks/useRealTimeSync.ts
export const useRealTimeSync = (sessionId: string) => {
  const [state, dispatch] = useReducer(fitnessSessionReducer, initialState);
  const [isConnected, setIsConnected] = useState(false);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  
  // Supabase real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_participants'
      }, (payload) => {
        handleParticipantChange(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_exercises'
      }, (payload) => {
        handleExerciseChange(payload);
      })
      .on('broadcast', { event: 'video_state_change' }, (payload) => {
        handleVideoStateChange(payload);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);
  
  // Conflict resolution for simultaneous updates
  const handleConflict = useCallback(async (localState: any, remoteState: any) => {
    // Use server timestamp as source of truth
    if (remoteState.updated_at > localState.updated_at) {
      return remoteState;
    }
    
    // For fitness-specific data, prefer coach updates
    if (remoteState.updated_by_role === 'coach' && localState.updated_by_role === 'student') {
      return remoteState;
    }
    
    return localState;
  }, []);
  
  return {
    state,
    isConnected,
    syncErrors,
    dispatch: useCallback((action: FitnessSessionAction) => {
      // Optimistic update
      dispatch(action);
      
      // Sync to server
      syncToServer(action).catch((error) => {
        // Rollback on failure
        dispatch({ type: 'ROLLBACK', payload: action });
        setSyncErrors(prev => [...prev, error]);
      });
    }, [])
  };
};
```

### 2. Video Stream State Management

```typescript
// hooks/useVideoStreamState.ts
export const useVideoStreamState = () => {
  const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map());
  const [qualities, setQualities] = useState<Map<string, VideoQuality>>(new Map());
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string | null>(null);
  
  const addStream = useCallback((participantId: string, stream: MediaStream) => {
    setStreams(prev => new Map(prev).set(participantId, stream));
    
    // Monitor stream quality
    monitorStreamQuality(participantId, stream);
  }, []);
  
  const removeStream = useCallback((participantId: string) => {
    const stream = streams.get(participantId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
    }
  }, [streams]);
  
  const spotlightParticipant = useCallback((participantId: string) => {
    setSpotlightedParticipant(participantId);
    
    // Optimize other streams for spotlight mode
    streams.forEach((stream, id) => {
      if (id !== participantId) {
        optimizeStreamForBackground(stream);
      }
    });
  }, [streams]);
  
  return {
    streams,
    qualities,
    spotlightedParticipant,
    addStream,
    removeStream,
    spotlightParticipant
  };
};
```

---

## Performance Optimization

### 1. Video Stream Optimization

#### Adaptive Bitrate Implementation
```typescript
// utils/video/adaptiveBitrate.ts
export class AdaptiveBitrateController {
  private bitrateHistory: number[] = [];
  private qualityLevels: QualityLevel[] = [
    { resolution: '1080p', bitrate: 2500, frameRate: 30 },
    { resolution: '720p', bitrate: 1500, frameRate: 24 },
    { resolution: '480p', bitrate: 800, frameRate: 20 },
    { resolution: '360p', bitrate: 500, frameRate: 15 },
    { resolution: '240p', bitrate: 300, frameRate: 12 }
  ];
  
  async adjustBitrate(networkStats: NetworkStats): Promise<QualityLevel> {
    const availableBandwidth = this.calculateAvailableBandwidth(networkStats);
    const participantCount = await this.getActiveParticipantCount();
    
    // Factor in participant count for bandwidth allocation
    const bandwidthPerStream = availableBandwidth / Math.max(participantCount, 1);
    
    // Find optimal quality level
    const optimalLevel = this.qualityLevels.find(level => 
      level.bitrate <= bandwidthPerStream * 0.8 // 80% safety margin
    ) || this.qualityLevels[this.qualityLevels.length - 1];
    
    return optimalLevel;
  }
  
  private calculateAvailableBandwidth(stats: NetworkStats): number {
    // Implement bandwidth calculation based on RTCStats
    this.bitrateHistory.push(stats.availableBitrate);
    
    // Keep only last 10 measurements
    if (this.bitrateHistory.length > 10) {
      this.bitrateHistory.shift();
    }
    
    // Use median to avoid spikes
    return this.median(this.bitrateHistory);
  }
}
```

#### Memory Management for Video Streams
```typescript
// utils/video/memoryManager.ts
export class VideoMemoryManager {
  private streamCache: Map<string, CachedStream> = new Map();
  private maxCacheSize: number = 25; // streams
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Cleanup inactive streams every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveStreams();
    }, 30000);
  }
  
  addStream(participantId: string, stream: MediaStream): void {
    // Check cache size
    if (this.streamCache.size >= this.maxCacheSize) {
      this.evictOldestStream();
    }
    
    this.streamCache.set(participantId, {
      stream,
      lastAccessed: Date.now(),
      isActive: true
    });
  }
  
  private evictOldestStream(): void {
    let oldestId: string | null = null;
    let oldestTime = Date.now();
    
    this.streamCache.forEach((cachedStream, id) => {
      if (cachedStream.lastAccessed < oldestTime && !cachedStream.isActive) {
        oldestTime = cachedStream.lastAccessed;
        oldestId = id;
      }
    });
    
    if (oldestId) {
      this.removeStream(oldestId);
    }
  }
  
  private cleanupInactiveStreams(): void {
    const cutoffTime = Date.now() - 300000; // 5 minutes
    
    this.streamCache.forEach((cachedStream, id) => {
      if (cachedStream.lastAccessed < cutoffTime && !cachedStream.isActive) {
        this.removeStream(id);
      }
    });
  }
  
  private removeStream(participantId: string): void {
    const cachedStream = this.streamCache.get(participantId);
    if (cachedStream) {
      cachedStream.stream.getTracks().forEach(track => track.stop());
      this.streamCache.delete(participantId);
    }
  }
}
```

### 2. React Performance Optimization

#### Memoized Video Components
```typescript
// components/video/OptimizedVideoTile.tsx
interface VideoTileProps {
  participantId: string;
  stream: MediaStream;
  fitnessLevel: FitnessLevel;
  isSpotlighted: boolean;
  repCount: number;
}

export const OptimizedVideoTile = memo<VideoTileProps>(({
  participantId,
  stream,
  fitnessLevel,
  isSpotlighted,
  repCount
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Memoize expensive calculations
  const tileStyle = useMemo(() => ({
    width: isSpotlighted ? '100%' : '200px',
    height: isSpotlighted ? '75vh' : '150px',
    transform: isSpotlighted ? 'scale(1.0)' : 'scale(0.8)',
    transition: 'all 0.3s ease-in-out'
  }), [isSpotlighted]);
  
  // Only re-render when essential props change
  const shouldUpdate = usePrevious([participantId, isSpotlighted, repCount]);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div 
      className="relative bg-fitness-gray rounded-lg overflow-hidden"
      style={tileStyle}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Fitness overlays */}
      <FitnessLevelBadge level={fitnessLevel} />
      <RepCounter count={repCount} />
      
      {isSpotlighted && (
        <div className="absolute top-2 left-2 bg-fitness-green text-black px-2 py-1 rounded">
          Spotlight
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-renders
  return (
    prevProps.participantId === nextProps.participantId &&
    prevProps.isSpotlighted === nextProps.isSpotlighted &&
    prevProps.repCount === nextProps.repCount &&
    prevProps.fitnessLevel === nextProps.fitnessLevel
  );
});
```

---

## Error Handling & Recovery

### 1. Video Stream Error Recovery

```typescript
// services/video/ErrorRecoveryService.ts
export class VideoErrorRecoveryService {
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private maxRetryAttempts: number = 3;
  private retryDelay: number = 1000; // ms
  
  constructor() {
    this.setupRecoveryStrategies();
  }
  
  private setupRecoveryStrategies(): void {
    this.recoveryStrategies.set('NETWORK_ERROR', {
      name: 'Network Recovery',
      steps: [
        () => this.reduceVideoQuality(),
        () => this.switchToAudioOnly(),
        () => this.attemptReconnection(),
        () => this.fallbackToDataChannel()
      ]
    });
    
    this.recoveryStrategies.set('CODEC_ERROR', {
      name: 'Codec Recovery',
      steps: [
        () => this.switchCodec('VP8'),
        () => this.switchCodec('H264'),
        () => this.disableVideoEncoding()
      ]
    });
    
    this.recoveryStrategies.set('PERMISSION_ERROR', {
      name: 'Permission Recovery',
      steps: [
        () => this.requestPermissions(),
        () => this.showPermissionGuide(),
        () => this.fallbackToAudioOnly()
      ]
    });
  }
  
  async handleError(error: VideoStreamError): Promise<boolean> {
    const errorType = this.classifyError(error);
    const strategy = this.recoveryStrategies.get(errorType);
    
    if (!strategy) {
      await this.logUnknownError(error);
      return false;
    }
    
    console.log(`Attempting recovery: ${strategy.name}`);
    
    for (let i = 0; i < strategy.steps.length; i++) {
      try {
        const success = await this.executeRecoveryStep(strategy.steps[i]);
        if (success) {
          await this.logRecoverySuccess(errorType, i + 1);
          return true;
        }
      } catch (recoveryError) {
        await this.logRecoveryFailure(errorType, i + 1, recoveryError);
      }
      
      // Wait before next attempt
      await this.delay(this.retryDelay * (i + 1));
    }
    
    await this.logRecoveryExhausted(errorType);
    return false;
  }
  
  private classifyError(error: VideoStreamError): string {
    if (error.message.includes('network') || error.code === 'NETWORK_FAILURE') {
      return 'NETWORK_ERROR';
    } else if (error.message.includes('codec') || error.code === 'CODEC_UNSUPPORTED') {
      return 'CODEC_ERROR';
    } else if (error.message.includes('permission') || error.code === 'PERMISSION_DENIED') {
      return 'PERMISSION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  private async reduceVideoQuality(): Promise<boolean> {
    try {
      const currentQuality = await this.getCurrentVideoQuality();
      const lowerQuality = this.getNextLowerQuality(currentQuality);
      
      if (lowerQuality) {
        await this.setVideoQuality(lowerQuality);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  private async attemptReconnection(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        await this.disconnect();
        await this.delay(this.retryDelay * attempt);
        await this.reconnect();
        
        // Verify connection
        const isConnected = await this.verifyConnection();
        if (isConnected) {
          return true;
        }
      } catch (error) {
        console.log(`Reconnection attempt ${attempt} failed:`, error);
      }
    }
    
    return false;
  }
}
```

### 2. State Recovery Mechanisms

```typescript
// hooks/useStateRecovery.ts
export const useStateRecovery = (sessionId: string) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastKnownState, setLastKnownState] = useState<SessionState | null>(null);
  
  // Periodically backup state
  useEffect(() => {
    const backupInterval = setInterval(() => {
      const currentState = getCurrentSessionState();
      localStorage.setItem(`session_backup_${sessionId}`, JSON.stringify(currentState));
      setLastKnownState(currentState);
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(backupInterval);
  }, [sessionId]);
  
  const recoverFromFailure = useCallback(async () => {
    setIsRecovering(true);
    
    try {
      // Try to recover from local backup
      const backupData = localStorage.getItem(`session_backup_${sessionId}`);
      if (backupData) {
        const backupState = JSON.parse(backupData);
        await restoreSessionState(backupState);
      }
      
      // Verify state consistency with server
      const serverState = await fetchServerState(sessionId);
      const mergedState = mergeStates(backupState, serverState);
      
      await restoreSessionState(mergedState);
      
    } catch (error) {
      console.error('State recovery failed:', error);
      // Fallback to server state only
      const serverState = await fetchServerState(sessionId);
      await restoreSessionState(serverState);
    } finally {
      setIsRecovering(false);
    }
  }, [sessionId]);
  
  return {
    isRecovering,
    lastKnownState,
    recoverFromFailure
  };
};
```

---

## Development Workflow

### 1. Feature Development Process

#### Branch Strategy
```bash
# Feature branches for new functionality
git checkout -b feature/video-quality-adaptation
git checkout -b feature/fitness-level-targeting
git checkout -b feature/rep-counter-sync

# Bug fix branches for issues
git checkout -b bugfix/video-stream-memory-leak
git checkout -b bugfix/participant-sync-race-condition

# Release branches for version preparation
git checkout -b release/v1.2.0
```

#### Pre-commit Hooks
```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run unit tests for changed files
npm run test:changed

# Check for video stream memory leaks
npm run test:memory-leaks

# Validate video quality settings
npm run validate:video-config
```

### 2. Local Development Setup

#### Mock Video SDK for Development
```typescript
// mocks/mockZoomSDK.ts
export class MockZoomSDK {
  private participants: Map<string, MockParticipant> = new Map();
  private streams: Map<string, MediaStream> = new Map();
  
  async createSession(config: SessionConfig): Promise<MockSession> {
    // Simulate Zoom SDK session creation
    const session = new MockSession(config);
    
    // Simulate realistic delays
    await this.delay(Math.random() * 1000 + 500);
    
    return session;
  }
  
  async addParticipant(userData: UserData): Promise<void> {
    const participant = new MockParticipant(userData);
    this.participants.set(userData.id, participant);
    
    // Simulate video stream
    const mockStream = await this.createMockVideoStream();
    this.streams.set(userData.id, mockStream);
    
    // Trigger participant joined event
    this.emit('participant-joined', { participant, stream: mockStream });
  }
  
  private async createMockVideoStream(): Promise<MediaStream> {
    // Create a canvas-based mock video stream for testing
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    
    const ctx = canvas.getContext('2d')!;
    
    // Animate the canvas to simulate video
    const animate = () => {
      ctx.fillStyle = `hsl(${Date.now() % 360}, 50%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText(`Mock Video ${Date.now()}`, 10, 30);
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return (canvas as any).captureStream(30); // 30 FPS
  }
  
  // Simulate network conditions for testing
  simulateNetworkCondition(condition: 'excellent' | 'good' | 'poor' | 'very-poor'): void {
    const qualityMap = {
      'excellent': 5,
      'good': 4,
      'poor': 2,
      'very-poor': 1
    };
    
    this.emit('connection-quality-changed', {
      quality: qualityMap[condition]
    });
  }
}
```

---

## Debugging Guidelines

### 1. Video Streaming Debug Tools

#### Debug Panel Component
```typescript
// components/debug/VideoDebugPanel.tsx
export const VideoDebugPanel = () => {
  const [debugData, setDebugData] = useState<VideoDebugData>({});
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;
    
    const updateDebugData = async () => {
      const data = await gatherVideoDebugData();
      setDebugData(data);
    };
    
    const interval = setInterval(updateDebugData, 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return (
      <button
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded"
        onClick={() => setIsVisible(true)}
      >
        Debug
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Video Debug Panel</h3>
        <button onClick={() => setIsVisible(false)}>×</button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Connection Quality:</strong> {debugData.connectionQuality}/5
        </div>
        <div>
          <strong>Video Resolution:</strong> {debugData.videoResolution}
        </div>
        <div>
          <strong>Frame Rate:</strong> {debugData.frameRate} fps
        </div>
        <div>
          <strong>Bitrate:</strong> {debugData.bitrate} kbps
        </div>
        <div>
          <strong>Participant Count:</strong> {debugData.participantCount}
        </div>
        <div>
          <strong>Memory Usage:</strong> {debugData.memoryUsage} MB
        </div>
        
        <div className="mt-4">
          <strong>Active Streams:</strong>
          <ul className="list-disc list-inside">
            {debugData.activeStreams?.map(stream => (
              <li key={stream.id}>
                {stream.id}: {stream.state} ({stream.quality})
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-4">
          <button
            className="bg-blue-500 px-2 py-1 rounded mr-2"
            onClick={() => window.open('/debug/rtc-stats')}
          >
            View RTC Stats
          </button>
          <button
            className="bg-green-500 px-2 py-1 rounded"
            onClick={downloadDebugLogs}
          >
            Download Logs
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### Debug Logging System
```typescript
// utils/debugLogger.ts
export class VideoDebugLogger {
  private logs: DebugLog[] = [];
  private maxLogs: number = 1000;
  
  log(level: LogLevel, category: string, message: string, data?: any): void {
    const log: DebugLog = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data: data ? JSON.stringify(data) : undefined
    };
    
    this.logs.push(log);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                      level === 'warn' ? console.warn : console.log;
      logMethod(`[${category}] ${message}`, data);
    }
  }
  
  logVideoEvent(event: string, participantId: string, data?: any): void {
    this.log('info', 'VIDEO', `${event} for participant ${participantId}`, data);
  }
  
  logNetworkEvent(event: string, quality: number, data?: any): void {
    this.log('info', 'NETWORK', `${event} - Quality: ${quality}`, data);
  }
  
  logPerformance(metric: string, value: number, threshold?: number): void {
    const level = threshold && value > threshold ? 'warn' : 'info';
    this.log(level, 'PERFORMANCE', `${metric}: ${value}`, { threshold });
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}

// Global debug logger instance
export const debugLogger = new VideoDebugLogger();
```

---

## Code Quality Standards

### 1. TypeScript Standards

#### Strict Type Definitions
```typescript
// types/video.ts - Comprehensive video type definitions
export interface VideoStreamConstraints {
  readonly resolution: VideoResolution;
  readonly frameRate: number;
  readonly bitrate: number;
  readonly deviceId?: string;
  readonly facingMode?: 'user' | 'environment';
}

export interface ParticipantVideoState {
  readonly participantId: string;
  readonly isVideoEnabled: boolean;
  readonly stream: MediaStream | null;
  readonly quality: VideoQuality;
  readonly connectionState: ConnectionState;
  readonly lastUpdate: number;
}

// Use branded types for ID safety
export type ParticipantId = string & { readonly brand: unique symbol };
export type SessionId = string & { readonly brand: unique symbol };

// Utility types for video events
export type VideoEventHandler<T = any> = (event: T) => void | Promise<void>;
export type VideoEventMap = {
  'stream-added': ParticipantVideoState;
  'stream-removed': ParticipantId;
  'quality-changed': QualityChangeEvent;
  'connection-state-changed': ConnectionStateEvent;
};
```

#### Error Type System
```typescript
// types/errors.ts
export abstract class FitnessVideoError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;
  
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NetworkError extends FitnessVideoError {
  readonly code = 'NETWORK_ERROR';
  readonly recoverable = true;
}

export class CodecError extends FitnessVideoError {
  readonly code = 'CODEC_ERROR';
  readonly recoverable = true;
}

export class PermissionError extends FitnessVideoError {
  readonly code = 'PERMISSION_ERROR';
  readonly recoverable = false;
}

// Type-safe error handling
export const handleVideoError = (error: unknown): FitnessVideoError => {
  if (error instanceof FitnessVideoError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new NetworkError(error.message, { originalError: error });
  }
  
  return new NetworkError('Unknown video error occurred');
};
```

### 2. Code Organization Rules

#### Component Structure Standards
```typescript
// Standard component file structure
/**
 * Component: OptimizedVideoTile
 * Purpose: Renders individual participant video with fitness overlays
 * Dependencies: Zoom SDK, fitness level data
 * Performance: Memoized, optimized for 50+ concurrent renders
 */

// 1. Imports - grouped by type
import React, { memo, useRef, useEffect, useMemo } from 'react';
import { VideoStreamConstraints, ParticipantVideoState } from '../../types/video';
import { FitnessLevel } from '../../types/fitness';
import { useVideoStream } from '../../hooks/useVideoStream';
import { debugLogger } from '../../utils/debugLogger';

// 2. Interface definitions
interface OptimizedVideoTileProps {
  readonly participant: ParticipantVideoState;
  readonly fitnessLevel: FitnessLevel;
  readonly isSpotlighted: boolean;
  readonly onParticipantClick?: (participantId: string) => void;
}

// 3. Component implementation with clear sections
export const OptimizedVideoTile = memo<OptimizedVideoTileProps>(({
  participant,
  fitnessLevel,
  isSpotlighted,
  onParticipantClick
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Hooks
  const { updateVideoElement } = useVideoStream(participant.participantId);
  
  // Memoized values
  const tileStyles = useMemo(() => ({
    // ... styles
  }), [isSpotlighted]);
  
  // Effects
  useEffect(() => {
    // ... video element setup
  }, [participant.stream]);
  
  // Event handlers
  const handleClick = useCallback(() => {
    onParticipantClick?.(participant.participantId);
    debugLogger.logVideoEvent('participant_clicked', participant.participantId);
  }, [onParticipantClick, participant.participantId]);
  
  // Render
  return (
    // ... JSX
  );
});

// 4. Display name for debugging
OptimizedVideoTile.displayName = 'OptimizedVideoTile';
```

### 3. Performance Guidelines

#### React Performance Rules
1. **Always use `memo` for video components** - Video components render frequently
2. **Memoize expensive calculations** - Use `useMemo` for style calculations
3. **Optimize re-render triggers** - Custom comparison functions for `memo`
4. **Use `useCallback` for event handlers** - Prevent unnecessary re-renders
5. **Implement virtual scrolling** - For participant lists > 20 items

#### Video Stream Performance Rules
1. **Limit concurrent video streams** - Maximum 25 active video streams
2. **Implement stream pooling** - Reuse MediaStream objects when possible
3. **Monitor memory usage** - Clean up inactive streams promptly
4. **Use adaptive quality** - Automatic quality adjustment based on performance
5. **Optimize for mobile** - Reduced quality settings for mobile devices

---

This developer guide provides a comprehensive framework for building and maintaining the FitConnect platform with a focus on the complex challenges of real-time video streaming in a fitness context. Follow these patterns and guidelines to ensure scalable, maintainable, and performant code.