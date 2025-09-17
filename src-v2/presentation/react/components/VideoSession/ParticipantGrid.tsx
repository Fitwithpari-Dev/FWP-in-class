import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import * as ReactWindow from 'react-window';
import { IVideoService } from '../../../core/interfaces/video-service/IVideoService';
import { Participant } from '../../../core/domain/entities/Participant';
import { ParticipantId } from '../../../core/domain/value-objects/ParticipantId';
import { ParticipantTile } from './ParticipantTile';

interface ParticipantGridProps {
  participants: Participant[];
  currentParticipant: Participant | null;
  spotlightedParticipant: Participant | null;
  viewMode: 'gallery' | 'speaker' | 'spotlight';
  videoService: IVideoService | null;
  isCoach: boolean;
  onSpotlightParticipant: (participantId: ParticipantId) => void;
  onMuteParticipant: (participantId: ParticipantId) => void;
  onRemoveParticipant: (participantId: ParticipantId) => void;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    participants: Participant[];
    currentParticipant: Participant | null;
    videoService: IVideoService | null;
    isCoach: boolean;
    onSpotlightParticipant: (participantId: ParticipantId) => void;
    onMuteParticipant: (participantId: ParticipantId) => void;
    onRemoveParticipant: (participantId: ParticipantId) => void;
    itemsPerRow: number;
  };
}

/**
 * Virtualized Participant Grid
 * Efficiently renders 1000+ participants using react-window
 * Supports multiple view modes optimized for fitness sessions
 */
export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  currentParticipant,
  spotlightedParticipant,
  viewMode,
  videoService,
  isCoach,
  onSpotlightParticipant,
  onMuteParticipant,
  onRemoveParticipant
}) => {
  const gridRef = useRef<ReactWindow.FixedSizeGrid>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combine all participants including current participant
  const allParticipants = useMemo(() => {
    const combined = [...participants];
    if (currentParticipant) {
      // Ensure current participant is always first
      const existingIndex = combined.findIndex(p => p.getId().equals(currentParticipant.getId()));
      if (existingIndex >= 0) {
        combined.splice(existingIndex, 1);
      }
      combined.unshift(currentParticipant);
    }
    return combined;
  }, [participants, currentParticipant]);

  // Calculate optimal grid dimensions based on view mode and participant count
  const { displayParticipants, itemsPerRow, itemHeight, itemWidth } = useMemo(() => {
    const totalParticipants = allParticipants.length;

    switch (viewMode) {
      case 'spotlight':
        // Show only spotlighted participant (large) + thumbnails of others
        if (spotlightedParticipant) {
          const thumbnails = allParticipants.filter(p =>
            !p.getId().equals(spotlightedParticipant.getId())
          ).slice(0, 6); // Max 6 thumbnails

          return {
            displayParticipants: [spotlightedParticipant, ...thumbnails],
            itemsPerRow: 1, // Spotlight takes full width
            itemHeight: 400, // Large spotlight view
            itemWidth: 600
          };
        }
        break;

      case 'speaker':
        // Show active speakers prominently
        const activeSpeakers = allParticipants
          .filter(p => p.isActiveSpeaker() || p.isCoach())
          .slice(0, 4);

        const others = allParticipants
          .filter(p => !p.isActiveSpeaker() && !p.isCoach())
          .slice(0, 8);

        return {
          displayParticipants: [...activeSpeakers, ...others],
          itemsPerRow: Math.min(4, activeSpeakers.length + others.length),
          itemHeight: 180,
          itemWidth: 240
        };

      case 'gallery':
      default:
        // Optimized gallery view for performance
        let participants = allParticipants;
        let perRow = 4;

        if (totalParticipants <= 4) {
          perRow = totalParticipants;
        } else if (totalParticipants <= 9) {
          perRow = 3;
        } else if (totalParticipants <= 16) {
          perRow = 4;
        } else if (totalParticipants <= 25) {
          perRow = 5;
        } else {
          // For large sessions, show high-priority participants first
          const highPriority = getHighPriorityParticipants(allParticipants);
          participants = [...highPriority, ...allParticipants.filter(p =>
            !highPriority.some(hp => hp.getId().equals(p.getId()))
          )];
          perRow = 6;
        }

        return {
          displayParticipants: participants,
          itemsPerRow: perRow,
          itemHeight: 150,
          itemWidth: 200
        };
    }

    // Fallback
    return {
      displayParticipants: allParticipants,
      itemsPerRow: 4,
      itemHeight: 150,
      itemWidth: 200
    };
  }, [allParticipants, viewMode, spotlightedParticipant]);

  // Calculate grid rows
  const totalRows = Math.ceil(displayParticipants.length / itemsPerRow);

  // Grid item renderer
  const GridItem: React.FC<GridItemProps> = useCallback(({
    columnIndex,
    rowIndex,
    style,
    data
  }) => {
    const participantIndex = rowIndex * data.itemsPerRow + columnIndex;
    const participant = data.participants[participantIndex];

    if (!participant) {
      return <div style={style} />;
    }

    const isCurrentParticipant = data.currentParticipant?.getId().equals(participant.getId()) || false;

    return (
      <div style={style}>
        <ParticipantTile
          participant={participant}
          isCurrentParticipant={isCurrentParticipant}
          videoService={data.videoService}
          isCoach={data.isCoach}
          viewMode={viewMode}
          onSpotlight={() => data.onSpotlightParticipant(participant.getId())}
          onMute={() => data.onMuteParticipant(participant.getId())}
          onRemove={() => data.onRemoveParticipant(participant.getId())}
        />
      </div>
    );
  }, [viewMode]);

  // Responsive grid dimensions
  const [gridDimensions, setGridDimensions] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGridDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Scroll to specific participant
  const scrollToParticipant = useCallback((participantId: ParticipantId) => {
    const index = displayParticipants.findIndex(p => p.getId().equals(participantId));
    if (index >= 0 && gridRef.current) {
      const rowIndex = Math.floor(index / itemsPerRow);
      gridRef.current.scrollToItem({ rowIndex, columnIndex: 0 });
    }
  }, [displayParticipants, itemsPerRow]);

  // Auto-scroll to spotlight participant
  useEffect(() => {
    if (spotlightedParticipant && viewMode === 'spotlight') {
      scrollToParticipant(spotlightedParticipant.getId());
    }
  }, [spotlightedParticipant, viewMode, scrollToParticipant]);

  const gridItemData = useMemo(() => ({
    participants: displayParticipants,
    currentParticipant,
    videoService,
    isCoach,
    onSpotlightParticipant,
    onMuteParticipant,
    onRemoveParticipant,
    itemsPerRow
  }), [
    displayParticipants,
    currentParticipant,
    videoService,
    isCoach,
    onSpotlightParticipant,
    onMuteParticipant,
    onRemoveParticipant,
    itemsPerRow
  ]);

  // Handle empty state
  if (displayParticipants.length === 0) {
    return (
      <div className="participant-grid-empty">
        <div className="empty-message">
          <h3>No participants in session</h3>
          <p>Waiting for others to join...</p>
        </div>

        <style jsx>{`
          .participant-grid-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #888;
            text-align: center;
          }

          .empty-message h3 {
            margin: 0 0 8px 0;
            font-weight: 500;
          }

          .empty-message p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="participant-grid-container" ref={containerRef}>
      {/* Performance Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-info">
          <span>Displaying {displayParticipants.length} / {allParticipants.length} participants</span>
          <span>Grid: {totalRows} rows × {itemsPerRow} cols</span>
          <span>Mode: {viewMode}</span>
        </div>
      )}

      {/* Virtualized Grid */}
      <ReactWindow.FixedSizeGrid
        ref={gridRef}
        height={gridDimensions.height}
        width={gridDimensions.width}
        columnCount={itemsPerRow}
        rowCount={totalRows}
        columnWidth={itemWidth}
        rowHeight={itemHeight}
        itemData={gridItemData}
        overscanRowCount={2} // Render 2 extra rows for smooth scrolling
      >
        {GridItem}
      </ReactWindow.FixedSizeGrid>

      <style jsx>{`
        .participant-grid-container {
          height: 100%;
          width: 100%;
          position: relative;
          background: #1a1a1a;
        }

        .performance-info {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: #00ff00;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Scrollbar styling for the grid */
        .participant-grid-container :global(.react-window-scrollbar-vertical) {
          background: #333;
          border-radius: 4px;
        }

        .participant-grid-container :global(.react-window-scrollbar-horizontal) {
          background: #333;
          border-radius: 4px;
        }

        .participant-grid-container :global(.react-window-scrollbar-thumb-vertical),
        .participant-grid-container :global(.react-window-scrollbar-thumb-horizontal) {
          background: #666;
          border-radius: 4px;
        }

        .participant-grid-container :global(.react-window-scrollbar-thumb-vertical:hover),
        .participant-grid-container :global(.react-window-scrollbar-thumb-horizontal:hover) {
          background: #888;
        }
      `}</style>
    </div>
  );
};

// Helper function to prioritize participants for rendering
function getHighPriorityParticipants(participants: Participant[]): Participant[] {
  const priority: Participant[] = [];

  // 1. Coach always first
  const coach = participants.find(p => p.isCoach());
  if (coach) priority.push(coach);

  // 2. Active speakers
  const activeSpeakers = participants
    .filter(p => p.isActiveSpeaker() && !p.isCoach())
    .slice(0, 3);
  priority.push(...activeSpeakers);

  // 3. Participants with raised hands
  const raisedHands = participants
    .filter(p => p.hasRaisedHand() && !p.isCoach() && !p.isActiveSpeaker())
    .slice(0, 3);
  priority.push(...raisedHands);

  // 4. Recently active participants (by video/audio state)
  const recentlyActive = participants
    .filter(p =>
      (p.isVideoEnabled() || p.isAudioEnabled()) &&
      !priority.some(pp => pp.getId().equals(p.getId()))
    )
    .slice(0, 6);
  priority.push(...recentlyActive);

  return priority.slice(0, 15); // Max 15 high-priority participants
}