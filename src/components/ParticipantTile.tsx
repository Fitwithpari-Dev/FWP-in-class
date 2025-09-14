import { Participant, UserRole } from '../types/fitness-platform';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  Hand,
  MoreVertical,
  Pin,
  Zap,
  UserX
} from 'lucide-react';

interface ParticipantTileProps {
  participant: Participant;
  userRole: UserRole;
  isSpotlighted?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onSpotlight?: (participantId: string) => void;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
}

export function ParticipantTile({ 
  participant, 
  userRole, 
  isSpotlighted = false,
  size = 'medium',
  className = '',
  onSpotlight,
  onMute,
  onRemove
}: ParticipantTileProps) {
  const getConnectionIcon = () => {
    switch (participant.connectionQuality) {
      case 'excellent':
        return <Wifi className="w-3 h-3 text-fitness-green" />;
      case 'good':
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <WifiOff className="w-3 h-3 text-red-400" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-20 h-16 sm:w-32 sm:h-24';
      case 'medium':
        return 'w-32 h-24 sm:w-48 sm:h-36';
      case 'large':
        return 'w-64 h-48 sm:w-96 sm:h-72';
    }
  };

  return (
    <div className={`relative bg-fitness-gray rounded-lg overflow-hidden border-2 ${
      isSpotlighted ? 'border-fitness-green' : 'border-gray-700'
    } ${className.includes('!w-') || className.includes('!h-') ? '' : getSizeClasses()} ${className}`}>
      {/* Video/Avatar Area */}
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        {participant.isVideoOn ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <div className={`${
              size === 'small' ? 'text-lg sm:text-2xl' : 
              size === 'medium' ? 'text-2xl sm:text-4xl' : 
              'text-4xl sm:text-6xl'
            } text-white font-bold`}>
              {participant.name.charAt(0)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 sm:gap-2 text-gray-400">
            <VideoOff className={`${
              size === 'small' ? 'w-4 h-4 sm:w-6 sm:h-6' : 
              size === 'medium' ? 'w-6 h-6 sm:w-8 sm:h-8' : 
              'w-8 h-8 sm:w-12 sm:h-12'
            }`} />
            {size !== 'small' && (
              <span className="text-xs sm:text-sm text-center px-1">{participant.name}</span>
            )}
          </div>
        )}
      </div>

      {/* Top Status Bar */}
      <div className="absolute top-1 sm:top-2 left-1 sm:left-2 right-1 sm:right-2 flex justify-between items-center">
        <div className="flex gap-0.5 sm:gap-1 flex-wrap">
          {participant.isHost && (
            <Badge className="bg-fitness-orange text-white text-xs px-1 py-0 scale-75 sm:scale-100">HOST</Badge>
          )}
          {participant.level && (
            <Badge 
              className={`text-white text-xs px-1 py-0 scale-75 sm:scale-100 ${
                participant.level === 'beginner' ? 'bg-blue-500' :
                participant.level === 'intermediate' ? 'bg-yellow-500' :
                participant.level === 'advanced' ? 'bg-red-500' : 'bg-gray-500'
              }`}
            >
              {size === 'small' ? participant.level.charAt(0).toUpperCase() : participant.level.charAt(0).toUpperCase() + participant.level.slice(1)}
            </Badge>
          )}
          {participant.variation && (
            <Badge className="bg-fitness-green text-black text-xs px-1 py-0 scale-75 sm:scale-100">
              {participant.variation}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-0.5 sm:gap-1">
          {getConnectionIcon()}
          {userRole === 'coach' && size !== 'small' && (
            <DropdownMenu>
              <DropdownMenuTrigger className="w-5 h-5 sm:w-6 sm:h-6 bg-black/50 hover:bg-black/70 rounded-md flex items-center justify-center border-0 outline-none focus:bg-black/70 transition-colors">
                <MoreVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onSpotlight?.(participant.id)}>
                  <Zap className="w-4 h-4 mr-2" />
                  Spotlight
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMute?.(participant.id)}>
                  <MicOff className="w-4 h-4 mr-2" />
                  Mute
                </DropdownMenuItem>
                {!participant.isHost && (
                  <DropdownMenuItem 
                    onClick={() => onRemove?.(participant.id)}
                    className="text-red-400"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 sm:p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <span className={`text-white font-medium truncate ${
              size === 'small' ? 'text-xs max-w-12' : 'text-sm max-w-24'
            }`}>
              {participant.name}
            </span>
            {participant.hasRaisedHand && (
              <Hand className="w-3 h-3 sm:w-4 sm:h-4 text-fitness-orange animate-bounce flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {participant.repCount && size !== 'small' && (
              <Badge className="bg-fitness-green text-black text-xs px-1 py-0 scale-75 sm:scale-100">
                {participant.repCount}
              </Badge>
            )}
            {participant.isAudioOn ? (
              <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-fitness-green" />
            ) : (
              <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
            )}
            {participant.isVideoOn ? (
              <Video className="w-3 h-3 sm:w-4 sm:h-4 text-fitness-green" />
            ) : (
              <VideoOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Fitness Overlays */}
      {userRole === 'student' && participant.id === 'current-user' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black/80 rounded-lg p-2 text-center">
            <div className="text-fitness-green text-xs mb-1">Form Check</div>
            <div className="text-white text-lg font-bold">✓ Good</div>
          </div>
        </div>
      )}
    </div>
  );
}