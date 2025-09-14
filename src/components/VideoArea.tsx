import { Participant, ViewMode, UserRole, StudentLevel } from '../types/fitness-platform';
import { ParticipantTile } from './ParticipantTile';

interface VideoAreaProps {
  participants: Participant[];
  viewMode: ViewMode;
  spotlightedParticipant: string;
  userRole: UserRole;
  highlightedLevel?: StudentLevel | null;
  onSpotlight?: (participantId: string) => void;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
}

export function VideoArea({
  participants,
  viewMode,
  spotlightedParticipant,
  userRole,
  highlightedLevel,
  onSpotlight,
  onMute,
  onRemove
}: VideoAreaProps) {
  const spotlightedUser = participants.find(p => p.id === spotlightedParticipant);
  const otherParticipants = participants.filter(p => p.id !== spotlightedParticipant);

  if (viewMode === 'spotlight') {
    return (
      <div className="flex-1 bg-black p-2 md:p-4 flex flex-col md:flex-row gap-2 md:gap-4">
        {/* Main Spotlight Video */}
        <div className="flex-1 flex items-center justify-center">
          {spotlightedUser && (
            <ParticipantTile
              participant={spotlightedUser}
              userRole={userRole}
              isSpotlighted={true}
              size="large"
              onSpotlight={onSpotlight}
              onMute={onMute}
              onRemove={onRemove}
            />
          )}
        </div>

        {/* Participant Filmstrip - Horizontal on mobile, vertical on desktop */}
        {otherParticipants.length > 0 && (
          <div className="w-full md:w-48 flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-y-auto md:overflow-x-visible">
            <h4 className="hidden md:block text-white text-sm font-medium px-2">Participants</h4>
            <div className="flex flex-row md:flex-col gap-2 md:gap-3">
              {otherParticipants.map((participant) => (
                <div key={participant.id} className="flex-shrink-0 w-20 md:w-auto">
                  <ParticipantTile
                    participant={participant}
                    userRole={userRole}
                    size="small"
                    onSpotlight={onSpotlight}
                    onMute={onMute}
                    onRemove={onRemove}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gallery View - Group by levels for coach
  if (userRole === 'coach') {
    const students = participants.filter(p => !p.isHost);
    const coach = participants.find(p => p.isHost);
    
    // Group participants by level
    const groupedParticipants = students.reduce((groups, participant) => {
      const level = participant.level || 'unassigned';
      if (!groups[level]) {
        groups[level] = [];
      }
      groups[level].push(participant);
      return groups;
    }, {} as Record<string, Participant[]>);

    const levelColors = {
      beginner: 'ring-blue-500',
      intermediate: 'ring-yellow-500', 
      advanced: 'ring-red-500',
      unassigned: 'ring-gray-500'
    };

    // Get highlighted participants or show coach by default
    const highlightedParticipants = highlightedLevel ? groupedParticipants[highlightedLevel] || [] : [];
    const showHighlightedGroup = highlightedLevel && highlightedParticipants.length > 0;

    // Grid layout helper for highlighted group (Zoom-like layout)
    const getHighlightedGridLayout = (count: number) => {
      if (count === 1) return 'grid-cols-1 place-items-center max-w-md mx-auto';
      if (count === 2) return 'grid-cols-2 max-w-4xl mx-auto';
      if (count === 3) return 'grid-cols-3 max-w-6xl mx-auto';
      if (count === 4) return 'grid-cols-2 grid-rows-2 max-w-4xl mx-auto';
      if (count <= 6) return 'grid-cols-3 grid-rows-2 max-w-6xl mx-auto';
      if (count <= 9) return 'grid-cols-3 grid-rows-3 max-w-6xl mx-auto';
      if (count <= 12) return 'grid-cols-4 grid-rows-3 max-w-7xl mx-auto';
      return 'grid-cols-4 max-w-7xl mx-auto';
    };

    return (
      <div className="flex-1 bg-black flex flex-col min-w-0">
        {/* Horizontal Participants Strip - Zoom-inspired */}
        <div className="flex-shrink-0 px-2 md:px-4 pt-2 md:pt-4 pb-2">
          <div className="bg-gray-900/50 rounded-lg p-2 md:p-3 border border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-white text-xs md:text-sm font-medium">Participants</h4>
                <span className="text-xs text-gray-400">({participants.length})</span>
              </div>
              {highlightedLevel && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${levelColors[highlightedLevel].replace('ring-', 'bg-')}`} />
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {highlightedLevel.charAt(0).toUpperCase() + highlightedLevel.slice(1)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="-mx-2 px-2 overflow-x-auto">
              <div className="flex gap-1 md:gap-2 pb-2 min-w-max">
                {/* Coach first with special styling */}
                {coach && (
                  <div className="flex-shrink-0 w-16 md:w-20 relative">
                    <ParticipantTile
                      participant={coach}
                      userRole={userRole}
                      size="small"
                      isSpotlighted={coach.id === spotlightedParticipant}
                      onSpotlight={onSpotlight}
                      onMute={onMute}
                      onRemove={onRemove}
                      className="ring-2 ring-fitness-green shadow-lg shadow-fitness-green/20"
                    />
                    <div className="absolute -top-1 -right-1 bg-fitness-green text-black text-xs px-1 rounded-full font-bold">
                      👑
                    </div>
                  </div>
                )}
                
                {/* Students grouped by level */}
                {Object.entries(groupedParticipants).map(([level, levelParticipants]) => (
                  levelParticipants.map((participant) => {
                    const isInHighlightedGroup = highlightedLevel && level === highlightedLevel;
                    const isHighlightedButNotInGroup = highlightedLevel && !isInHighlightedGroup;
                    
                    return (
                      <div key={participant.id} className="flex-shrink-0 w-16 md:w-20 relative">
                        <ParticipantTile
                          participant={participant}
                          userRole={userRole}
                          size="small"
                          isSpotlighted={participant.id === spotlightedParticipant}
                          onSpotlight={onSpotlight}
                          onMute={onMute}
                          onRemove={onRemove}
                          className={`transition-all duration-300 ${
                            isHighlightedButNotInGroup ? 'opacity-30 scale-90' : 'opacity-100 scale-100'
                          } ${
                            isInHighlightedGroup ? `${levelColors[level as keyof typeof levelColors]} ring-2 shadow-md` : ''
                          }`}
                        />
                        {/* Level indicator dot */}
                        <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-gray-900 ${
                          levelColors[level as keyof typeof levelColors].replace('ring-', 'bg-')
                        }`} />
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-2 md:p-4 overflow-auto">
          {showHighlightedGroup ? (
            /* Highlighted Group Display */
            <div className="w-full h-full flex flex-col">
              <div className="bg-gray-900/30 rounded-lg p-3 md:p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4 md:mb-6 flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full ${levelColors[highlightedLevel].replace('ring-', 'bg-')}`} />
                  <h3 className="text-white text-lg md:text-xl font-medium">
                    {highlightedLevel.charAt(0).toUpperCase() + highlightedLevel.slice(1)} Group
                  </h3>
                  <span className="text-gray-400 text-sm md:text-base">({highlightedParticipants.length} participants)</span>
                </div>
                
                {/* Desktop Grid Layout */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                  <div className={`grid gap-6 ${getHighlightedGridLayout(highlightedParticipants.length)}`}>
                    {highlightedParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-center">
                        <ParticipantTile
                          participant={participant}
                          userRole={userRole}
                          size="large"
                          isSpotlighted={participant.id === spotlightedParticipant}
                          onSpotlight={onSpotlight}
                          onMute={onMute}
                          onRemove={onRemove}
                          className={`${levelColors[participant.level || 'unassigned']} ring-2 ring-opacity-80 shadow-lg`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Vertical Stack Layout */}
                <div className="md:hidden flex-1 overflow-y-auto">
                  <div className="space-y-4 pb-4">
                    {highlightedParticipants.map((participant, index) => (
                      <div key={participant.id} className="flex-shrink-0">
                        {/* Participant Video */}
                        <div className="h-48 sm:h-56 mb-3">
                          <ParticipantTile
                            participant={participant}
                            userRole={userRole}
                            size="large"
                            isSpotlighted={participant.id === spotlightedParticipant}
                            onSpotlight={onSpotlight}
                            onMute={onMute}
                            onRemove={onRemove}
                            className={`w-full h-full ${levelColors[participant.level || 'unassigned']} ring-2 ring-opacity-80 shadow-lg`}
                          />
                        </div>
                        
                        {/* Participant Info Bar */}
                        <div className="px-2 pb-2">
                          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-sm">
                                {participant.name}
                              </span>
                              {participant.level && (
                                <div className={`text-xs px-2 py-1 rounded-full font-bold ${
                                  participant.level === 'beginner' ? 'bg-blue-500 text-white' :
                                  participant.level === 'intermediate' ? 'bg-yellow-500 text-black' :
                                  participant.level === 'advanced' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                                }`}>
                                  {participant.level.charAt(0).toUpperCase() + participant.level.slice(1)}
                                </div>
                              )}
                              {participant.variation && (
                                <div className="bg-fitness-green text-black text-xs px-2 py-1 rounded-full font-bold">
                                  {participant.variation}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {participant.repCount && (
                                <div className="bg-fitness-orange text-black text-xs px-2 py-1 rounded-full font-bold">
                                  {participant.repCount} reps
                                </div>
                              )}
                              {participant.hasRaisedHand && (
                                <div className="text-fitness-orange animate-bounce">
                                  ✋
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  participant.connectionQuality === 'excellent' ? 'bg-fitness-green' :
                                  participant.connectionQuality === 'good' ? 'bg-yellow-400' :
                                  'bg-red-400'
                                }`} />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Divider between participants (except last) */}
                        {index < highlightedParticipants.length - 1 && (
                          <div className="h-px bg-gray-700/50 mx-4 my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Default Coach Display */
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                {coach && (
                  <ParticipantTile
                    participant={coach}
                    userRole={userRole}
                    isSpotlighted={coach.id === spotlightedParticipant}
                    size="large"
                    onSpotlight={onSpotlight}
                    onMute={onMute}
                    onRemove={onRemove}
                    className="ring-2 ring-fitness-green"
                  />
                )}
                <p className="text-gray-400 text-center max-w-md">
                  Select a group from the side panel to highlight participants
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Zoom-inspired Mobile Gallery View for students
  const coach = participants.find(p => p.isHost);
  const students = participants.filter(p => !p.isHost);
  
  // Mobile-first layout with Zoom patterns
  return (
    <div className="flex-1 bg-black flex flex-col">
      {/* Mobile: Horizontal participant filmstrip (Zoom-style) */}
      <div className="flex-shrink-0 lg:hidden">
        <div className="bg-gray-900/30 p-2 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-white text-xs font-medium">Participants</h4>
            <span className="text-xs text-gray-400">({participants.length})</span>
          </div>
          <div className="-mx-2 px-2 overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-max">
              {participants.map((participant, index) => (
                <div key={participant.id} className="flex-shrink-0 w-16">
                  <ParticipantTile
                    participant={participant}
                    userRole={userRole}
                    size="small"
                    isSpotlighted={participant.id === spotlightedParticipant}
                    onSpotlight={onSpotlight}
                    onMute={onMute}
                    onRemove={onRemove}
                    className={`${participant.isHost ? 'ring-2 ring-fitness-green' : ''} ${
                      highlightedLevel && participant.level && highlightedLevel !== participant.level 
                        ? 'opacity-40' 
                        : 'opacity-100'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 overflow-hidden">
        {/* Mobile Layout - Optimized Vertical Stacking */}
        <div className="h-full lg:hidden">
          {/* Vertical Stack Layout - Better space utilization */}
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex-1 p-2 space-y-3">
              {participants.map((participant, index) => {
                const isCoach = participant.isHost;
                const isFirst = index === 0;
                const isSpotlightedOrCoach = participant.id === spotlightedParticipant || isCoach;
                
                return (
                  <div 
                    key={participant.id} 
                    className={`flex-shrink-0 ${
                      isSpotlightedOrCoach && isFirst 
                        ? 'h-56 sm:h-64' // Larger for featured participant
                        : participants.length <= 3 
                          ? 'h-48 sm:h-56' // Medium size for small groups
                          : 'h-40 sm:h-48' // Compact for larger groups
                    }`}
                  >
                    <ParticipantTile
                      participant={participant}
                      userRole={userRole}
                      size={isSpotlightedOrCoach && isFirst ? "large" : participants.length <= 3 ? "medium" : "medium"}
                      isSpotlighted={participant.id === spotlightedParticipant}
                      onSpotlight={onSpotlight}
                      onMute={onMute}
                      onRemove={onRemove}
                      className={`w-full h-full ${isCoach ? 'ring-2 ring-fitness-green shadow-lg shadow-fitness-green/20' : ''} ${
                        highlightedLevel && participant.level && highlightedLevel !== participant.level 
                          ? 'opacity-40' 
                          : 'opacity-100'
                      } ${isSpotlightedOrCoach ? 'ring-2 ring-fitness-orange ring-opacity-60' : ''}`}
                    />
                    
                    {/* Participant info overlay for mobile */}
                    <div className="mt-1 px-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate max-w-32">
                            {participant.name}
                          </span>
                          {isCoach && (
                            <div className="bg-fitness-green text-black text-xs px-2 py-0.5 rounded-full font-bold">
                              COACH
                            </div>
                          )}
                          {participant.level && (
                            <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              participant.level === 'beginner' ? 'bg-blue-500 text-white' :
                              participant.level === 'intermediate' ? 'bg-yellow-500 text-black' :
                              participant.level === 'advanced' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                            }`}>
                              {participant.level.charAt(0).toUpperCase() + participant.level.slice(1)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {participant.repCount && (
                            <div className="bg-fitness-orange text-black text-xs px-2 py-0.5 rounded-full font-bold">
                              {participant.repCount} reps
                            </div>
                          )}
                          {participant.hasRaisedHand && (
                            <div className="text-fitness-orange">
                              ✋
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Empty state message for better UX */}
              {participants.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">👥</div>
                    <p>No participants yet</p>
                    <p className="text-sm">Waiting for others to join...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick stats footer */}
            <div className="flex-shrink-0 bg-gray-900/30 p-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3">
                  <span>{participants.filter(p => p.isVideoOn).length} video on</span>
                  <span>{participants.filter(p => p.isAudioOn).length} audio on</span>
                  {highlightedLevel && (
                    <span className="text-fitness-orange">
                      {highlightedLevel} highlighted
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Grid */}
        <div className="hidden lg:block h-full p-4">
          <div className={`grid gap-4 h-full ${
            participants.length <= 2 ? 'grid-cols-2 place-items-center max-w-4xl mx-auto' :
            participants.length <= 4 ? 'grid-cols-2 grid-rows-2 max-w-4xl mx-auto' :
            participants.length <= 6 ? 'grid-cols-3 grid-rows-2 max-w-6xl mx-auto' :
            participants.length <= 9 ? 'grid-cols-3 grid-rows-3 max-w-6xl mx-auto' :
            'grid-cols-4 max-w-7xl mx-auto'
          }`}>
            {participants.map((participant) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                userRole={userRole}
                size="medium"
                isSpotlighted={participant.id === spotlightedParticipant}
                onSpotlight={onSpotlight}
                onMute={onMute}
                onRemove={onRemove}
                className={`${participant.isHost ? 'ring-2 ring-fitness-green' : ''} ${
                  highlightedLevel && participant.level && highlightedLevel !== participant.level 
                    ? 'opacity-40' 
                    : 'opacity-100'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}