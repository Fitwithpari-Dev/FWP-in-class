import { useState } from 'react';
import { useFitnessPlatformContext } from '../context/FitnessPlatformContext';
import { TopBar } from './TopBar';
import { VideoArea } from './VideoArea';
import { ControlBar } from './ControlBar';
import { SidePanel } from './SidePanel';
import { SettingsModal } from './SettingsModal';
import { TeachModeView } from './TeachModeView';
import { StudentLevelGroups } from './StudentLevelGroups';
import { SessionInfo } from './SessionInfo';
import { useIsMobile } from './ui/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { VideoDebugPanel } from './VideoDebugPanel';

interface CoachViewProps {
  onToggleView: () => void;
}

export function CoachView({ onToggleView }: CoachViewProps) {
  const {
    participants,
    classSession,
    viewMode,
    isLocalVideoOn,
    isLocalAudioOn,
    spotlightedParticipant,
    elapsedTime,
    exerciseTimer,
    highlightedLevel,
    setViewMode,
    formatTime,
    getCurrentUser,
    getSpotlightedParticipant,
    sdk,
  } = useFitnessPlatformContext();

  const isMobile = useIsMobile();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(!isMobile); // Default closed on mobile
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentUser = getCurrentUser();
  const coachParticipant = participants.find(p => p.isHost);

  const handleToggleVideo = async () => {
    try {
      console.log('🎥 Coach toggling video:', { currentState: isLocalVideoOn });
      await sdk.toggleVideo();
      console.log('✅ Video toggle completed');
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
    }
  };

  const handleToggleAudio = async () => {
    try {
      console.log('🎤 Coach toggling audio:', { currentState: isLocalAudioOn });
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
    if (confirm('Are you sure you want to end the class for everyone?')) {
      // Mock leave functionality
      console.log('Ending class...');
    }
  };

  const handleCoachModeToggle = (mode: 'teach' | 'workout') => {
    sdk.setCoachMode();
  };

  const handleLevelHighlight = (level: 'beginner' | 'intermediate' | 'advanced' | null) => {
    sdk.highlightLevel(level);
  };

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
        currentView="coach"
        onCoachModeToggle={handleCoachModeToggle}
      />

      {/* Session Info for Coach */}
      <div className="px-4">
        <SessionInfo
          sessionId={classSession.id}
          participantCount={participants.length}
          userRole="coach"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Coach always sees the standard video area */}
        <VideoArea
          participants={participants}
          viewMode={viewMode}
          spotlightedParticipant={spotlightedParticipant}
          userRole="coach"
          highlightedLevel={highlightedLevel}
          onSpotlight={sdk.spotlightParticipant}
          onMute={sdk.muteParticipant}
          onRemove={sdk.removeParticipant}
        />

        {/* Desktop Side Panel */}
        {!isMobile && (
          <SidePanel
            participants={participants}
            userRole="coach"
            isVisible={isSidePanelOpen}
            onClose={() => setIsSidePanelOpen(false)}
            onSpotlight={sdk.spotlightParticipant}
            onMute={sdk.muteParticipant}
            onRemove={sdk.removeParticipant}
            highlightedLevel={highlightedLevel}
            onHighlightLevel={handleLevelHighlight}
            showLevelGroups={true}
          />
        )}
      </div>

      {/* Mobile Side Panel as Sheet */}
      {isMobile && (
        <Sheet open={isSidePanelOpen} onOpenChange={setIsSidePanelOpen}>
          <SheetContent side="bottom" className="h-[80vh] bg-fitness-gray border-gray-700 p-0">
            <SheetTitle className="sr-only">Class Panel</SheetTitle>
            <SheetDescription className="sr-only">
              Access groups, health notes, and chat for the fitness class
            </SheetDescription>
            <SidePanel
              participants={participants}
              userRole="coach"
              isVisible={true}
              onClose={() => setIsSidePanelOpen(false)}
              onSpotlight={sdk.spotlightParticipant}
              onMute={sdk.muteParticipant}
              onRemove={sdk.removeParticipant}
              highlightedLevel={highlightedLevel}
              onHighlightLevel={handleLevelHighlight}
              showLevelGroups={true}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Control Bar */}
      <ControlBar
        userRole="coach"
        isLocalVideoOn={isLocalVideoOn}
        isLocalAudioOn={isLocalAudioOn}
        hasRaisedHand={false}
        viewMode={viewMode}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onRaiseHand={sdk.raiseHand}
        onToggleChat={() => setIsSidePanelOpen(!isSidePanelOpen)}
        onSwitchView={handleSwitchView}
        onMuteAll={sdk.muteAll}
        onLeave={handleLeave}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Video Debug Panel - Only show in development */}
      <VideoDebugPanel />
    </div>
  );
}