import { useState, useEffect } from 'react';
import { Participant, ClassSession, ViewMode, UserRole, CoachMode, StudentLevel, ExerciseContent, HealthConsideration } from '../types/fitness-platform';

// Mock participants data with student levels
const mockParticipants: Participant[] = [
  {
    id: 'coach-1',
    name: 'Sarah Johnson',
    isVideoOn: true,
    isAudioOn: true,
    isHost: true,
    connectionQuality: 'excellent',
    hasRaisedHand: false,
  },
  // Beginner group
  {
    id: 'student-1',
    name: 'Mike Chen',
    isVideoOn: true,
    isAudioOn: false,
    isHost: false,
    connectionQuality: 'good',
    hasRaisedHand: false,
    repCount: 8,
    level: 'beginner',
  },
  {
    id: 'student-2',
    name: 'Emma Davis',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'excellent',
    hasRaisedHand: true,
    variation: 'Modified',
    repCount: 6,
    level: 'beginner',
    healthConsiderations: [
      {
        type: 'injury',
        description: 'Recent knee surgery',
        affectedExercises: ['lunges', 'squats', 'jumping jacks'],
        severity: 'high',
        recommendedModifications: ['Wall sits instead of squats', 'Step-ups instead of lunges']
      }
    ],
    medicalNotes: 'Cleared for upper body exercises. Avoid high-impact movements.'
  },
  {
    id: 'student-3',
    name: 'James Wilson',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'good',
    hasRaisedHand: false,
    repCount: 7,
    level: 'beginner',
  },
  // Intermediate group
  {
    id: 'student-4',
    name: 'Alex Rodriguez',
    isVideoOn: false,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'poor',
    hasRaisedHand: false,
    repCount: 12,
    level: 'intermediate',
    healthConsiderations: [
      {
        type: 'condition',
        description: 'Lower back pain',
        affectedExercises: ['deadlifts', 'sit-ups', 'toe touches'],
        severity: 'medium',
        recommendedModifications: ['Planks instead of sit-ups', 'Wall sits for core work']
      }
    ],
    medicalNotes: 'Prefers standing exercises. Monitor form carefully.'
  },
  {
    id: 'student-5',
    name: 'Lisa Park',
    isVideoOn: true,
    isAudioOn: false,
    isHost: false,
    connectionQuality: 'good',
    hasRaisedHand: false,
    repCount: 15,
    level: 'intermediate',
    healthConsiderations: [
      {
        type: 'condition',
        description: 'Pregnancy (2nd trimester)',
        affectedExercises: ['ab exercises', 'twisting movements', 'lying on back'],
        severity: 'high',
        recommendedModifications: ['Standing core work', 'Prenatal modifications', 'Avoid supine position']
      }
    ],
    medicalNotes: 'Doctor cleared for moderate exercise. Stay hydrated.'
  },
  {
    id: 'student-6',
    name: 'David Kim',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'excellent',
    hasRaisedHand: false,
    repCount: 14,
    level: 'intermediate',
  },
  // Advanced group
  {
    id: 'student-7',
    name: 'Maria Garcia',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'excellent',
    hasRaisedHand: false,
    variation: 'Advanced',
    repCount: 20,
    level: 'advanced',
  },
  {
    id: 'student-8',
    name: 'Tom Brown',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'good',
    hasRaisedHand: false,
    repCount: 22,
    level: 'advanced',
    healthConsiderations: [
      {
        type: 'injury',
        description: 'Shoulder impingement',
        affectedExercises: ['overhead press', 'pull-ups', 'burpees'],
        severity: 'medium',
        recommendedModifications: ['Keep arms below shoulder height', 'Focus on form over intensity']
      }
    ],
    medicalNotes: 'Avoid overhead movements. Can do most other exercises.'
  },
  {
    id: 'student-9',
    name: 'Anna Lee',
    isVideoOn: true,
    isAudioOn: false,
    isHost: false,
    connectionQuality: 'excellent',
    hasRaisedHand: false,
    repCount: 18,
    level: 'advanced',
  },
  // Unassigned participants
  {
    id: 'student-10',
    name: 'John Smith',
    isVideoOn: true,
    isAudioOn: true,
    isHost: false,
    connectionQuality: 'good',
    hasRaisedHand: false,
    repCount: 10,
    // No level assigned
    healthConsiderations: [
      {
        type: 'preference',
        description: 'Prefers low-impact exercises',
        affectedExercises: ['jumping', 'high-intensity moves'],
        severity: 'low',
        recommendedModifications: ['Walking instead of running', 'Step-touches instead of jumping jacks']
      }
    ],
    medicalNotes: 'No medical restrictions. Personal preference for gentler workouts.'
  },
];

const mockClassSession: ClassSession = {
  id: 'class-1',
  title: 'HIIT Cardio Blast',
  startTime: new Date(),
  duration: 45,
  isRecording: true,
  currentExercise: 'Push-ups',
  exerciseTimer: 180, // 3 minutes in seconds
  coachMode: 'teach',
  exerciseGifUrl: 'https://images.unsplash.com/photo-1734873477108-6837b02f2b9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwke2ZpdG5lc3MlMjBleGVyY2lzZSUyMGZpdG5lc3MlMjBkZW1vbnN0cmF0aW9ufGVufDF8fHx8MTc1NzgxMzEwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  exerciseBenefits: 'Push-ups build upper body and core strength, improve posture, and enhance functional movement patterns.',
  currentExerciseContent: {
    name: 'Push-ups',
    benefits: 'Build upper body and core strength, improve posture, and enhance functional movement patterns.',
    targetAudience: 'beginner',
    gifUrl: 'https://images.unsplash.com/photo-1734873477108-6837b02f2b9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwke2ZpdG5lc3MlMjBleGVyY2lzZSUyMGZpdG5lc3MlMjBkZW1vbnN0cmF0aW9ufGVufDF8fHx8MTc1NzgxMzEwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    keyPoints: [
      'Keep your body in a straight line from head to heels',
      'Lower your chest to within an inch of the floor',
      'Push through your palms, not fingertips',
      'Engage your core throughout the movement'
    ]
  },
};

export function useFitnessPlatform() {
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
  const [classSession, setClassSession] = useState<ClassSession>(mockClassSession);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [currentUser, setCurrentUser] = useState<{ id: string; role: UserRole } | null>(null);
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(true);
  const [isLocalAudioOn, setIsLocalAudioOn] = useState(true);
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string>('coach-1');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(mockClassSession.exerciseTimer || 0);
  const [highlightedLevel, setHighlightedLevel] = useState<StudentLevel | null>(null);

  // Timer effect for class elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Exercise timer effect
  useEffect(() => {
    if (exerciseTimer > 0) {
      const interval = setInterval(() => {
        setExerciseTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [exerciseTimer]);

  // Mock SDK functions
  const mockSDK = {
    muteLocalAudio: () => setIsLocalAudioOn(false),
    unmuteLocalAudio: () => setIsLocalAudioOn(true),
    startVideo: () => setIsLocalVideoOn(true),
    stopVideo: () => setIsLocalVideoOn(false),
    switchToGalleryView: () => setViewMode('gallery'),
    switchToSpotlightView: (participantId: string) => {
      setViewMode('spotlight');
      setSpotlightedParticipant(participantId);
    },
    sendChatMessage: (message: string) => {
      console.log('Chat message sent:', message);
    },
    muteParticipant: (participantId: string) => {
      setParticipants(prev => 
        prev.map(p => p.id === participantId ? { ...p, isAudioOn: false } : p)
      );
    },
    muteAll: () => {
      setParticipants(prev => 
        prev.map(p => p.isHost ? p : { ...p, isAudioOn: false })
      );
    },
    removeParticipant: (participantId: string) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    },
    spotlightParticipant: (participantId: string) => {
      setSpotlightedParticipant(participantId);
      setViewMode('spotlight');
    },
    raiseHand: () => {
      if (currentUser) {
        setParticipants(prev => 
          prev.map(p => p.id === currentUser.id ? { ...p, hasRaisedHand: !p.hasRaisedHand } : p)
        );
      }
    },
    setCoachMode: (mode: CoachMode) => {
      setClassSession(prev => ({ ...prev, coachMode: mode }));
    },
    setExerciseContent: (content: ExerciseContent) => {
      setClassSession(prev => ({ 
        ...prev, 
        currentExerciseContent: content,
        currentExercise: content.name,
        exerciseGifUrl: content.gifUrl,
        exerciseBenefits: content.benefits
      }));
    },
    highlightLevel: (level: StudentLevel | null) => {
      setHighlightedLevel(level);
    },
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentUser = () => {
    if (!currentUser) return null;
    return participants.find(p => p.id === currentUser.id);
  };

  const getSpotlightedParticipant = () => {
    return participants.find(p => p.id === spotlightedParticipant);
  };

  const getParticipantsByLevel = (level: StudentLevel) => {
    return participants.filter(p => p.level === level);
  };

  const getStudentLevels = (): StudentLevel[] => {
    return ['beginner', 'intermediate', 'advanced'];
  };

  return {
    participants,
    classSession,
    viewMode,
    currentUser,
    isLocalVideoOn,
    isLocalAudioOn,
    spotlightedParticipant,
    elapsedTime,
    exerciseTimer,
    highlightedLevel,
    setCurrentUser,
    setViewMode,
    formatTime,
    getCurrentUser,
    getSpotlightedParticipant,
    getParticipantsByLevel,
    getStudentLevels,
    mockSDK,
  };
}