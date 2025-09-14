import { Participant, StudentLevel } from '../types/fitness-platform';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ParticipantTile } from './ParticipantTile';
import { 
  Users, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface StudentLevelGroupsProps {
  participants: Participant[];
  highlightedLevel: StudentLevel | null;
  onHighlightLevel: (level: StudentLevel | null) => void;
  userRole: 'coach' | 'student';
  onSpotlight?: (participantId: string) => void;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
}

export function StudentLevelGroups({
  participants,
  highlightedLevel,
  onHighlightLevel,
  userRole,
  onSpotlight,
  onMute,
  onRemove,
}: StudentLevelGroupsProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<StudentLevel>>(
    new Set(['beginner', 'intermediate', 'advanced'])
  );

  const levels: StudentLevel[] = ['beginner', 'intermediate', 'advanced'];
  
  const getParticipantsByLevel = (level: StudentLevel) => {
    return participants.filter(p => p.level === level);
  };

  const getLevelColor = (level: StudentLevel) => {
    switch (level) {
      case 'beginner': return 'bg-blue-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelLabel = (level: StudentLevel) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const toggleGroupExpansion = (level: StudentLevel) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const handleHighlightToggle = (level: StudentLevel) => {
    if (highlightedLevel === level) {
      onHighlightLevel(null);
    } else {
      onHighlightLevel(level);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Student Groups</h3>
        {highlightedLevel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHighlightLevel(null)}
            className="text-gray-400 hover:text-white"
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Clear Highlight
          </Button>
        )}
      </div>

      {levels.map(level => {
        const levelParticipants = getParticipantsByLevel(level);
        const isExpanded = expandedGroups.has(level);
        const isHighlighted = highlightedLevel === level;
        
        if (levelParticipants.length === 0) return null;

        return (
          <div 
            key={level} 
            className={`border rounded-lg transition-all duration-200 ${
              isHighlighted 
                ? 'border-fitness-orange bg-fitness-orange/10' 
                : 'border-gray-600 bg-gray-800/50'
            }`}
          >
            {/* Group Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroupExpansion(level)}
                  className="p-0 h-auto text-white hover:bg-transparent"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getLevelColor(level)}`} />
                  <span className="text-white font-medium">
                    {getLevelLabel(level)}
                  </span>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    {levelParticipants.length}
                  </Badge>
                </div>
              </div>

              {/* Group Actions */}
              <div className="flex items-center gap-2">
                {userRole === 'coach' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHighlightToggle(level)}
                    className={`h-8 px-2 ${
                      isHighlighted 
                        ? 'bg-fitness-orange text-black hover:bg-fitness-orange/90' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {isHighlighted ? 'Highlighted' : 'Highlight'}
                  </Button>
                )}
              </div>
            </div>

            {/* Participants List */}
            {isExpanded && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {levelParticipants.map(participant => (
                    <ParticipantTile
                      key={participant.id}
                      participant={participant}
                      userRole={userRole}
                      size="small"
                      onSpotlight={onSpotlight}
                      onMute={onMute}
                      onRemove={onRemove}
                      className={`transition-opacity duration-200 ${
                        highlightedLevel && highlightedLevel !== level ? 'opacity-30' : 'opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}