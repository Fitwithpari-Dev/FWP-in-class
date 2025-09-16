// Agora Video Session Debugging Utility
// Helps diagnose connectivity and video rendering issues

import { agoraService } from '../services/agoraSDKService';

export class AgoraDebugger {
  // Log current Agora session state
  static logCurrentState() {
    console.log('🔍 === AGORA DEBUG STATE ===');

    try {
      const connectionState = agoraService.getConnectionState();
      const currentChannel = agoraService.getCurrentChannel();
      const currentUID = agoraService.getCurrentUID();
      const remoteUsers = agoraService.getRemoteUsers();
      const localVideoTrack = agoraService.getLocalVideoTrack();
      const localAudioTrack = agoraService.getLocalAudioTrack();

      console.log('📊 Connection Info:', {
        connectionState,
        currentChannel,
        currentUID,
        localVideoEnabled: agoraService.isLocalVideoEnabled(),
        localAudioEnabled: agoraService.isLocalAudioEnabled()
      });

      console.log('👥 Remote Users:', remoteUsers.map(user => ({
        uid: user.uid,
        hasVideoTrack: !!user.videoTrack,
        hasAudioTrack: !!user.audioTrack,
        videoTrackState: user.videoTrack ? 'available' : 'none',
        audioTrackState: user.audioTrack ? 'available' : 'none'
      })));

      console.log('🎥 Local Tracks:', {
        video: {
          exists: !!localVideoTrack,
          enabled: localVideoTrack?.enabled ?? false,
          muted: localVideoTrack?.muted ?? false
        },
        audio: {
          exists: !!localAudioTrack,
          enabled: localAudioTrack?.enabled ?? false,
          muted: localAudioTrack?.muted ?? false
        }
      });

    } catch (error) {
      console.error('❌ Error getting debug state:', error);
    }

    console.log('🔍 === END AGORA DEBUG ===');
  }

  // Check if participants can see each other
  static checkParticipantVisibility() {
    console.log('👀 === CHECKING PARTICIPANT VISIBILITY ===');

    try {
      const remoteUsers = agoraService.getRemoteUsers();
      const currentUID = agoraService.getCurrentUID();

      console.log(`🧮 Total participants: ${remoteUsers.length + 1} (including self)`);
      console.log(`🆔 My UID: ${currentUID}`);

      if (remoteUsers.length === 0) {
        console.warn('⚠️ No remote users found - you might be alone in the channel');
        return;
      }

      remoteUsers.forEach((user, index) => {
        console.log(`👤 Remote User ${index + 1}:`, {
          uid: user.uid,
          videoAvailable: !!user.videoTrack,
          audioAvailable: !!user.audioTrack,
          canSeeVideo: !!user.videoTrack,
          canHearAudio: !!user.audioTrack
        });

        if (!user.videoTrack) {
          console.warn(`⚠️ User ${user.uid} has no video track - they might not have started video`);
        }

        if (!user.audioTrack) {
          console.warn(`⚠️ User ${user.uid} has no audio track - they might be muted`);
        }
      });

    } catch (error) {
      console.error('❌ Error checking visibility:', error);
    }

    console.log('👀 === END VISIBILITY CHECK ===');
  }

  // Monitor track subscriptions
  static checkSubscriptions() {
    console.log('📡 === CHECKING SUBSCRIPTIONS ===');

    try {
      const remoteUsers = agoraService.getRemoteUsers();

      remoteUsers.forEach(user => {
        console.log(`📺 User ${user.uid} subscription status:`, {
          videoSubscribed: !!user.videoTrack,
          audioSubscribed: !!user.audioTrack,
          videoTrackInfo: user.videoTrack ? {
            muted: user.videoTrack.muted,
            enabled: user.videoTrack.enabled
          } : 'No video track',
          audioTrackInfo: user.audioTrack ? {
            muted: user.audioTrack.muted,
            enabled: user.audioTrack.enabled
          } : 'No audio track'
        });
      });

    } catch (error) {
      console.error('❌ Error checking subscriptions:', error);
    }

    console.log('📡 === END SUBSCRIPTION CHECK ===');
  }

  // Test video rendering for all participants
  static testVideoRendering() {
    console.log('🎬 === TESTING VIDEO RENDERING ===');

    try {
      const localVideoTrack = agoraService.getLocalVideoTrack();
      const remoteUsers = agoraService.getRemoteUsers();

      console.log('🎥 Local video:', {
        available: !!localVideoTrack,
        enabled: localVideoTrack?.enabled ?? false,
        canRender: !!localVideoTrack && localVideoTrack.enabled
      });

      remoteUsers.forEach(user => {
        console.log(`🎥 Remote user ${user.uid} video:`, {
          available: !!user.videoTrack,
          enabled: user.videoTrack?.enabled ?? false,
          canRender: !!user.videoTrack && !user.videoTrack.muted
        });
      });

    } catch (error) {
      console.error('❌ Error testing video rendering:', error);
    }

    console.log('🎬 === END VIDEO RENDERING TEST ===');
  }

  // Quick health check
  static healthCheck() {
    console.log('🏥 === AGORA HEALTH CHECK ===');

    const issues: string[] = [];

    try {
      const connectionState = agoraService.getConnectionState();
      const currentChannel = agoraService.getCurrentChannel();
      const remoteUsers = agoraService.getRemoteUsers();

      // Check connection
      if (connectionState !== 'CONNECTED') {
        issues.push(`Connection state is ${connectionState}, should be CONNECTED`);
      }

      // Check channel
      if (!currentChannel) {
        issues.push('Not in any channel');
      }

      // Check participants
      if (remoteUsers.length === 0) {
        issues.push('No other participants in the channel');
      }

      // Check video tracks
      const usersWithoutVideo = remoteUsers.filter(user => !user.videoTrack).length;
      if (usersWithoutVideo > 0) {
        issues.push(`${usersWithoutVideo} participants have no video track`);
      }

      if (issues.length === 0) {
        console.log('✅ All systems healthy!');
      } else {
        console.warn('⚠️ Issues found:', issues);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
    }

    console.log('🏥 === END HEALTH CHECK ===');
  }
}

// Make debugger available globally for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).AgoraDebugger = AgoraDebugger;
}

export default AgoraDebugger;