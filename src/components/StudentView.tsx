import { useState } from 'react';
import { useFitnessPlatformContext } from '../App';
import { TopBar } from './TopBar';
import { VideoArea } from './VideoArea';
import { ControlBar } from './ControlBar';
import { SidePanel } from './SidePanel';
import { SettingsModal } from './SettingsModal';
import { ParticipantTile } from './ParticipantTile';
import { TeachModeView } from './TeachModeView';
import { WorkoutModeStudentView } from './WorkoutModeStudentView';
import { useIsMobile } from './ui/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

interface StudentViewProps {
  onToggleView?: () => void;
  isCoachViewing?: boolean;
}

export function StudentView({ onToggleView, isCoachViewing = false }: StudentViewProps) {
  const {
    participants,
    classSession,
    viewMode,
    isLocalVideoOn,
    isLocalAudioOn,
    spotlightedParticipant,
    elapsedTime,
    exerciseTimer,
    setViewMode,
    formatTime,
    getCurrentUser,
    getSpotlightedParticipant,
    sdk,
  } = useFitnessPlatformContext();

  const isMobile = useIsMobile();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentUser = getCurrentUser();
  const spotlightedUser = getSpotlightedParticipant();
  const coachParticipant = participants.find(p => p.isHost);

  const handleToggleVideo = async () => {
    try {
      console.log('🎥 Student toggling video:', { currentState: isLocalVideoOn });
      await sdk.toggleVideo();
      console.log('✅ Video toggle completed');
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
    }
  };

  const handleToggleAudio = async () => {
    try {
      console.log('🎤 Student toggling audio:', { currentState: isLocalAudioOn });
      await sdk.toggleAudio();
      console.log('✅ Audio toggle completed');
    } catch (error) {
      console.error('❌ Failed to toggle audio:', error);
    }
  };

  const handleSwitchView = () => {
    if (viewMode === 'spotlight') {
      setViewMode('gallery');
    } else {
      setViewMode('spotlight');
    }
  };

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave the class?')) {
      // Mock leave functionality
      console.log('Leaving class...');
    }
  };

  // Handle different coach modes for student view
  if (classSession.coachMode === 'teach') {
    return (
      <div className="h-screen bg-fitness-dark flex flex-col">
        {/* Top Bar */}
        <TopBar
          classSession={classSession}
          elapsedTime={elapsedTime}
          exerciseTimer={exerciseTimer}
          participantCount={participants.length}
          formatTime={formatTime}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onToggleView={onToggleView}
          currentView="student"
        />

        {/* Teach Mode View */}
        <TeachModeView
          classSession={classSession}
          coachParticipant={coachParticipant}
          userRole="student"
          studentLevel={currentUser?.level}
        />

        {/* Control Bar */}
        <ControlBar
          userRole="student"
          isLocalVideoOn={isLocalVideoOn}
          isLocalAudioOn={isLocalAudioOn}
          hasRaisedHand={currentUser?.hasRaisedHand || false}
          viewMode={viewMode}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onRaiseHand={sdk.raiseHand}
          onToggleChat={() => setIsSidePanelOpen(!isSidePanelOpen)}
          onSwitchView={handleSwitchView}
          onLeave={handleLeave}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    );
  }

  if (classSession.coachMode === 'workout') {
    return (
      <div className="h-screen bg-fitness-dark flex flex-col">
        {/* Top Bar */}
        <TopBar
          classSession={classSession}
          elapsedTime={elapsedTime}
          exerciseTimer={exerciseTimer}
          participantCount={participants.length}
          formatTime={formatTime}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onToggleView={onToggleView}
          currentView="student"
        />

        {/* Workout Mode View */}
        <WorkoutModeStudentView
          classSession={classSession}
          currentUser={currentUser}
          coachParticipant={coachParticipant}
          exerciseTimer={exerciseTimer}
          formatTime={formatTime}
        />

        {/* Control Bar */}
        <ControlBar
          userRole="student"
          isLocalVideoOn={isLocalVideoOn}
          isLocalAudioOn={isLocalAudioOn}
          hasRaisedHand={currentUser?.hasRaisedHand || false}
          viewMode={viewMode}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onRaiseHand={sdk.raiseHand}
          onToggleChat={() => setIsSidePanelOpen(!isSidePanelOpen)}
          onSwitchView={handleSwitchView}
          onLeave={handleLeave}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    );
  }

  // Default/fallback view for students
  return (
    <div className="h-screen bg-fitness-dark flex flex-col">
      {/* Top Bar */}
      <TopBar
        classSession={classSession}
        elapsedTime={elapsedTime}
        exerciseTimer={exerciseTimer}
        participantCount={participants.length}
        formatTime={formatTime}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onToggleView={onToggleView}
        currentView="student"
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <VideoArea
          participants={participants}
          viewMode={viewMode}
          spotlightedParticipant={spotlightedParticipant}
          userRole="student"
        />

        {/* Desktop Side Panel */}
        {!isMobile && (
          <SidePanel
            participants={participants}
            userRole="student"
            isVisible={isSidePanelOpen}
            onClose={() => setIsSidePanelOpen(false)}
          />
        )}
      </div>

      {/* Mobile Side Panel as Sheet */}
      {isMobile && (
        <Sheet open={isSidePanelOpen} onOpenChange={setIsSidePanelOpen}>
          <SheetContent side="bottom" className="h-[80vh] bg-fitness-gray border-gray-700 p-0">
            <SheetTitle className="sr-only">Class Panel</SheetTitle>
            <SheetDescription className="sr-only">
              Access health notes and chat for the fitness class
            </SheetDescription>
            <SidePanel
              participants={participants}
              userRole="student"
              isVisible={true}
              onClose={() => setIsSidePanelOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Control Bar */}
      <ControlBar
        userRole="student"
        isLocalVideoOn={isLocalVideoOn}
        isLocalAudioOn={isLocalAudioOn}
        hasRaisedHand={currentUser?.hasRaisedHand || false}
        viewMode={viewMode}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onRaiseHand={sdk.raiseHand}
        onToggleChat={() => setIsSidePanelOpen(!isSidePanelOpen)}
        onSwitchView={handleSwitchView}
        onLeave={handleLeave}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}