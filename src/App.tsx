import { useState, useEffect, createContext, useContext } from 'react';
import { useZoomFitnessPlatform } from './hooks/useZoomFitnessPlatform';
import { CoachView } from './components/CoachView';
import { StudentView } from './components/StudentView';
import { RoleSelection } from './components/RoleSelection';
import { UserRole } from './types/fitness-platform';
import { checkBrowserSupport } from './utils/sessionValidator';

type ViewPerspective = 'coach' | 'student';

// Create context to share fitness platform state
const FitnessPlatformContext = createContext<ReturnType<typeof useZoomFitnessPlatform> | null>(null);

export const useFitnessPlatformContext = () => {
  const context = useContext(FitnessPlatformContext);
  if (!context) {
    throw new Error('useFitnessPlatformContext must be used within FitnessPlatformProvider');
  }
  return context;
};

export default function App() {
  const [hasJoinedSession, setHasJoinedSession] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState('');
  const [browserSupport, setBrowserSupport] = useState<any>(null);
  const fitnessPlatform = useZoomFitnessPlatform();

  // Check browser compatibility on mount
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);

    if (!support.isSupported) {
      console.warn('⚠️ Browser compatibility issues:', support.warnings);
    }
  }, []);

  // Handle role selection and joining Zoom session
  const handleRoleSelection = async (role: UserRole) => {
    alert(`Button clicked! Role: ${role}`);
    console.log('🎯 Button clicked! Role:', role);
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

      console.log('🚀 Attempting to join session:', {
        name: defaultName,
        role,
        session: 'fitwithpari-session' // Using config default
      });

      // Join the Zoom session using default session name from config
      console.log('🚀 Attempting to join Zoom session...');
      await fitnessPlatform.sdk.joinSession(defaultName, role);

      console.log('✅ Successfully joined Zoom session!');
      setHasJoinedSession(true);
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      alert(`Failed to join the fitness class: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    }
  };

  const toggleViewPerspective = () => {
    // In Zoom mode, we don't toggle - users are locked to their joined role
    // This is just for demonstration purposes in the UI
  };

  // Debug info
  console.log('🔧 DEBUG - App state:', {
    hasJoinedSession,
    currentRole,
    fitnessPlatformExists: !!fitnessPlatform,
    sdkExists: !!fitnessPlatform?.sdk,
    connectionState: fitnessPlatform?.connectionState,
    error: fitnessPlatform?.error,
    isConnecting: fitnessPlatform?.isConnecting
  });

  // Show role selection screen if user hasn't joined yet
  if (!hasJoinedSession || !currentRole) {
    return <RoleSelection onSelectRole={handleRoleSelection} />;
  }

  // Show the appropriate view based on joined role
  return (
    <FitnessPlatformContext.Provider value={fitnessPlatform}>
      {currentRole === 'student' ? (
        <StudentView onToggleView={toggleViewPerspective} isCoachViewing={false} />
      ) : (
        <CoachView onToggleView={toggleViewPerspective} />
      )}
    </FitnessPlatformContext.Provider>
  );
}