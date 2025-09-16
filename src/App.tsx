import { useState, useEffect } from 'react';
import { useVideoFitnessPlatform } from './hooks/useVideoFitnessPlatform';
import { FitnessPlatformContext } from './context/FitnessPlatformContext';
import { CoachView } from './components/CoachView';
import { StudentView } from './components/StudentView';
import { SessionManager } from './components/SessionManager';
import { AgoraDebugPanel } from './components/AgoraDebugPanel';
import { VideoServiceIndicator } from './components/VideoServiceIndicator';
import { UserRole } from './types/fitness-platform';
import { checkBrowserSupport } from './utils/sessionValidator';
import { VIDEO_SERVICE, SERVICE_NAMES } from './config/video.config';

type ViewPerspective = 'coach' | 'student';

export default function App() {
  const [hasJoinedSession, setHasJoinedSession] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState('');
  const [browserSupport, setBrowserSupport] = useState<any>(null);
  const fitnessPlatform = useVideoFitnessPlatform();

  // Check browser compatibility on mount
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);

    if (!support.isSupported) {
      console.warn('⚠️ Browser compatibility issues:', support.warnings);
    }
  }, []);

  // Handle session creation
  const handleCreateSession = async (sessionName: string, className: string, role: UserRole) => {
    console.log('🎯 Creating session:', { sessionName, className, role });
    console.log('🔍 Fitness Platform SDK:', fitnessPlatform.sdk);

    // Check browser compatibility before joining
    if (browserSupport && !browserSupport.isSupported) {
      alert(`Your browser (${browserSupport.browser} ${browserSupport.version}) is not supported for video calls. Please use Chrome 88+, Firefox 78+, Safari 13+, or Edge 88+ for the best experience.`);
      return;
    }

    try {
      setCurrentRole(role);

      // Set a default user name based on role
      const defaultName = role === 'coach' ? 'Coach Sarah' : `Student ${Math.floor(Math.random() * 100)}`;
      setUserName(defaultName);

      console.log('🚀 Creating and joining session:', {
        name: defaultName,
        role,
        sessionName
      });

      // Join the Zoom session with the specified session name
      await fitnessPlatform.sdk.joinSession(defaultName, role, sessionName);

      console.log('✅ Successfully created and joined session!');
      setHasJoinedSession(true);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      alert(`Failed to create the fitness session: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    }
  };

  // Handle joining existing session
  const handleJoinSession = async (sessionId: string, role: UserRole) => {
    console.log('🎯 Joining session:', { sessionId, role });
    console.log('🔍 Fitness Platform SDK:', fitnessPlatform.sdk);

    // Check browser compatibility before joining
    if (browserSupport && !browserSupport.isSupported) {
      alert(`Your browser (${browserSupport.browser} ${browserSupport.version}) is not supported for video calls. Please use Chrome 88+, Firefox 78+, Safari 13+, or Edge 88+ for the best experience.`);
      return;
    }

    try {
      setCurrentRole(role);

      // Set a default user name based on role
      const defaultName = role === 'coach' ? 'Coach Sarah' : `Student ${Math.floor(Math.random() * 100)}`;
      setUserName(defaultName);

      console.log('🚀 Joining existing session:', {
        name: defaultName,
        role,
        sessionId
      });

      // Join the Zoom session with the specified session ID
      await fitnessPlatform.sdk.joinSession(defaultName, role, sessionId);

      console.log('✅ Successfully joined session!');
      setHasJoinedSession(true);
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      alert(`Failed to join the fitness session: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    }
  };

  const resetSession = () => {
    // Reset all session state to start fresh
    setHasJoinedSession(false);
    setCurrentRole(null);
    setUserName('');

    // Clear any localStorage data that might be cached
    try {
      localStorage.removeItem('zoomSessionData');
      localStorage.removeItem('sessionMetadata');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }

    console.log('🔄 Session reset - returning to role selection');
  };

  const toggleViewPerspective = () => {
    // In Zoom mode, we don't toggle - users are locked to their joined role
    // This is just for demonstration purposes in the UI
  };

  // Debug info
  console.log('🔧 DEBUG - App state:', {
    hasJoinedSession,
    currentRole,
    videoService: VIDEO_SERVICE,
    videoServiceName: SERVICE_NAMES[VIDEO_SERVICE],
    fitnessPlatformExists: !!fitnessPlatform,
    sdkExists: !!fitnessPlatform?.sdk,
    connectionState: fitnessPlatform?.connectionState,
    error: fitnessPlatform?.error,
    isConnecting: fitnessPlatform?.isConnecting,
    serviceInfo: fitnessPlatform?.getServiceInfo?.()
  });

  // Show role selection screen if user hasn't joined yet OR if connection failed
  const connectionFailed = fitnessPlatform?.connectionState === 'Closed' &&
                           fitnessPlatform?.error &&
                           hasJoinedSession;

  // Always wrap everything in the context provider
  return (
    <FitnessPlatformContext.Provider value={fitnessPlatform}>
      {(!hasJoinedSession || !currentRole || connectionFailed) ? (
        <>
          <SessionManager
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
            isLoading={fitnessPlatform?.isConnecting}
          />
          <VideoServiceIndicator />
          <AgoraDebugPanel />
        </>
      ) : (
        <>
          {currentRole === 'student' ? (
            <StudentView onToggleView={toggleViewPerspective} isCoachViewing={false} />
          ) : (
            <CoachView onToggleView={toggleViewPerspective} />
          )}
          <VideoServiceIndicator />
          <AgoraDebugPanel />
        </>
      )}
    </FitnessPlatformContext.Provider>
  );
}