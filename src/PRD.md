# Product Requirements Document (PRD)
# FitWithPari: Online Fitness Class Platform

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [User Stories & Requirements](#user-stories--requirements)
4. [Technical Architecture](#technical-architecture)
5. [Feature Specifications](#feature-specifications)
6. [UI/UX Requirements](#uiux-requirements)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Metrics](#success-metrics)
9. [Risk Assessment](#risk-assessment)

---

## Executive Summary

FitWithPari is a comprehensive online fitness class platform that enables real-time interactive fitness sessions between coaches and students. Built on Zoom Video SDK, the platform provides role-based experiences with intelligent student grouping, targeted exercise instruction, and comprehensive class management tools.

### Key Value Propositions
- **Personalized Fitness Experience**: Group students by fitness levels for targeted instruction
- **Real-time Interaction**: Live video sessions with form feedback and rep tracking
- **Professional Coaching Tools**: Comprehensive coach dashboard with group management
- **Scalable Architecture**: Cloud-native solution supporting multiple concurrent sessions

---

## Product Overview

### Target Users
- **Primary**: Fitness coaches conducting online classes
- **Secondary**: Students participating in online fitness sessions
- **Tertiary**: Fitness studio owners managing multiple coaches

### Core Problems Solved
1. **Generic Fitness Classes**: One-size-fits-all approach doesn't serve different fitness levels
2. **Limited Interaction**: Traditional video calls lack fitness-specific features
3. **Poor Form Monitoring**: Difficulty tracking student progress and form in virtual sessions
4. **Complex Group Management**: No efficient way to manage students by skill level

### Business Objectives
- Capture 15% market share in online fitness platform space within 18 months
- Enable coaches to manage 3x larger class sizes effectively
- Reduce student churn by 40% through personalized experiences
- Generate revenue through subscription tiers and per-session pricing

---

## User Stories & Requirements

### Epic 1: Coach Management & Class Control

#### Story 1.1: Class Setup & Student Grouping
**As a fitness coach**, I want to organize students into fitness level groups so that I can provide targeted instruction appropriate for their skill level.

**Acceptance Criteria:**
- Coach can assign students to Beginner, Intermediate, or Advanced groups
- Visual indicators show group assignments in real-time
- Coach can modify group assignments during live sessions
- System supports up to 50 students per session with group filtering

#### Story 1.2: Mode Switching (Teach vs Workout)
**As a fitness coach**, I want to switch between teaching and workout modes so that I can demonstrate exercises and then monitor student execution.

**Acceptance Criteria:**
- One-click toggle between Teach Mode and Workout Mode
- Teach Mode: Split screen with coach spotlight and exercise content
- Workout Mode: Grid view of all students for monitoring
- Mode changes are reflected in real-time for all participants

#### Story 1.3: Targeted Exercise Assignment
**As a fitness coach**, I want to assign different exercise variations to specific groups so that beginners get modified versions while advanced students get challenging variations.

**Acceptance Criteria:**
- Exercise content can be targeted to specific fitness levels or "all students"
- Students only see content relevant to their level
- Coach sees targeting status for all assigned exercises
- Exercise library supports multiple difficulty variations

### Epic 2: Student Experience & Engagement

#### Story 2.1: Personalized Class View
**As a fitness student**, I want to see content appropriate for my fitness level so that I'm not overwhelmed or under-challenged.

**Acceptance Criteria:**
- Student sees exercises targeted to their assigned level
- Hidden content shows "Exercise in Progress" placeholder
- Clear visual indicators for student's current group assignment
- Seamless experience when exercises are retargeted

#### Story 2.2: Form Feedback & Progress Tracking
**As a fitness student**, I want real-time feedback on my form and rep counting so that I can improve my technique and track progress.

**Acceptance Criteria:**
- Rep counter displays current count and targets
- Form alerts notify of technique issues (future implementation)
- Progress tracking across multiple sessions
- Achievement badges for milestones

#### Story 2.3: Interactive Features
**As a fitness student**, I want to interact with my coach during sessions so that I can ask questions and get personalized attention.

**Acceptance Criteria:**
- Hand raise feature for questions
- Chat functionality for text communication
- Mute/unmute audio controls
- Video on/off toggle

### Epic 3: Technical Platform Requirements

#### Story 3.1: Video Infrastructure
**As a platform user**, I want reliable, high-quality video streaming so that I can participate in classes without technical issues.

**Acceptance Criteria:**
- Support for up to 50 concurrent video streams
- Automatic quality adjustment based on bandwidth
- <500ms latency for real-time interaction
- 99.9% uptime during class hours

#### Story 3.2: Data Management & Analytics
**As a coach**, I want to track student progress and class analytics so that I can improve my teaching and student outcomes.

**Acceptance Criteria:**
- Student attendance tracking
- Exercise completion rates by group
- Progress metrics over time
- Class engagement analytics

---

## Technical Architecture

### Infrastructure Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4 with fitness-specific design tokens
- **Video SDK**: Zoom Video SDK for real-time communication
- **State Management**: React Context + Custom Hooks
- **Build Tool**: Vite for optimized builds

#### Backend & Database
- **Database**: Supabase (PostgreSQL) for real-time data
- **Authentication**: Supabase Auth with role-based access
- **Real-time**: Supabase Realtime for live updates
- **File Storage**: AWS S3 for media assets
- **CDN**: AWS CloudFront for global content delivery

#### Hosting & Deployment
- **Frontend Hosting**: AWS Amplify for automated deployments
- **Domain & SSL**: Amplify-managed with custom domain support
- **Environment Management**: Amplify environment branches
- **CI/CD**: GitHub Actions integration with Amplify

#### Third-Party Integrations
- **Video Infrastructure**: Zoom Video SDK v2.18.0+ with WebRTC support
- **Exercise Content**: Unsplash API for placeholder images
- **Analytics**: AWS CloudWatch + Custom analytics pipeline
- **Monitoring**: Sentry for error tracking

#### Zoom Video SDK Integration Details

##### SDK Configuration
- **Version**: Zoom Video SDK Web v2.18.0 or later
- **Bundle Size**: ~2.8MB gzipped for optimal performance
- **Browser Support**: Chrome 74+, Firefox 79+, Safari 14+, Edge 79+
- **WebRTC Protocol**: For low-latency peer-to-peer communication
- **Concurrent Participants**: Up to 1000 (500 with video, 1000 audio-only)

##### Authentication & Security
```javascript
// JWT Token Structure for Zoom SDK
const jwtPayload = {
  app_key: process.env.ZOOM_SDK_KEY,
  tpc: sessionName,        // Topic/Session name
  version: 1,              // JWT version
  alg: 'HS256',           // Algorithm
  exp: expirationTime,     // Token expiration
  iat: issuedTime,        // Token issued time
  aud: 'zoom',            // Audience
  user_identity: userId,   // Unique user identifier
  session_key: sessionKey // Session-specific key
}
```

##### Core Video Features Implementation
- **Video Resolution**: Support for 90p to 1080p adaptive streaming
- **Frame Rate**: 15fps to 30fps based on network conditions
- **Video Codecs**: VP8, VP9, H.264 with automatic codec selection
- **Audio Codecs**: Opus, G.722, PCMU/PCMA with noise suppression
- **Bandwidth Management**: Automatic quality adjustment (90p-1080p)

##### Fitness Platform Specific Features
```javascript
// Custom Video Layout Manager
class FitnessVideoLayoutManager {
  // Spotlight mode for coach demonstration
  setSpotlightMode(participantId: string): void
  
  // Gallery mode with fitness level grouping
  setGalleryMode(groupBy: 'level' | 'performance'): void
  
  // Workout mode with coach + student focus
  setWorkoutMode(studentId: string, coachId: string): void
  
  // Group highlighting for targeted exercises
  highlightGroup(level: 'beginner' | 'intermediate' | 'advanced'): void
}
```

### Zoom Video SDK Implementation Architecture

#### Session Management Integration
```javascript
// Zoom Session Lifecycle Management
class ZoomSessionManager {
  private client: ZoomVideoSDK
  private mediaStream: MediaStream
  
  async initializeSession(config: SessionConfig): Promise<void> {
    // Initialize Zoom SDK client
    this.client = ZoomVideoSDK.createClient()
    
    // Join session with JWT authentication
    await this.client.join({
      topic: config.sessionName,
      token: config.jwtToken,
      userName: config.userName,
      password: config.sessionPassword,
      // Fitness platform specific settings
      enforceGalleryView: false,
      maxParticipants: 50,
      disablePreview: false
    })
  }
  
  // Fitness-specific participant management
  async assignFitnessLevel(userId: string, level: FitnessLevel): Promise<void>
  async toggleSpotlight(participantId: string): Promise<void>
  async muteParticipant(participantId: string): Promise<void>
  async removeParticipant(participantId: string): Promise<void>
}
```

#### Video Stream Management
```javascript
// Custom video rendering for fitness platform
class FitnessVideoRenderer {
  // Render participant videos with fitness overlays
  renderParticipantTile(participant: ZoomParticipant, fitnessData: FitnessMetrics): HTMLElement
  
  // Overlay fitness-specific information
  addRepCounterOverlay(element: HTMLElement, repCount: number): void
  addFormAlertOverlay(element: HTMLElement, alertType: FormAlert): void
  addLevelBadgeOverlay(element: HTMLElement, level: FitnessLevel): void
  
  // Dynamic video quality management
  adjustVideoQuality(participant: ZoomParticipant, targetQuality: VideoQuality): void
}
```

#### Real-time Communication Features
```javascript
// Zoom SDK Event Handlers for Fitness Platform
class FitnessZoomEventHandler {
  // Handle participant interactions
  onParticipantJoin(participant: ZoomParticipant): void
  onParticipantLeave(participant: ZoomParticipant): void
  onVideoStateChange(participant: ZoomParticipant, isVideoOn: boolean): void
  onAudioStateChange(participant: ZoomParticipant, isAudioOn: boolean): void
  
  // Custom fitness platform events
  onRepCountUpdate(participantId: string, count: number): void
  onFormAlert(participantId: string, alertType: FormAlert): void
  onHandRaise(participantId: string, isRaised: boolean): void
  onFitnessLevelChange(participantId: string, newLevel: FitnessLevel): void
}
```

#### Network Optimization
```javascript
// Bandwidth and Quality Management
interface ZoomNetworkConfig {
  // Adaptive bitrate settings
  videoBitrate: {
    min: 150,    // kbps for 90p
    max: 2500,   // kbps for 1080p
    target: 1000 // kbps for 720p
  },
  
  // Audio quality settings
  audioBitrate: {
    music: 128,   // kbps for high quality
    speech: 64,   // kbps for voice
    low: 32       // kbps for poor connections
  },
  
  // Frame rate optimization
  frameRate: {
    min: 15,
    max: 30,
    adaptive: true
  }
}
```

### Data Models

#### User Management
```sql
-- Users table
users (
  id: UUID PRIMARY KEY,
  email: TEXT UNIQUE,
  role: ENUM('coach', 'student', 'admin'),
  profile: JSONB,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- User profiles with Zoom integration
user_profiles (
  user_id: UUID REFERENCES users(id),
  display_name: TEXT,
  fitness_level: ENUM('beginner', 'intermediate', 'advanced'),
  health_notes: TEXT,
  avatar_url: TEXT,
  zoom_user_id: TEXT, -- Zoom SDK user identifier
  preferred_video_quality: ENUM('90p', '180p', '360p', '720p', '1080p'),
  bandwidth_limit: INTEGER, -- User's bandwidth preference in kbps
  device_capabilities: JSONB -- Camera/microphone capabilities
)
```

#### Class Management
```sql
-- Classes/Sessions with Zoom SDK integration
classes (
  id: UUID PRIMARY KEY,
  coach_id: UUID REFERENCES users(id),
  title: TEXT,
  description: TEXT,
  scheduled_start: TIMESTAMP,
  actual_start: TIMESTAMP,
  status: ENUM('scheduled', 'live', 'completed', 'cancelled'),
  max_participants: INTEGER DEFAULT 50,
  zoom_session_name: TEXT UNIQUE, -- Zoom SDK session topic
  zoom_session_password: TEXT,    -- Optional session password
  zoom_jwt_token: TEXT,          -- Active session JWT
  session_recording_id: TEXT,     -- Zoom cloud recording ID
  network_quality_threshold: INTEGER DEFAULT 2, -- Minimum connection quality (1-5)
  enable_waiting_room: BOOLEAN DEFAULT false,
  require_audio_on_join: BOOLEAN DEFAULT false,
  max_video_participants: INTEGER DEFAULT 25 -- Video limit for performance
)

-- Class participants with Zoom session data
class_participants (
  class_id: UUID REFERENCES classes(id),
  user_id: UUID REFERENCES users(id),
  joined_at: TIMESTAMP,
  left_at: TIMESTAMP,
  fitness_level: ENUM('beginner', 'intermediate', 'advanced'),
  status: ENUM('invited', 'joined', 'left', 'removed'),
  zoom_participant_id: TEXT,     -- Zoom SDK participant identifier
  video_quality: ENUM('90p', '180p', '360p', '720p', '1080p'),
  audio_quality: ENUM('low', 'medium', 'high'),
  connection_quality: INTEGER,   -- Network quality score (1-5)
  total_speaking_time: INTEGER,  -- Seconds of audio activity
  camera_on_duration: INTEGER,   -- Seconds with video enabled
  is_spotlighted: BOOLEAN DEFAULT false,
  spotlight_duration: INTEGER DEFAULT 0,
  hand_raised_count: INTEGER DEFAULT 0,
  rep_count: INTEGER DEFAULT 0,
  session_engagement_score: DECIMAL(3,2) -- Calculated engagement metric
)
```

#### Exercise & Content Management
```sql
-- Exercise library
exercises (
  id: UUID PRIMARY KEY,
  name: TEXT,
  description: TEXT,
  difficulty_level: ENUM('beginner', 'intermediate', 'advanced'),
  category: TEXT,
  demo_video_url: TEXT,
  instructions: JSONB,
  benefits: TEXT
)

-- Class exercises (real-time)
class_exercises (
  id: UUID PRIMARY KEY,
  class_id: UUID REFERENCES classes(id),
  exercise_id: UUID REFERENCES exercises(id),
  target_audience: ENUM('all', 'beginner', 'intermediate', 'advanced'),
  started_at: TIMESTAMP,
  duration: INTEGER,
  is_active: BOOLEAN DEFAULT true
)
```

#### Progress Tracking
```sql
-- Student progress
student_progress (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id),
  class_id: UUID REFERENCES classes(id),
  exercise_id: UUID REFERENCES exercises(id),
  rep_count: INTEGER,
  duration: INTEGER,
  form_score: DECIMAL(3,2),
  completed_at: TIMESTAMP
)
```

### Security & Compliance

#### Authentication & Authorization
- **Multi-factor Authentication**: Email + SMS verification
- **Role-based Access Control**: Coach, Student, Admin permissions
- **Session Management**: JWT tokens with refresh mechanism
- **API Security**: Rate limiting and request validation

#### Data Protection
- **GDPR Compliance**: Data export, deletion, and consent management
- **HIPAA Considerations**: Health data encryption and access controls
- **Video Privacy**: Encrypted streaming with secure token management
- **Audit Logging**: All user actions tracked for security analysis

---

## Feature Specifications

### Core Features (MVP)

#### 1. User Management System
- **Registration/Login**: Email-based authentication with verification
- **Profile Management**: Display name, fitness level, avatar, health notes
- **Role Assignment**: Coach vs Student permissions
- **Account Settings**: Password reset, notification preferences

#### 2. Class Management
- **Class Creation**: Schedule, invite students, set capacity
- **Live Session Control**: Start/stop, mode switching, group highlighting
- **Participant Management**: Mute/unmute, remove participants, assign levels
- **Session Recording**: Optional recording with participant consent

#### 3. Video Communication (Zoom Video SDK)
- **Real-time Video**: Zoom SDK v2.18.0+ with WebRTC for sub-500ms latency
- **Adaptive Quality**: Automatic resolution scaling (90p-1080p) based on bandwidth
- **Audio Controls**: Push-to-talk, AI-powered background noise suppression
- **Screen Sharing**: 1080p screen sharing for exercise demonstrations
- **Connection Quality**: Real-time network monitoring with quality indicators
- **Multi-device Support**: Seamless switching between desktop/mobile clients
- **Recording Integration**: Cloud recording with automatic transcription
- **Bandwidth Optimization**: Smart codec selection (VP8/VP9/H.264)

#### 4. Fitness-Specific Features
- **Group Management**: 3-tier fitness level system
- **Exercise Targeting**: Content visibility based on fitness level
- **Rep Counting**: Manual increment/decrement with targets
- **Progress Tracking**: Session history and improvement metrics

#### 5. Interactive Elements
- **Hand Raise**: Question/attention requests
- **Chat System**: Text communication during sessions
- **Reactions**: Quick feedback emoji system
- **Polls**: Quick fitness assessments

### Advanced Features (Phase 2)

#### 1. AI-Powered Form Analysis
- **Computer Vision**: Pose detection for form correction
- **Real-time Feedback**: Automated form alerts and suggestions
- **Progress Analytics**: AI-generated improvement recommendations
- **Injury Prevention**: Movement pattern analysis

#### 2. Gamification System
- **Achievement Badges**: Milestone rewards and recognition
- **Leaderboards**: Friendly competition within groups
- **Streak Tracking**: Consistency rewards
- **Challenge System**: Group and individual fitness challenges

#### 3. Advanced Analytics
- **Coach Dashboard**: Detailed class and student analytics
- **Progress Reports**: Automated student progress summaries
- **Engagement Metrics**: Participation and retention analysis
- **Performance Insights**: Data-driven coaching recommendations

#### 4. Mobile Application
- **Native iOS/Android**: React Native implementation
- **Offline Mode**: Download exercises for offline viewing
- **Push Notifications**: Class reminders and updates
- **Wearable Integration**: Heart rate and fitness tracker data

---

## UI/UX Requirements

### Design System

#### Color Palette
- **Primary Green**: #00ff88 (Fitness energy, success states)
- **Primary Orange**: #ff6b35 (Attention, active states)
- **Background Dark**: #0a0a0a (Main background)
- **Surface Gray**: #1a1a1a (Card backgrounds)
- **Text Colors**: White primary, Gray secondary

#### Typography
- **Base Font Size**: 16px for optimal readability
- **Font Weights**: Normal (400) for body, Medium (500) for headings
- **Responsive Scaling**: 14px mobile, 16px desktop base

#### Layout Principles
- **Mobile-First**: Vertical stacking optimized for mobile screens
- **Responsive Grid**: Flexbox and CSS Grid for adaptive layouts
- **Touch-Friendly**: Minimum 44px touch targets
- **Accessibility**: WCAG 2.1 AA compliance

### Component Specifications

#### Video Tiles
- **Aspect Ratio**: 4:3 for consistent video proportions
- **Sizing**: Small (80px), Medium (200px), Large (400px+)
- **Overlay Elements**: Name, level badge, status indicators
- **Interaction States**: Hover, selected, muted, spotlight

#### Control Interfaces
- **Bottom Toolbar**: Primary controls always visible
- **Side Panel**: Secondary features with collapse/expand
- **Modal Dialogs**: Settings, user management overlays
- **Context Menus**: Right-click participant options

#### Responsive Behavior
- **Mobile Layout**: Vertical stacking with prominent coach view
- **Tablet Layout**: Split view with sidebar collapse
- **Desktop Layout**: Multi-column grid with full features
- **Large Screens**: Maximum content width with centered layout

### Accessibility Requirements
- **Keyboard Navigation**: Full app navigation without mouse
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Alternative color scheme option
- **Motion Reduction**: Respect prefers-reduced-motion setting
- **Font Scaling**: Support for user font size preferences

---

## Implementation Roadmap

### Phase 1: Core Platform (3 months)
**Milestone: MVP Launch**

#### Month 1: Foundation
- [ ] Project setup and development environment
- [ ] Authentication system with Supabase
- [ ] Basic user management (registration, profiles)
- [ ] Zoom Video SDK integration
- [ ] Core UI components and design system

#### Month 2: Class Management
- [ ] Class creation and scheduling
- [ ] Student invitation and enrollment
- [ ] Live session controls (start/stop/modes)
- [ ] Basic video grid and participant management
- [ ] Fitness level assignment system

#### Month 3: Fitness Features
- [ ] Group highlighting and targeting
- [ ] Exercise content management
- [ ] Rep counting and progress tracking
- [ ] Interactive features (hand raise, chat)
- [ ] Mobile responsive optimization

### Phase 2: Advanced Features (2 months)
**Milestone: Production Ready**

#### Month 4: Polish & Analytics
- [ ] Coach analytics dashboard
- [ ] Student progress reports
- [ ] Performance optimizations
- [ ] Advanced group management tools
- [ ] Comprehensive testing suite

#### Month 5: Launch Preparation
- [ ] Production deployment pipeline
- [ ] User acceptance testing
- [ ] Documentation and training materials
- [ ] Marketing website and onboarding
- [ ] Beta user program

### Phase 3: Scale & Enhance (Ongoing)
**Milestone: Market Expansion**

#### Months 6-12: Growth Features
- [ ] AI form analysis integration
- [ ] Mobile native applications
- [ ] Gamification system
- [ ] Advanced analytics and reporting
- [ ] Enterprise features and integrations

---

## Success Metrics

### User Engagement
- **Daily Active Users**: Target 1,000+ within 6 months
- **Session Duration**: Average 45+ minutes per fitness class
- **Retention Rate**: 80% monthly retention for students
- **Class Completion**: 85% of students complete full sessions

### Platform Performance
- **Video Quality**: 95% of sessions maintain HD quality
- **Connection Reliability**: <2% session drops due to technical issues
- **Load Time**: <3 seconds initial app load
- **Mobile Performance**: 60fps video on mobile devices

### Business Metrics
- **Revenue Growth**: $100K ARR within 12 months
- **Customer Acquisition**: 500 paying coaches in first year
- **Average Revenue Per User**: $50/month for coach subscriptions
- **Support Tickets**: <5% of sessions require technical support

### Feature Adoption
- **Group Management**: 90% of coaches use fitness level grouping
- **Exercise Targeting**: 75% of classes use targeted content delivery
- **Interactive Features**: 60% of students use hand raise/chat features
- **Progress Tracking**: 80% of students engage with rep counting

---

## Risk Assessment

### Technical Risks

#### High Impact, High Probability
1. **Video SDK Reliability**: Zoom SDK limitations or outages
   - *Mitigation*: Zoom SDK redundancy across multiple data centers, WebRTC fallback
   - *Contingency*: Agora.io or AWS Chime SDK as alternatives
   - *Monitoring*: Real-time SDK health monitoring with automatic failover

2. **Scalability Bottlenecks**: Database performance under load
   - *Mitigation*: Supabase performance monitoring, query optimization
   - *Contingency*: Database sharding, read replicas

#### Medium Impact, Medium Probability
3. **Mobile Performance**: React web app performance on mobile
   - *Mitigation*: Progressive Web App optimization, native app roadmap
   - *Contingency*: React Native implementation acceleration

4. **Real-time Synchronization**: State conflicts in live sessions
   - *Mitigation*: Conflict resolution algorithms, pessimistic locking
   - *Contingency*: Session state rebuild mechanisms

### Business Risks

#### High Impact, Low Probability
1. **Competitive Displacement**: Major player enters market
   - *Mitigation*: Strong feature differentiation, user loyalty programs
   - *Contingency*: Pivot to B2B or niche market segments

2. **Regulatory Changes**: Data privacy law modifications
   - *Mitigation*: Privacy-by-design architecture, legal consultation
   - *Contingency*: Rapid compliance feature development

#### Medium Impact, Medium Probability
3. **User Acquisition Challenges**: Difficulty reaching target audience
   - *Mitigation*: Multi-channel marketing, influencer partnerships
   - *Contingency*: B2B2C partnerships with gym chains

4. **Feature Complexity**: User confusion with advanced features
   - *Mitigation*: Progressive disclosure, comprehensive onboarding
   - *Contingency*: Simplified "lite" mode for basic users

### Operational Risks

1. **Team Scaling**: Hiring qualified developers quickly
   - *Mitigation*: Remote-first hiring, competitive compensation
   - *Contingency*: Outsourcing partnerships, phased feature delivery

2. **Infrastructure Costs**: AWS/Supabase costs scaling faster than revenue
   - *Mitigation*: Usage monitoring, cost optimization strategies
   - *Contingency*: Pricing model adjustments, premium tiers

---

## Appendices

### A. Technology Stack Details
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Zoom Video SDK v2.18.0+
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Infrastructure**: AWS Amplify, S3, CloudFront, Route 53
- **Development**: Vite, ESLint, Prettier, Jest, Cypress, Zoom SDK Testing Tools
- **Monitoring**: Sentry, AWS CloudWatch, Supabase Analytics, Zoom Webhook Analytics

### B. Zoom Video SDK Integration Specifications

#### Authentication Flow
```javascript
// JWT Generation for Zoom SDK
const generateZoomJWT = (sessionName: string, userRole: string) => {
  const payload = {
    app_key: process.env.ZOOM_SDK_KEY,
    tpc: sessionName,
    version: 1,
    user_identity: `${userRole}_${userId}`,
    session_key: generateSessionKey(),
    role_type: userRole === 'coach' ? 1 : 0, // 1 = host, 0 = participant
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2) // 2 hours
  }
  return jwt.sign(payload, process.env.ZOOM_SDK_SECRET, { algorithm: 'HS256' })
}
```

#### Video Quality Management
```javascript
// Adaptive quality based on participant count and network
const optimizeVideoQuality = (participantCount: number, networkQuality: number) => {
  if (participantCount > 25 || networkQuality < 3) {
    return {
      resolution: '360p',
      frameRate: 15,
      bitrate: 500
    }
  } else if (participantCount > 10) {
    return {
      resolution: '720p', 
      frameRate: 24,
      bitrate: 1000
    }
  } else {
    return {
      resolution: '1080p',
      frameRate: 30,
      bitrate: 2500
    }
  }
}
```

#### Fitness Platform Event Mapping
```javascript
// Map Zoom SDK events to fitness platform actions
const eventMappings = {
  'peer-video-state-change': handleVideoToggle,
  'peer-audio-state-change': handleAudioToggle, 
  'user-added': handleParticipantJoin,
  'user-removed': handleParticipantLeave,
  'active-speaker': handleActiveSpeaker,
  'connection-change': handleConnectionQuality,
  // Custom fitness events
  'rep-count-update': handleRepCountChange,
  'hand-raise': handleHandRaise,
  'form-alert': handleFormAlert,
  'group-assignment': handleGroupAssignment
}
```

#### Performance Optimization
```javascript
// Zoom SDK performance configuration for fitness platform
const zoomConfig = {
  // Optimize for fitness class scenarios
  videoOptimization: {
    enableHardwareAcceleration: true,
    preferH264: true, // Better for fitness content
    adaptiveBitrate: true,
    maxConcurrentVideoStreams: 25 // Performance limit
  },
  
  // Audio optimization for fitness instruction
  audioOptimization: {
    enableAudioProcessing: true,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    musicMode: false // Optimize for speech
  },
  
  // Network resilience
  networkOptimization: {
    enableAdaptiveStreaming: true,
    lowBandwidthMode: true,
    connectionTimeout: 30000,
    reconnectAttempts: 5
  }
}
```

### C. API Integration Specifications

#### Zoom Video SDK Integration
```javascript
// Complete Zoom SDK integration architecture
class ZoomFitnessPlatformIntegration {
  // Session lifecycle management
  async createSession(classData: ClassSession): Promise<ZoomSession>
  async joinSession(sessionName: string, userToken: string): Promise<void>
  async leaveSession(): Promise<void>
  async endSession(): Promise<void>
  
  // Participant management
  async promoteToHost(participantId: string): Promise<void>
  async demoteFromHost(participantId: string): Promise<void>
  async muteParticipant(participantId: string): Promise<void>
  async removeParticipant(participantId: string): Promise<void>
  
  // Video management
  async spotlightParticipant(participantId: string): Promise<void>
  async setVideoQuality(quality: VideoQuality): Promise<void>
  async enableScreenShare(): Promise<void>
  async disableScreenShare(): Promise<void>
  
  // Fitness-specific features
  async highlightFitnessGroup(level: FitnessLevel): Promise<void>
  async sendRepCountUpdate(participantId: string, count: number): Promise<void>
  async triggerFormAlert(participantId: string, alertType: string): Promise<void>
  async assignExerciseVariation(participantId: string, variation: string): Promise<void>
}
```

#### Webhook Integration for Real-time Updates
```javascript
// Zoom webhook handlers for fitness platform events
const webhookHandlers = {
  // Session events
  'meeting.started': async (payload) => {
    await updateClassStatus(payload.object.id, 'live')
    await notifyParticipants(payload.object.id, 'session_started')
  },
  
  'meeting.ended': async (payload) => {
    await updateClassStatus(payload.object.id, 'completed')
    await generateSessionReport(payload.object.id)
  },
  
  // Participant events  
  'meeting.participant_joined': async (payload) => {
    await trackParticipantJoin(payload.object.participant)
    await assignFitnessLevel(payload.object.participant.id)
  },
  
  'meeting.participant_left': async (payload) => {
    await trackParticipantLeave(payload.object.participant)
    await updateEngagementMetrics(payload.object.participant.id)
  },
  
  // Quality monitoring
  'meeting.connection_quality': async (payload) => {
    await updateConnectionQuality(payload.object.participant.id, payload.object.quality)
    await optimizeVideoSettings(payload.object.participant.id)
  }
}
```

#### Supabase Integration
- **Row Level Security**: Fitness level and role-based data access
- **Real-time Subscriptions**: Live session updates, participant changes
- **Edge Functions**: Zoom JWT generation, webhook processing
- **Database Triggers**: Automatic analytics and progress tracking

#### External APIs
- **Unsplash API**: Exercise image search with fitness-specific keywords
- **AWS S3**: Presigned URLs for secure exercise video uploads
- **CloudFront**: Global CDN for exercise content delivery

### C. Database Schema
*[Detailed SQL schema definitions would be included here]*

### D. Component Architecture
*[React component hierarchy and prop flow diagrams would be included here]*

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: January 2024  
**Owner**: Product Team  
**Contributors**: Engineering, Design, Business Teams