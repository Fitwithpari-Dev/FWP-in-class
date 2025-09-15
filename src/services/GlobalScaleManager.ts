/**
 * Global Scale Manager for handling 100s of students worldwide
 * Optimizes performance, bandwidth, and user experience for large-scale fitness classes
 */

export interface GlobalScaleConfig {
  maxParticipants: number;
  videoPaginationSize: number;
  adaptiveQuality: boolean;
  regionalOptimization: boolean;
}

export interface ParticipantGroup {
  id: string;
  participants: string[];
  region?: string;
  averageBandwidth?: number;
  isVisible: boolean;
}

export class GlobalScaleManager {
  private participantGroups: Map<string, ParticipantGroup> = new Map();
  private visibleParticipants: Set<string> = new Set();
  private config: GlobalScaleConfig;

  constructor(config: GlobalScaleConfig) {
    this.config = config;
    console.log('🌍 GlobalScaleManager initialized for worldwide fitness classes:', {
      maxParticipants: config.maxParticipants,
      videoPagination: config.videoPaginationSize,
      adaptiveQuality: config.adaptiveQuality
    });
  }

  /**
   * Organize participants into manageable groups for performance
   */
  public organizeParticipants(participants: string[]): ParticipantGroup[] {
    const groups: ParticipantGroup[] = [];
    const groupSize = this.config.videoPaginationSize;

    for (let i = 0; i < participants.length; i += groupSize) {
      const groupParticipants = participants.slice(i, i + groupSize);
      const group: ParticipantGroup = {
        id: `group-${Math.floor(i / groupSize)}`,
        participants: groupParticipants,
        isVisible: i === 0, // First group visible by default
      };

      groups.push(group);
      this.participantGroups.set(group.id, group);
    }

    console.log(`📊 Organized ${participants.length} participants into ${groups.length} groups`, {
      groupSize,
      totalParticipants: participants.length,
      visibleGroups: groups.filter(g => g.isVisible).length
    });

    return groups;
  }

  /**
   * Get participants that should have video rendered (performance optimization)
   */
  public getVideoEnabledParticipants(
    allParticipants: string[],
    coachId: string,
    maxVideos: number = 16
  ): string[] {
    // Always include coach
    const prioritizedParticipants = [coachId];

    // Add visible participants up to the limit
    const remainingSlots = maxVideos - 1;
    const visibleStudents = allParticipants
      .filter(p => p !== coachId)
      .slice(0, remainingSlots);

    const result = [...prioritizedParticipants, ...visibleStudents];

    console.log('🎥 Video-enabled participants for global scale:', {
      totalParticipants: allParticipants.length,
      videoEnabled: result.length,
      coachIncluded: true,
      studentsWithVideo: result.length - 1
    });

    return result;
  }

  /**
   * Determine optimal video quality based on participant count and bandwidth
   */
  public getAdaptiveVideoQuality(
    participantCount: number,
    estimatedBandwidth: number = 1000
  ): '90p' | '180p' | '360p' | '720p' {
    // Scale down quality as participant count increases
    if (participantCount > 200) {
      return estimatedBandwidth < 500 ? '90p' : '180p';
    } else if (participantCount > 100) {
      return estimatedBandwidth < 800 ? '180p' : '360p';
    } else if (participantCount > 50) {
      return estimatedBandwidth < 1200 ? '180p' : '360p';
    } else {
      return estimatedBandwidth < 1500 ? '360p' : '720p';
    }
  }

  /**
   * Get pagination info for UI (showing "Page X of Y" to students)
   */
  public getPaginationInfo(): {
    currentPage: number;
    totalPages: number;
    canNavigateNext: boolean;
    canNavigatePrev: boolean;
  } {
    const visibleGroup = Array.from(this.participantGroups.values()).find(g => g.isVisible);
    const visibleGroupIndex = visibleGroup ? parseInt(visibleGroup.id.split('-')[1]) : 0;
    const totalPages = this.participantGroups.size;

    return {
      currentPage: visibleGroupIndex + 1,
      totalPages,
      canNavigateNext: visibleGroupIndex < totalPages - 1,
      canNavigatePrev: visibleGroupIndex > 0
    };
  }

  /**
   * Navigate to next group of participants (pagination)
   */
  public navigateToNextGroup(): boolean {
    const currentVisible = Array.from(this.participantGroups.values()).find(g => g.isVisible);
    if (!currentVisible) return false;

    const currentIndex = parseInt(currentVisible.id.split('-')[1]);
    const nextGroupId = `group-${currentIndex + 1}`;
    const nextGroup = this.participantGroups.get(nextGroupId);

    if (nextGroup) {
      currentVisible.isVisible = false;
      nextGroup.isVisible = true;
      console.log(`📄 Navigated to next participant group: ${nextGroupId}`);
      return true;
    }

    return false;
  }

  /**
   * Navigate to previous group of participants
   */
  public navigateToPreviousGroup(): boolean {
    const currentVisible = Array.from(this.participantGroups.values()).find(g => g.isVisible);
    if (!currentVisible) return false;

    const currentIndex = parseInt(currentVisible.id.split('-')[1]);
    if (currentIndex === 0) return false;

    const prevGroupId = `group-${currentIndex - 1}`;
    const prevGroup = this.participantGroups.get(prevGroupId);

    if (prevGroup) {
      currentVisible.isVisible = false;
      prevGroup.isVisible = true;
      console.log(`📄 Navigated to previous participant group: ${prevGroupId}`);
      return true;
    }

    return false;
  }

  /**
   * Get performance stats for monitoring large-scale sessions
   */
  public getPerformanceStats(): {
    totalParticipants: number;
    activeGroups: number;
    videoStreams: number;
    estimatedBandwidthUsage: string;
  } {
    const totalParticipants = Array.from(this.participantGroups.values())
      .reduce((sum, group) => sum + group.participants.length, 0);

    const activeGroups = Array.from(this.participantGroups.values())
      .filter(g => g.isVisible).length;

    const videoStreams = Math.min(totalParticipants, 16); // Max video streams
    const estimatedBandwidth = videoStreams * 200; // ~200kbps per stream

    return {
      totalParticipants,
      activeGroups,
      videoStreams,
      estimatedBandwidthUsage: `${estimatedBandwidth}kbps`
    };
  }

  /**
   * Optimize for mobile devices (reduced functionality for performance)
   */
  public getMobileOptimizations(): {
    maxVideos: number;
    quality: string;
    audioOnly: boolean;
  } {
    const stats = this.getPerformanceStats();

    return {
      maxVideos: Math.min(8, stats.videoStreams), // Max 8 videos on mobile
      quality: stats.totalParticipants > 100 ? '90p' : '180p',
      audioOnly: stats.totalParticipants > 200 // Audio-only for very large classes
    };
  }
}

// Export singleton instance
export const globalScaleManager = new GlobalScaleManager({
  maxParticipants: 500,
  videoPaginationSize: 50,
  adaptiveQuality: true,
  regionalOptimization: true,
});