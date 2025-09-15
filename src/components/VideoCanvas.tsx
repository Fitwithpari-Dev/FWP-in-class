import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomSDKService } from '../services/zoomSDKService';
import { Participant } from '../types/fitness-platform';
import { useFitnessPlatform } from '../context/FitnessPlatformContext';

interface VideoCanvasProps {
  participant: Participant;
  width?: number;
  height?: number;
  isSpotlight?: boolean;
  showControls?: boolean;
  className?: string;
  zoomSDK: ZoomSDKService | null;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  participant,
  width = 320,
  height = 180,
  isSpotlight = false,
  showControls = false,
  className = '',
  zoomSDK,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const { currentUser } = useFitnessPlatform();

  // Start rendering video
  useEffect(() => {
    if (!videoRef.current || !zoomSDK || !participant.isVideoOn) {
      return;
    }

    let isMounted = true;

    const startRendering = async () => {
      try {
        setRenderError(null);
        setIsRendering(true);

        await zoomSDK.renderVideo(
          participant.id,
          videoRef.current!,
          width,
          height,
          isSpotlight
        );

        if (isMounted) {
          setIsRendering(true);
        }
      } catch (error) {
        console.error(`Failed to render video for ${participant.name}:`, error);
        if (isMounted) {
          setRenderError('Failed to load video');
          setIsRendering(false);
        }
      }
    };

    startRendering();

    // Cleanup
    return () => {
      isMounted = false;
      if (videoRef.current && zoomSDK) {
        zoomSDK.stopRenderVideo(participant.id, videoRef.current).catch(console.error);
      }
      setIsRendering(false);
    };
  }, [participant.id, participant.isVideoOn, width, height, isSpotlight, zoomSDK]);

  // Handle canvas click for spotlight
  const handleCanvasClick = useCallback(() => {
    if (showControls && currentUser?.role === 'coach') {
      // Trigger spotlight from parent component
      const event = new CustomEvent('spotlight-participant', {
        detail: { participantId: participant.id },
      });
      window.dispatchEvent(event);
    }
  }, [participant.id, showControls, currentUser]);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        width={width}
        height={height}
        className="w-full h-full object-cover"
        onClick={handleCanvasClick}
        style={{ cursor: showControls && currentUser?.role === 'coach' ? 'pointer' : 'default' }}
        autoPlay
        muted
        playsInline
      />

      {/* Overlay when video is off */}
      {!participant.isVideoOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white text-sm">{participant.name}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {participant.isVideoOn && !isRendering && !renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error state */}
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
          <p className="text-white text-sm">{renderError}</p>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-xs font-medium truncate max-w-[150px]">
              {participant.name}
            </span>
            {participant.isHost && (
              <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                Host
              </span>
            )}
            {participant.level && (
              <span className={`text-xs px-1 py-0.5 rounded ${
                participant.level === 'beginner' ? 'bg-green-500' :
                participant.level === 'intermediate' ? 'bg-yellow-500' :
                'bg-red-500'
              } text-white`}>
                {participant.level.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Audio indicator */}
            {!participant.isAudioOn && (
              <div className="bg-red-500 rounded-full p-1">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Hand raised indicator */}
            {participant.hasRaisedHand && (
              <div className="bg-yellow-500 rounded-full p-1 animate-pulse">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V3a1 1 0 011-1z" />
                </svg>
              </div>
            )}

            {/* Connection quality */}
            <div className={`rounded-full p-1 ${
              participant.connectionQuality === 'excellent' ? 'bg-green-500' :
              participant.connectionQuality === 'good' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Health considerations indicator (for coaches) */}
        {currentUser?.role === 'coach' && participant.healthConsiderations && participant.healthConsiderations.length > 0 && (
          <div className="mt-1">
            <span className="bg-orange-500 text-white text-xs px-1 py-0.5 rounded">
              ⚠ Health notes
            </span>
          </div>
        )}

        {/* Rep count display (during workouts) */}
        {participant.repCount !== undefined && (
          <div className="mt-1">
            <span className="text-white text-xs">
              Reps: {participant.repCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};