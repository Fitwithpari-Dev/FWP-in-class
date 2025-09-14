export interface HealthConsideration {
  type: 'injury' | 'condition' | 'modification' | 'preference';
  description: string;
  affectedExercises?: string[];
  severity: 'low' | 'medium' | 'high';
  recommendedModifications?: string[];
}

export interface Participant {
  id: string;
  name: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isHost: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  hasRaisedHand: boolean;
  variation?: string;
  repCount?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  healthConsiderations?: HealthConsideration[];
  medicalNotes?: string;
}

export interface ExerciseContent {
  name: string;
  gifUrl?: string;
  benefits?: string;
  targetAudience: 'all' | StudentLevel; // Who should see this exercise
  keyPoints?: string[];
}

export interface ClassSession {
  id: string;
  title: string;
  startTime: Date;
  duration: number; // in minutes
  isRecording: boolean;
  currentExercise?: string;
  exerciseTimer?: number;
  coachMode?: 'teach' | 'workout';
  exerciseGifUrl?: string;
  exerciseBenefits?: string;
  currentExerciseContent?: ExerciseContent; // New field for targeted exercise content
}

export type ViewMode = 'spotlight' | 'gallery';
export type UserRole = 'coach' | 'student';
export type CoachMode = 'teach' | 'workout';
export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ZoomSDKInterface {
  // Session management
  joinSession: (userName: string, role: UserRole, sessionName?: string) => Promise<void>;
  leaveSession: () => Promise<void>;

  // Video/Audio controls
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  startVideo?: () => Promise<void>;
  stopVideo?: () => Promise<void>;
  muteLocalAudio?: () => Promise<void>;
  unmuteLocalAudio?: () => Promise<void>;

  // View controls
  switchToGalleryView: () => void;
  switchToSpotlightView: (participantId: string) => void;

  // Communication
  sendChatMessage: (message: string, toUserId?: string) => Promise<void>;

  // Coach-only functions
  muteParticipant: (participantId: string) => Promise<void>;
  muteAll: () => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  spotlightParticipant: (participantId: string) => Promise<void>;

  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;

  // Screen sharing
  startScreenShare?: () => Promise<void>;
  stopScreenShare?: () => Promise<void>;

  // Fitness-specific
  setCoachMode: (mode: CoachMode) => void;
  setExerciseContent: (content: ExerciseContent) => void;
  highlightLevel: (level: StudentLevel | null) => void;
  raiseHand: () => void;
}

// Legacy support - will be deprecated
export interface ZoomSDKMock extends ZoomSDKInterface {
  // Events (for backward compatibility)
  onParticipantJoin?: (callback: (participant: Participant) => void) => void;
  onParticipantLeave?: (callback: (participantId: string) => void) => void;
}