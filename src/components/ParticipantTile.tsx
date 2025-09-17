import { Participant, UserRole } from '../types/fitness-platform';
import { VideoParticipant } from '../types/video-service';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useRef, useEffect } from 'react';
import { useFitnessPlatformContext } from '../context/FitnessPlatformContext';
import { UnifiedVideoTile } from './UnifiedVideoTile';
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
  const { currentUser, videoService } = useFitnessPlatformContext();
  const videoElementRef = useRef<HTMLVideoElement>(null);

  // Convert Participant to VideoParticipant for unified video service
  const videoParticipant: VideoParticipant = {
    id: String(participant.id),
    name: participant.name,
    isHost: participant.isHost,
    isVideoOn: participant.isVideoOn,
    isAudioOn: participant.isAudioOn,
    role: participant.isHost ? 'coach' : 'student'
  };

  // Effect to handle video rendering with enhanced retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5; // Increased retry attempts
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let renderingInProgress = false;

    const renderParticipantVideo = async () => {
      // Prevent multiple concurrent render attempts
      if (renderingInProgress) {
        console.log(`⏳ Render already in progress for ${participant.name}, skipping...`);
        return;
      }

      console.log(`🎥 ParticipantTile render check for ${participant.name} (${participant.id}):`, {
        isVideoOn: participant.isVideoOn,
        hasVideoElement: !!videoElementRef.current,
        hasVideoService: !!videoService,
        isHost: participant.isHost,
        retryCount,
        renderingInProgress
      });

      if (participant.isVideoOn && videoElementRef.current && videoService) {
        renderingInProgress = true;
        try {
          // Get video element dimensions based on size
          const videoElement = videoElementRef.current;
          const rect = videoElement.getBoundingClientRect();
          const width = rect.width || (size === 'small' ? 160 : size === 'medium' ? 384 : 768);
          const height = rect.height || (size === 'small' ? 120 : size === 'medium' ? 288 : 576);

          // Set video element dimensions
          videoElement.width = width;
          videoElement.height = height;

          // Clear the video element src to ensure fresh rendering
          videoElement.srcObject = null;

          // Add loading state indicator
          videoElement.style.backgroundColor = '#374151'; // Gray background during loading

          // Render video using unified video service (supports both Zoom and Agora)
          console.log(`🎬 Attempting to render video for ${participant.name} (${participant.id}), dimensions: ${width}x${height}`);
          await videoService.renderVideo(participant.id, videoElement);
          console.log(`✅ Successfully rendered video for ${participant.name}`);

          // Clear loading state
          videoElement.style.backgroundColor = '';

          // Reset retry count on success
          retryCount = 0;
        } catch (error) {
          console.error(`❌ Error rendering video for ${participant.name} (${participant.id}):`, error);
          console.error(`❌ Video render error details:`, {
            participantId: participant.id,
            participantName: participant.name,
            isVideoOn: participant.isVideoOn,
            elementDimensions: {
              width: videoElementRef.current?.width,
              height: videoElementRef.current?.height
            },
            errorType: error?.constructor?.name,
            errorMessage: error?.message,
            retryCount,
            maxRetries
          });

          // Enhanced retry logic with different backoff strategies
          if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = retryCount <= 2 ? 500 * retryCount : 2000; // Fast retry first 2 attempts, then slower
            console.log(`🔄 Retrying video render for ${participant.name} (attempt ${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
            retryTimeoutId = setTimeout(() => {
              renderingInProgress = false;
              renderParticipantVideo();
            }, retryDelay);
          } else {
            console.warn(`⚠️ Maximum retry attempts (${maxRetries}) reached for ${participant.name}. Video rendering failed.`);
          }
        } finally {
          if (retryCount === 0 || retryCount >= maxRetries) {
            renderingInProgress = false;
          }
        }
      } else {
        console.log(`🔍 Video not rendering for ${participant.name}:`, {
          videoOn: participant.isVideoOn,
          hasElement: !!videoElementRef.current,
          hasSDK: !!videoService
        });

        // Enhanced state synchronization wait - if video should be on but state isn't updated
        if (!participant.isVideoOn && retryCount < maxRetries && videoElementRef.current && videoService) {
          retryCount++;
          const waitDelay = retryCount <= 2 ? 300 : 1000; // Shorter initial waits for state updates
          console.log(`⏳ Waiting for video state to update for ${participant.name} (attempt ${retryCount}/${maxRetries}) - waiting ${waitDelay}ms...`);
          retryTimeoutId = setTimeout(renderParticipantVideo, waitDelay);
        }
      }
    };

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(renderParticipantVideo, 100);

    // Cleanup when component unmounts or video turns off
    return () => {
      clearTimeout(timeoutId);
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      if (videoElementRef.current && videoService) {
        videoService.stopRenderingVideo(participant.id).catch(console.error);
      }
    };
  }, [participant.isVideoOn, participant.id, participant.name, videoService, isSpotlighted, size]);

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

  const getSizeStyles = () => {
    // Explicit dimensions for video element sizing compatibility with Zoom SDK
    switch (size) {
      case 'small':
        return { minWidth: '160px', minHeight: '120px' };
      case 'medium':
        return { minWidth: '384px', minHeight: '288px' };
      case 'large':
        return { minWidth: '768px', minHeight: '576px' };
    }
  };

  return (
    <div
      className={`relative bg-fitness-gray rounded-lg overflow-hidden border-2 ${
        isSpotlighted ? 'border-fitness-green' : 'border-gray-700'
      } ${className.includes('!w-') || className.includes('!h-') ? '' : getSizeClasses()} ${className}`}
      style={className.includes('!w-') || className.includes('!h-') ? {} : getSizeStyles()}
    >
      {/* Unified Video Tile - Works with Both Zoom and Agora */}
      <UnifiedVideoTile
        participant={videoParticipant}
        isLocal={currentUser?.id === String(participant.id)}
        className="w-full h-full"
      />

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