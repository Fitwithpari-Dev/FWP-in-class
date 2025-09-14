# FitWithPari Implementation Plan
## Sequential Development Strategy for Real-Time Fitness Platform

### Table of Contents
1. [Overview](#overview)
2. [Pre-Development Setup](#pre-development-setup)
3. [Phase 1: Foundation & Core Infrastructure](#phase-1-foundation--core-infrastructure)
4. [Phase 2: Video Integration & Basic Features](#phase-2-video-integration--basic-features)
5. [Phase 3: Fitness-Specific Features](#phase-3-fitness-specific-features)
6. [Phase 4: Real-Time Synchronization](#phase-4-real-time-synchronization)
7. [Phase 5: Advanced Features & Optimization](#phase-5-advanced-features--optimization)
8. [Phase 6: Production Readiness](#phase-6-production-readiness)
9. [Risk Mitigation & Rollback Plans](#risk-mitigation--rollback-plans)
10. [Success Criteria & Testing Gates](#success-criteria--testing-gates)

---

## Overview

This implementation plan outlines the sequential development approach for the FitConnect platform, building upon the existing codebase structure. The plan prioritizes core video infrastructure before fitness-specific features to ensure a stable foundation for real-time interactions.

### Current State Analysis
- ✅ Basic React structure with Coach/Student views
- ✅ Fitness platform hook foundation
- ✅ Type definitions started
- ✅ UI component library (shadcn/ui)
- ⚠️ No video integration yet
- ⚠️ No backend database integration
- ⚠️ No real-time synchronization

### Development Principles
1. **Video-First Approach**: Establish stable video infrastructure before adding fitness features
2. **Incremental Integration**: Add complexity gradually with thorough testing at each step
3. **Mock-First Development**: Use mocks for external dependencies during development
4. **Testable Architecture**: Build testing infrastructure alongside features
5. **Performance Monitoring**: Track performance metrics from the beginning

---

## Pre-Development Setup

### Week -1: Environment & Tools Setup

#### Development Environment
```bash
# Install additional dependencies for video development
npm install @types/webrtc @testing-library/jest-dom
npm install --save-dev @types/jest cypress @storybook/react
npm install jwt-simple uuid lodash-es
npm install @types/uuid @types/lodash-es

# Video SDK dependencies (mocked initially)
npm install --save-dev jest-canvas-mock
```

#### Project Structure Updates
```
src/
├── __mocks__/              # Mock implementations
│   ├── zoomSDK.ts
│   ├── supabase.ts
│   └── mediaDevices.ts
├── config/                 # Configuration files
│   ├── environment.ts
│   ├── zoomConfig.ts
│   └── constants.ts
├── services/               # Business logic services
│   ├── video/
│   ├── fitness/
│   ├── session/
│   └── database/
├── utils/                  # Utility functions
│   ├── video/
│   ├── fitness/
│   └── common/
└── tests/                  # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

#### Development Tools Configuration
- **Storybook**: For component development in isolation
- **Jest**: Unit testing with video mocks
- **Cypress**: E2E testing with video simulation
- **TypeScript**: Strict configuration for video types
- **ESLint**: Custom rules for video component patterns

---

## Phase 1: Foundation & Core Infrastructure
### Duration: 2 weeks

### Week 1: Core Architecture & Mock Video System

#### Sprint 1.1: Service Layer Foundation
**Goal**: Establish service layer architecture with mock video implementation

**Tasks**:
1. **Create Mock Video SDK Service** (`services/video/MockZoomService.ts`)
   ```typescript
   export class MockZoomService implements VideoSDKInterface {
     async createSession(config: SessionConfig): Promise<MockSession>
     async joinSession(token: string): Promise<void>
     async addParticipant(userData: UserData): Promise<MockParticipant>
     // ... other methods with realistic delays and event simulation
   }
   ```

2. **Implement Video Service Interface** (`services/video/VideoServiceInterface.ts`)
   ```typescript
   export interface VideoSDKInterface {
     createSession(config: SessionConfig): Promise<Session>
     joinSession(token: string): Promise<void>
     leaveSession(): Promise<void>
     // ... complete interface definition
   }
   ```

3. **Create Session Management Service** (`services/session/SessionService.ts`)
   ```typescript
   export class SessionService {
     constructor(private videoService: VideoSDKInterface) {}
     async createFitnessSession(data: FitnessSessionData): Promise<FitnessSession>
     async startSession(sessionId: string): Promise<void>
     // ... session lifecycle management
   }
   ```

4. **Update Type Definitions** (`types/`)
   - Enhanced video types with Zoom SDK compatibility
   - Session management types
   - Error handling types
   - Mock data types

**Deliverables**:
- [ ] Working mock video service with event simulation
- [ ] Service layer interfaces and implementations
- [ ] Updated type definitions
- [ ] Unit tests for service layer (>90% coverage)

**Success Criteria**:
- Mock video calls work without errors
- Service layer is testable in isolation
- Type safety across all video operations

---

#### Sprint 1.2: Enhanced State Management & Testing Infrastructure
**Goal**: Upgrade state management and establish testing patterns

**Tasks**:
1. **Refactor useFitnessPlatform Hook**
   ```typescript
   // Enhanced with video state management
   export const useFitnessPlatform = () => {
     const [session, setSession] = useState<FitnessSession | null>(null)
     const [participants, setParticipants] = useState<Map<string, Participant>>(new Map())
     const [videoStreams, setVideoStreams] = useState<Map<string, MediaStream>>(new Map())
     const [connectionStates, setConnectionStates] = useState<Map<string, ConnectionState>>(new Map())
     
     // Video service integration
     const videoService = useMemo(() => new MockZoomService(), [])
     // ... rest of implementation
   }
   ```

2. **Create Testing Utilities** (`tests/utils/`)
   ```typescript
   // Test environment setup
   export const createTestEnvironment = async (config: TestConfig) => {
     return {
       mockVideoService: new MockZoomService(),
       simulateParticipantJoin: (userData: UserData) => Promise<void>,
       simulateNetworkCondition: (condition: NetworkCondition) => Promise<void>,
       getSessionState: () => SessionState
     }
   }
   ```

3. **Implement Component Testing Framework**
   - Video component test utilities
   - Mock stream generators
   - Event simulation helpers

4. **Create Development Storybook Stories**
   ```typescript
   // Video component stories with mock streams
   export const VideoTileStory = {
     args: {
       participant: mockParticipant,
       stream: mockVideoStream,
       isSpotlighted: false
     }
   }
   ```

**Deliverables**:
- [ ] Enhanced state management with video support
- [ ] Testing utilities and framework
- [ ] Storybook stories for existing components
- [ ] Integration test setup

**Success Criteria**:
- All existing components work with new state management
- Testing framework supports video mocking
- Storybook provides isolated development environment

---

### Week 2: Component Updates & Video UI Foundation

#### Sprint 1.3: Update Existing Components for Video Integration
**Goal**: Modify existing components to support video streams and prepare for real video integration

**Tasks**:
1. **Enhance ParticipantTile Component**
   ```typescript
   interface ParticipantTileProps {
     participant: Participant
     stream?: MediaStream
     isSpotlighted: boolean
     connectionQuality: number
     onSpotlight: (participantId: string) => void
     onMute: (participantId: string) => void
   }
   
   export const ParticipantTile = memo<ParticipantTileProps>(({ ... }) => {
     const videoRef = useRef<HTMLVideoElement>(null)
     
     useEffect(() => {
       if (videoRef.current && stream) {
         videoRef.current.srcObject = stream
       }
     }, [stream])
     
     // ... rest of implementation with video support
   })
   ```

2. **Update VideoArea Component** for Video Grid Layout
   ```typescript
   export const VideoArea = () => {
     const { participants, videoStreams, spotlightedParticipant } = useFitnessPlatformContext()
     
     const renderVideoGrid = useMemo(() => {
       // Dynamic grid layout based on participant count
       const participantCount = participants.size
       const gridClass = getGridLayoutClass(participantCount, spotlightedParticipant)
       
       return (
         <div className={gridClass}>
           {Array.from(participants.values()).map(participant => (
             <ParticipantTile
               key={participant.id}
               participant={participant}
               stream={videoStreams.get(participant.id)}
               isSpotlighted={spotlightedParticipant === participant.id}
               // ... other props
             />
           ))}
         </div>
       )
     }, [participants, videoStreams, spotlightedParticipant])
     
     return renderVideoGrid
   }
   ```

3. **Create Video Controls Component**
   ```typescript
   export const VideoControls = () => {
     const { toggleVideo, toggleAudio, leaveSession } = useFitnessPlatformContext()
     
     return (
       <div className="flex gap-4 p-4 bg-fitness-dark rounded-lg">
         <Button onClick={toggleVideo} variant="secondary">
           <Video className="w-4 h-4" />
         </Button>
         <Button onClick={toggleAudio} variant="secondary">
           <Mic className="w-4 h-4" />
         </Button>
         <Button onClick={leaveSession} variant="destructive">
           <PhoneOff className="w-4 h-4" />
         </Button>
       </div>
     )
   }
   ```

4. **Add Connection Quality Indicators**
   ```typescript
   export const ConnectionIndicator = ({ quality }: { quality: number }) => {
     const getQualityColor = (q: number) => {
       if (q >= 4) return 'text-fitness-green'
       if (q >= 2) return 'text-fitness-orange'
       return 'text-red-500'
     }
     
     return (
       <div className={`flex items-center gap-1 ${getQualityColor(quality)}`}>
         <Wifi className="w-3 h-3" />
         <span className="text-xs">{quality}/5</span>
       </div>
     )
   }
   ```

**Deliverables**:
- [ ] Updated ParticipantTile with video support
- [ ] Enhanced VideoArea with grid layout
- [ ] Video controls component
- [ ] Connection quality indicators
- [ ] Component unit tests

**Success Criteria**:
- All components render correctly with mock video streams
- Video grid layout adapts to participant count
- Controls provide visual feedback for actions

---

#### Sprint 1.4: Mock Video Streaming & Event System
**Goal**: Implement realistic mock video streaming with event system

**Tasks**:
1. **Create Mock Video Stream Generator**
   ```typescript
   export class MockVideoStreamGenerator {
     static async createMockStream(config: MockStreamConfig): Promise<MediaStream> {
       const canvas = document.createElement('canvas')
       canvas.width = config.width || 640
       canvas.height = config.height || 480
       
       const ctx = canvas.getContext('2d')!
       
       // Animate canvas with fitness-related content
       const animate = () => {
         this.drawFitnessContent(ctx, config.participantData)
         requestAnimationFrame(animate)
       }
       animate()
       
       return (canvas as any).captureStream(30)
     }
     
     private static drawFitnessContent(ctx: CanvasRenderingContext2D, data: ParticipantData) {
       // Draw animated content representing a fitness participant
       // Background
       ctx.fillStyle = '#1a1a1a'
       ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
       
       // Participant name
       ctx.fillStyle = 'white'
       ctx.font = '20px Arial'
       ctx.fillText(data.name, 10, 30)
       
       // Fitness level badge
       ctx.fillStyle = data.fitnessLevel === 'beginner' ? '#00ff88' : 
                        data.fitnessLevel === 'intermediate' ? '#ff6b35' : '#0066ff'
       ctx.fillRect(10, 40, 100, 25)
       
       // Animated rep counter
       ctx.fillStyle = 'white'
       ctx.fillText(`Reps: ${Math.floor(Date.now() / 1000) % 20}`, 10, 80)
       
       // Simulated exercise movement
       const time = Date.now() / 1000
       const movement = Math.sin(time) * 50 + 100
       ctx.beginPath()
       ctx.arc(200, movement, 20, 0, 2 * Math.PI)
       ctx.fillStyle = '#00ff88'
       ctx.fill()
     }
   }
   ```

2. **Implement Event System for Mock Video**
   ```typescript
   export class MockVideoEventEmitter extends EventTarget {
     simulateParticipantJoin(participant: Participant) {
       this.dispatchEvent(new CustomEvent('participant-joined', { 
         detail: { participant } 
       }))
     }
     
     simulateVideoQualityChange(participantId: string, quality: number) {
       this.dispatchEvent(new CustomEvent('video-quality-changed', {
         detail: { participantId, quality }
       }))
     }
     
     simulateNetworkIssue(severity: 'mild' | 'severe') {
       this.dispatchEvent(new CustomEvent('network-issue', {
         detail: { severity, timestamp: Date.now() }
       }))
     }
   }
   ```

3. **Create Realistic Mock Data**
   ```typescript
   export const mockParticipants: Participant[] = [
     {
       id: 'coach-1',
       name: 'Sarah (Coach)',
       role: 'coach',
       fitnessLevel: 'advanced',
       isVideoEnabled: true,
       isAudioEnabled: true,
       connectionQuality: 5
     },
     {
       id: 'student-1',
       name: 'Mike',
       role: 'student',
       fitnessLevel: 'beginner',
       isVideoEnabled: true,
       isAudioEnabled: true,
       connectionQuality: 4
     },
     // ... more participants
   ]
   ```

4. **Update Components to Use Mock Events**
   ```typescript
   export const useFitnessPlatform = () => {
     const [mockEventEmitter] = useState(() => new MockVideoEventEmitter())
     
     useEffect(() => {
       const handleParticipantJoin = (event: CustomEvent) => {
         setParticipants(prev => new Map(prev).set(event.detail.participant.id, event.detail.participant))
       }
       
       mockEventEmitter.addEventListener('participant-joined', handleParticipantJoin)
       
       return () => {
         mockEventEmitter.removeEventListener('participant-joined', handleParticipantJoin)
       }
     }, [mockEventEmitter])
     
     // ... rest of implementation
   }
   ```

**Deliverables**:
- [ ] Mock video stream generator with fitness content
- [ ] Event system for video state changes
- [ ] Realistic mock data for testing
- [ ] Updated components using mock events

**Success Criteria**:
- Mock video streams display animated fitness content
- Events trigger appropriate state changes
- All components work seamlessly with mock data

---

## Phase 2: Video Integration & Basic Features
### Duration: 3 weeks

### Week 3: Real Zoom SDK Integration

#### Sprint 2.1: Zoom SDK Setup & Basic Integration
**Goal**: Replace mock video service with real Zoom Video SDK

**Tasks**:
1. **Install and Configure Zoom Video SDK**
   ```bash
   npm install @zoom/videosdk
   ```

2. **Create Real Zoom Service Implementation**
   ```typescript
   import ZoomVideoSDK from '@zoom/videosdk'
   
   export class ZoomVideoService implements VideoSDKInterface {
     private client: typeof ZoomVideoSDK | null = null
     private session: any = null
     
     async initialize(config: ZoomConfig): Promise<void> {
       this.client = ZoomVideoSDK.createClient()
       
       // Configure for fitness platform
       await this.client.init({
         debug: process.env.NODE_ENV === 'development',
         supportMultipleVideos: true,
         supportMultipleSharedScreen: false,
         enforceGalleryView: false,
         // Fitness-specific optimizations
         enableLogRetentionPeriod: false,
         enableVideoEffects: false
       })
     }
     
     async createSession(config: SessionConfig): Promise<ZoomSession> {
       if (!this.client) throw new Error('Zoom SDK not initialized')
       
       const jwtToken = await this.generateJWT(config)
       
       this.session = await this.client.join({
         topic: config.sessionName,
         token: jwtToken,
         userName: config.userName,
         password: config.sessionPassword
       })
       
       this.setupEventHandlers()
       return new ZoomSession(this.session)
     }
     
     private setupEventHandlers(): void {
       this.client?.on('user-added', this.handleUserAdded.bind(this))
       this.client?.on('user-removed', this.handleUserRemoved.bind(this))
       this.client?.on('peer-video-state-change', this.handleVideoStateChange.bind(this))
       // ... more event handlers
     }
     
     private async generateJWT(config: SessionConfig): Promise<string> {
       // JWT generation for Zoom SDK authentication
       const payload = {
         app_key: process.env.REACT_APP_ZOOM_SDK_KEY,
         tpc: config.sessionName,
         version: 1,
         user_identity: config.userId,
         session_key: this.generateSessionKey(),
         role_type: config.userRole === 'coach' ? 1 : 0,
         exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2) // 2 hours
       }
       
       return jwt.sign(payload, process.env.REACT_APP_ZOOM_SDK_SECRET!, { algorithm: 'HS256' })
     }
   }
   ```

3. **Environment Configuration**
   ```typescript
   // config/environment.ts
   export const config = {
     zoom: {
       sdkKey: process.env.REACT_APP_ZOOM_SDK_KEY!,
       sdkSecret: process.env.REACT_APP_ZOOM_SDK_SECRET!,
       webEndpoint: 'zoom.us'
     },
     development: {
       useMockVideo: process.env.REACT_APP_USE_MOCK_VIDEO === 'true',
       debugVideo: true
     }
   }
   ```

4. **Service Factory Pattern**
   ```typescript
   // services/video/VideoServiceFactory.ts
   export class VideoServiceFactory {
     static createVideoService(): VideoSDKInterface {
       if (config.development.useMockVideo) {
         return new MockZoomService()
       }
       return new ZoomVideoService()
     }
   }
   ```

**Deliverables**:
- [ ] Real Zoom SDK integration
- [ ] JWT authentication system
- [ ] Service factory for mock/real switching
- [ ] Environment configuration

**Success Criteria**:
- Successfully connect to Zoom Video SDK
- JWT authentication works correctly
- Can switch between mock and real video services

---

#### Sprint 2.2: Video Stream Management & Quality Control
**Goal**: Implement video stream handling and adaptive quality management

**Tasks**:
1. **Create Video Stream Manager**
   ```typescript
   export class VideoStreamManager {
     private streams: Map<string, MediaStream> = new Map()
     private qualities: Map<string, VideoQuality> = new Map()
     private maxConcurrentStreams: number = 25
     
     async addParticipantStream(participantId: string, stream: MediaStream): Promise<void> {
       // Check stream limits
       if (this.streams.size >= this.maxConcurrentStreams) {
         await this.optimizeStreamCount()
       }
       
       this.streams.set(participantId, stream)
       this.monitorStreamQuality(participantId, stream)
     }
     
     private async optimizeStreamCount(): Promise<void> {
       // Prioritize coach and spotlighted participants
       const participants = Array.from(this.streams.keys())
       const nonPriorityParticipants = participants.filter(id => 
         !this.isCoach(id) && !this.isSpotlighted(id)
       )
       
       if (nonPriorityParticipants.length > 0) {
         const toRemove = nonPriorityParticipants[0]
         await this.removeParticipantStream(toRemove)
       }
     }
     
     private monitorStreamQuality(participantId: string, stream: MediaStream): void {
       const track = stream.getVideoTracks()[0]
       if (!track) return
       
       const stats = setInterval(async () => {
         const rtcStats = await this.getRTCStats(track)
         const quality = this.calculateQuality(rtcStats)
         
         this.qualities.set(participantId, quality)
         
         if (quality.score < 3) {
           await this.requestQualityReduction(participantId)
         }
       }, 5000)
       
       // Store interval for cleanup
       this.qualityMonitors.set(participantId, stats)
     }
   }
   ```

2. **Implement Adaptive Quality Controller**
   ```typescript
   export class AdaptiveQualityController {
     private qualityLevels: QualityLevel[] = [
       { resolution: '1080p', bitrate: 2500, frameRate: 30 },
       { resolution: '720p', bitrate: 1500, frameRate: 24 },
       { resolution: '480p', bitrate: 800, frameRate: 20 },
       { resolution: '360p', bitrate: 500, frameRate: 15 },
       { resolution: '240p', bitrate: 300, frameRate: 12 }
     ]
     
     async optimizeQuality(participantCount: number, networkCondition: NetworkCondition): Promise<QualityLevel> {
       // Algorithm for fitness platform optimization
       const bandwidthPerParticipant = networkCondition.availableBandwidth / Math.max(participantCount, 1)
       
       // Find optimal quality level
       const optimalLevel = this.qualityLevels.find(level => 
         level.bitrate <= bandwidthPerParticipant * 0.8 // 80% safety margin
       ) || this.qualityLevels[this.qualityLevels.length - 1]
       
       return optimalLevel
     }
     
     async adjustVideoConstraints(participantId: string, targetQuality: QualityLevel): Promise<void> {
       const stream = this.streamManager.getStream(participantId)
       if (!stream) return
       
       const videoTrack = stream.getVideoTracks()[0]
       if (!videoTrack) return
       
       await videoTrack.applyConstraints({
         width: this.getResolutionWidth(targetQuality.resolution),
         height: this.getResolutionHeight(targetQuality.resolution),
         frameRate: targetQuality.frameRate
       })
     }
   }
   ```

3. **Update Components for Real Video Streams**
   ```typescript
   export const ParticipantTile = memo<ParticipantTileProps>(({
     participant,
     stream,
     isSpotlighted,
     connectionQuality
   }) => {
     const videoRef = useRef<HTMLVideoElement>(null)
     const [isVideoLoading, setIsVideoLoading] = useState(true)
     const [videoError, setVideoError] = useState<string | null>(null)
     
     useEffect(() => {
       if (videoRef.current && stream) {
         videoRef.current.srcObject = stream
         
         const handleLoadedData = () => setIsVideoLoading(false)
         const handleError = (e: Event) => {
           setVideoError('Failed to load video stream')
           console.error('Video element error:', e)
         }
         
         videoRef.current.addEventListener('loadeddata', handleLoadedData)
         videoRef.current.addEventListener('error', handleError)
         
         return () => {
           videoRef.current?.removeEventListener('loadeddata', handleLoadedData)
           videoRef.current?.removeEventListener('error', handleError)
         }
       }
     }, [stream])
     
     return (
       <div className="relative bg-fitness-gray rounded-lg overflow-hidden">
         {isVideoLoading && (
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fitness-green"></div>
           </div>
         )}
         
         {videoError ? (
           <div className="absolute inset-0 flex items-center justify-center bg-fitness-gray">
             <p className="text-red-500 text-sm">{videoError}</p>
           </div>
         ) : (
           <video
             ref={videoRef}
             autoPlay
             playsInline
             muted
             className="w-full h-full object-cover"
           />
         )}
         
         <ConnectionIndicator quality={connectionQuality} />
         <FitnessLevelBadge level={participant.fitnessLevel} />
       </div>
     )
   })
   ```

**Deliverables**:
- [ ] Video stream manager with quality monitoring
- [ ] Adaptive quality controller
- [ ] Updated components for real video streams
- [ ] Error handling for video failures

**Success Criteria**:
- Video streams display correctly in UI
- Quality adapts based on network conditions
- Graceful handling of video loading and errors

---

### Week 4: Session Management & Participant Interaction

#### Sprint 2.3: Session Lifecycle Management
**Goal**: Implement complete session creation, joining, and management

**Tasks**:
1. **Create Session Manager Service**
   ```typescript
   export class SessionManager {
     constructor(
       private videoService: VideoSDKInterface,
       private databaseService: DatabaseService
     ) {}
     
     async createFitnessSession(sessionData: CreateSessionRequest): Promise<FitnessSession> {
       // Create session in database
       const dbSession = await this.databaseService.createSession({
         coachId: sessionData.coachId,
         title: sessionData.title,
         scheduledStart: sessionData.scheduledStart,
         maxParticipants: sessionData.maxParticipants || 50,
         zoomSessionName: this.generateSessionName(),
         zoomSessionPassword: this.generateSessionPassword()
       })
       
       // Create Zoom session
       const zoomSession = await this.videoService.createSession({
         sessionName: dbSession.zoomSessionName,
         sessionPassword: dbSession.zoomSessionPassword,
         maxParticipants: dbSession.maxParticipants
       })
       
       return new FitnessSession(dbSession, zoomSession)
     }
     
     async joinSession(sessionId: string, userData: UserData): Promise<void> {
       const session = await this.databaseService.getSession(sessionId)
       if (!session) throw new Error('Session not found')
       
       // Generate user-specific JWT token
       const jwtToken = await this.generateUserJWT(session, userData)
       
       // Join Zoom session
       await this.videoService.joinSession(jwtToken)
       
       // Update participant list
       await this.databaseService.addParticipant(sessionId, userData)
       
       // Emit participant joined event
       this.emit('participant-joined', { sessionId, participant: userData })
     }
     
     async leaveSession(sessionId: string, userId: string): Promise<void> {
       await this.videoService.leaveSession()
       await this.databaseService.removeParticipant(sessionId, userId)
       
       this.emit('participant-left', { sessionId, userId })
     }
     
     async endSession(sessionId: string): Promise<SessionSummary> {
       const session = await this.databaseService.getSession(sessionId)
       const participants = await this.databaseService.getSessionParticipants(sessionId)
       
       // End Zoom session
       await this.videoService.endSession()
       
       // Update session status
       await this.databaseService.updateSessionStatus(sessionId, 'completed')
       
       // Generate session summary
       return this.generateSessionSummary(session, participants)
     }
   }
   ```

2. **Update State Management for Sessions**
   ```typescript
   export const useFitnessPlatform = () => {
     const [currentSession, setCurrentSession] = useState<FitnessSession | null>(null)
     const [participants, setParticipants] = useState<Map<string, Participant>>(new Map())
     const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle')
     
     const sessionManager = useMemo(() => new SessionManager(
       VideoServiceFactory.createVideoService(),
       new MockDatabaseService() // Replace with real service later
     ), [])
     
     const createSession = useCallback(async (sessionData: CreateSessionRequest) => {
       setSessionStatus('creating')
       try {
         const session = await sessionManager.createFitnessSession(sessionData)
         setCurrentSession(session)
         setSessionStatus('created')
         return session
       } catch (error) {
         setSessionStatus('error')
         throw error
       }
     }, [sessionManager])
     
     const joinSession = useCallback(async (sessionId: string, userData: UserData) => {
       setSessionStatus('joining')
       try {
         await sessionManager.joinSession(sessionId, userData)
         setSessionStatus('joined')
       } catch (error) {
         setSessionStatus('error')
         throw error
       }
     }, [sessionManager])
     
     const leaveSession = useCallback(async () => {
       if (!currentSession) return
       
       setSessionStatus('leaving')
       try {
         await sessionManager.leaveSession(currentSession.id, currentUser?.id)
         setCurrentSession(null)
         setParticipants(new Map())
         setSessionStatus('idle')
       } catch (error) {
         setSessionStatus('error')
         throw error
       }
     }, [sessionManager, currentSession, currentUser])
     
     return {
       currentSession,
       participants,
       sessionStatus,
       createSession,
       joinSession,
       leaveSession,
       // ... other methods
     }
   }
   ```

3. **Create Session UI Components**
   ```typescript
   export const SessionCreator = () => {
     const [sessionData, setSessionData] = useState<CreateSessionRequest>({
       title: '',
       description: '',
       maxParticipants: 25,
       scheduledStart: new Date()
     })
     const { createSession, sessionStatus } = useFitnessPlatformContext()
     
     const handleCreate = async () => {
       try {
         const session = await createSession(sessionData)
         toast.success(`Session "${session.title}" created successfully!`)
       } catch (error) {
         toast.error('Failed to create session')
       }
     }
     
     return (
       <Card className="p-6">
         <h3 className="text-lg font-medium mb-4">Create Fitness Session</h3>
         
         <div className="space-y-4">
           <div>
             <Label htmlFor="title">Session Title</Label>
             <Input
               id="title"
               value={sessionData.title}
               onChange={(e) => setSessionData(prev => ({ ...prev, title: e.target.value }))}
               placeholder="Morning Workout"
             />
           </div>
           
           <div>
             <Label htmlFor="maxParticipants">Max Participants</Label>
             <Input
               id="maxParticipants"
               type="number"
               value={sessionData.maxParticipants}
               onChange={(e) => setSessionData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
               min={1}
               max={50}
             />
           </div>
           
           <Button 
             onClick={handleCreate} 
             disabled={sessionStatus === 'creating'}
             className="w-full"
           >
             {sessionStatus === 'creating' ? 'Creating...' : 'Create Session'}
           </Button>
         </div>
       </Card>
     )
   }
   
   export const SessionJoiner = () => {
     const [sessionId, setSessionId] = useState('')
     const { joinSession, sessionStatus, currentUser } = useFitnessPlatformContext()
     
     const handleJoin = async () => {
       if (!currentUser) return
       
       try {
         await joinSession(sessionId, currentUser)
         toast.success('Joined session successfully!')
       } catch (error) {
         toast.error('Failed to join session')
       }
     }
     
     return (
       <Card className="p-6">
         <h3 className="text-lg font-medium mb-4">Join Session</h3>
         
         <div className="space-y-4">
           <div>
             <Label htmlFor="sessionId">Session ID</Label>
             <Input
               id="sessionId"
               value={sessionId}
               onChange={(e) => setSessionId(e.target.value)}
               placeholder="Enter session ID"
             />
           </div>
           
           <Button 
             onClick={handleJoin} 
             disabled={sessionStatus === 'joining' || !sessionId}
             className="w-full"
           >
             {sessionStatus === 'joining' ? 'Joining...' : 'Join Session'}
           </Button>
         </div>
       </Card>
     )
   }
   ```

**Deliverables**:
- [ ] Complete session manager service
- [ ] Session lifecycle state management
- [ ] Session creation and joining UI
- [ ] Error handling for session operations

**Success Criteria**:
- Can create and join Zoom sessions successfully
- Session state is properly managed
- UI provides clear feedback for session operations

---

#### Sprint 2.4: Participant Management & Basic Controls
**Goal**: Implement participant management and basic video controls

**Tasks**:
1. **Create Participant Manager**
   ```typescript
   export class ParticipantManager {
     constructor(
       private videoService: VideoSDKInterface,
       private eventEmitter: EventEmitter
     ) {}
     
     async muteParticipant(participantId: string): Promise<void> {
       await this.videoService.muteParticipant(participantId)
       this.eventEmitter.emit('participant-muted', { participantId })
     }
     
     async unmuteParticipant(participantId: string): Promise<void> {
       await this.videoService.unmuteParticipant(participantId)
       this.eventEmitter.emit('participant-unmuted', { participantId })
     }
     
     async spotlightParticipant(participantId: string): Promise<void> {
       await this.videoService.spotlightParticipant(participantId)
       this.eventEmitter.emit('participant-spotlighted', { participantId })
     }
     
     async removeParticipant(participantId: string): Promise<void> {
       await this.videoService.removeParticipant(participantId)
       this.eventEmitter.emit('participant-removed', { participantId })
     }
     
     async assignFitnessLevel(participantId: string, level: FitnessLevel): Promise<void> {
       // This will be handled by fitness service later
       this.eventEmitter.emit('fitness-level-assigned', { participantId, level })
     }
   }
   ```

2. **Enhanced Participant Management UI**
   ```typescript
   export const ParticipantManagerPanel = () => {
     const { participants, currentUser } = useFitnessPlatformContext()
     const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
     
     const isCoach = currentUser?.role === 'coach'
     
     const participantManager = useMemo(() => new ParticipantManager(
       VideoServiceFactory.createVideoService(),
       new EventEmitter()
     ), [])
     
     const handleMute = async (participantId: string) => {
       try {
         await participantManager.muteParticipant(participantId)
         toast.success('Participant muted')
       } catch (error) {
         toast.error('Failed to mute participant')
       }
     }
     
     const handleSpotlight = async (participantId: string) => {
       try {
         await participantManager.spotlightParticipant(participantId)
         toast.success('Participant spotlighted')
       } catch (error) {
         toast.error('Failed to spotlight participant')
       }
     }
     
     const handleRemove = async (participantId: string) => {
       try {
         await participantManager.removeParticipant(participantId)
         toast.success('Participant removed')
       } catch (error) {
         toast.error('Failed to remove participant')
       }
     }
     
     return (
       <div className="space-y-4">
         <h3 className="text-lg font-medium">Participants ({participants.size})</h3>
         
         <div className="space-y-2 max-h-64 overflow-y-auto">
           {Array.from(participants.values()).map(participant => (
             <div key={participant.id} className="flex items-center justify-between p-3 bg-fitness-gray rounded-lg">
               <div className="flex items-center gap-3">
                 <Avatar>
                   <AvatarFallback>{participant.name[0]}</AvatarFallback>
                 </Avatar>
                 
                 <div>
                   <p className="font-medium">{participant.name}</p>
                   <div className="flex items-center gap-2">
                     <FitnessLevelBadge level={participant.fitnessLevel} size="sm" />
                     <ConnectionIndicator quality={participant.connectionQuality} />
                   </div>
                 </div>
               </div>
               
               {isCoach && participant.id !== currentUser?.id && (
                 <div className="flex items-center gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleSpotlight(participant.id)}
                   >
                     <Spotlight className="w-3 h-3" />
                   </Button>
                   
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleMute(participant.id)}
                   >
                     <MicOff className="w-3 h-3" />
                   </Button>
                   
                   <Button
                     size="sm"
                     variant="destructive"
                     onClick={() => handleRemove(participant.id)}
                   >
                     <UserX className="w-3 h-3" />
                   </Button>
                 </div>
               )}
             </div>
           ))}
         </div>
       </div>
     )
   }
   ```

3. **Video Control Bar**
   ```typescript
   export const VideoControlBar = () => {
     const { currentUser, toggleVideo, toggleAudio, leaveSession } = useFitnessPlatformContext()
     const [isVideoEnabled, setIsVideoEnabled] = useState(true)
     const [isAudioEnabled, setIsAudioEnabled] = useState(true)
     
     const handleToggleVideo = async () => {
       try {
         await toggleVideo()
         setIsVideoEnabled(prev => !prev)
       } catch (error) {
         toast.error('Failed to toggle video')
       }
     }
     
     const handleToggleAudio = async () => {
       try {
         await toggleAudio()
         setIsAudioEnabled(prev => !prev)
       } catch (error) {
         toast.error('Failed to toggle audio')
       }
     }
     
     const handleLeaveSession = async () => {
       try {
         await leaveSession()
         toast.success('Left session')
       } catch (error) {
         toast.error('Failed to leave session')
       }
     }
     
     return (
       <div className="flex items-center justify-center gap-4 p-4 bg-fitness-dark rounded-lg">
         <Button
           variant={isVideoEnabled ? "secondary" : "destructive"}
           size="sm"
           onClick={handleToggleVideo}
         >
           {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
         </Button>
         
         <Button
           variant={isAudioEnabled ? "secondary" : "destructive"}
           size="sm"
           onClick={handleToggleAudio}
         >
           {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
         </Button>
         
         <Button
           variant="destructive"
           size="sm"
           onClick={handleLeaveSession}
         >
           <PhoneOff className="w-4 h-4" />
           Leave
         </Button>
       </div>
     )
   }
   ```

**Deliverables**:
- [ ] Participant manager service
- [ ] Enhanced participant management UI
- [ ] Video control bar component
- [ ] Coach permission system

**Success Criteria**:
- Coaches can manage participant audio/video states
- Video controls work correctly
- Permission system prevents students from managing others

---

### Week 5: Basic Fitness Features Integration

#### Sprint 2.5: Fitness Level System & Group Management
**Goal**: Implement fitness level assignment and group visualization

**Tasks**:
1. **Create Fitness Level Service**
   ```typescript
   export class FitnessLevelService {
     constructor(private databaseService: DatabaseService) {}
     
     async assignFitnessLevel(userId: string, level: FitnessLevel): Promise<void> {
       await this.databaseService.updateUserFitnessLevel(userId, level)
       this.emit('fitness-level-assigned', { userId, level })
     }
     
     async getFitnessGroups(sessionId: string): Promise<FitnessGroups> {
       const participants = await this.databaseService.getSessionParticipants(sessionId)
       
       return {
         beginner: participants.filter(p => p.fitnessLevel === 'beginner'),
         intermediate: participants.filter(p => p.fitnessLevel === 'intermediate'),
         advanced: participants.filter(p => p.fitnessLevel === 'advanced')
       }
     }
     
     calculateRecommendedLevel(assessmentData: FitnessAssessment): FitnessLevel {
       // Simple algorithm for level calculation
       const score = (
         (assessmentData.pushUps || 0) * 0.3 +
         (assessmentData.squats || 0) * 0.2 +
         (assessmentData.planDuration || 0) * 0.3 +
         (assessmentData.experience === 'beginner' ? 0 : 
          assessmentData.experience === 'intermediate' ? 50 : 100) * 0.2
       )
       
       if (score < 30) return 'beginner'
       if (score < 70) return 'intermediate'
       return 'advanced'
     }
   }
   ```

2. **Fitness Level Assignment UI**
   ```typescript
   export const FitnessLevelAssignmentModal = ({ 
     participantId, 
     currentLevel, 
     onClose 
   }: {
     participantId: string
     currentLevel: FitnessLevel
     onClose: () => void
   }) => {
     const [selectedLevel, setSelectedLevel] = useState<FitnessLevel>(currentLevel)
     const fitnessService = useMemo(() => new FitnessLevelService(new MockDatabaseService()), [])
     
     const handleAssign = async () => {
       try {
         await fitnessService.assignFitnessLevel(participantId, selectedLevel)
         toast.success(`Fitness level updated to ${selectedLevel}`)
         onClose()
       } catch (error) {
         toast.error('Failed to update fitness level')
       }
     }
     
     return (
       <Dialog open onOpenChange={onClose}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Assign Fitness Level</DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               {(['beginner', 'intermediate', 'advanced'] as FitnessLevel[]).map(level => (
                 <div key={level} className="flex items-center space-x-2">
                   <input
                     type="radio"
                     id={level}
                     name="fitnessLevel"
                     value={level}
                     checked={selectedLevel === level}
                     onChange={(e) => setSelectedLevel(e.target.value as FitnessLevel)}
                   />
                   <label htmlFor={level} className="flex items-center gap-2">
                     <FitnessLevelBadge level={level} />
                     <span className="capitalize">{level}</span>
                   </label>
                 </div>
               ))}
             </div>
             
             <div className="flex gap-2">
               <Button variant="outline" onClick={onClose}>Cancel</Button>
               <Button onClick={handleAssign}>Assign Level</Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     )
   }
   ```

3. **Enhanced Group Visualization**
   ```typescript
   export const StudentLevelGroups = () => {
     const { participants } = useFitnessPlatformContext()
     const [highlightedGroup, setHighlightedGroup] = useState<FitnessLevel | null>(null)
     
     const fitnessGroups = useMemo(() => {
       const groups: FitnessGroups = {
         beginner: [],
         intermediate: [],
         advanced: []
       }
       
       participants.forEach(participant => {
         groups[participant.fitnessLevel].push(participant)
       })
       
       return groups
     }, [participants])
     
     const handleGroupHighlight = (level: FitnessLevel) => {
       setHighlightedGroup(prev => prev === level ? null : level)
       // This will later trigger visual highlighting in the video grid
     }
     
     return (
       <div className="space-y-4">
         <h3 className="text-lg font-medium">Fitness Level Groups</h3>
         
         {Object.entries(fitnessGroups).map(([level, participants]) => (
           <div 
             key={level}
             className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
               highlightedGroup === level
                 ? 'border-fitness-green bg-fitness-green/10'
                 : 'border-fitness-gray bg-fitness-gray/50'
             }`}
             onClick={() => handleGroupHighlight(level as FitnessLevel)}
           >
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <FitnessLevelBadge level={level as FitnessLevel} />
                 <span className="font-medium capitalize">{level}</span>
               </div>
               <span className="text-sm text-muted-foreground">{participants.length} members</span>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
               {participants.map(participant => (
                 <div key={participant.id} className="flex items-center gap-2 text-sm">
                   <Avatar size="sm">
                     <AvatarFallback>{participant.name[0]}</AvatarFallback>
                   </Avatar>
                   <span>{participant.name}</span>
                 </div>
               ))}
             </div>
           </div>
         ))}
       </div>
     )
   }
   ```

**Deliverables**:
- [ ] Fitness level service implementation
- [ ] Level assignment UI components
- [ ] Enhanced group visualization
- [ ] Group highlighting functionality

**Success Criteria**:
- Coaches can assign fitness levels to participants
- Group visualization updates in real-time
- Group highlighting works correctly

---

#### Sprint 2.6: Basic Mode Switching (Teach vs Workout)
**Goal**: Implement basic mode switching between teach and workout modes

**Tasks**:
1. **Create Mode Manager Service**
   ```typescript
   export class ModeManager {
     private currentMode: SessionMode = 'workout'
     private eventEmitter: EventEmitter
     
     constructor(eventEmitter: EventEmitter) {
       this.eventEmitter = eventEmitter
     }
     
     async switchToTeachMode(): Promise<void> {
       this.currentMode = 'teach'
       this.eventEmitter.emit('mode-changed', { mode: 'teach' })
       
       // Optimize video layout for teach mode
       await this.optimizeForTeachMode()
     }
     
     async switchToWorkoutMode(): Promise<void> {
       this.currentMode = 'workout'
       this.eventEmitter.emit('mode-changed', { mode: 'workout' })
       
       // Optimize video layout for workout mode
       await this.optimizeForWorkoutMode()
     }
     
     private async optimizeForTeachMode(): Promise<void> {
       // Spotlight coach for demonstration
       // Reduce quality for student videos to save bandwidth
       this.eventEmitter.emit('optimize-for-teach-mode')
     }
     
     private async optimizeForWorkoutMode(): Promise<void> {
       // Equal visibility for all participants for monitoring
       // Optimize for multiple concurrent video streams
       this.eventEmitter.emit('optimize-for-workout-mode')
     }
     
     getCurrentMode(): SessionMode {
       return this.currentMode
     }
   }
   ```

2. **Mode Switching UI**
   ```typescript
   export const ModeToggle = () => {
     const { currentUser, sessionMode, switchMode } = useFitnessPlatformContext()
     const isCoach = currentUser?.role === 'coach'
     
     if (!isCoach) return null
     
     const handleModeSwitch = async (mode: SessionMode) => {
       try {
         await switchMode(mode)
         toast.success(`Switched to ${mode} mode`)
       } catch (error) {
         toast.error(`Failed to switch to ${mode} mode`)
       }
     }
     
     return (
       <div className="flex items-center gap-2 p-2 bg-fitness-gray rounded-lg">
         <Button
           variant={sessionMode === 'teach' ? 'default' : 'outline'}
           size="sm"
           onClick={() => handleModeSwitch('teach')}
           className="flex items-center gap-2"
         >
           <GraduationCap className="w-4 h-4" />
           Teach Mode
         </Button>
         
         <Button
           variant={sessionMode === 'workout' ? 'default' : 'outline'}
           size="sm"
           onClick={() => handleModeSwitch('workout')}
           className="flex items-center gap-2"
         >
           <Activity className="w-4 h-4" />
           Workout Mode
         </Button>
       </div>
     )
   }
   ```

3. **Mode-Specific Video Layouts**
   ```typescript
   export const ModeAwareVideoArea = () => {
     const { sessionMode, participants, spotlightedParticipant, currentUser } = useFitnessPlatformContext()
     
     const renderTeachModeLayout = useMemo(() => {
       const coach = Array.from(participants.values()).find(p => p.role === 'coach')
       const students = Array.from(participants.values()).filter(p => p.role === 'student')
       
       return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
           {/* Coach spotlight area - 2/3 of width on desktop */}
           <div className="lg:col-span-2">
             {coach && (
               <ParticipantTile
                 participant={coach}
                 stream={videoStreams.get(coach.id)}
                 isSpotlighted={true}
                 size="large"
               />
             )}
           </div>
           
           {/* Student grid - 1/3 of width on desktop */}
           <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
             {students.slice(0, 6).map(student => (
               <ParticipantTile
                 key={student.id}
                 participant={student}
                 stream={videoStreams.get(student.id)}
                 isSpotlighted={false}
                 size="small"
               />
             ))}
           </div>
         </div>
       )
     }, [participants, videoStreams])
     
     const renderWorkoutModeLayout = useMemo(() => {
       const participantArray = Array.from(participants.values())
       const gridCols = Math.min(Math.ceil(Math.sqrt(participantArray.length)), 4)
       
       return (
         <div className={`grid gap-4 h-full`} style={{
           gridTemplateColumns: `repeat(${gridCols}, 1fr)`
         }}>
           {participantArray.map(participant => (
             <ParticipantTile
               key={participant.id}
               participant={participant}
               stream={videoStreams.get(participant.id)}
               isSpotlighted={spotlightedParticipant === participant.id}
               size="medium"
             />
           ))}
         </div>
       )
     }, [participants, videoStreams, spotlightedParticipant])
     
     return (
       <div className="flex-1 p-4">
         {sessionMode === 'teach' ? renderTeachModeLayout : renderWorkoutModeLayout}
       </div>
     )
   }
   ```

**Deliverables**:
- [ ] Mode manager service
- [ ] Mode switching UI component
- [ ] Mode-specific video layouts
- [ ] Layout optimization for each mode

**Success Criteria**:
- Coaches can switch between teach and workout modes
- Video layout changes appropriately for each mode
- Mode switching is reflected in real-time

---

## Phase 3: Fitness-Specific Features
### Duration: 2 weeks

### Week 6: Exercise Targeting & Rep Counter System

#### Sprint 3.1: Exercise Targeting System
**Goal**: Implement exercise assignment to specific fitness level groups

**Tasks**:
1. **Create Exercise Service**
   ```typescript
   export class ExerciseService {
     constructor(
       private databaseService: DatabaseService,
       private eventEmitter: EventEmitter
     ) {}
     
     async assignExerciseToGroup(
       sessionId: string,
       exercise: Exercise,
       targetLevel: FitnessLevel | 'all'
     ): Promise<void> {
       const assignment: ExerciseAssignment = {
         id: uuid(),
         sessionId,
         exerciseId: exercise.id,
         targetLevel,
         assignedAt: new Date(),
         duration: exercise.defaultDuration
       }
       
       await this.databaseService.createExerciseAssignment(assignment)
       
       this.eventEmitter.emit('exercise-assigned', {
         assignment,
         exercise,
         targetParticipants: await this.getTargetParticipants(sessionId, targetLevel)
       })
     }
     
     async getActiveExercises(sessionId: string, participantLevel: FitnessLevel): Promise<Exercise[]> {
       const assignments = await this.databaseService.getActiveExerciseAssignments(sessionId)
       
       return assignments
         .filter(assignment => 
           assignment.targetLevel === 'all' || assignment.targetLevel === participantLevel
         )
         .map(assignment => assignment.exercise)
     }
     
     async completeExercise(sessionId: string, exerciseId: string, userId: string): Promise<void> {
       await this.databaseService.recordExerciseCompletion({
         sessionId,
         exerciseId,
         userId,
         completedAt: new Date()
       })
       
       this.eventEmitter.emit('exercise-completed', { sessionId, exerciseId, userId })
     }
     
     private async getTargetParticipants(
       sessionId: string, 
       targetLevel: FitnessLevel | 'all'
     ): Promise<Participant[]> {
       const participants = await this.databaseService.getSessionParticipants(sessionId)
       
       if (targetLevel === 'all') return participants
       
       return participants.filter(p => p.fitnessLevel === targetLevel)
     }
   }
   ```

2. **Exercise Targeting UI Component**
   ```typescript
   export const ExerciseTargetSelector = () => {
     const { currentSession, participants, currentUser } = useFitnessPlatformContext()
     const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
     const [targetLevel, setTargetLevel] = useState<FitnessLevel | 'all'>('all')
     const [isAssigning, setIsAssigning] = useState(false)
     
     const exerciseService = useMemo(() => new ExerciseService(
       new MockDatabaseService(),
       new EventEmitter()
     ), [])
     
     const isCoach = currentUser?.role === 'coach'
     
     const mockExercises: Exercise[] = [
       {
         id: '1',
         name: 'Push-ups',
         description: 'Classic upper body exercise',
         difficulty: 'beginner',
         defaultDuration: 60,
         variations: {
           beginner: 'Modified push-ups (knees down)',
           intermediate: 'Standard push-ups',
           advanced: 'One-arm push-ups'
         }
       },
       {
         id: '2',
         name: 'Squats',
         description: 'Lower body strength exercise',
         difficulty: 'beginner',
         defaultDuration: 60,
         variations: {
           beginner: 'Chair-assisted squats',
           intermediate: 'Bodyweight squats',
           advanced: 'Jump squats'
         }
       },
       // ... more exercises
     ]
     
     const handleAssignExercise = async () => {
       if (!selectedExercise || !currentSession) return
       
       setIsAssigning(true)
       try {
         await exerciseService.assignExerciseToGroup(
           currentSession.id,
           selectedExercise,
           targetLevel
         )
         
         toast.success(`Exercise assigned to ${targetLevel === 'all' ? 'all students' : `${targetLevel} group`}`)
         setSelectedExercise(null)
       } catch (error) {
         toast.error('Failed to assign exercise')
       } finally {
         setIsAssigning(false)
       }
     }
     
     const getTargetParticipants = () => {
       if (targetLevel === 'all') return Array.from(participants.values())
       return Array.from(participants.values()).filter(p => p.fitnessLevel === targetLevel)
     }
     
     if (!isCoach) return null
     
     return (
       <Card className="p-4">
         <h3 className="text-lg font-medium mb-4">Assign Exercise</h3>
         
         <div className="space-y-4">
           <div>
             <Label>Select Exercise</Label>
             <Select 
               value={selectedExercise?.id || ''} 
               onValueChange={(value) => {
                 const exercise = mockExercises.find(e => e.id === value)
                 setSelectedExercise(exercise || null)
               }}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Choose an exercise" />
               </SelectTrigger>
               <SelectContent>
                 {mockExercises.map(exercise => (
                   <SelectItem key={exercise.id} value={exercise.id}>
                     {exercise.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <div>
             <Label>Target Group</Label>
             <Select 
               value={targetLevel} 
               onValueChange={(value: FitnessLevel | 'all') => setTargetLevel(value)}
             >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Students</SelectItem>
                 <SelectItem value="beginner">Beginner Group</SelectItem>
                 <SelectItem value="intermediate">Intermediate Group</SelectItem>
                 <SelectItem value="advanced">Advanced Group</SelectItem>
               </SelectContent>
             </Select>
           </div>
           
           {selectedExercise && (
             <div className="p-3 bg-fitness-gray rounded-lg">
               <h4 className="font-medium">{selectedExercise.name}</h4>
               <p className="text-sm text-muted-foreground mb-2">{selectedExercise.description}</p>
               
               <div className="text-sm">
                 <strong>Target: </strong>
                 {getTargetParticipants().length} participant(s)
                 
                 {targetLevel !== 'all' && selectedExercise.variations && (
                   <div className="mt-2">
                     <strong>Variation: </strong>
                     {selectedExercise.variations[targetLevel]}
                   </div>
                 )}
               </div>
             </div>
           )}
           
           <Button 
             onClick={handleAssignExercise}
             disabled={!selectedExercise || isAssigning}
             className="w-full"
           >
             {isAssigning ? 'Assigning...' : 'Assign Exercise'}
           </Button>
         </div>
       </Card>
     )
   }
   ```

3. **Exercise Display for Students**
   ```typescript
   export const StudentExerciseView = () => {
     const { currentSession, currentUser } = useFitnessPlatformContext()
     const [activeExercises, setActiveExercises] = useState<Exercise[]>([])
     const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null)
     
     const exerciseService = useMemo(() => new ExerciseService(
       new MockDatabaseService(),
       new EventEmitter()
     ), [])
     
     useEffect(() => {
       if (!currentSession || !currentUser) return
       
       const fetchActiveExercises = async () => {
         const exercises = await exerciseService.getActiveExercises(
           currentSession.id,
           currentUser.fitnessLevel
         )
         setActiveExercises(exercises)
         
         if (exercises.length > 0 && !currentExercise) {
           setCurrentExercise(exercises[0])
         }
       }
       
       fetchActiveExercises()
       
       // Listen for new exercise assignments
       const handleExerciseAssigned = (event: any) => {
         const { targetParticipants } = event.detail
         if (targetParticipants.some((p: Participant) => p.id === currentUser.id)) {
           fetchActiveExercises()
         }
       }
       
       window.addEventListener('exercise-assigned', handleExerciseAssigned)
       
       return () => {
         window.removeEventListener('exercise-assigned', handleExerciseAssigned)
       }
     }, [currentSession, currentUser, exerciseService])
     
     if (!currentExercise) {
       return (
         <div className="flex items-center justify-center h-32 bg-fitness-gray rounded-lg">
           <p className="text-muted-foreground">No active exercises</p>
         </div>
       )
     }
     
     const variation = currentExercise.variations?.[currentUser?.fitnessLevel || 'beginner']
     
     return (
       <Card className="p-4">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-medium">Current Exercise</h3>
           <FitnessLevelBadge level={currentUser?.fitnessLevel || 'beginner'} />
         </div>
         
         <div className="space-y-3">
           <div>
             <h4 className="font-medium text-fitness-green">{currentExercise.name}</h4>
             <p className="text-sm text-muted-foreground">{currentExercise.description}</p>
           </div>
           
           {variation && (
             <div className="p-3 bg-fitness-dark rounded-lg">
               <strong className="text-sm">Your variation: </strong>
               <span className="text-sm">{variation}</span>
             </div>
           )}
           
           <div className="flex gap-2">
             <Button
               onClick={() => setCurrentExercise(null)}
               variant="outline"
               size="sm"
             >
               <Check className="w-4 h-4 mr-2" />
               Complete
             </Button>
           </div>
         </div>
       </Card>
     )
   }
   ```

**Deliverables**:
- [ ] Exercise service with targeting functionality
- [ ] Exercise assignment UI for coaches
- [ ] Exercise display for students with variations
- [ ] Target group selection and validation

**Success Criteria**:
- Coaches can assign exercises to specific fitness groups
- Students see only exercises targeted to their level
- Exercise variations are displayed correctly

---

#### Sprint 3.2: Rep Counter System
**Goal**: Implement interactive rep counting system for exercises

**Tasks**:
1. **Create Rep Counter Service**
   ```typescript
   export class RepCounterService {
     private repCounts: Map<string, Map<string, number>> = new Map() // sessionId -> userId -> count
     private targets: Map<string, Map<string, number>> = new Map() // sessionId -> userId -> target
     
     constructor(private eventEmitter: EventEmitter) {}
     
     setRepTarget(sessionId: string, userId: string, target: number): void {
       if (!this.targets.has(sessionId)) {
         this.targets.set(sessionId, new Map())
       }
       this.targets.get(sessionId)!.set(userId, target)
       
       this.eventEmitter.emit('rep-target-set', { sessionId, userId, target })
     }
     
     incrementRep(sessionId: string, userId: string): number {
       if (!this.repCounts.has(sessionId)) {
         this.repCounts.set(sessionId, new Map())
       }
       
       const sessionCounts = this.repCounts.get(sessionId)!
       const currentCount = sessionCounts.get(userId) || 0
       const newCount = currentCount + 1
       
       sessionCounts.set(userId, newCount)
       
       this.eventEmitter.emit('rep-incremented', { sessionId, userId, count: newCount })
       
       // Check if target reached
       const target = this.targets.get(sessionId)?.get(userId)
       if (target && newCount >= target) {
         this.eventEmitter.emit('rep-target-reached', { sessionId, userId, count: newCount, target })
       }
       
       return newCount
     }
     
     decrementRep(sessionId: string, userId: string): number {
       if (!this.repCounts.has(sessionId)) {
         this.repCounts.set(sessionId, new Map())
       }
       
       const sessionCounts = this.repCounts.get(sessionId)!
       const currentCount = sessionCounts.get(userId) || 0
       const newCount = Math.max(0, currentCount - 1)
       
       sessionCounts.set(userId, newCount)
       
       this.eventEmitter.emit('rep-decremented', { sessionId, userId, count: newCount })
       
       return newCount
     }
     
     getRepCount(sessionId: string, userId: string): number {
       return this.repCounts.get(sessionId)?.get(userId) || 0
     }
     
     getRepTarget(sessionId: string, userId: string): number | undefined {
       return this.targets.get(sessionId)?.get(userId)
     }
     
     resetReps(sessionId: string, userId: string): void {
       const sessionCounts = this.repCounts.get(sessionId)
       if (sessionCounts) {
         sessionCounts.set(userId, 0)
         this.eventEmitter.emit('rep-reset', { sessionId, userId })
       }
     }
     
     getAllRepCounts(sessionId: string): Map<string, number> {
       return this.repCounts.get(sessionId) || new Map()
     }
   }
   ```

2. **Rep Counter UI Component**
   ```typescript
   export const RepCounter = ({ userId, sessionId }: { userId: string; sessionId: string }) => {
     const [count, setCount] = useState(0)
     const [target, setTarget] = useState<number | undefined>(undefined)
     const [isTargetReached, setIsTargetReached] = useState(false)
     
     const repCounterService = useMemo(() => new RepCounterService(new EventEmitter()), [])
     
     useEffect(() => {
       const currentCount = repCounterService.getRepCount(sessionId, userId)
       const currentTarget = repCounterService.getRepTarget(sessionId, userId)
       
       setCount(currentCount)
       setTarget(currentTarget)
       setIsTargetReached(currentTarget ? currentCount >= currentTarget : false)
     }, [repCounterService, sessionId, userId])
     
     const handleIncrement = () => {
       const newCount = repCounterService.incrementRep(sessionId, userId)
       setCount(newCount)
       
       if (target && newCount >= target) {
         setIsTargetReached(true)
         // Celebration animation or sound
         toast.success(`🎉 Target reached! ${newCount}/${target} reps completed!`)
       }
     }
     
     const handleDecrement = () => {
       const newCount = repCounterService.decrementRep(sessionId, userId)
       setCount(newCount)
       setIsTargetReached(target ? newCount >= target : false)
     }
     
     const handleReset = () => {
       repCounterService.resetReps(sessionId, userId)
       setCount(0)
       setIsTargetReached(false)
     }
     
     const progressPercentage = target ? Math.min((count / target) * 100, 100) : 0
     
     return (
       <div className="bg-fitness-dark p-4 rounded-lg">
         <div className="text-center mb-3">
           <div className="text-3xl font-bold text-fitness-green mb-1">
             {count}
             {target && (
               <span className="text-lg text-muted-foreground ml-1">/{target}</span>
             )}
           </div>
           <div className="text-sm text-muted-foreground">Reps</div>
         </div>
         
         {target && (
           <div className="mb-3">
             <div className="w-full bg-fitness-gray rounded-full h-2">
               <div 
                 className={`h-2 rounded-full transition-all duration-300 ${
                   isTargetReached ? 'bg-fitness-green' : 'bg-fitness-orange'
                 }`}
                 style={{ width: `${progressPercentage}%` }}
               />
             </div>
           </div>
         )}
         
         <div className="flex gap-2">
           <Button
             onClick={handleDecrement}
             variant="outline"
             size="sm"
             disabled={count === 0}
             className="flex-1"
           >
             <Minus className="w-4 h-4" />
           </Button>
           
           <Button
             onClick={handleIncrement}
             variant="default"
             size="sm"
             className="flex-1 bg-fitness-green hover:bg-fitness-green/80"
           >
             <Plus className="w-4 h-4" />
           </Button>
           
           <Button
             onClick={handleReset}
             variant="outline"
             size="sm"
           >
             <RotateCcw className="w-4 h-4" />
           </Button>
         </div>
         
         {isTargetReached && (
           <div className="mt-2 text-center text-sm text-fitness-green font-medium">
             🎯 Target Achieved!
           </div>
         )}
       </div>
     )
   }
   ```

3. **Coach Rep Monitoring Dashboard**
   ```typescript
   export const CoachRepMonitoringPanel = () => {
     const { currentSession, participants } = useFitnessPlatformContext()
     const [repCounts, setRepCounts] = useState<Map<string, number>>(new Map())
     const [targets, setTargets] = useState<Map<string, number>>(new Map())
     
     const repCounterService = useMemo(() => new RepCounterService(new EventEmitter()), [])
     
     useEffect(() => {
       if (!currentSession) return
       
       const updateRepCounts = () => {
         const counts = repCounterService.getAllRepCounts(currentSession.id)
         setRepCounts(new Map(counts))
         
         // Update targets
         const targetMap = new Map<string, number>()
         participants.forEach(participant => {
           const target = repCounterService.getRepTarget(currentSession.id, participant.id)
           if (target) {
             targetMap.set(participant.id, target)
           }
         })
         setTargets(targetMap)
       }
       
       updateRepCounts()
       
       // Listen for rep count changes
       const handleRepUpdate = () => updateRepCounts()
       
       window.addEventListener('rep-incremented', handleRepUpdate)
       window.addEventListener('rep-decremented', handleRepUpdate)
       window.addEventListener('rep-reset', handleRepUpdate)
       
       return () => {
         window.removeEventListener('rep-incremented', handleRepUpdate)
         window.removeEventListener('rep-decremented', handleRepUpdate)
         window.removeEventListener('rep-reset', handleRepUpdate)
       }
     }, [currentSession, participants, repCounterService])
     
     const handleSetTarget = (participantId: string, target: number) => {
       if (currentSession) {
         repCounterService.setRepTarget(currentSession.id, participantId, target)
         setTargets(prev => new Map(prev).set(participantId, target))
       }
     }
     
     return (
       <Card className="p-4">
         <h3 className="text-lg font-medium mb-4">Rep Monitoring</h3>
         
         <div className="space-y-3 max-h-64 overflow-y-auto">
           {Array.from(participants.values())
             .filter(p => p.role === 'student')
             .map(participant => {
               const count = repCounts.get(participant.id) || 0
               const target = targets.get(participant.id)
               const progressPercentage = target ? (count / target) * 100 : 0
               
               return (
                 <div key={participant.id} className="flex items-center justify-between p-3 bg-fitness-gray rounded-lg">
                   <div className="flex items-center gap-3">
                     <Avatar size="sm">
                       <AvatarFallback>{participant.name[0]}</AvatarFallback>
                     </Avatar>
                     
                     <div>
                       <p className="font-medium">{participant.name}</p>
                       <FitnessLevelBadge level={participant.fitnessLevel} size="sm" />
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <div className="text-right">
                       <div className="text-lg font-bold text-fitness-green">
                         {count}
                         {target && <span className="text-sm text-muted-foreground">/{target}</span>}
                       </div>
                       
                       {target && (
                         <div className="w-16 bg-fitness-dark rounded-full h-1 mt-1">
                           <div 
                             className="h-1 bg-fitness-green rounded-full transition-all"
                             style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                           />
                         </div>
                       )}
                     </div>
                     
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => {
                         const newTarget = prompt(`Set rep target for ${participant.name}:`, target?.toString() || '10')
                         if (newTarget && !isNaN(parseInt(newTarget))) {
                           handleSetTarget(participant.id, parseInt(newTarget))
                         }
                       }}
                     >
                       <Target className="w-3 h-3" />
                     </Button>
                   </div>
                 </div>
               )
             })}
         </div>
       </Card>
     )
   }
   ```

**Deliverables**:
- [ ] Rep counter service with target functionality
- [ ] Interactive rep counter UI for students
- [ ] Coach monitoring dashboard for all participants
- [ ] Progress tracking and target achievement

**Success Criteria**:
- Students can increment/decrement reps accurately
- Coaches can monitor all participant rep counts in real-time
- Target setting and achievement works correctly

---

### Week 7: Form Alerts & Placeholder Features

#### Sprint 3.3: Form Alert System (Placeholder)
**Goal**: Implement placeholder form alert system for future AI integration

**Tasks**:
1. **Create Form Alert Service (Mock)**
   ```typescript
   export class FormAlertService {
     private alertHistory: Map<string, FormAlert[]> = new Map()
     
     constructor(private eventEmitter: EventEmitter) {}
     
     // Mock form analysis - will be replaced with AI/computer vision
     analyzeForm(userId: string, exerciseType: string, videoFrame?: ImageData): FormAlert | null {
       // Simulate form analysis with random alerts for demo
       const alertTypes: FormAlertType[] = [
         'posture_warning',
         'range_of_motion',
         'speed_adjustment',
         'form_correction'
       ]
       
       // Random chance of alert (for demo purposes)
       if (Math.random() < 0.1) { // 10% chance
         const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)]
         
         const alert: FormAlert = {
           id: uuid(),
           userId,
           exerciseType,
           alertType,
           severity: this.getRandomSeverity(),
           message: this.getAlertMessage(alertType, exerciseType),
           timestamp: new Date(),
           resolved: false
         }
         
         this.recordAlert(userId, alert)
         this.eventEmitter.emit('form-alert-triggered', alert)
         
         return alert
       }
       
       return null
     }
     
     private getRandomSeverity(): 'low' | 'medium' | 'high' {
       const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
       return severities[Math.floor(Math.random() * severities.length)]
     }
     
     private getAlertMessage(alertType: FormAlertType, exerciseType: string): string {
       const messages = {
         posture_warning: `Keep your back straight during ${exerciseType}`,
         range_of_motion: `Try to get full range of motion in your ${exerciseType}`,
         speed_adjustment: `Slow down your ${exerciseType} movement for better form`,
         form_correction: `Check your ${exerciseType} form - see the demonstration`
       }
       
       return messages[alertType] || 'Form improvement suggestion available'
     }
     
     private recordAlert(userId: string, alert: FormAlert): void {
       if (!this.alertHistory.has(userId)) {
         this.alertHistory.set(userId, [])
       }
       
       this.alertHistory.get(userId)!.push(alert)
       
       // Keep only last 10 alerts per user
       const userAlerts = this.alertHistory.get(userId)!
       if (userAlerts.length > 10) {
         userAlerts.shift()
       }
     }
     
     getAlertHistory(userId: string): FormAlert[] {
       return this.alertHistory.get(userId) || []
     }
     
     resolveAlert(alertId: string): void {
       this.alertHistory.forEach(userAlerts => {
         const alert = userAlerts.find(a => a.id === alertId)
         if (alert) {
           alert.resolved = true
           this.eventEmitter.emit('form-alert-resolved', alert)
         }
       })
     }
     
     // Simulate continuous form monitoring
     startFormMonitoring(userId: string, exerciseType: string): () => void {
       const interval = setInterval(() => {
         this.analyzeForm(userId, exerciseType)
       }, 5000) // Check every 5 seconds
       
       return () => clearInterval(interval)
     }
   }
   ```

2. **Form Alert UI Components**
   ```typescript
   export const FormAlertDisplay = ({ userId }: { userId: string }) => {
     const [alerts, setAlerts] = useState<FormAlert[]>([])
     const [activeAlert, setActiveAlert] = useState<FormAlert | null>(null)
     
     const formAlertService = useMemo(() => new FormAlertService(new EventEmitter()), [])
     
     useEffect(() => {
       const handleFormAlert = (event: CustomEvent<FormAlert>) => {
         const alert = event.detail
         if (alert.userId === userId) {
           setAlerts(prev => [alert, ...prev.slice(0, 4)]) // Keep last 5 alerts
           setActiveAlert(alert)
           
           // Auto-dismiss after 5 seconds for low severity
           if (alert.severity === 'low') {
             setTimeout(() => {
               setActiveAlert(null)
             }, 5000)
           }
         }
       }
       
       window.addEventListener('form-alert-triggered', handleFormAlert as EventListener)
       
       return () => {
         window.removeEventListener('form-alert-triggered', handleFormAlert as EventListener)
       }
     }, [userId])
     
     const handleDismissAlert = (alertId: string) => {
       formAlertService.resolveAlert(alertId)
       setActiveAlert(null)
       setAlerts(prev => prev.filter(a => a.id !== alertId))
     }
     
     const getSeverityColor = (severity: FormAlert['severity']) => {
       switch (severity) {
         case 'high': return 'border-red-500 bg-red-500/10 text-red-400'
         case 'medium': return 'border-fitness-orange bg-fitness-orange/10 text-fitness-orange'
         case 'low': return 'border-fitness-green bg-fitness-green/10 text-fitness-green'
       }
     }
     
     return (
       <div className="space-y-2">
         {/* Active Alert */}
         {activeAlert && (
           <div className={`p-3 rounded-lg border-2 ${getSeverityColor(activeAlert.severity)}`}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="font-medium">Form Alert</span>
               </div>
               <Button
                 size="sm"
                 variant="ghost"
                 onClick={() => handleDismissAlert(activeAlert.id)}
               >
                 <X className="w-3 h-3" />
               </Button>
             </div>
             
             <p className="text-sm mt-1">{activeAlert.message}</p>
             
             <div className="flex gap-2 mt-2">
               <Button size="sm" variant="outline">
                 <Eye className="w-3 h-3 mr-1" />
                 View Demo
               </Button>
               <Button size="sm" variant="outline">
                 <CheckCircle className="w-3 h-3 mr-1" />
                 Got it
               </Button>
             </div>
           </div>
         )}
         
         {/* Alert History */}
         {alerts.length > 0 && (
           <details className="group">
             <summary className="cursor-pointer text-sm text-muted-foreground">
               Recent form suggestions ({alerts.length})
             </summary>
             
             <div className="mt-2 space-y-1">
               {alerts.slice(0, 3).map(alert => (
                 <div key={alert.id} className="p-2 bg-fitness-gray rounded text-xs">
                   <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                     alert.severity === 'high' ? 'bg-red-500' :
                     alert.severity === 'medium' ? 'bg-fitness-orange' : 'bg-fitness-green'
                   }`} />
                   {alert.message}
                 </div>
               ))}
             </div>
           </details>
         )}
       </div>
     )
   }
   ```

3. **Coach Form Monitoring Dashboard**
   ```typescript
   export const CoachFormMonitoringPanel = () => {
     const { participants, currentSession } = useFitnessPlatformContext()
     const [participantAlerts, setParticipantAlerts] = useState<Map<string, FormAlert[]>>(new Map())
     
     const formAlertService = useMemo(() => new FormAlertService(new EventEmitter()), [])
     
     useEffect(() => {
       const handleFormAlert = (event: CustomEvent<FormAlert>) => {
         const alert = event.detail
         setParticipantAlerts(prev => {
           const newMap = new Map(prev)
           const userAlerts = newMap.get(alert.userId) || []
           newMap.set(alert.userId, [alert, ...userAlerts.slice(0, 2)]) // Keep last 3 alerts
           return newMap
         })
       }
       
       window.addEventListener('form-alert-triggered', handleFormAlert as EventListener)
       
       return () => {
         window.removeEventListener('form-alert-triggered', handleFormAlert as EventListener)
       }
     }, [])
     
     const getAlertSummary = (userId: string) => {
       const alerts = participantAlerts.get(userId) || []
       const highSeverity = alerts.filter(a => a.severity === 'high').length
       const mediumSeverity = alerts.filter(a => a.severity === 'medium').length
       
       return { high: highSeverity, medium: mediumSeverity, total: alerts.length }
     }
     
     return (
       <Card className="p-4">
         <h3 className="text-lg font-medium mb-4">Form Monitoring</h3>
         <p className="text-sm text-muted-foreground mb-4">
           🚧 AI-powered form analysis coming soon
         </p>
         
         <div className="space-y-3 max-h-64 overflow-y-auto">
           {Array.from(participants.values())
             .filter(p => p.role === 'student')
             .map(participant => {
               const alertSummary = getAlertSummary(participant.id)
               const recentAlerts = participantAlerts.get(participant.id) || []
               
               return (
                 <div key={participant.id} className="p-3 bg-fitness-gray rounded-lg">
                   <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-3">
                       <Avatar size="sm">
                         <AvatarFallback>{participant.name[0]}</AvatarFallback>
                       </Avatar>
                       <span className="font-medium">{participant.name}</span>
                     </div>
                     
                     <div className="flex items-center gap-2">
                       {alertSummary.high > 0 && (
                         <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                           {alertSummary.high} high
                         </span>
                       )}
                       {alertSummary.medium > 0 && (
                         <span className="px-2 py-1 bg-fitness-orange/20 text-fitness-orange text-xs rounded">
                           {alertSummary.medium} medium
                         </span>
                       )}
                       {alertSummary.total === 0 && (
                         <span className="px-2 py-1 bg-fitness-green/20 text-fitness-green text-xs rounded">
                           Good form
                         </span>
                       )}
                     </div>
                   </div>
                   
                   {recentAlerts.length > 0 && (
                     <div className="text-xs text-muted-foreground">
                       Latest: {recentAlerts[0].message}
                     </div>
                   )}
                 </div>
               )
             })}
         </div>
       </Card>
     )
   }
   ```

**Deliverables**:
- [ ] Mock form alert service with realistic simulation
- [ ] Form alert display for students
- [ ] Coach form monitoring dashboard
- [ ] Alert severity system and UI indicators

**Success Criteria**:
- Form alerts appear realistically during exercise simulation
- Students receive helpful form suggestions
- Coaches can monitor form alerts across all participants

---

#### Sprint 3.4: Placeholder Overlays & Future Features
**Goal**: Create placeholder overlays for advanced features to be implemented later

**Tasks**:
1. **Exercise Badge System**
   ```typescript
   export const ExerciseBadge = ({ 
     badge, 
     position = 'top-right' 
   }: { 
     badge: ExerciseBadge; 
     position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' 
   }) => {
     const getBadgeColor = (type: ExerciseBadge['type']) => {
       switch (type) {
         case 'streak': return 'bg-fitness-orange text-white'
         case 'achievement': return 'bg-fitness-green text-black'
         case 'milestone': return 'bg-purple-500 text-white'
         case 'form_perfect': return 'bg-blue-500 text-white'
         default: return 'bg-fitness-gray text-white'
       }
     }
     
     const getPositionClasses = (pos: string) => {
       switch (pos) {
         case 'top-left': return 'top-2 left-2'
         case 'top-right': return 'top-2 right-2'
         case 'bottom-left': return 'bottom-2 left-2'
         case 'bottom-right': return 'bottom-2 right-2'
         default: return 'top-2 right-2'
       }
     }
     
     return (
       <div className={`absolute ${getPositionClasses(position)} z-10`}>
         <div className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(badge.type)} flex items-center gap-1`}>
           {badge.icon && <span>{badge.icon}</span>}
           <span>{badge.label}</span>
         </div>
       </div>
     )
   }
   
   // Usage in video tiles
   export const EnhancedParticipantTile = ({ participant, ...props }: ParticipantTileProps) => {
     const [badges, setBadges] = useState<ExerciseBadge[]>([])
     
     useEffect(() => {
       // Mock badge assignment
       const mockBadges: ExerciseBadge[] = []
       
       // Simulate achievement badges
       if (Math.random() < 0.3) {
         mockBadges.push({
           id: '1',
           type: 'streak',
           label: '5 day streak',
           icon: '🔥'
         })
       }
       
       if (Math.random() < 0.2) {
         mockBadges.push({
           id: '2',
           type: 'achievement',
           label: '100 reps',
           icon: '💪'
         })
       }
       
       setBadges(mockBadges)
     }, [participant.id])
     
     return (
       <div className="relative">
         <ParticipantTile participant={participant} {...props} />
         
         {badges.map((badge, index) => (
           <ExerciseBadge 
             key={badge.id} 
             badge={badge} 
             position={index === 0 ? 'top-right' : 'top-left'}
           />
         ))}
       </div>
     )
   }
   ```

2. **Progress Tracking Overlay**
   ```typescript
   export const ProgressTrackingOverlay = ({ userId }: { userId: string }) => {
     const [progressData, setProgressData] = useState<ProgressData>({
       sessionsThisWeek: 3,
       totalWorkoutTime: 180, // minutes
       averageFormScore: 85,
       improvementTrend: 'up'
     })
     
     const [isVisible, setIsVisible] = useState(false)
     
     const toggleVisibility = () => setIsVisible(!isVisible)
     
     if (!isVisible) {
       return (
         <Button
           size="sm"
           variant="ghost"
           className="absolute bottom-2 left-2 text-xs"
           onClick={toggleVisibility}
         >
           <TrendingUp className="w-3 h-3" />
         </Button>
       )
     }
     
     return (
       <div className="absolute bottom-2 left-2 bg-black/80 p-3 rounded-lg text-white min-w-48">
         <div className="flex items-center justify-between mb-2">
           <h4 className="text-sm font-medium">Progress</h4>
           <Button size="sm" variant="ghost" onClick={toggleVisibility}>
             <X className="w-3 h-3" />
           </Button>
         </div>
         
         <div className="space-y-1 text-xs">
           <div className="flex justify-between">
             <span>This week:</span>
             <span className="text-fitness-green">{progressData.sessionsThisWeek} sessions</span>
           </div>
           
           <div className="flex justify-between">
             <span>Total time:</span>
             <span>{progressData.totalWorkoutTime}min</span>
           </div>
           
           <div className="flex justify-between">
             <span>Form score:</span>
             <span className="text-fitness-orange">{progressData.averageFormScore}%</span>
           </div>
           
           <div className="flex justify-between">
             <span>Trend:</span>
             <span className={progressData.improvementTrend === 'up' ? 'text-fitness-green' : 'text-red-400'}>
               {progressData.improvementTrend === 'up' ? '↗️ Improving' : '↘️ Declining'}
             </span>
           </div>
         </div>
         
         <div className="mt-2 pt-2 border-t border-gray-600">
           <p className="text-xs text-gray-400">🚧 Detailed analytics coming soon</p>
         </div>
       </div>
     )
   }
   ```

3. **AI Assistant Placeholder**
   ```typescript
   export const AIAssistantPlaceholder = () => {
     const [isExpanded, setIsExpanded] = useState(false)
     const [messages, setMessages] = useState<AIMessage[]>([
       {
         id: '1',
         type: 'suggestion',
         content: 'Try to keep your core engaged during squats',
         timestamp: new Date()
       }
     ])
     
     const addMockMessage = () => {
       const mockMessages = [
         'Your form is improving! Keep it up!',
         'Consider increasing your rep target for next set',
         'Remember to breathe steadily during exercises',
         'Great job maintaining consistency this week!'
       ]
       
       const newMessage: AIMessage = {
         id: Date.now().toString(),
         type: 'encouragement',
         content: mockMessages[Math.floor(Math.random() * mockMessages.length)],
         timestamp: new Date()
       }
       
       setMessages(prev => [newMessage, ...prev.slice(0, 4)])
     }
     
     if (!isExpanded) {
       return (
         <Button
           className="fixed bottom-4 right-4 rounded-full w-12 h-12 bg-fitness-green hover:bg-fitness-green/80"
           onClick={() => setIsExpanded(true)}
         >
           <Bot className="w-5 h-5" />
         </Button>
       )
     }
     
     return (
       <div className="fixed bottom-4 right-4 w-80 bg-fitness-dark border border-fitness-gray rounded-lg shadow-lg">
         <div className="p-4 border-b border-fitness-gray">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Bot className="w-5 h-5 text-fitness-green" />
               <h3 className="font-medium">AI Fitness Assistant</h3>
             </div>
             <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)}>
               <X className="w-4 h-4" />
             </Button>
           </div>
           <p className="text-xs text-muted-foreground mt-1">🚧 Coming soon with advanced AI features</p>
         </div>
         
         <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
           {messages.map(message => (
             <div key={message.id} className="p-3 bg-fitness-gray rounded-lg">
               <div className="flex items-center gap-2 mb-1">
                 <span className={`w-2 h-2 rounded-full ${
                   message.type === 'suggestion' ? 'bg-fitness-orange' : 'bg-fitness-green'
                 }`} />
                 <span className="text-xs text-muted-foreground capitalize">{message.type}</span>
               </div>
               <p className="text-sm">{message.content}</p>
             </div>
           ))}
         </div>
         
         <div className="p-4 border-t border-fitness-gray">
           <Button
             size="sm"
             variant="outline"
             className="w-full"
             onClick={addMockMessage}
           >
             Get Suggestion
           </Button>
         </div>
       </div>
     )
   }
   ```

4. **Feature Showcase Modal**
   ```typescript
   export const FutureFeatureShowcase = () => {
     const [isOpen, setIsOpen] = useState(false)
     
     const futureFeatures = [
       {
         icon: '🤖',
         title: 'AI Form Analysis',
         description: 'Real-time posture and movement correction using computer vision',
         status: 'In Development'
       },
       {
         icon: '📊',
         title: 'Advanced Analytics',
         description: 'Detailed progress tracking, performance insights, and workout recommendations',
         status: 'Planned'
       },
       {
         icon: '🏆',
         title: 'Gamification',
         description: 'Achievement system, leaderboards, and social challenges',
         status: 'Planned'
       },
       {
         icon: '📱',
         title: 'Mobile App',
         description: 'Native iOS and Android apps with offline workout capability',
         status: 'Planned'
       },
       {
         icon: '⌚',
         title: 'Wearable Integration',
         description: 'Heart rate monitoring, calorie tracking, and fitness device sync',
         status: 'Future'
       },
       {
         icon: '🎯',
         title: 'Personalized Programs',
         description: 'AI-generated workout plans based on individual goals and progress',
         status: 'Future'
       }
     ]
     
     return (
       <>
         <Button
           variant="outline"
           size="sm"
           onClick={() => setIsOpen(true)}
           className="fixed top-4 right-4 z-50"
         >
           <Sparkles className="w-4 h-4 mr-2" />
           Coming Soon
         </Button>
         
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Upcoming Features</DialogTitle>
               <DialogDescription>
                 Exciting features we're building to enhance your fitness experience
               </DialogDescription>
             </DialogHeader>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {futureFeatures.map((feature, index) => (
                 <div key={index} className="p-4 bg-fitness-gray rounded-lg">
                   <div className="flex items-center gap-3 mb-2">
                     <span className="text-2xl">{feature.icon}</span>
                     <div>
                       <h3 className="font-medium">{feature.title}</h3>
                       <span className={`text-xs px-2 py-1 rounded ${
                         feature.status === 'In Development' ? 'bg-fitness-orange/20 text-fitness-orange' :
                         feature.status === 'Planned' ? 'bg-fitness-green/20 text-fitness-green' :
                         'bg-blue-500/20 text-blue-400'
                       }`}>
                         {feature.status}
                       </span>
                     </div>
                   </div>
                   <p className="text-sm text-muted-foreground">{feature.description}</p>
                 </div>
               ))}
             </div>
             
             <div className="flex justify-center pt-4">
               <Button onClick={() => setIsOpen(false)}>Close</Button>
             </div>
           </DialogContent>
         </Dialog>
       </>
     )
   }
   ```

**Deliverables**:
- [ ] Exercise badge system with achievement tracking
- [ ] Progress tracking overlay with mock data
- [ ] AI assistant placeholder with mock interactions
- [ ] Future feature showcase modal

**Success Criteria**:
- Placeholder features provide realistic preview of future functionality
- Badge system enhances visual engagement
- Users understand what features are coming soon

---

## Phase 4: Real-Time Synchronization
### Duration: 2 weeks

### Week 8: Database Integration & State Sync

#### Sprint 4.1: Supabase Integration
**Goal**: Replace mock database service with real Supabase integration

**Tasks**:
1. **Set up Supabase Project and Schema**
   ```sql
   -- Complete database schema setup
   
   -- Users and profiles
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     role TEXT CHECK (role IN ('coach', 'student', 'admin')) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   CREATE TABLE user_profiles (
     user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
     display_name TEXT NOT NULL,
     fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
     health_notes TEXT,
     avatar_url TEXT,
     zoom_user_id TEXT,
     preferred_video_quality TEXT DEFAULT '720p',
     bandwidth_limit INTEGER DEFAULT 1000,
     device_capabilities JSONB DEFAULT '{}'::jsonb
   );
   
   -- Sessions/Classes
   CREATE TABLE classes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     coach_id UUID REFERENCES users(id) NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     scheduled_start TIMESTAMP WITH TIME ZONE,
     actual_start TIMESTAMP WITH TIME ZONE,
     actual_end TIMESTAMP WITH TIME ZONE,
     status TEXT CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')) DEFAULT 'scheduled',
     max_participants INTEGER DEFAULT 50,
     zoom_session_name TEXT UNIQUE,
     zoom_session_password TEXT,
     zoom_jwt_token TEXT,
     session_recording_id TEXT,
     network_quality_threshold INTEGER DEFAULT 2,
     enable_waiting_room BOOLEAN DEFAULT false,
     require_audio_on_join BOOLEAN DEFAULT false,
     max_video_participants INTEGER DEFAULT 25,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Class participants with real-time data
   CREATE TABLE class_participants (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     left_at TIMESTAMP WITH TIME ZONE,
     fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
     status TEXT CHECK (status IN ('invited', 'joined', 'left', 'removed')) DEFAULT 'invited',
     zoom_participant_id TEXT,
     video_quality TEXT DEFAULT '720p',
     audio_quality TEXT DEFAULT 'medium',
     connection_quality INTEGER DEFAULT 5,
     total_speaking_time INTEGER DEFAULT 0,
     camera_on_duration INTEGER DEFAULT 0,
     is_spotlighted BOOLEAN DEFAULT false,
     spotlight_duration INTEGER DEFAULT 0,
     hand_raised_count INTEGER DEFAULT 0,
     rep_count INTEGER DEFAULT 0,
     rep_target INTEGER,
     session_engagement_score DECIMAL(3,2) DEFAULT 0.00,
     UNIQUE(class_id, user_id)
   );
   
   -- Exercises and assignments
   CREATE TABLE exercises (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     description TEXT,
     difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
     category TEXT,
     demo_video_url TEXT,
     instructions JSONB DEFAULT '{}'::jsonb,
     benefits TEXT,
     default_duration INTEGER DEFAULT 60,
     variations JSONB DEFAULT '{}'::jsonb,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   CREATE TABLE class_exercises (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
     exercise_id UUID REFERENCES exercises(id),
     target_audience TEXT CHECK (target_audience IN ('all', 'beginner', 'intermediate', 'advanced')) DEFAULT 'all',
     started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     ended_at TIMESTAMP WITH TIME ZONE,
     duration INTEGER DEFAULT 60,
     is_active BOOLEAN DEFAULT true,
     assigned_by UUID REFERENCES users(id)
   );
   
   -- Progress tracking
   CREATE TABLE student_progress (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
     exercise_id UUID REFERENCES exercises(id),
     rep_count INTEGER DEFAULT 0,
     duration INTEGER DEFAULT 0,
     form_score DECIMAL(3,2) DEFAULT 0.00,
     completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     notes TEXT
   );
   
   -- Form alerts
   CREATE TABLE form_alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
     exercise_type TEXT,
     alert_type TEXT CHECK (alert_type IN ('posture_warning', 'range_of_motion', 'speed_adjustment', 'form_correction')),
     severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
     message TEXT,
     resolved BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Row Level Security (RLS) policies
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE class_participants ENABLE ROW LEVEL SECURITY;
   ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
   ALTER TABLE class_exercises ENABLE ROW LEVEL SECURITY;
   ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
   ALTER TABLE form_alerts ENABLE ROW LEVEL SECURITY;
   
   -- RLS Policies (users can only access their own data or classes they're part of)
   CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
   
   CREATE POLICY "Users can view own user profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
   
   CREATE POLICY "Coaches can manage their classes" ON classes FOR ALL USING (
     auth.uid() = coach_id OR 
     EXISTS (SELECT 1 FROM class_participants WHERE class_id = classes.id AND user_id = auth.uid())
   );
   
   CREATE POLICY "Participants can view class data" ON class_participants FOR SELECT USING (
     auth.uid() = user_id OR 
     EXISTS (SELECT 1 FROM classes WHERE id = class_id AND coach_id = auth.uid())
   );
   
   CREATE POLICY "Coaches can manage participants" ON class_participants FOR ALL USING (
     EXISTS (SELECT 1 FROM classes WHERE id = class_id AND coach_id = auth.uid())
   );
   ```

2. **Create Real Supabase Service**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from '../types/supabase'
   
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!
   
   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
   
   export class SupabaseDatabaseService implements DatabaseService {
     async createSession(sessionData: CreateSessionData): Promise<FitnessSession> {
       const { data, error } = await supabase
         .from('classes')
         .insert({
           coach_id: sessionData.coachId,
           title: sessionData.title,
           description: sessionData.description,
           scheduled_start: sessionData.scheduledStart?.toISOString(),
           max_participants: sessionData.maxParticipants,
           zoom_session_name: sessionData.zoomSessionName,
           zoom_session_password: sessionData.zoomSessionPassword
         })
         .select()
         .single()
       
       if (error) throw new Error(`Failed to create session: ${error.message}`)
       
       return this.mapToFitnessSession(data)
     }
     
     async getSession(sessionId: string): Promise<FitnessSession | null> {
       const { data, error } = await supabase
         .from('classes')
         .select('*')
         .eq('id', sessionId)
         .single()
       
       if (error) {
         if (error.code === 'PGRST116') return null // Not found
         throw new Error(`Failed to get session: ${error.message}`)
       }
       
       return this.mapToFitnessSession(data)
     }
     
     async addParticipant(sessionId: string, userData: UserData): Promise<void> {
       const { error } = await supabase
         .from('class_participants')
         .insert({
           class_id: sessionId,
           user_id: userData.id,
           fitness_level: userData.fitnessLevel,
           status: 'joined',
           zoom_participant_id: userData.zoomParticipantId
         })
       
       if (error) throw new Error(`Failed to add participant: ${error.message}`)
     }
     
     async updateParticipantStatus(
       sessionId: string, 
       userId: string, 
       status: ParticipantStatus
     ): Promise<void> {
       const { error } = await supabase
         .from('class_participants')
         .update({ status, left_at: status === 'left' ? new Date().toISOString() : null })
         .eq('class_id', sessionId)
         .eq('user_id', userId)
       
       if (error) throw new Error(`Failed to update participant status: ${error.message}`)
     }
     
     async updateRepCount(sessionId: string, userId: string, repCount: number): Promise<void> {
       const { error } = await supabase
         .from('class_participants')
         .update({ rep_count: repCount })
         .eq('class_id', sessionId)
         .eq('user_id', userId)
       
       if (error) throw new Error(`Failed to update rep count: ${error.message}`)
     }
     
     async setRepTarget(sessionId: string, userId: string, target: number): Promise<void> {
       const { error } = await supabase
         .from('class_participants')
         .update({ rep_target: target })
         .eq('class_id', sessionId)
         .eq('user_id', userId)
       
       if (error) throw new Error(`Failed to set rep target: ${error.message}`)
     }
     
     async assignExerciseToGroup(
       sessionId: string,
       exerciseId: string,
       targetLevel: FitnessLevel | 'all'
     ): Promise<void> {
       const { error } = await supabase
         .from('class_exercises')
         .insert({
           class_id: sessionId,
           exercise_id: exerciseId,
           target_audience: targetLevel,
           assigned_by: (await supabase.auth.getUser()).data.user?.id
         })
       
       if (error) throw new Error(`Failed to assign exercise: ${error.message}`)
     }
     
     async recordFormAlert(alert: FormAlertData): Promise<void> {
       const { error } = await supabase
         .from('form_alerts')
         .insert({
           user_id: alert.userId,
           class_id: alert.sessionId,
           exercise_type: alert.exerciseType,
           alert_type: alert.alertType,
           severity: alert.severity,
           message: alert.message
         })
       
       if (error) throw new Error(`Failed to record form alert: ${error.message}`)
     }
     
     // Real-time subscriptions
     subscribeToSessionChanges(sessionId: string, callback: (payload: any) => void) {
       return supabase
         .channel(`session:${sessionId}`)
         .on('postgres_changes', {
           event: '*',
           schema: 'public',
           table: 'class_participants',
           filter: `class_id=eq.${sessionId}`
         }, callback)
         .on('postgres_changes', {
           event: '*',
           schema: 'public',
           table: 'class_exercises',
           filter: `class_id=eq.${sessionId}`
         }, callback)
         .subscribe()
     }
     
     private mapToFitnessSession(data: any): FitnessSession {
       return {
         id: data.id,
         title: data.title,
         description: data.description,
         coachId: data.coach_id,
         status: data.status,
         scheduledStart: data.scheduled_start ? new Date(data.scheduled_start) : undefined,
         actualStart: data.actual_start ? new Date(data.actual_start) : undefined,
         actualEnd: data.actual_end ? new Date(data.actual_end) : undefined,
         maxParticipants: data.max_participants,
         zoomSessionName: data.zoom_session_name,
         zoomSessionPassword: data.zoom_session_password,
         createdAt: new Date(data.created_at),
         updatedAt: new Date(data.updated_at)
       }
     }
   }
   ```

3. **Update State Management for Real-Time Sync**
   ```typescript
   export const useFitnessPlatform = () => {
     const [currentSession, setCurrentSession] = useState<FitnessSession | null>(null)
     const [participants, setParticipants] = useState<Map<string, Participant>>(new Map())
     const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)
     
     const databaseService = useMemo(() => new SupabaseDatabaseService(), [])
     
     // Set up real-time subscription when session starts
     useEffect(() => {
       if (currentSession && !realtimeChannel) {
         const channel = databaseService.subscribeToSessionChanges(
           currentSession.id,
           handleRealtimeUpdate
         )
         setRealtimeChannel(channel)
         
         return () => {
           channel.unsubscribe()
           setRealtimeChannel(null)
         }
       }
     }, [currentSession, realtimeChannel, databaseService])
     
     const handleRealtimeUpdate = useCallback((payload: any) => {
       const { eventType, new: newRecord, old: oldRecord, table } = payload
       
       switch (table) {
         case 'class_participants':
           handleParticipantUpdate(eventType, newRecord, oldRecord)
           break
         case 'class_exercises':
           handleExerciseUpdate(eventType, newRecord, oldRecord)
           break
       }
     }, [])
     
     const handleParticipantUpdate = useCallback((
       eventType: string,
       newRecord: any,
       oldRecord: any
     ) => {
       switch (eventType) {
         case 'INSERT':
           // New participant joined
           setParticipants(prev => {
             const newMap = new Map(prev)
             newMap.set(newRecord.user_id, {
               id: newRecord.user_id,
               name: newRecord.display_name || 'Unknown',
               role: 'student', // Will be fetched from user profile
               fitnessLevel: newRecord.fitness_level,
               isVideoEnabled: true,
               isAudioEnabled: true,
               connectionQuality: newRecord.connection_quality,
               repCount: newRecord.rep_count,
               repTarget: newRecord.rep_target
             })
             return newMap
           })
           break
           
         case 'UPDATE':
           // Participant data updated
           setParticipants(prev => {
             const participant = prev.get(newRecord.user_id)
             if (participant) {
               const newMap = new Map(prev)
               newMap.set(newRecord.user_id, {
                 ...participant,
                 fitnessLevel: newRecord.fitness_level,
                 connectionQuality: newRecord.connection_quality,
                 repCount: newRecord.rep_count,
                 repTarget: newRecord.rep_target,
                 isSpotlighted: newRecord.is_spotlighted
               })
               return newMap
             }
             return prev
           })
           break
           
         case 'DELETE':
           // Participant left
           setParticipants(prev => {
             const newMap = new Map(prev)
             newMap.delete(oldRecord.user_id)
             return newMap
           })
           break
       }
     }, [])
     
     // Updated methods to use real database
     const updateRepCount = useCallback(async (userId: string, count: number) => {
       if (!currentSession) return
       
       try {
         await databaseService.updateRepCount(currentSession.id, userId, count)
         // Real-time update will be handled by subscription
       } catch (error) {
         console.error('Failed to update rep count:', error)
         toast.error('Failed to update rep count')
       }
     }, [currentSession, databaseService])
     
     const setRepTarget = useCallback(async (userId: string, target: number) => {
       if (!currentSession) return
       
       try {
         await databaseService.setRepTarget(currentSession.id, userId, target)
         // Real-time update will be handled by subscription
       } catch (error) {
         console.error('Failed to set rep target:', error)
         toast.error('Failed to set rep target')
       }
     }, [currentSession, databaseService])
     
     const assignFitnessLevel = useCallback(async (userId: string, level: FitnessLevel) => {
       if (!currentSession) return
       
       try {
         await databaseService.updateParticipantFitnessLevel(currentSession.id, userId, level)
         // Real-time update will be handled by subscription
       } catch (error) {
         console.error('Failed to assign fitness level:', error)
         toast.error('Failed to assign fitness level')
       }
     }, [currentSession, databaseService])
     
     return {
       currentSession,
       participants,
       updateRepCount,
       setRepTarget,
       assignFitnessLevel,
       // ... other methods
     }
   }
   ```

**Deliverables**:
- [ ] Complete Supabase database schema
- [ ] Real Supabase service implementation
- [ ] Updated state management with real-time subscriptions
- [ ] Database migration from mock to real data

**Success Criteria**:
- All data operations work with real Supabase database
- Real-time updates sync across all connected clients
- Database operations are secure with proper RLS policies

---

This implementation plan provides a structured, sequential approach to building the FitConnect platform. Each phase builds upon the previous one, with clear deliverables and success criteria. The plan prioritizes video infrastructure first, then gradually adds fitness-specific features and real-time synchronization, ensuring a stable foundation throughout development.