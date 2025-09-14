import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomSDKService } from '../services/zoomSDKService';
import { Participant, StudentLevel } from '../types/fitness-platform';
import { VideoCanvas } from './VideoCanvas';
import { useFitnessPlatform } from '../context/FitnessPlatformContext';

interface VideoGalleryProps {
  participants: Participant[];
  zoomSDK: ZoomSDKService | null;
  maxTiles?: number;
  highlightedLevel?: StudentLevel | null;
  onSpotlightParticipant?: (participantId: string) => void;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({
  participants,
  zoomSDK,
  maxTiles = 49,
  highlightedLevel = null,
  onSpotlightParticipant,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [tilesPerPage, setTilesPerPage] = useState(25);
  const [tileSize, setTileSize] = useState({ width: 160, height: 90 });
  const { currentUser, viewMode } = useFitnessPlatform();

  // Filter and sort participants
  const displayParticipants = useMemo(() => {
    let filtered = [...participants];

    // Sort: Host first, then by level, then by name
    filtered.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;

      // Group by level if highlighting
      if (highlightedLevel) {
        const aHighlighted = a.level === highlightedLevel;
        const bHighlighted = b.level === highlightedLevel;
        if (aHighlighted && !bHighlighted) return -1;
        if (!aHighlighted && bHighlighted) return 1;
      }

      return a.name.localeCompare(b.name);
    });

    return filtered.slice(0, maxTiles);
  }, [participants, highlightedLevel, maxTiles]);

  // Calculate optimal grid layout
  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const participantCount = Math.min(displayParticipants.length, tilesPerPage);

    if (participantCount === 0) return;

    // Calculate optimal grid dimensions
    let cols = Math.ceil(Math.sqrt(participantCount * (containerWidth / containerHeight)));
    let rows = Math.ceil(participantCount / cols);

    // Adjust for better aspect ratio
    while (cols * rows > participantCount + cols) {
      rows--;
    }

    // Calculate tile dimensions
    const tileWidth = Math.floor(containerWidth / cols) - 8; // 8px for margins
    const tileHeight = Math.floor(containerHeight / rows) - 8;

    // Maintain 16:9 aspect ratio
    const aspectRatio = 16 / 9;
    let finalWidth = tileWidth;
    let finalHeight = tileHeight;

    if (tileWidth / tileHeight > aspectRatio) {
      finalWidth = Math.floor(tileHeight * aspectRatio);
    } else {
      finalHeight = Math.floor(tileWidth / aspectRatio);
    }

    setTileSize({ width: finalWidth, height: finalHeight });

    // Adjust tiles per page based on available space
    const maxTilesVisible = cols * rows;
    setTilesPerPage(Math.min(maxTilesVisible, 25)); // Cap at 25 for performance
  }, [displayParticipants.length, tilesPerPage]);

  // Recalculate layout on resize
  useEffect(() => {
    calculateLayout();

    const handleResize = () => {
      calculateLayout();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateLayout]);

  // Handle spotlight event
  useEffect(() => {
    const handleSpotlight = (event: CustomEvent) => {
      if (onSpotlightParticipant) {
        onSpotlightParticipant(event.detail.participantId);
      }
    };

    window.addEventListener('spotlight-participant' as any, handleSpotlight);
    return () => window.removeEventListener('spotlight-participant' as any, handleSpotlight);
  }, [onSpotlightParticipant]);

  // Pagination
  const totalPages = Math.ceil(displayParticipants.length / tilesPerPage);
  const paginatedParticipants = displayParticipants.slice(
    currentPage * tilesPerPage,
    (currentPage + 1) * tilesPerPage
  );

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // Group participants by level for visual organization
  const groupedParticipants = useMemo(() => {
    if (!highlightedLevel) return { all: paginatedParticipants };

    const groups: Record<string, Participant[]> = {
      highlighted: [],
      others: [],
    };

    paginatedParticipants.forEach(p => {
      if (p.level === highlightedLevel) {
        groups.highlighted.push(p);
      } else {
        groups.others.push(p);
      }
    });

    return groups;
  }, [paginatedParticipants, highlightedLevel]);

  return (
    <div className="relative w-full h-full bg-gray-900 p-2" ref={containerRef}>
      {/* Gallery Grid */}
      <div className="h-full flex flex-col">
        {/* Highlighted Level Section */}
        {highlightedLevel && groupedParticipants.highlighted.length > 0 && (
          <div className="mb-2">
            <div className="text-white text-sm font-medium mb-1 px-2">
              {highlightedLevel.charAt(0).toUpperCase() + highlightedLevel.slice(1)} Level
            </div>
            <div className="flex flex-wrap gap-2 justify-center p-2 bg-gray-800 rounded-lg">
              {groupedParticipants.highlighted.map(participant => (
                <VideoCanvas
                  key={participant.id}
                  participant={participant}
                  width={tileSize.width}
                  height={tileSize.height}
                  showControls={currentUser?.role === 'coach'}
                  className="shadow-lg ring-2 ring-yellow-500"
                  zoomSDK={zoomSDK}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Gallery */}
        <div className="flex-1 flex flex-wrap gap-2 justify-center content-center overflow-hidden">
          {(highlightedLevel ? groupedParticipants.others : paginatedParticipants).map(participant => (
            <VideoCanvas
              key={participant.id}
              participant={participant}
              width={tileSize.width}
              height={tileSize.height}
              showControls={currentUser?.role === 'coach'}
              className={`shadow-lg transition-all duration-200 ${
                participant.isHost ? 'ring-2 ring-blue-500' : ''
              } ${
                participant.hasRaisedHand ? 'ring-2 ring-yellow-500 animate-pulse' : ''
              }`}
              zoomSDK={zoomSDK}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-2 flex justify-center items-center space-x-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
            <span className="text-white text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Performance Indicator */}
      {displayParticipants.length > 25 && (
        <div className="absolute top-2 right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
          Optimized View: {displayParticipants.length} participants
        </div>
      )}

      {/* Empty State */}
      {displayParticipants.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.5-4.5M19.5 5.5L15 10M15 10l4.5 4.5M19.5 14.5L15 10M15 10H9m6 0v6m0-6V4" />
            </svg>
            <p className="text-gray-400 text-lg">No participants yet</p>
            <p className="text-gray-500 text-sm mt-2">Waiting for participants to join...</p>
          </div>
        </div>
      )}
    </div>
  );
};