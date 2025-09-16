# FWP-in-Class Technical Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client (Browser)"
        UI[React UI Components]
        Hook[useVideoFitnessPlatform Hook]
        Service[Video Service Layer]
        SDK[Agora/Zoom SDK]
    end

    subgraph "Infrastructure"
        TokenServer[Token Server<br/>Node.js/Express]
        Amplify[AWS Amplify<br/>Hosting & CI/CD]
        CDN[AWS CloudFront<br/>Content Delivery]
    end

    subgraph "External Services"
        AgoraCloud[Agora RTC Cloud]
        ZoomCloud[Zoom Video SDK Cloud]
    end

    UI --> Hook
    Hook --> Service
    Service --> SDK
    SDK --> AgoraCloud
    SDK --> ZoomCloud
    Service --> TokenServer
    Amplify --> CDN
    CDN --> UI
```

## Video Service Architecture

```mermaid
graph TB
    subgraph "Abstraction Layer"
        IVideoService[IVideoService Interface]
    end

    subgraph "Implementation Layer"
        AgoraService[AgoraVideoService]
        ZoomService[ZoomVideoService]
    end

    subgraph "SDK Layer"
        AgoraSDK[AgoraSDKService]
        ZoomSDK[ZoomSDKService]
    end

    subgraph "External SDKs"
        AgoraRTC[Agora RTC SDK]
        ZoomVideoSDK[Zoom Video SDK]
    end

    IVideoService --> AgoraService
    IVideoService --> ZoomService
    AgoraService --> AgoraSDK
    ZoomService --> ZoomSDK
    AgoraSDK --> AgoraRTC
    ZoomSDK --> ZoomVideoSDK

    Provider[videoServiceProvider] --> IVideoService
    Hook[useVideoFitnessPlatform] --> Provider
```

## Event-Driven State Management

```mermaid
sequenceDiagram
    participant SDK as WebRTC SDK
    participant Service as Video Service
    participant Hook as React Hook
    participant UI as React Components

    SDK->>Service: user-joined event
    Service->>Service: Update participant state
    Service->>Hook: onParticipantJoined callback
    Hook->>Hook: getParticipants() sync
    Hook->>UI: State update triggers re-render
    UI->>UI: Display updated participant list

    Note over SDK,UI: Event-driven architecture ensures<br/>consistent state across all clients
```

## Session Flow Architecture

```mermaid
flowchart TD
    Start([User Opens App]) --> Role{Select Role}

    Role -->|Coach| CoachFlow[Coach Session Creation]
    Role -->|Student| StudentFlow[Student Session Join]

    CoachFlow --> CreateSession[Generate Session ID]
    CreateSession --> RequestToken[Request RTC Token]
    RequestToken --> JoinChannel[Join Video Channel]

    StudentFlow --> EnterSession[Enter Session ID]
    EnterSession --> RequestToken

    JoinChannel --> VideoStream[Start Video Stream]
    VideoStream --> ParticipantSync[Participant State Sync]
    ParticipantSync --> ActiveSession[Active Video Session]

    ActiveSession --> Controls[Video/Audio Controls]
    Controls --> TeachMode{Coach Mode?}

    TeachMode -->|Yes| CoachFeatures[Exercise Selection<br/>Student Grouping<br/>Spotlight Control]
    TeachMode -->|No| StudentFeatures[Follow Along<br/>Hand Raising]

    CoachFeatures --> ActiveSession
    StudentFeatures --> ActiveSession

    ActiveSession --> Leave[Leave Session]
    Leave --> Cleanup[Resource Cleanup]
    Cleanup --> End([Session Ended])
```

## Component Hierarchy

```mermaid
graph TB
    App[App.tsx] --> Role[RoleSelection.tsx]
    App --> Coach[CoachView.tsx]
    App --> Student[StudentView.tsx]

    Coach --> TeachMode[TeachModeView.tsx]
    Coach --> Exercise[ExerciseTargetSelector.tsx]
    Coach --> Groups[StudentLevelGroups.tsx]

    Coach --> SharedComponents
    Student --> SharedComponents

    subgraph SharedComponents[Shared Components]
        TopBar[TopBar.tsx]
        VideoTile[UnifiedVideoTile.tsx]
        ControlBar[ControlBar.tsx]
        SessionManager[SessionManager.tsx]
    end

    VideoTile --> AgoraTile[AgoraVideoTile.tsx]
    VideoTile --> ParticipantTile[ParticipantTile.tsx]
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "External Events"
        WebRTC[WebRTC SDK Events]
        UserInput[User Actions]
    end

    subgraph "Service Layer"
        VideoService[Video Service]
        TokenService[Token Service]
    end

    subgraph "State Management"
        Hook[useVideoFitnessPlatform]
        Context[FitnessPlatformContext]
    end

    subgraph "UI Layer"
        Components[React Components]
        State[Component State]
    end

    WebRTC --> VideoService
    UserInput --> VideoService
    VideoService --> TokenService
    VideoService --> Hook
    Hook --> Context
    Context --> Components
    Components --> State
    State --> Components
    Components --> UserInput
```

## Network Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        Coach[Coach Browser]
        Student1[Student Browser 1]
        Student2[Student Browser 2]
        StudentN[Student Browser N]
    end

    subgraph "Infrastructure Layer"
        Amplify[AWS Amplify<br/>Static Hosting]
        TokenServer[Token Server<br/>Authentication]
        CDN[CloudFront CDN<br/>Global Distribution]
    end

    subgraph "Video Infrastructure"
        AgoraSFU[Agora SFU Servers<br/>Media Processing]
        ZoomServers[Zoom Cloud Infrastructure]
    end

    Coach --> Amplify
    Student1 --> Amplify
    Student2 --> Amplify
    StudentN --> Amplify

    Amplify --> CDN
    Coach --> TokenServer
    Student1 --> TokenServer
    Student2 --> TokenServer
    StudentN --> TokenServer

    Coach --> AgoraSFU
    Student1 --> AgoraSFU
    Student2 --> AgoraSFU
    StudentN --> AgoraSFU

    Coach -.-> ZoomServers
    Student1 -.-> ZoomServers
    Student2 -.-> ZoomServers
    StudentN -.-> ZoomServers
```

## WebRTC Connection Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant TS as Token Server
    participant AS as Agora Service
    participant AC as Agora Cloud

    C->>TS: Request RTC Token
    Note over C,TS: POST /rtc-token<br/>channelName, uid, role
    TS->>TS: Generate token with app certificate
    TS->>C: Return JWT token

    C->>AS: Initialize with app ID & token
    AS->>AC: Connect to Agora cloud
    AC->>AS: Connection established

    C->>AS: Join channel with token
    AS->>AC: Join request with authentication
    AC->>AS: Channel joined successfully
    AS->>C: Joined callback with assigned UID

    Note over C,AC: Video/Audio streams flow<br/>through Agora SFU infrastructure
```

## Error Handling Flow

```mermaid
flowchart TD
    Start[User Action] --> Execute[Execute Operation]
    Execute --> Check{Success?}

    Check -->|Yes| Success[Update UI State]
    Check -->|No| Error[Catch Error]

    Error --> ServiceError{Service Level Error?}
    ServiceError -->|Yes| ServiceHandle[Service Error Handling]
    ServiceError -->|No| SDKError[SDK Error Handling]

    ServiceHandle --> Retry{Retryable?}
    SDKError --> Retry

    Retry -->|Yes| Delay[Wait & Retry]
    Retry -->|No| UserError[Show User Error]

    Delay --> Execute
    UserError --> Fallback{Fallback Available?}

    Fallback -->|Yes| SwitchService[Switch to Fallback Service]
    Fallback -->|No| GracefulFail[Graceful Degradation]

    SwitchService --> Execute
    GracefulFail --> End[End with Error State]
    Success --> End[End Successfully]
```

## Performance Optimization Flow

```mermaid
flowchart TB
    Monitor[Performance Monitoring] --> Detect{Issue Detected?}

    Detect -->|No| Continue[Continue Monitoring]
    Detect -->|Yes| Analyze[Analyze Issue Type]

    Analyze --> Network{Network Issue?}
    Analyze --> CPU{CPU Issue?}
    Analyze --> Memory{Memory Issue?}

    Network --> ReduceQuality[Reduce Video Quality<br/>Lower Bitrate/FPS]
    CPU --> OptimizeRendering[Optimize Video Rendering<br/>Reduce Participants Shown]
    Memory --> Cleanup[Cleanup Resources<br/>Remove Unused Tracks]

    ReduceQuality --> Test[Test Performance]
    OptimizeRendering --> Test
    Cleanup --> Test

    Test --> Improved{Performance Improved?}
    Improved -->|Yes| Continue
    Improved -->|No| Escalate[Escalate to Fallback Service]

    Escalate --> Continue
    Continue --> Monitor
```

## Development vs Production Flow

```mermaid
graph TB
    subgraph "Development Environment"
        DevBuild[npm run dev]
        LocalServer[Local Vite Server<br/>Port 3000]
        TestToken[Test Token Server<br/>Port 3001]
        DevSDK[SDK Development Mode<br/>Null Tokens Allowed]
    end

    subgraph "Production Environment"
        ProdBuild[npm run build]
        AmplifyDeploy[AWS Amplify Deployment]
        ProdDomain[Production Domain]
        ProdToken[Production Token Server]
        ProdSDK[SDK Production Mode<br/>Valid Tokens Required]
    end

    subgraph "CI/CD Pipeline"
        GitPush[Git Push to Master] --> AmplifyTrigger[Amplify Build Trigger]
        AmplifyTrigger --> BuildProcess[Build & Deploy Process]
        BuildProcess --> ProdDomain
    end

    DevBuild --> LocalServer
    LocalServer --> TestToken
    TestToken --> DevSDK

    GitPush --> ProdBuild
    ProdBuild --> AmplifyDeploy
    AmplifyDeploy --> ProdDomain
    ProdDomain --> ProdToken
    ProdToken --> ProdSDK
```

---

*These technical diagrams provide visual representation of the FWP-in-Class architecture. For detailed implementation, refer to ARCHITECTURE.md and the source code.*