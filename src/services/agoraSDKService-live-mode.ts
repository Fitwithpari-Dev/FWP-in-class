// Alternative implementation for Live mode with role promotion
// This file shows how to handle student visibility in live mode

import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ClientRole,
  UID
} from 'agora-rtc-sdk-ng';

export class AgoraSDKServiceLiveMode {
  private client: IAgoraRTCClient | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private currentRole: ClientRole = 'audience';

  // Initialize in live mode
  public async initialize(appId: string): Promise<void> {
    this.client = AgoraRTC.createClient({
      mode: 'live', // Keep live mode
      codec: 'vp8'
    });
  }

  // Join channel with initial role
  public async joinChannel(
    channel: string,
    token: string | null,
    uid: UID | null = null,
    role: ClientRole = 'audience'
  ): Promise<UID> {
    if (!this.client) throw new Error('Client not initialized');

    // Set initial role
    this.currentRole = role;
    await this.client.setClientRole(role);

    // Join the channel
    const assignedUID = await this.client.join(appId, channel, token, uid);

    console.log(`Joined as ${role} with UID: ${assignedUID}`);
    return assignedUID;
  }

  // CRITICAL: Promote to host before publishing (for students)
  public async promoteToHost(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    if (this.currentRole === 'audience') {
      console.log('🎬 Promoting audience member to host for publishing...');
      await this.client.setClientRole('host');
      this.currentRole = 'host';

      // Wait a bit for role change to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ Successfully promoted to host');
    }
  }

  // Start video with automatic role promotion
  public async startLocalVideo(userRole: 'coach' | 'student'): Promise<ICameraVideoTrack> {
    if (!this.client) throw new Error('Client not initialized');

    // IMPORTANT: Promote students to host before publishing
    if (userRole === 'student' && this.currentRole === 'audience') {
      await this.promoteToHost();
    }

    // Create and publish video track
    this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
      optimizationMode: userRole === 'coach' ? 'detail' : 'motion',
      encoderConfig: {
        width: userRole === 'coach' ? 1280 : 640,
        height: userRole === 'coach' ? 720 : 480,
        frameRate: userRole === 'coach' ? 30 : 24,
        bitrateMax: userRole === 'coach' ? 2500 : 1200
      }
    });

    // Publish the track
    await this.client.publish(this.localVideoTrack);
    console.log('✅ Video published successfully');

    return this.localVideoTrack;
  }

  // Start audio with automatic role promotion
  public async startLocalAudio(userRole: 'coach' | 'student'): Promise<IMicrophoneAudioTrack> {
    if (!this.client) throw new Error('Client not initialized');

    // IMPORTANT: Promote students to host before publishing
    if (userRole === 'student' && this.currentRole === 'audience') {
      await this.promoteToHost();
    }

    // Create and publish audio track
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: userRole === 'coach' ? 'music_high_quality_stereo' : 'speech_standard',
      AEC: true,
      ANS: true,
      AGC: true
    });

    // Publish the track
    await this.client.publish(this.localAudioTrack);
    console.log('✅ Audio published successfully');

    return this.localAudioTrack;
  }

  // Demote back to audience when stopping media (optional)
  public async demoteToAudience(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    if (this.currentRole === 'host' && !this.localVideoTrack && !this.localAudioTrack) {
      console.log('🎬 Demoting host back to audience...');
      await this.client.setClientRole('audience');
      this.currentRole = 'audience';
      console.log('✅ Successfully demoted to audience');
    }
  }
}