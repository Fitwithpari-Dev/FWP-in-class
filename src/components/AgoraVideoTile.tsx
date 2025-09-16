import React, { useRef, useEffect, useState } from 'react';
import { IAgoraRTCRemoteUser, ICameraVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { agoraService } from '../services/agoraSDKService';
import { Mic, MicOff, Video, VideoOff, Crown } from 'lucide-react';

interface AgoraVideoTileProps {
  user?: IAgoraRTCRemoteUser;
  localTrack?: ICameraVideoTrack;
  isLocal?: boolean;
  displayName: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  className?: string;
}

export const AgoraVideoTile: React.FC<AgoraVideoTileProps> = ({
  user,
  localTrack,
  isLocal = false,
  displayName,
  isHost = false,
  isMuted = false,
  isVideoOff = false,
  className = ''
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Effect to handle video rendering
  useEffect(() => {
    if (!videoRef.current) return;

    let videoTrack: ICameraVideoTrack | IRemoteVideoTrack | null = null;

    const renderVideo = async () => {
      try {
        setHasError(false);

        if (isLocal && localTrack) {
          // Render local video
          console.log('🎥 Rendering local video track...');
          videoTrack = localTrack;
          localTrack.play(videoRef.current!);
          setIsVideoPlaying(true);
          console.log('✅ Local video rendered successfully');

        } else if (user?.videoTrack && !isLocal) {
          // Render remote video
          console.log('🎥 Rendering remote video track for user:', user.uid);
          videoTrack = user.videoTrack;
          user.videoTrack.play(videoRef.current!);
          setIsVideoPlaying(true);
          console.log('✅ Remote video rendered successfully');

        } else {
          // No video track available
          console.log('📴 No video track available');
          setIsVideoPlaying(false);
        }

      } catch (error) {
        console.error('❌ Error rendering video:', error);
        setHasError(true);
        setIsVideoPlaying(false);
      }
    };

    // Clean up function
    const cleanup = () => {
      if (videoRef.current && videoTrack) {
        try {
          videoTrack.stop?.();
          console.log('🛑 Video track stopped');
        } catch (error) {
          console.warn('⚠️ Error stopping video track:', error);
        }
      }
    };

    // Render video if not disabled
    if (!isVideoOff) {
      renderVideo();
    } else {
      setIsVideoPlaying(false);
    }

    // Cleanup on unmount or dependency change
    return cleanup;

  }, [user, localTrack, isLocal, isVideoOff]);

  // Effect to handle audio
  useEffect(() => {
    if (!isLocal && user?.audioTrack && !isMuted) {
      try {
        console.log('🔊 Playing remote audio for user:', user.uid);
        user.audioTrack.play();
      } catch (error) {
        console.error('❌ Error playing audio:', error);
      }
    }
  }, [user, isLocal, isMuted]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video container */}
      <div
        ref={videoRef}
        className="w-full h-full min-h-[200px] bg-gray-800"
        style={{ minHeight: '200px' }}
      />

      {/* Video off overlay */}
      {(isVideoOff || !isVideoPlaying) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xl text-white font-semibold">
                {getInitials(displayName)}
              </span>
            </div>
            <p className="text-white text-sm font-medium">{displayName}</p>
            {isVideoOff && (
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
              {displayName}
              {isLocal && <span className="text-green-400 ml-1">(You)</span>}
            </span>
            {isHost && (
              <Crown className="w-4 h-4 text-yellow-400" title="Host" />
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Audio indicator */}
            <div className={`p-1 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
              {isMuted ? (
                <MicOff className="w-3 h-3 text-white" />
              ) : (
                <Mic className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Video indicator */}
            <div className={`p-1 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-green-500'}`}>
              {isVideoOff ? (
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

      {/* Local video mirror effect */}
      {isLocal && isVideoPlaying && (
        <style jsx>{`
          .video-container video {
            transform: scaleX(-1); /* Mirror local video */
          }
        `}</style>
      )}
    </div>
  );
};