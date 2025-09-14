import { useState } from 'react';
import { useFitnessPlatformContext } from '../App';
import { TopBar } from './TopBar';
import { VideoArea } from './VideoArea';
import { ControlBar } from './ControlBar';
import { SidePanel } from './SidePanel';
import { SettingsModal } from './SettingsModal';
import { TeachModeView } from './TeachModeView';
import { StudentLevelGroups } from './StudentLevelGroups';
import { useIsMobile } from './ui/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

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
    mockSDK,
  } = useFitnessPlatformContext();

  const isMobile = useIsMobile();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(!isMobile); // Default closed on mobile
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentUser = getCurrentUser();
  const coachParticipant = participants.find(p => p.isHost);

  const handleToggleVideo = () => {
    if (isLocalVideoOn) {
      mockSDK.stopVideo();
    } else {
      mockSDK.startVideo();
    }
  };

  const handleToggleAudio = () => {
    if (isLocalAudioOn) {
      mockSDK.muteLocalAudio();
    } else {
      mockSDK.unmuteLocalAudio();
    }
  };

  const handleSwitchView = () => {
    if (viewMode === 'spotlight') {
      mockSDK.switchToGalleryView();
    } else {
      mockSDK.switchToSpotlightView(spotlightedParticipant);
    }
  };

  const handleLeave = () => {
    if (confirm('Are you sure you want to end the class for everyone?')) {
      // Mock leave functionality
      console.log('Ending class...');
    }
  };

  const handleCoachModeToggle = (mode: 'teach' | 'workout') => {
    mockSDK.setCoachMode(mode);
  };

  const handleLevelHighlight = (level: 'beginner' | 'intermediate' | 'advanced' | null) => {
    mockSDK.highlightLevel(level);
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

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Coach always sees the standard video area */}
        <VideoArea
          participants={participants}
          viewMode={viewMode}
          spotlightedParticipant={spotlightedParticipant}
          userRole="coach"
          highlightedLevel={highlightedLevel}
          onSpotlight={mockSDK.spotlightParticipant}
          onMute={mockSDK.muteParticipant}
          onRemove={mockSDK.removeParticipant}
        />

        {/* Desktop Side Panel */}
        {!isMobile && (
          <SidePanel
            participants={participants}
            userRole="coach"
            isVisible={isSidePanelOpen}
            onClose={() => setIsSidePanelOpen(false)}
            onSpotlight={mockSDK.spotlightParticipant}
            onMute={mockSDK.muteParticipant}
            onRemove={mockSDK.removeParticipant}
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
              onSpotlight={mockSDK.spotlightParticipant}
              onMute={mockSDK.muteParticipant}
              onRemove={mockSDK.removeParticipant}
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
        hasRaisedHand={currentUser?.hasRaisedHand || false}
        viewMode={viewMode}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onRaiseHand={mockSDK.raiseHand}
        onToggleChat={() => setIsSidePanelOpen(!isSidePanelOpen)}
        onSwitchView={handleSwitchView}
        onMuteAll={mockSDK.muteAll}
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