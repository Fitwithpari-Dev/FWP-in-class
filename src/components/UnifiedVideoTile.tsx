// Unified Video Tile - Works with Both Zoom and Agora Services
// Automatically detects video service and renders appropriately

import React, { useRef, useEffect, useState } from 'react';
import { VideoParticipant } from '../types/video-service';
import { Mic, MicOff, Video, VideoOff, Crown } from 'lucide-react';
import { useFitnessPlatformContext } from '../context/FitnessPlatformContext';
import { VIDEO_SERVICE } from '../config/video.config';
import { AgoraVideoTile } from './AgoraVideoTile';

interface UnifiedVideoTileProps {
  participant: VideoParticipant;
  isLocal?: boolean;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
}

export const UnifiedVideoTile: React.FC<UnifiedVideoTileProps> = ({
  participant,
  isLocal = false,
  className = '',
  priority = 'medium'
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isVideoRendering, setIsVideoRendering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { videoService } = useFitnessPlatformContext();

  // Effect to handle video rendering based on service type
  useEffect(() => {
    if (!videoRef.current || !videoService || !participant.isVideoOn) {
      setIsVideoRendering(false);
      return;
    }

    let mounted = true;

    const renderVideo = async () => {
      try {
        setHasError(false);

        console.log(`🎬 UnifiedVideoTile: Rendering video for ${participant.name} using ${videoService.serviceName}`);

        // Render video using the service's renderVideo method
        await videoService.renderVideo(participant.id, videoRef.current!);

        if (mounted) {
          setIsVideoRendering(true);
          console.log(`✅ UnifiedVideoTile: Video rendered successfully for ${participant.name}`);
        }

      } catch (error) {
        console.error(`❌ UnifiedVideoTile: Failed to render video for ${participant.name}:`, error);

        if (mounted) {
          setHasError(true);
          setIsVideoRendering(false);
        }
      }
    };

    renderVideo();

    // Cleanup function
    return () => {
      mounted = false;

      if (videoService && participant.id) {
        videoService.stopRenderingVideo(participant.id).catch(console.warn);
      }
    };

  }, [videoService, participant.id, participant.isVideoOn, participant.name]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // For Agora service with working video, render directly
  if (VIDEO_SERVICE === 'agora' && videoService?.serviceName === 'Agora RTC SDK' && participant.isVideoOn) {
    // The video rendering will be handled by the useEffect above through videoService.renderVideo()
    // This ensures we use the working Agora video functionality
  }

  // Default unified video tile for Zoom or fallback
  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className} unified-video-tile`}>
      {/* Video container with explicit dimensions for Zoom SDK compatibility */}
      <div
        ref={videoRef}
        className="w-full h-full min-h-[200px] bg-gray-800"
        style={{
          minHeight: '200px',
          minWidth: '300px',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />

      {/* Video off overlay */}
      {(!participant.isVideoOn || !isVideoRendering) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xl text-white font-semibold">
                {getInitials(participant.name)}
              </span>
            </div>
            <p className="text-white text-sm font-medium">{participant.name}</p>
            {!participant.isVideoOn && (
              <p className="text-gray-400 text-xs mt-1">Camera off</p>
            )}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
          <div className="text-center">
            <VideoOff className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-white text-sm">Video Error</p>
            <p className="text-red-400 text-xs">Failed to load video</p>
          </div>
        </div>
      )}

      {/* User info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium truncate max-w-[120px]">
              {participant.name}
              {isLocal && <span className="text-green-400 ml-1">(You)</span>}
            </span>
            {participant.isHost && (
              <Crown className="w-4 h-4 text-yellow-400" />
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Audio indicator */}
            <div className={`p-1 rounded-full ${!participant.isAudioOn ? 'bg-red-500' : 'bg-green-500'}`}>
              {!participant.isAudioOn ? (
                <MicOff className="w-3 h-3 text-white" />
              ) : (
                <Mic className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Video indicator */}
            <div className={`p-1 rounded-full ${!participant.isVideoOn ? 'bg-red-500' : 'bg-green-500'}`}>
              {!participant.isVideoOn ? (
                <VideoOff className="w-3 h-3 text-white" />
              ) : (
                <Video className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection quality indicator */}
      <div className="absolute top-2 right-2">
        <div className="flex items-center space-x-1">
          <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
          <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
          <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
        </div>
      </div>

      {/* Service indicator */}
      <div className="absolute top-2 left-2">
        <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
          {VIDEO_SERVICE.toUpperCase()}
        </div>
      </div>

      {/* Local video mirror effect for Zoom */}
      {isLocal && isVideoRendering && VIDEO_SERVICE === 'zoom' && (
        <style>{`
          .unified-video-tile video {
            transform: scaleX(-1); /* Mirror local video for Zoom */
          }
        `}</style>
      )}
    </div>
  );
};