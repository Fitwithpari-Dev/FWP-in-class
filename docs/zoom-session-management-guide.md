# Complete Zoom Video SDK Session Management Guide for Fitness Platform

## Table of Contents
1. [Session Creation Process](#1-session-creation-process)
2. [User Management](#2-user-management)
3. [Token Generation](#3-token-generation)
4. [Session Lifecycle](#4-session-lifecycle)
5. [Fitness Class Specific Features](#5-fitness-class-specific-features)
6. [Real-world Implementation Steps](#6-real-world-implementation-steps)

---

## 1. Session Creation Process

### How to Programmatically Create Sessions

Sessions in Zoom Video SDK are created through a combination of backend session management and frontend SDK initialization:

```typescript
// Backend: Create session record in database
async function createFitnessSession({
  title,
  coachId,
  scheduledTime,
  duration,
  maxParticipants = 50
}) {
  // Generate unique session name using timestamp and UUID
  const sessionName = `fitness_${Date.now()}_${generateUUID()}`;

  // Store in database
  const session = await supabase
    .from('class_sessions')
    .insert({
      title,
      coach_id: coachId,
      scheduled_start_time: scheduledTime,
      scheduled_duration: duration,
      max_participants: maxParticipants,
      zoom_meeting_id: sessionName,
      status: 'scheduled'
    })
    .select()
    .single();

  return session;
}
```

### Session Naming Conventions and Best Practices

```typescript
// Recommended naming patterns for fitness platform
const SESSION_NAMING = {
  // Pattern: [type]_[timestamp]_[uniqueId]
  liveClass: (classType: string) =>
    `live_${classType}_${Date.now()}_${generateShortId()}`,

  // Include coach identifier for tracking
  coachSession: (coachId: string, classType: string) =>
    `coach_${coachId}_${classType}_${Date.now()}`,

  // Group sessions with level indicator
  groupSession: (level: string, capacity: number) =>
    `group_${level}_${capacity}p_${Date.now()}`,

  // Private training sessions
  privateSession: (coachId: string, studentId: string) =>
    `private_${coachId}_${studentId}_${Date.now()}`
};

// Session name validator
function validateSessionName(name: string): boolean {
  // Must be 1-200 characters, alphanumeric with underscores/hyphens
  const pattern = /^[a-zA-Z0-9_-]{1,200}$/;
  return pattern.test(name);
}
```

### Role Assignments (Host vs Participants)

```typescript
// Role types in Zoom Video SDK
enum ZoomRole {
  PARTICIPANT = 0,  // Regular participant (students)
  HOST = 1         // Session host (coach/instructor)
}

// Role assignment logic
function determineUserRole(userId: string, session: Session): ZoomRole {
  // Coach is always host
  if (session.coach_id === userId) {
    return ZoomRole.HOST;
  }

  // Assistant coaches can be co-hosts
  if (session.assistant_coaches?.includes(userId)) {
    return ZoomRole.HOST;
  }

  // All others are participants
  return ZoomRole.PARTICIPANT;
}
```

### Session Parameters and Configuration Options

```typescript
interface FitnessSessionConfig {
  // Core settings
  sessionName: string;
  password?: string;  // Optional session password

  // Video settings optimized for fitness
  videoConfig: {
    defaultVideoQuality: '720p' | '480p' | '360p';
    maxVideosOnScreen: number;  // Recommend 25 for 50+ participants
    videoAspectRatio: '16:9' | '4:3';
    mirrorMyVideo: boolean;  // Important for fitness instruction
  };

  // Audio settings
  audioConfig: {
    echoCancellation: boolean;  // Always true for fitness
    noiseSuppression: boolean;  // Always true
    autoGainControl: boolean;
    stereoAudio: boolean;  // For music playback
  };

  // Performance optimizations
  performance: {
    enableHardwareAcceleration: boolean;
    maxRenderingParticipants: number;  // Limit to 25-30 for 50+ sessions
    videoReceiveBandwidth: 'high' | 'medium' | 'low';
    enableSimulcast: boolean;  // Critical for large sessions
  };

  // Features
  features: {
    chat: boolean;
    recording: boolean;
    virtualBackground: boolean;  // Usually disabled for performance
    shareScreen: boolean;
    spotlight: boolean;  // Coach spotlight feature
    galleryView: boolean;
    speakerView: boolean;
  };
}

// Default configuration for fitness classes
const DEFAULT_FITNESS_CONFIG: FitnessSessionConfig = {
  sessionName: '',
  videoConfig: {
    defaultVideoQuality: '480p',  // Balance quality and performance
    maxVideosOnScreen: 25,
    videoAspectRatio: '16:9',
    mirrorMyVideo: true
  },
  audioConfig: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    stereoAudio: true
  },
  performance: {
    enableHardwareAcceleration: true,
    maxRenderingParticipants: 25,
    videoReceiveBandwidth: 'medium',
    enableSimulcast: true
  },
  features: {
    chat: true,
    recording: true,
    virtualBackground: false,
    shareScreen: true,
    spotlight: true,
    galleryView: true,
    speakerView: true
  }
};
```

---

## 2. User Management

### How to Add Users to Sessions Programmatically

```typescript
// Backend API: Add user to session
async function addUserToSession(
  sessionId: string,
  userId: string,
  userDetails: {
    name: string;
    email: string;
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  }
) {
  // Check session capacity
  const participantCount = await getSessionParticipantCount(sessionId);
  const session = await getSession(sessionId);

  if (participantCount >= session.max_participants) {
    throw new Error('Session is full');
  }

  // Add to database
  const participant = await supabase
    .from('session_participants')
    .insert({
      session_id: sessionId,
      user_id: userId,
      status: 'registered',
      fitness_level: userDetails.fitnessLevel,
      joined_at: null  // Will be set when they actually join
    })
    .select()
    .single();

  // Send invitation
  await sendSessionInvitation(userDetails.email, session, participant);

  return participant;
}

// Batch add for group registrations
async function batchAddUsersToSession(
  sessionId: string,
  userIds: string[]
) {
  const results = await Promise.allSettled(
    userIds.map(userId => addUserToSession(sessionId, userId))
  );

  return {
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
  };
}
```

### User Invitation Mechanisms

```typescript
// Email invitation system
async function sendSessionInvitation(
  email: string,
  session: Session,
  participant: Participant
) {
  // Generate unique join link
  const joinToken = generateJoinToken(participant.id, session.id);
  const joinUrl = `${process.env.APP_URL}/join/${session.id}?token=${joinToken}`;

  const emailContent = {
    to: email,
    subject: `You're invited to: ${session.title}`,
    html: `
      <h2>Fitness Class Invitation</h2>
      <p>You're registered for: <strong>${session.title}</strong></p>
      <p>Date: ${formatDate(session.scheduled_start_time)}</p>
      <p>Duration: ${session.scheduled_duration} minutes</p>
      <p>Coach: ${session.coach_name}</p>

      <a href="${joinUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background: #4F46E5;
        color: white;
        text-decoration: none;
        border-radius: 6px;
      ">Join Class</a>

      <p>Tips for best experience:</p>
      <ul>
        <li>Use Chrome, Firefox, or Safari browser</li>
        <li>Ensure stable internet connection</li>
        <li>Have your workout space ready</li>
        <li>Join 5 minutes early to test audio/video</li>
      </ul>
    `
  };

  await sendEmail(emailContent);
}

// In-app notification
async function sendInAppInvitation(userId: string, session: Session) {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'session_invitation',
      title: `Class Starting: ${session.title}`,
      message: `Your fitness class starts in 15 minutes`,
      action_url: `/session/${session.id}`,
      is_read: false
    });
}
```

### Role-Based Access Control

```typescript
// Permission matrix for fitness platform
const PERMISSIONS = {
  coach: {
    canStartSession: true,
    canEndSession: true,
    canMuteParticipants: true,
    canRemoveParticipants: true,
    canSpotlight: true,
    canRecord: true,
    canShareScreen: true,
    canSendBroadcastMessage: true,
    canViewAllParticipants: true,
    canManageBreakoutRooms: true
  },
  assistant: {
    canStartSession: false,
    canEndSession: false,
    canMuteParticipants: true,
    canRemoveParticipants: false,
    canSpotlight: true,
    canRecord: false,
    canShareScreen: true,
    canSendBroadcastMessage: true,
    canViewAllParticipants: true,
    canManageBreakoutRooms: false
  },
  participant: {
    canStartSession: false,
    canEndSession: false,
    canMuteParticipants: false,
    canRemoveParticipants: false,
    canSpotlight: false,
    canRecord: false,
    canShareScreen: false,
    canSendBroadcastMessage: false,
    canViewAllParticipants: true,
    canManageBreakoutRooms: false
  }
};

// Check permission
function hasPermission(
  userRole: string,
  action: keyof typeof PERMISSIONS.coach
): boolean {
  return PERMISSIONS[userRole]?.[action] || false;
}

// Apply permissions in SDK
async function applyUserPermissions(
  client: VideoClient,
  userRole: string
) {
  const permissions = PERMISSIONS[userRole];

  if (permissions.canMuteParticipants) {
    client.setCommandChannelPermission(true);
  }

  // Additional permission configurations...
}
```

### Authentication and Authorization Flow

```typescript
// Complete auth flow for Zoom Video SDK
class SessionAuthManager {
  // Step 1: Authenticate user with your platform
  async authenticateUser(credentials: {
    email: string;
    password: string;
  }): Promise<User> {
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) throw error;

    // Get user profile with role
    const profile = await this.getUserProfile(user.id);
    return { ...user, profile };
  }

  // Step 2: Verify session access
  async verifySessionAccess(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    // Check if user is registered for session
    const { data: participant } = await supabase
      .from('session_participants')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    if (!participant) {
      // Check if user is the coach
      const { data: session } = await supabase
        .from('class_sessions')
        .select('coach_id')
        .eq('id', sessionId)
        .single();

      return session?.coach_id === userId;
    }

    return participant.status === 'registered';
  }

  // Step 3: Generate session token
  async generateSessionToken(
    userId: string,
    sessionId: string
  ): Promise<string> {
    // Verify access first
    const hasAccess = await this.verifySessionAccess(userId, sessionId);
    if (!hasAccess) {
      throw new Error('Unauthorized access to session');
    }

    // Get session details
    const session = await this.getSession(sessionId);
    const role = this.determineUserRole(userId, session);

    // Generate token with proper claims
    const token = await generateZoomToken({
      sessionName: session.zoom_meeting_id,
      role: role,
      sessionKey: session.id,
      userIdentity: userId,
      sessionPasscode: session.zoom_passcode
    });

    return token;
  }

  // Step 4: Join session with token
  async joinSessionWithAuth(
    sessionId: string,
    token: string
  ): Promise<void> {
    const zoomService = new ZoomSDKService();

    // Parse token to get session info
    const sessionInfo = tokenService.getSessionInfoFromToken(token);

    if (!sessionInfo) {
      throw new Error('Invalid token');
    }

    // Join Zoom session
    await zoomService.joinSession(
      sessionInfo.sessionName,
      token,
      sessionInfo.userIdentity,
      sessionInfo.role === 1
    );

    // Update participant status
    await this.updateParticipantStatus(
      sessionInfo.userIdentity,
      sessionId,
      'joined'
    );
  }
}
```

---

## 3. Token Generation

### JWT Token Structure for Sessions

```typescript
// Zoom Video SDK JWT Payload Structure
interface ZoomJWTPayload {
  // Required fields
  app_key: string;        // Your SDK Key
  tpc: string;           // Topic/Session name
  role_type: 0 | 1;      // 0: Participant, 1: Host
  user_identity: string;  // Unique user identifier
  version: number;       // Always 1 for current SDK
  iat: number;          // Issued at (Unix timestamp)
  exp: number;          // Expiration (Unix timestamp)

  // Optional fields
  session_key?: string;  // Custom session identifier
  user_name?: string;    // Display name
  cloud_recording_option?: 0 | 1;  // Cloud recording permission
  cloud_recording_election?: 0 | 1;  // Auto-start recording
  audio_option?: boolean;  // Start with audio
  video_option?: boolean;  // Start with video
}

// Token generation with all parameters
function createZoomJWT(params: {
  sessionName: string;
  userId: string;
  userName: string;
  isHost: boolean;
  sessionKey?: string;
  duration?: number;  // Token validity in hours
}): string {
  const iat = Math.round(Date.now() / 1000) - 30;  // 30 seconds in past
  const exp = iat + (params.duration || 2) * 3600;  // Default 2 hours

  const payload: ZoomJWTPayload = {
    app_key: process.env.ZOOM_SDK_KEY!,
    tpc: params.sessionName,
    role_type: params.isHost ? 1 : 0,
    user_identity: params.userId,
    version: 1,
    iat,
    exp,
    session_key: params.sessionKey,
    user_name: params.userName,
    cloud_recording_option: params.isHost ? 1 : 0,
    audio_option: true,
    video_option: true
  };

  return jwt.sign(payload, process.env.ZOOM_SDK_SECRET!, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' }
  });
}
```

### Required Payload Parameters

```typescript
// Validation for required parameters
class TokenValidator {
  static validatePayload(payload: Partial<ZoomJWTPayload>): void {
    const required = ['app_key', 'tpc', 'role_type', 'user_identity', 'version', 'iat', 'exp'];
    const missing = required.filter(field => !payload[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate field constraints
    if (payload.role_type !== 0 && payload.role_type !== 1) {
      throw new Error('role_type must be 0 (participant) or 1 (host)');
    }

    if (payload.version !== 1) {
      throw new Error('version must be 1');
    }

    // Validate timestamps
    const now = Math.round(Date.now() / 1000);
    if (payload.exp! <= now) {
      throw new Error('Token expiration must be in the future');
    }

    if (payload.exp! - payload.iat! > 48 * 3600) {
      throw new Error('Token validity cannot exceed 48 hours');
    }

    // Validate session name format
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(payload.tpc!)) {
      throw new Error('Invalid session name format');
    }
  }
}
```

### Token Expiration and Refresh Strategies

```typescript
// Token lifecycle management
class TokenLifecycleManager {
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map();
  private refreshThreshold = 300; // Refresh 5 minutes before expiry

  // Generate token with automatic refresh scheduling
  async generateAndScheduleToken(
    sessionId: string,
    userId: string,
    params: any
  ): Promise<string> {
    const token = await this.generateToken(params);
    const expiresAt = this.getTokenExpiration(token);

    // Store token
    this.tokens.set(`${sessionId}_${userId}`, { token, expiresAt });

    // Schedule refresh
    this.scheduleTokenRefresh(sessionId, userId, params);

    return token;
  }

  // Check if token needs refresh
  needsRefresh(sessionId: string, userId: string): boolean {
    const key = `${sessionId}_${userId}`;
    const tokenData = this.tokens.get(key);

    if (!tokenData) return true;

    const now = Math.round(Date.now() / 1000);
    return (tokenData.expiresAt - now) < this.refreshThreshold;
  }

  // Refresh token proactively
  async refreshToken(
    sessionId: string,
    userId: string,
    params: any
  ): Promise<string> {
    // Generate new token
    const newToken = await this.generateToken({
      ...params,
      iat: Math.round(Date.now() / 1000) - 30,
      exp: Math.round(Date.now() / 1000) + 7200  // 2 hours
    });

    // Update stored token
    const expiresAt = this.getTokenExpiration(newToken);
    this.tokens.set(`${sessionId}_${userId}`, {
      token: newToken,
      expiresAt
    });

    // Reschedule next refresh
    this.scheduleTokenRefresh(sessionId, userId, params);

    return newToken;
  }

  // Schedule automatic refresh
  private scheduleTokenRefresh(
    sessionId: string,
    userId: string,
    params: any
  ): void {
    const key = `${sessionId}_${userId}`;
    const tokenData = this.tokens.get(key);

    if (!tokenData) return;

    const now = Math.round(Date.now() / 1000);
    const refreshIn = (tokenData.expiresAt - now - this.refreshThreshold) * 1000;

    if (refreshIn > 0) {
      setTimeout(async () => {
        try {
          await this.refreshToken(sessionId, userId, params);
          console.log(`Token refreshed for session ${sessionId}, user ${userId}`);
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }, refreshIn);
    }
  }

  // Extract expiration from JWT
  private getTokenExpiration(token: string): number {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp;
  }

  private async generateToken(params: any): Promise<string> {
    return createZoomJWT(params);
  }
}

// Usage in React component
const useTokenManagement = (sessionId: string, userId: string) => {
  const [token, setToken] = useState<string>('');
  const tokenManager = useRef(new TokenLifecycleManager());

  useEffect(() => {
    const initToken = async () => {
      const newToken = await tokenManager.current.generateAndScheduleToken(
        sessionId,
        userId,
        { /* params */ }
      );
      setToken(newToken);
    };

    initToken();

    // Check for refresh every minute
    const interval = setInterval(async () => {
      if (tokenManager.current.needsRefresh(sessionId, userId)) {
        const refreshed = await tokenManager.current.refreshToken(
          sessionId,
          userId,
          { /* params */ }
        );
        setToken(refreshed);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionId, userId]);

  return token;
};
```

### Security Best Practices

```typescript
// Security implementation for token generation
class SecureTokenService {
  // 1. Never expose SDK Secret on client
  private validateEnvironment(): void {
    if (typeof window !== 'undefined' && process.env.ZOOM_SDK_SECRET) {
      throw new Error('SDK Secret detected in client environment!');
    }
  }

  // 2. Implement rate limiting
  private rateLimiter = new Map<string, number[]>();

  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(userId) || [];

    // Remove requests older than 1 minute
    const recentRequests = userRequests.filter(time => now - time < 60000);

    if (recentRequests.length >= 10) {
      throw new Error('Rate limit exceeded. Max 10 tokens per minute.');
    }

    recentRequests.push(now);
    this.rateLimiter.set(userId, recentRequests);
  }

  // 3. Validate user permissions before token generation
  async validateUserPermissions(
    userId: string,
    sessionId: string
  ): Promise<void> {
    const hasAccess = await this.checkSessionAccess(userId, sessionId);
    if (!hasAccess) {
      throw new Error('User does not have access to this session');
    }
  }

  // 4. Implement token encryption for storage
  encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
      iv
    );

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // 5. Audit logging
  async logTokenGeneration(
    userId: string,
    sessionId: string,
    role: number
  ): Promise<void> {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'token_generated',
        resource_type: 'session',
        resource_id: sessionId,
        metadata: {
          role: role === 1 ? 'host' : 'participant',
          timestamp: new Date().toISOString(),
          ip_address: this.getClientIP()
        }
      });
  }

  // 6. Implement token revocation
  private revokedTokens = new Set<string>();

  revokeToken(token: string): void {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    this.revokedTokens.add(tokenHash);
  }

  isTokenRevoked(token: string): boolean {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    return this.revokedTokens.has(tokenHash);
  }

  // Complete secure token generation
  async generateSecureToken(
    userId: string,
    sessionId: string,
    userDetails: any
  ): Promise<string> {
    // Security checks
    this.validateEnvironment();
    this.checkRateLimit(userId);
    await this.validateUserPermissions(userId, sessionId);

    // Generate token on backend
    const response = await fetch('/api/zoom/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getUserAuthToken()}`
      },
      body: JSON.stringify({
        sessionId,
        userId,
        ...userDetails
      })
    });

    if (!response.ok) {
      throw new Error('Token generation failed');
    }

    const { token } = await response.json();

    // Log for audit
    await this.logTokenGeneration(userId, sessionId, userDetails.role);

    return token;
  }
}
```

---

## 4. Session Lifecycle

### Session State Management

```typescript
// Complete session state machine
class SessionStateMachine {
  private state: SessionState = 'idle';
  private listeners: Set<(state: SessionState) => void> = new Set();

  // State definitions
  readonly states = {
    idle: { canTransitionTo: ['initializing'] },
    initializing: { canTransitionTo: ['ready', 'error'] },
    ready: { canTransitionTo: ['connecting'] },
    connecting: { canTransitionTo: ['connected', 'error'] },
    connected: { canTransitionTo: ['active', 'reconnecting', 'error'] },
    active: { canTransitionTo: ['paused', 'ending', 'reconnecting', 'error'] },
    paused: { canTransitionTo: ['active', 'ending'] },
    reconnecting: { canTransitionTo: ['connected', 'error'] },
    ending: { canTransitionTo: ['ended'] },
    ended: { canTransitionTo: ['idle'] },
    error: { canTransitionTo: ['idle', 'reconnecting'] }
  };

  // Transition with validation
  transition(newState: SessionState): void {
    const currentStateConfig = this.states[this.state];

    if (!currentStateConfig.canTransitionTo.includes(newState)) {
      throw new Error(
        `Invalid transition from ${this.state} to ${newState}`
      );
    }

    console.log(`Session state: ${this.state} -> ${newState}`);
    this.state = newState;
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  getCurrentState(): SessionState {
    return this.state;
  }
}

// Session lifecycle manager
class SessionLifecycleManager {
  private stateMachine = new SessionStateMachine();
  private zoomService: ZoomSDKService;
  private sessionData: Session;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(zoomService: ZoomSDKService) {
    this.zoomService = zoomService;
    this.setupEventHandlers();
  }

  // Initialize session
  async initializeSession(sessionId: string): Promise<void> {
    try {
      this.stateMachine.transition('initializing');

      // Load session data
      this.sessionData = await this.loadSessionData(sessionId);

      // Initialize Zoom SDK
      await this.zoomService.initialize();

      this.stateMachine.transition('ready');
    } catch (error) {
      console.error('Session initialization failed:', error);
      this.stateMachine.transition('error');
      throw error;
    }
  }

  // Join session
  async joinSession(token: string, userName: string): Promise<void> {
    try {
      this.stateMachine.transition('connecting');

      await this.zoomService.joinSession(
        this.sessionData.zoom_meeting_id,
        token,
        userName,
        this.sessionData.coach_id === getCurrentUserId()
      );

      this.stateMachine.transition('connected');

      // Start session activities
      await this.startSessionActivities();

      this.stateMachine.transition('active');
    } catch (error) {
      console.error('Failed to join session:', error);
      this.handleConnectionError(error);
    }
  }

  // Handle disconnection
  private async handleDisconnection(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.stateMachine.transition('reconnecting');
      this.reconnectAttempts++;

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

      setTimeout(async () => {
        try {
          await this.reconnect();
          this.reconnectAttempts = 0;
          this.stateMachine.transition('connected');
        } catch (error) {
          this.handleDisconnection();
        }
      }, delay);
    } else {
      this.stateMachine.transition('error');
      this.notifyReconnectionFailed();
    }
  }

  // End session
  async endSession(): Promise<void> {
    try {
      this.stateMachine.transition('ending');

      // Save session data
      await this.saveSessionData();

      // Leave Zoom session
      await this.zoomService.leaveSession();

      // Cleanup
      await this.cleanup();

      this.stateMachine.transition('ended');
    } catch (error) {
      console.error('Error ending session:', error);
      // Force cleanup even on error
      await this.cleanup();
      this.stateMachine.transition('ended');
    }
  }

  // Pause session (coach only)
  async pauseSession(): Promise<void> {
    if (this.stateMachine.getCurrentState() !== 'active') {
      throw new Error('Can only pause active sessions');
    }

    this.stateMachine.transition('paused');

    // Notify participants
    await this.zoomService.sendChatMessage(
      'Session paused by instructor. Please stand by.'
    );
  }

  // Resume session
  async resumeSession(): Promise<void> {
    if (this.stateMachine.getCurrentState() !== 'paused') {
      throw new Error('Can only resume paused sessions');
    }

    this.stateMachine.transition('active');

    // Notify participants
    await this.zoomService.sendChatMessage('Session resumed. Let\'s continue!');
  }
}
```

### Starting/Ending Sessions

```typescript
// Complete session start flow
class SessionStartManager {
  async startFitnessClass(
    sessionId: string,
    coachId: string
  ): Promise<void> {
    // 1. Pre-flight checks
    await this.performPreflightChecks();

    // 2. Update database
    await this.updateSessionStatus(sessionId, 'live');

    // 3. Initialize Zoom session
    const session = await this.getSession(sessionId);
    const token = await this.generateHostToken(session, coachId);

    // 4. Join as host
    const zoomService = new ZoomSDKService();
    await zoomService.joinSession(
      session.zoom_meeting_id,
      token,
      session.coach_name,
      true // isHost
    );

    // 5. Configure session settings
    await this.configureSessionSettings(zoomService);

    // 6. Start recording if enabled
    if (session.is_recording) {
      await zoomService.startRecording();
    }

    // 7. Send notifications to participants
    await this.notifyParticipants(sessionId, 'Session starting now!');

    // 8. Initialize performance monitoring
    this.startPerformanceMonitoring(sessionId);
  }

  private async performPreflightChecks(): Promise<void> {
    // Check browser compatibility
    if (!this.isBrowserSupported()) {
      throw new Error('Browser not supported. Please use Chrome, Firefox, or Safari.');
    }

    // Check camera/microphone permissions
    const permissions = await this.checkMediaPermissions();
    if (!permissions.camera || !permissions.microphone) {
      throw new Error('Camera and microphone permissions required');
    }

    // Check network quality
    const networkQuality = await this.testNetworkQuality();
    if (networkQuality.bandwidth < 1000) { // 1 Mbps minimum
      console.warn('Low bandwidth detected. Video quality may be affected.');
    }
  }

  private async configureSessionSettings(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // Set video quality based on participant count
    const participants = await zoomService.getAllParticipants();
    const quality = participants.length > 30 ? '360p' : '720p';
    await zoomService.setVideoQuality(quality);

    // Configure audio settings
    await zoomService.configureAudio({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    });

    // Enable host controls
    await zoomService.enableHostControls();
  }

  // End session flow
  async endFitnessClass(
    sessionId: string,
    coachId: string
  ): Promise<void> {
    const zoomService = new ZoomSDKService();

    // 1. Stop recording if active
    if (await zoomService.isRecording()) {
      const recordingUrl = await zoomService.stopRecording();
      await this.saveRecordingUrl(sessionId, recordingUrl);
    }

    // 2. Collect session metrics
    const metrics = await this.collectSessionMetrics(sessionId);

    // 3. Save attendance
    const participants = zoomService.getAllParticipants();
    await this.saveAttendance(sessionId, participants);

    // 4. End Zoom session
    await zoomService.endSession();

    // 5. Update database
    await this.updateSessionStatus(sessionId, 'completed', {
      actual_end_time: new Date(),
      participant_count: participants.length,
      metrics
    });

    // 6. Send follow-up emails
    await this.sendPostSessionEmails(sessionId, participants);

    // 7. Cleanup resources
    await this.cleanupSessionResources(sessionId);
  }
}
```

### Handling Disconnections and Reconnections

```typescript
// Robust reconnection handling
class ReconnectionManager {
  private reconnectStrategy: ReconnectStrategy;
  private maxAttempts = 5;
  private baseDelay = 1000;

  async handleDisconnection(
    reason: string,
    zoomService: ZoomSDKService
  ): Promise<void> {
    console.log(`Disconnected: ${reason}`);

    // Determine strategy based on reason
    this.reconnectStrategy = this.determineStrategy(reason);

    // Show UI notification
    this.showReconnectingUI();

    // Attempt reconnection
    await this.attemptReconnection(zoomService);
  }

  private determineStrategy(reason: string): ReconnectStrategy {
    if (reason.includes('network')) {
      return 'aggressive'; // Quick retries for network issues
    } else if (reason.includes('kicked')) {
      return 'none'; // Don't reconnect if kicked
    } else {
      return 'standard'; // Default strategy
    }
  }

  private async attemptReconnection(
    zoomService: ZoomSDKService
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        console.log(`Reconnection attempt ${attempt}/${this.maxAttempts}`);

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        await this.wait(delay);

        // Check network before attempting
        if (!(await this.isNetworkAvailable())) {
          console.log('Network unavailable, waiting...');
          continue;
        }

        // Attempt to rejoin
        await zoomService.rejoinSession();

        console.log('Reconnection successful!');
        this.hideReconnectingUI();
        this.notifyReconnectionSuccess();
        return;

      } catch (error) {
        console.error(`Reconnection attempt ${attempt} failed:`, error);

        if (attempt === this.maxAttempts) {
          this.handleReconnectionFailure();
        }
      }
    }
  }

  private calculateDelay(attempt: number): number {
    if (this.reconnectStrategy === 'aggressive') {
      return Math.min(this.baseDelay * attempt, 5000);
    } else {
      return Math.min(this.baseDelay * Math.pow(2, attempt - 1), 30000);
    }
  }

  private async isNetworkAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private handleReconnectionFailure(): void {
    this.hideReconnectingUI();
    this.showReconnectionFailedUI();

    // Offer manual reconnection
    this.enableManualReconnectButton();

    // Save partial session data
    this.savePartialSessionData();
  }
}

// Connection quality monitoring
class ConnectionQualityMonitor {
  private metrics: ConnectionMetrics = {
    bandwidth: 0,
    latency: 0,
    packetLoss: 0,
    jitter: 0
  };

  startMonitoring(zoomService: ZoomSDKService): void {
    // Monitor connection quality every 5 seconds
    setInterval(async () => {
      const stats = await zoomService.getConnectionStats();

      this.metrics = {
        bandwidth: stats.availableBandwidth,
        latency: stats.roundTripTime,
        packetLoss: stats.packetLossRate,
        jitter: stats.jitter
      };

      this.evaluateQuality();
    }, 5000);
  }

  private evaluateQuality(): void {
    const quality = this.calculateQuality();

    if (quality === 'poor') {
      this.handlePoorConnection();
    } else if (quality === 'fair') {
      this.handleFairConnection();
    }
  }

  private calculateQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.metrics.bandwidth < 500 || this.metrics.packetLoss > 5) {
      return 'poor';
    } else if (this.metrics.bandwidth < 1000 || this.metrics.packetLoss > 2) {
      return 'fair';
    } else if (this.metrics.bandwidth < 2000 || this.metrics.packetLoss > 0.5) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  private handlePoorConnection(): void {
    // Automatically reduce video quality
    this.downgradeVideoQuality();

    // Notify user
    this.showConnectionWarning('Poor connection detected. Video quality reduced.');

    // Log for analytics
    this.logConnectionIssue('poor_quality');
  }
}
```

### Session Cleanup and Resource Management

```typescript
// Comprehensive cleanup manager
class SessionCleanupManager {
  async cleanupSession(
    sessionId: string,
    zoomService: ZoomSDKService
  ): Promise<void> {
    console.log(`Starting cleanup for session ${sessionId}`);

    try {
      // 1. Stop all media streams
      await this.stopMediaStreams(zoomService);

      // 2. Clear video canvases
      await this.clearVideoCanvases(zoomService);

      // 3. Disconnect from Zoom
      await this.disconnectFromZoom(zoomService);

      // 4. Save final session state
      await this.saveFinalState(sessionId);

      // 5. Clear local storage
      this.clearLocalStorage(sessionId);

      // 6. Release memory
      this.releaseMemory();

      // 7. Cancel pending operations
      this.cancelPendingOperations();

      console.log(`Cleanup completed for session ${sessionId}`);
    } catch (error) {
      console.error('Cleanup error:', error);
      // Force cleanup even on error
      this.forceCleanup();
    }
  }

  private async stopMediaStreams(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // Stop video
    if (await zoomService.isVideoOn()) {
      await zoomService.stopVideo();
    }

    // Stop audio
    if (await zoomService.isAudioOn()) {
      await zoomService.stopAudio();
    }

    // Stop screen share if active
    if (await zoomService.isScreenSharing()) {
      await zoomService.stopScreenShare();
    }

    // Release camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    stream.getTracks().forEach(track => track.stop());
  }

  private async clearVideoCanvases(
    zoomService: ZoomSDKService
  ): Promise<void> {
    const canvases = document.querySelectorAll('canvas.zoom-video');

    for (const canvas of canvases) {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d');
      if (ctx) {
        ctx.clearRect(
          0,
          0,
          (canvas as HTMLCanvasElement).width,
          (canvas as HTMLCanvasElement).height
        );
      }

      // Remove from DOM
      canvas.remove();
    }

    // Clear Zoom SDK canvas references
    await zoomService.clearAllCanvases();
  }

  private clearLocalStorage(sessionId: string): void {
    // Clear session-specific data
    const keysToRemove = [
      `session_${sessionId}_token`,
      `session_${sessionId}_state`,
      `session_${sessionId}_participants`,
      `session_${sessionId}_metrics`
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear session storage
    sessionStorage.clear();
  }

  private releaseMemory(): void {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Clear large objects
    this.clearCaches();

    // Remove event listeners
    this.removeAllEventListeners();
  }

  private forceCleanup(): void {
    // Emergency cleanup - ignore errors
    try {
      // Stop all media tracks
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {});

      // Clear all canvases
      document.querySelectorAll('canvas').forEach(canvas => canvas.remove());

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Reload page if critical
      if (this.isCriticalState()) {
        window.location.reload();
      }
    } catch {
      // Ignore all errors in force cleanup
    }
  }
}
```

---

## 5. Fitness Class Specific Features

### Optimizations for 50+ Participants

```typescript
// Performance optimization for large fitness classes
class LargeClassOptimizer {
  private readonly TIER_LIMITS = {
    tier1: { max: 10, quality: '720p', fps: 30 },  // Instructors
    tier2: { max: 15, quality: '480p', fps: 24 },  // Featured participants
    tier3: { max: 25, quality: '360p', fps: 15 },  // Active participants
    tier4: { max: 50, quality: '180p', fps: 10 }   // Observers
  };

  async optimizeForParticipantCount(
    zoomService: ZoomSDKService,
    participantCount: number
  ): Promise<void> {
    if (participantCount <= 20) {
      // Small class - high quality for everyone
      await this.applySmallClassSettings(zoomService);
    } else if (participantCount <= 50) {
      // Medium class - balanced settings
      await this.applyMediumClassSettings(zoomService);
    } else {
      // Large class - aggressive optimization
      await this.applyLargeClassSettings(zoomService);
    }
  }

  private async applyLargeClassSettings(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // 1. Implement video tiers
    const participants = await zoomService.getAllParticipants();

    // Tier 1: Coach always gets highest quality
    const coach = participants.find(p => p.isHost);
    if (coach) {
      await zoomService.setParticipantVideoQuality(
        coach.id,
        this.TIER_LIMITS.tier1
      );
    }

    // Tier 2: Featured participants (raised hand, spotlighted)
    const featured = participants.filter(p => p.hasRaisedHand || p.isSpotlighted);
    for (const participant of featured.slice(0, this.TIER_LIMITS.tier2.max)) {
      await zoomService.setParticipantVideoQuality(
        participant.id,
        this.TIER_LIMITS.tier2
      );
    }

    // Tier 3: Recently active participants
    const active = participants.filter(p => p.lastActivityTime > Date.now() - 300000);
    for (const participant of active.slice(0, this.TIER_LIMITS.tier3.max)) {
      await zoomService.setParticipantVideoQuality(
        participant.id,
        this.TIER_LIMITS.tier3
      );
    }

    // Tier 4: Everyone else gets minimal video
    const remaining = participants.filter(
      p => !featured.includes(p) && !active.includes(p) && !p.isHost
    );
    for (const participant of remaining) {
      await zoomService.setParticipantVideoQuality(
        participant.id,
        this.TIER_LIMITS.tier4
      );
    }

    // 2. Enable simulcast for adaptive streaming
    await zoomService.enableSimulcast();

    // 3. Implement pagination for video rendering
    await this.implementVideoPagination(zoomService, participants);

    // 4. Optimize audio
    await this.optimizeAudioForLargeClass(zoomService);
  }

  private async implementVideoPagination(
    zoomService: ZoomSDKService,
    participants: Participant[]
  ): Promise<void> {
    const VIDEOS_PER_PAGE = 25;
    let currentPage = 0;

    // Only render current page of videos
    const renderPage = async (page: number) => {
      const start = page * VIDEOS_PER_PAGE;
      const end = start + VIDEOS_PER_PAGE;
      const pageParticipants = participants.slice(start, end);

      // Clear previous page
      await zoomService.clearAllVideoRenders();

      // Render current page
      for (const participant of pageParticipants) {
        await zoomService.renderParticipantVideo(participant.id);
      }
    };

    // Initial render
    await renderPage(currentPage);

    // Setup pagination controls
    this.setupPaginationControls({
      totalPages: Math.ceil(participants.length / VIDEOS_PER_PAGE),
      currentPage,
      onPageChange: async (page) => {
        currentPage = page;
        await renderPage(page);
      }
    });
  }

  private async optimizeAudioForLargeClass(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // Mute all participants except coach
    await zoomService.muteAllParticipants(true);

    // Enable push-to-talk for participants
    await zoomService.enablePushToTalk();

    // Optimize audio processing
    await zoomService.setAudioProcessing({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      voiceIsolation: true
    });

    // Reduce audio bitrate for participants
    await zoomService.setAudioBitrate(32); // 32 kbps for participants
  }
}
```

### Video Quality Settings for Workouts

```typescript
// Fitness-specific video optimization
class FitnessVideoOptimizer {
  // Video presets for different workout types
  private readonly WORKOUT_PRESETS = {
    yoga: {
      resolution: '720p',
      fps: 24,
      bitrate: 1500,
      keyFrameInterval: 60,
      priority: 'clarity'  // Prioritize image clarity over motion
    },
    hiit: {
      resolution: '480p',
      fps: 30,
      bitrate: 2000,
      keyFrameInterval: 30,
      priority: 'motion'  // Prioritize smooth motion
    },
    dance: {
      resolution: '540p',
      fps: 30,
      bitrate: 2500,
      keyFrameInterval: 30,
      priority: 'balanced'
    },
    strength: {
      resolution: '720p',
      fps: 24,
      bitrate: 1800,
      keyFrameInterval: 45,
      priority: 'clarity'
    },
    cardio: {
      resolution: '480p',
      fps: 30,
      bitrate: 2200,
      keyFrameInterval: 30,
      priority: 'motion'
    }
  };

  async optimizeForWorkoutType(
    zoomService: ZoomSDKService,
    workoutType: keyof typeof this.WORKOUT_PRESETS
  ): Promise<void> {
    const preset = this.WORKOUT_PRESETS[workoutType];

    // Apply video settings
    await zoomService.setVideoConfig({
      resolution: preset.resolution,
      frameRate: preset.fps,
      bitrate: preset.bitrate,
      keyFrameInterval: preset.keyFrameInterval
    });

    // Configure encoder based on priority
    if (preset.priority === 'motion') {
      await this.optimizeForMotion(zoomService);
    } else if (preset.priority === 'clarity') {
      await this.optimizeForClarity(zoomService);
    } else {
      await this.balancedOptimization(zoomService);
    }
  }

  private async optimizeForMotion(
    zoomService: ZoomSDKService
  ): Promise<void> {
    await zoomService.setEncoderConfig({
      profile: 'baseline',  // Lower complexity for faster encoding
      level: '3.1',
      entropyMode: 'CAVLC',  // Faster than CABAC
      bFrames: 0,  // No B-frames for lower latency
      refFrames: 1,  // Fewer reference frames
      motionEstimation: 'hex',  // Fast motion estimation
      rateControl: 'CBR'  // Constant bitrate for predictable quality
    });
  }

  private async optimizeForClarity(
    zoomService: ZoomSDKService
  ): Promise<void> {
    await zoomService.setEncoderConfig({
      profile: 'high',  // Better compression
      level: '4.0',
      entropyMode: 'CABAC',  // Better compression
      bFrames: 2,  // Use B-frames for better quality
      refFrames: 3,  // More reference frames
      motionEstimation: 'umh',  // More accurate motion estimation
      rateControl: 'VBR'  // Variable bitrate for better quality
    });
  }

  // Dynamic quality adjustment based on movement detection
  async enableAdaptiveQuality(
    zoomService: ZoomSDKService
  ): Promise<void> {
    let lastMotionLevel = 0;

    setInterval(async () => {
      const motionLevel = await this.detectMotionLevel(zoomService);

      if (Math.abs(motionLevel - lastMotionLevel) > 20) {
        // Significant change in motion
        if (motionLevel > 70) {
          // High motion - prioritize framerate
          await zoomService.adjustVideoSettings({
            resolution: '480p',
            frameRate: 30
          });
        } else if (motionLevel < 30) {
          // Low motion - prioritize resolution
          await zoomService.adjustVideoSettings({
            resolution: '720p',
            frameRate: 24
          });
        }

        lastMotionLevel = motionLevel;
      }
    }, 5000);  // Check every 5 seconds
  }

  private async detectMotionLevel(
    zoomService: ZoomSDKService
  ): Promise<number> {
    // Analyze video frames for motion
    const stats = await zoomService.getVideoStats();

    // Calculate motion score (0-100)
    const motionScore =
      (stats.frameDropRate * 0.3) +
      (stats.encodingCpuUsage * 0.3) +
      (stats.bandwidthUsage * 0.4);

    return Math.min(100, Math.max(0, motionScore));
  }
}
```

### Audio Management for Fitness Classes

```typescript
// Advanced audio management for fitness instruction
class FitnessAudioManager {
  private musicStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;

  // Setup dual audio streams (voice + music)
  async setupInstructorAudio(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // 1. Get microphone stream with optimization
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,  // Manual control for instructor
        sampleRate: 48000,
        channelCount: 1
      }
    });

    // 2. Setup music streaming
    await this.setupMusicStreaming();

    // 3. Create mixed audio stream
    this.mixedStream = await this.createMixedAudioStream();

    // 4. Send to Zoom
    await zoomService.setCustomAudioStream(this.mixedStream);

    // 5. Setup audio controls
    this.setupAudioControls();
  }

  private async setupMusicStreaming(): Promise<void> {
    // Create audio context for music processing
    const audioContext = new AudioContext();

    // Load music source (could be file or streaming service)
    const musicSource = await this.loadMusicSource();

    // Apply audio processing for fitness
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.7;  // 70% volume for music

    // Connect audio graph
    musicSource.connect(compressor);
    compressor.connect(gainNode);

    // Convert to MediaStream
    const destination = audioContext.createMediaStreamDestination();
    gainNode.connect(destination);

    this.musicStream = destination.stream;
  }

  private async createMixedAudioStream(): Promise<MediaStream> {
    const audioContext = new AudioContext();

    // Create sources
    const micSource = audioContext.createMediaStreamSource(this.micStream!);
    const musicSource = audioContext.createMediaStreamSource(this.musicStream!);

    // Create gain controls
    const micGain = audioContext.createGain();
    const musicGain = audioContext.createGain();

    // Set initial levels
    micGain.gain.value = 1.0;   // Full volume for voice
    musicGain.gain.value = 0.3;  // 30% volume for music

    // Create merger
    const merger = audioContext.createChannelMerger(2);

    // Connect graph
    micSource.connect(micGain);
    musicSource.connect(musicGain);
    micGain.connect(merger, 0, 0);
    musicGain.connect(merger, 0, 1);

    // Create output
    const destination = audioContext.createMediaStreamDestination();
    merger.connect(destination);

    // Store gain nodes for control
    this.audioControls = { micGain, musicGain };

    return destination.stream;
  }

  // Dynamic audio ducking (lower music when speaking)
  async enableAutoDucking(): Promise<void> {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    // Connect mic to analyser
    const micSource = audioContext.createMediaStreamSource(this.micStream!);
    micSource.connect(analyser);

    // Monitor voice activity
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    setInterval(() => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate voice activity level
      const voiceLevel = dataArray.reduce((a, b) => a + b) / dataArray.length;

      if (voiceLevel > 30) {  // Voice detected
        // Duck music
        this.audioControls.musicGain.gain.exponentialRampToValueAtTime(
          0.15,
          audioContext.currentTime + 0.1
        );
      } else {
        // Restore music
        this.audioControls.musicGain.gain.exponentialRampToValueAtTime(
          0.3,
          audioContext.currentTime + 0.3
        );
      }
    }, 100);
  }

  // Participant audio management
  async manageParticipantAudio(
    zoomService: ZoomSDKService,
    participantId: string,
    action: 'mute' | 'unmute' | 'requestUnmute'
  ): Promise<void> {
    switch (action) {
      case 'mute':
        await zoomService.muteParticipant(participantId);
        break;

      case 'unmute':
        if (await this.canUnmuteParticipant(participantId)) {
          await zoomService.unmuteParticipant(participantId);
        }
        break;

      case 'requestUnmute':
        await zoomService.requestParticipantUnmute(participantId);
        break;
    }
  }

  // Smart mute management for classes
  async setupSmartMute(
    zoomService: ZoomSDKService
  ): Promise<void> {
    // Mute all on join
    zoomService.setEventHandlers({
      onUserJoin: async (userId) => {
        if (!await this.isInstructor(userId)) {
          await zoomService.muteParticipant(userId);
        }
      }
    });

    // Setup push-to-talk for Q&A
    this.setupPushToTalk(zoomService);

    // Auto-mute on high noise detection
    this.setupNoiseDetection(zoomService);
  }
}
```

### Recording and Playback Capabilities

```typescript
// Recording management for fitness classes
class FitnessRecordingManager {
  private recordingState: 'idle' | 'recording' | 'processing' = 'idle';
  private recordingStartTime: Date | null = null;
  private recordingChunks: Blob[] = [];

  // Start cloud recording with fitness-specific settings
  async startCloudRecording(
    zoomService: ZoomSDKService,
    sessionId: string
  ): Promise<void> {
    // Configure recording settings
    const recordingConfig = {
      recordVideo: true,
      recordAudio: true,
      recordChat: true,
      recordTranscript: false,  // Usually not needed for fitness
      videoQuality: 'HD',  // 720p for fitness instruction
      audioQuality: 'high',
      layout: 'speaker',  // Focus on instructor
      spotlightWithSharedScreen: true
    };

    // Start recording
    await zoomService.startCloudRecording(recordingConfig);

    this.recordingState = 'recording';
    this.recordingStartTime = new Date();

    // Update database
    await this.updateSessionRecordingStatus(sessionId, true);

    // Notify participants
    await zoomService.sendChatMessage(
      '🔴 This class is being recorded for future playback'
    );
  }

  // Local backup recording
  async startLocalBackupRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: 1920,
        height: 1080,
        frameRate: 30
      },
      audio: true
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 2500000  // 2.5 Mbps
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordingChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(this.recordingChunks, { type: 'video/webm' });
      await this.uploadBackupRecording(blob);
    };

    mediaRecorder.start(10000);  // Collect data every 10 seconds
  }

  // Stop and process recording
  async stopRecording(
    zoomService: ZoomSDKService,
    sessionId: string
  ): Promise<string> {
    this.recordingState = 'processing';

    // Stop cloud recording
    const recordingInfo = await zoomService.stopCloudRecording();

    // Update database
    await this.updateSessionRecordingStatus(sessionId, false, {
      recordingUrl: recordingInfo.playbackUrl,
      recordingDuration: Date.now() - this.recordingStartTime!.getTime(),
      recordingSize: recordingInfo.fileSize
    });

    // Process recording for on-demand playback
    await this.processRecordingForPlayback(recordingInfo);

    this.recordingState = 'idle';

    return recordingInfo.playbackUrl;
  }

  // Process recording for optimized playback
  private async processRecordingForPlayback(
    recordingInfo: RecordingInfo
  ): Promise<void> {
    // Generate multiple quality versions
    const qualities = ['1080p', '720p', '480p', '360p'];

    for (const quality of qualities) {
      await this.transcodeRecording(recordingInfo.url, quality);
    }

    // Generate thumbnail
    await this.generateThumbnail(recordingInfo.url);

    // Create chapters/segments for workout sections
    await this.createWorkoutChapters(recordingInfo);

    // Generate captions (if needed)
    await this.generateCaptions(recordingInfo.url);
  }

  // Playback system for recorded classes
  async setupPlaybackSystem(
    recordingUrl: string,
    container: HTMLElement
  ): Promise<VideoPlayer> {
    const player = new VideoPlayer({
      container,
      src: recordingUrl,
      controls: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],  // Speed control for learning
      chapters: await this.loadChapters(recordingUrl),
      thumbnail: await this.loadThumbnail(recordingUrl),
      analytics: true,
      autoQuality: true,  // Adaptive bitrate
      pip: true,  // Picture-in-picture support
      keyboard: true,  // Keyboard shortcuts
      gestures: true  // Mobile gestures
    });

    // Add fitness-specific features
    this.addFitnessPlaybackFeatures(player);

    return player;
  }

  private addFitnessPlaybackFeatures(player: VideoPlayer): void {
    // Add exercise timer overlay
    player.addOverlay({
      type: 'timer',
      position: 'top-right',
      format: 'mm:ss'
    });

    // Add heart rate zone indicator (if data available)
    player.addOverlay({
      type: 'heartrate',
      position: 'bottom-left',
      dataSource: '/api/session/heartrate'
    });

    // Add loop section feature for practice
    player.addFeature('loop-section', {
      onLoop: (startTime, endTime) => {
        player.setLoop(startTime, endTime);
      }
    });

    // Add mirror mode for following along
    player.addFeature('mirror-mode', {
      onToggle: (enabled) => {
        player.setVideoTransform(enabled ? 'scaleX(-1)' : 'none');
      }
    });
  }
}
```

---

## 6. Real-world Implementation Steps

### Database Schema for Session Management

```sql
-- Complete database schema for Zoom session management
-- This extends the existing schema with Zoom-specific tables

-- Zoom sessions table
CREATE TABLE zoom_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    zoom_session_name TEXT NOT NULL UNIQUE,
    zoom_session_key TEXT UNIQUE,
    zoom_passcode TEXT,

    -- Session configuration
    max_participants INTEGER DEFAULT 100,
    video_quality TEXT DEFAULT '480p',
    enable_recording BOOLEAN DEFAULT true,
    enable_chat BOOLEAN DEFAULT true,
    enable_screen_share BOOLEAN DEFAULT true,
    enable_virtual_background BOOLEAN DEFAULT false,

    -- Session state
    state TEXT CHECK (state IN ('scheduled', 'initializing', 'active', 'paused', 'ended')),
    actual_participant_count INTEGER DEFAULT 0,
    peak_participant_count INTEGER DEFAULT 0,

    -- Recording info
    recording_status TEXT CHECK (recording_status IN ('not_started', 'recording', 'stopped', 'processing', 'available')),
    recording_start_time TIMESTAMPTZ,
    recording_url TEXT,
    recording_duration INTEGER, -- in seconds
    recording_size_mb DECIMAL(10, 2),

    -- Performance metrics
    average_video_quality TEXT,
    average_audio_quality TEXT,
    connection_issues_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session tokens table (for token management and revocation)
CREATE TABLE session_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zoom_session_id UUID NOT NULL REFERENCES zoom_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    token_hash TEXT NOT NULL, -- SHA256 hash of token
    role INTEGER NOT NULL CHECK (role IN (0, 1)), -- 0: participant, 1: host

    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,

    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,

    ip_address INET,
    user_agent TEXT,

    UNIQUE(zoom_session_id, user_id, token_hash)
);

-- Session participants with Zoom-specific data
CREATE TABLE zoom_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zoom_session_id UUID NOT NULL REFERENCES zoom_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    zoom_user_id TEXT NOT NULL, -- Zoom's internal user ID

    -- Participation details
    join_time TIMESTAMPTZ,
    leave_time TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Activity metrics
    video_on_duration INTEGER DEFAULT 0, -- seconds with video on
    audio_on_duration INTEGER DEFAULT 0, -- seconds with audio on
    messages_sent INTEGER DEFAULT 0,
    hand_raised_count INTEGER DEFAULT 0,

    -- Connection quality
    average_bandwidth_kbps DECIMAL(10, 2),
    packet_loss_percentage DECIMAL(5, 2),
    average_latency_ms INTEGER,
    connection_quality connection_quality,

    -- Features used
    used_virtual_background BOOLEAN DEFAULT false,
    shared_screen BOOLEAN DEFAULT false,
    was_spotlighted BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(zoom_session_id, user_id)
);

-- Session events log
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zoom_session_id UUID NOT NULL REFERENCES zoom_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),

    event_type TEXT NOT NULL,
    event_data JSONB,

    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_zoom_sessions_class_session ON zoom_sessions(class_session_id);
CREATE INDEX idx_zoom_sessions_state ON zoom_sessions(state);
CREATE INDEX idx_session_tokens_user ON session_tokens(user_id);
CREATE INDEX idx_session_tokens_expires ON session_tokens(expires_at);
CREATE INDEX idx_zoom_participants_session ON zoom_participants(zoom_session_id);
CREATE INDEX idx_zoom_participants_user ON zoom_participants(user_id);
CREATE INDEX idx_session_events_session ON session_events(zoom_session_id);
CREATE INDEX idx_session_events_occurred ON session_events(occurred_at);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_zoom_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update peak participant count
    UPDATE zoom_sessions
    SET peak_participant_count = GREATEST(
        peak_participant_count,
        (SELECT COUNT(*) FROM zoom_participants WHERE zoom_session_id = NEW.zoom_session_id)
    ),
    actual_participant_count = (
        SELECT COUNT(*) FROM zoom_participants
        WHERE zoom_session_id = NEW.zoom_session_id
        AND leave_time IS NULL
    ),
    updated_at = NOW()
    WHERE id = NEW.zoom_session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_metrics_trigger
AFTER INSERT OR UPDATE ON zoom_participants
FOR EACH ROW
EXECUTE FUNCTION update_zoom_session_metrics();

-- Row Level Security
ALTER TABLE zoom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Coaches can manage their sessions" ON zoom_sessions
    FOR ALL USING (
        class_session_id IN (
            SELECT id FROM class_sessions WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their tokens" ON session_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their participation" ON zoom_participants
    FOR SELECT USING (user_id = auth.uid());
```

### API Endpoints Needed

```typescript
// Backend API implementation for Zoom session management
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// 1. Create session endpoint
router.post('/api/sessions/create', async (req, res) => {
  const schema = z.object({
    title: z.string(),
    scheduledTime: z.string().datetime(),
    duration: z.number().min(15).max(180),
    maxParticipants: z.number().min(1).max(100),
    workoutType: z.enum(['yoga', 'hiit', 'dance', 'strength', 'cardio'])
  });

  try {
    const validated = schema.parse(req.body);
    const userId = req.user.id;

    // Create database record
    const session = await db.classSession.create({
      data: {
        ...validated,
        coachId: userId,
        zoomMeetingId: generateSessionName(validated.workoutType)
      }
    });

    // Create Zoom session record
    const zoomSession = await db.zoomSession.create({
      data: {
        classSessionId: session.id,
        zoomSessionName: session.zoomMeetingId,
        zoomSessionKey: generateSessionKey(),
        maxParticipants: validated.maxParticipants,
        videoQuality: getOptimalQuality(validated.maxParticipants)
      }
    });

    res.json({ session, zoomSession });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Join session endpoint
router.post('/api/sessions/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    // Verify access
    const hasAccess = await verifySessionAccess(userId, sessionId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get session details
    const session = await db.zoomSession.findUnique({
      where: { classSessionId: sessionId },
      include: { classSession: true }
    });

    // Determine role
    const role = session.classSession.coachId === userId ? 1 : 0;

    // Generate token
    const token = await generateSessionToken({
      sessionName: session.zoomSessionName,
      role,
      sessionKey: session.zoomSessionKey,
      userIdentity: userId
    });

    // Record token
    await db.sessionToken.create({
      data: {
        zoomSessionId: session.id,
        userId,
        tokenHash: hashToken(token),
        role,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      token,
      sessionName: session.zoomSessionName,
      role,
      config: getSessionConfig(session)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update session state
router.patch('/api/sessions/:sessionId/state', async (req, res) => {
  const { sessionId } = req.params;
  const { state } = req.body;
  const userId = req.user.id;

  try {
    // Verify host permission
    const isHost = await verifyHostPermission(userId, sessionId);
    if (!isHost) {
      return res.status(403).json({ error: 'Host permission required' });
    }

    // Update state
    const updated = await db.zoomSession.update({
      where: { classSessionId: sessionId },
      data: {
        state,
        updatedAt: new Date()
      }
    });

    // Log event
    await db.sessionEvent.create({
      data: {
        zoomSessionId: updated.id,
        userId,
        eventType: 'state_change',
        eventData: { from: updated.state, to: state }
      }
    });

    // Broadcast to participants via WebSocket
    io.to(sessionId).emit('stateChange', { state });

    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get session participants
router.get('/api/sessions/:sessionId/participants', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const participants = await db.zoomParticipant.findMany({
      where: {
        zoomSession: {
          classSessionId: sessionId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            fitnessLevel: true
          }
        }
      }
    });

    res.json({ participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Start recording
router.post('/api/sessions/:sessionId/recording/start', async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    // Verify host permission
    const isHost = await verifyHostPermission(userId, sessionId);
    if (!isHost) {
      return res.status(403).json({ error: 'Host permission required' });
    }

    // Update recording status
    await db.zoomSession.update({
      where: { classSessionId: sessionId },
      data: {
        recordingStatus: 'recording',
        recordingStartTime: new Date()
      }
    });

    // Log event
    await db.sessionEvent.create({
      data: {
        zoomSessionId: session.id,
        userId,
        eventType: 'recording_started'
      }
    });

    res.json({ success: true, status: 'recording' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. WebSocket endpoint for real-time updates
io.on('connection', (socket) => {
  socket.on('joinSession', async (data) => {
    const { sessionId, token } = data;

    // Verify token
    const isValid = await verifyToken(token);
    if (!isValid) {
      socket.emit('error', { message: 'Invalid token' });
      return;
    }

    // Join room
    socket.join(sessionId);

    // Track participant
    await db.zoomParticipant.update({
      where: { /* ... */ },
      data: { joinTime: new Date() }
    });

    // Notify others
    socket.to(sessionId).emit('participantJoined', {
      userId: socket.userId,
      timestamp: new Date()
    });
  });

  socket.on('updateVideo', async (data) => {
    const { sessionId, isOn } = data;

    // Update participant record
    await db.zoomParticipant.update({
      where: { /* ... */ },
      data: {
        videoOnDuration: isOn
          ? db.raw('video_on_duration + EXTRACT(EPOCH FROM NOW() - updated_at)')
          : db.raw('video_on_duration')
      }
    });

    // Broadcast to room
    socket.to(sessionId).emit('videoUpdate', {
      userId: socket.userId,
      isOn
    });
  });

  socket.on('disconnect', async () => {
    // Update leave time
    await db.zoomParticipant.update({
      where: { /* ... */ },
      data: { leaveTime: new Date() }
    });

    // Notify room
    socket.to(sessionId).emit('participantLeft', {
      userId: socket.userId
    });
  });
});

// 7. Analytics endpoint
router.get('/api/sessions/:sessionId/analytics', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const analytics = await db.$queryRaw`
      SELECT
        COUNT(DISTINCT zp.user_id) as total_participants,
        AVG(zp.duration_seconds) as avg_duration,
        AVG(zp.video_on_duration) as avg_video_time,
        AVG(zp.packet_loss_percentage) as avg_packet_loss,
        COUNT(CASE WHEN zp.connection_quality = 'excellent' THEN 1 END) as excellent_connections,
        COUNT(CASE WHEN zp.connection_quality = 'good' THEN 1 END) as good_connections,
        COUNT(CASE WHEN zp.connection_quality = 'poor' THEN 1 END) as poor_connections
      FROM zoom_participants zp
      JOIN zoom_sessions zs ON zp.zoom_session_id = zs.id
      WHERE zs.class_session_id = ${sessionId}
    `;

    res.json({ analytics: analytics[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Frontend Integration Points

```tsx
// React components for Zoom session integration
import React, { useEffect, useState, useRef } from 'react';
import { ZoomSDKService } from '@/services/zoomSDKService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

// Main session component
export const FitnessSession: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [sessionState, setSessionState] = useState<SessionState>('initializing');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const zoomService = useRef<ZoomSDKService>();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeSession();

    return () => {
      cleanupSession();
    };
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      // Initialize Zoom SDK
      zoomService.current = new ZoomSDKService();

      // Get session token
      const { token, role, config } = await fetchSessionToken(sessionId);
      setIsHost(role === 1);

      // Setup event handlers
      zoomService.current.setEventHandlers({
        onUserJoin: handleUserJoin,
        onUserLeave: handleUserLeave,
        onConnectionChange: handleConnectionChange,
        onSessionClosed: handleSessionClosed
      });

      // Join session
      await zoomService.current.joinSession(
        config.sessionName,
        token,
        user.name,
        role === 1
      );

      setSessionState('active');
    } catch (error) {
      console.error('Failed to initialize session:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to join the fitness session',
        variant: 'destructive'
      });
      setSessionState('error');
    }
  };

  const handleUserJoin = (userId: string, user: ZoomParticipant) => {
    setParticipants(prev => [...prev, transformParticipant(user)]);

    toast({
      title: 'Participant Joined',
      description: `${user.displayName} joined the session`
    });
  };

  const handleUserLeave = (userId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== userId));
  };

  const handleConnectionChange = (state: ConnectionState) => {
    if (state === 'reconnecting') {
      toast({
        title: 'Reconnecting...',
        description: 'Connection interrupted. Attempting to reconnect.'
      });
    } else if (state === 'connected') {
      toast({
        title: 'Connected',
        description: 'Connection restored'
      });
    }
  };

  const handleSessionClosed = () => {
    setSessionState('ended');
    toast({
      title: 'Session Ended',
      description: 'The fitness session has ended'
    });
  };

  const cleanupSession = async () => {
    if (zoomService.current) {
      await zoomService.current.leaveSession();
    }
  };

  return (
    <div className="fitness-session">
      <SessionHeader
        state={sessionState}
        isHost={isHost}
        participantCount={participants.length}
      />

      <div className="session-content">
        <VideoGrid
          participants={participants}
          zoomService={zoomService.current}
          isHost={isHost}
        />

        {isHost && (
          <HostControls
            zoomService={zoomService.current}
            participants={participants}
          />
        )}

        <ParticipantControls
          zoomService={zoomService.current}
        />
      </div>

      <SessionSidebar
        participants={participants}
        isHost={isHost}
      />
    </div>
  );
};

// Video grid component
const VideoGrid: React.FC<{
  participants: Participant[];
  zoomService: ZoomSDKService;
  isHost: boolean;
}> = ({ participants, zoomService, isHost }) => {
  const [layout, setLayout] = useState<'gallery' | 'speaker'>('gallery');
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    renderParticipantVideos();
  }, [participants, layout]);

  const renderParticipantVideos = async () => {
    for (const participant of participants) {
      const canvas = videoRefs.current.get(participant.id);
      if (canvas && participant.isVideoOn) {
        await zoomService.renderVideo(
          participant.id,
          canvas,
          canvas.width,
          canvas.height,
          participant.id === spotlightId
        );
      }
    }
  };

  const handleSpotlight = async (participantId: string) => {
    if (!isHost) return;

    setSpotlightId(participantId);
    const canvas = document.getElementById('main-video') as HTMLCanvasElement;
    await zoomService.spotlightParticipant(participantId, canvas);
  };

  return (
    <div className={`video-grid ${layout}`}>
      {layout === 'speaker' && spotlightId && (
        <div className="main-video">
          <canvas id="main-video" width={1280} height={720} />
        </div>
      )}

      <div className="participant-videos">
        {participants.map(participant => (
          <ParticipantVideo
            key={participant.id}
            participant={participant}
            onSpotlight={() => handleSpotlight(participant.id)}
            canSpotlight={isHost}
            ref={(canvas) => {
              if (canvas) videoRefs.current.set(participant.id, canvas);
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Host controls component
const HostControls: React.FC<{
  zoomService: ZoomSDKService;
  participants: Participant[];
}> = ({ zoomService, participants }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleMuteAll = async () => {
    await zoomService.muteAllParticipants(true);
    toast({
      title: 'All Participants Muted',
      description: 'All participants have been muted'
    });
  };

  const handleStartRecording = async () => {
    await zoomService.startRecording();
    setIsRecording(true);

    toast({
      title: 'Recording Started',
      description: 'The session is now being recorded'
    });
  };

  const handleStopRecording = async () => {
    await zoomService.stopRecording();
    setIsRecording(false);

    toast({
      title: 'Recording Stopped',
      description: 'The recording has been saved'
    });
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end the session for all participants?')) {
      await zoomService.endSession();
    }
  };

  return (
    <div className="host-controls">
      <button onClick={handleMuteAll}>
        Mute All
      </button>

      <button onClick={isRecording ? handleStopRecording : handleStartRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <button onClick={handleEndSession} className="danger">
        End Session
      </button>
    </div>
  );
};
```

### Error Handling and Fallback Mechanisms

```typescript
// Comprehensive error handling system
class SessionErrorHandler {
  private errorQueue: SessionError[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private fallbackMode = false;

  // Central error handler
  async handleError(error: SessionError): Promise<void> {
    console.error('Session error:', error);

    // Categorize error
    const category = this.categorizeError(error);

    // Take appropriate action
    switch (category) {
      case 'network':
        await this.handleNetworkError(error);
        break;

      case 'permission':
        await this.handlePermissionError(error);
        break;

      case 'capacity':
        await this.handleCapacityError(error);
        break;

      case 'media':
        await this.handleMediaError(error);
        break;

      case 'critical':
        await this.handleCriticalError(error);
        break;

      default:
        await this.handleGenericError(error);
    }

    // Log for analytics
    await this.logError(error);
  }

  private categorizeError(error: SessionError): ErrorCategory {
    if (error.code >= 500) return 'critical';
    if (error.message.includes('network') || error.message.includes('connection')) return 'network';
    if (error.message.includes('permission') || error.message.includes('denied')) return 'permission';
    if (error.message.includes('full') || error.message.includes('capacity')) return 'capacity';
    if (error.message.includes('camera') || error.message.includes('microphone')) return 'media';
    return 'generic';
  }

  private async handleNetworkError(error: SessionError): Promise<void> {
    // Show user notification
    this.showNotification({
      type: 'warning',
      title: 'Connection Issue',
      message: 'Experiencing network issues. Video quality may be reduced.',
      actions: [
        { label: 'Check Connection', action: () => this.runNetworkDiagnostics() }
      ]
    });

    // Implement fallback
    await this.enableLowBandwidthMode();

    // Schedule retry
    this.scheduleRetry(error, 5000);
  }

  private async handleMediaError(error: SessionError): Promise<void> {
    const device = error.details?.device;

    this.showNotification({
      type: 'error',
      title: `${device} Error`,
      message: `Unable to access ${device}. Please check permissions.`,
      actions: [
        { label: 'Settings', action: () => this.openMediaSettings() },
        { label: 'Continue Without', action: () => this.continueWithoutMedia(device) }
      ]
    });

    // Try alternative devices
    await this.tryAlternativeDevices(device);
  }

  private async handleCapacityError(error: SessionError): Promise<void> {
    this.showNotification({
      type: 'error',
      title: 'Session Full',
      message: 'This session has reached maximum capacity.',
      actions: [
        { label: 'Join Waitlist', action: () => this.joinWaitlist() },
        { label: 'View Recording Later', action: () => this.scheduleRecordingView() }
      ]
    });
  }

  private async handleCriticalError(error: SessionError): Promise<void> {
    // Enter fallback mode
    this.fallbackMode = true;

    // Show critical error UI
    this.showCriticalErrorUI({
      message: 'Unable to connect to the session',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Use a different browser (Chrome or Firefox recommended)',
        'Contact support if the issue persists'
      ],
      actions: [
        { label: 'Retry', action: () => this.retryConnection() },
        { label: 'Report Issue', action: () => this.reportIssue(error) }
      ]
    });

    // Save session state for recovery
    await this.saveSessionStateForRecovery();
  }

  // Fallback mechanisms
  private async enableLowBandwidthMode(): Promise<void> {
    const zoomService = ZoomSDKService.getInstance();

    // Reduce video quality
    await zoomService.setVideoQuality('180p');

    // Disable non-essential features
    await zoomService.disableVirtualBackground();
    await zoomService.disableVideoEffects();

    // Reduce frame rate
    await zoomService.setFrameRate(10);

    // Enable audio-only mode option
    this.showAudioOnlyOption();
  }

  private async tryAlternativeDevices(deviceType: string): Promise<void> {
    if (deviceType === 'camera') {
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');

      for (const camera of cameras) {
        try {
          await navigator.mediaDevices.getUserMedia({
            video: { deviceId: camera.deviceId }
          });

          // Success - use this camera
          await this.switchToDevice(camera.deviceId);
          break;
        } catch {
          continue;
        }
      }
    }
  }

  // Recovery mechanisms
  private async attemptSessionRecovery(): Promise<boolean> {
    try {
      // 1. Check if we have a saved session state
      const savedState = await this.loadSavedSessionState();
      if (!savedState) return false;

      // 2. Validate token is still valid
      if (this.isTokenExpired(savedState.token)) {
        // Try to refresh token
        const newToken = await this.refreshSessionToken(savedState.sessionId);
        savedState.token = newToken;
      }

      // 3. Attempt to rejoin
      const zoomService = new ZoomSDKService();
      await zoomService.joinSession(
        savedState.sessionName,
        savedState.token,
        savedState.userName,
        savedState.isHost
      );

      // 4. Restore participant state
      await this.restoreParticipantState(savedState);

      return true;
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }

  // Diagnostic tools
  private async runNetworkDiagnostics(): Promise<DiagnosticResult> {
    const results: DiagnosticResult = {
      timestamp: new Date(),
      tests: []
    };

    // Test 1: Basic connectivity
    results.tests.push(await this.testConnectivity());

    // Test 2: Bandwidth test
    results.tests.push(await this.testBandwidth());

    // Test 3: Latency test
    results.tests.push(await this.testLatency());

    // Test 4: WebRTC connectivity
    results.tests.push(await this.testWebRTC());

    // Test 5: Firewall/port test
    results.tests.push(await this.testPorts());

    // Show results to user
    this.showDiagnosticResults(results);

    return results;
  }

  private async testBandwidth(): Promise<TestResult> {
    const startTime = Date.now();
    const testSize = 1024 * 1024; // 1MB

    try {
      // Download test
      const response = await fetch('/api/speedtest/download', {
        cache: 'no-cache'
      });
      const blob = await response.blob();
      const downloadTime = Date.now() - startTime;
      const downloadSpeed = (blob.size * 8) / (downloadTime / 1000) / 1024 / 1024; // Mbps

      return {
        test: 'Bandwidth',
        passed: downloadSpeed > 1, // Minimum 1 Mbps
        details: `Download speed: ${downloadSpeed.toFixed(2)} Mbps`,
        recommendation: downloadSpeed < 2
          ? 'Your connection may experience quality issues'
          : 'Bandwidth sufficient for video streaming'
      };
    } catch (error) {
      return {
        test: 'Bandwidth',
        passed: false,
        details: 'Failed to test bandwidth',
        recommendation: 'Check your internet connection'
      };
    }
  }
}

// Global error boundary for React
export class SessionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Session error caught by boundary:', error, errorInfo);

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);

    // Attempt recovery
    this.attemptRecovery();
  }

  private async attemptRecovery() {
    const handler = new SessionErrorHandler();
    const recovered = await handler.attemptSessionRecovery();

    if (recovered) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Session Connection Issue</h2>
          <p>We're having trouble connecting to your fitness session.</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            <button onClick={() => this.attemptRecovery()}>
              Try Reconnecting
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Summary

This comprehensive guide provides a complete end-to-end implementation for Zoom Video SDK session management in your fitness platform. The key components include:

1. **Robust session creation and management** with proper naming conventions and role-based access
2. **Secure token generation** with server-side implementation and refresh strategies
3. **Complete session lifecycle management** with state machines and reconnection handling
4. **Fitness-specific optimizations** for 50+ participants including video tiering and bandwidth management
5. **Production-ready database schema** with proper indexing and RLS policies
6. **RESTful API endpoints** with WebSocket support for real-time updates
7. **React components** with proper error boundaries and recovery mechanisms
8. **Comprehensive error handling** with fallback strategies and diagnostic tools

The implementation focuses on scalability, performance, and reliability for production fitness platforms handling live workout classes with multiple participants.