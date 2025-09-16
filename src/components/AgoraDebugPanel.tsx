import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bug, Video, VideoOff, Mic, MicOff, Users } from 'lucide-react';
import { agoraService } from '../services/agoraSDKService';
import { AGORA_CONFIG, validateAgoraConfig, generateChannelName } from '../config/agora.config';
import { AgoraVideoTile } from './AgoraVideoTile';
import { getAgoraTokenService } from '../services/agoraTokenService';

export function AgoraDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [currentChannel, setCurrentChannel] = useState('');
  const [currentUID, setCurrentUID] = useState<string>('');

  // Only show in development or when needed for debugging
  // if (process.env.NODE_ENV === 'production') {
  //   return null;
  // }

  const handleInitializeAgora = async () => {
    try {
      console.log('🚀 DEBUG: Initializing Agora SDK...');

      if (!validateAgoraConfig()) {
        console.error('❌ Agora configuration invalid');
        return;
      }

      await agoraService.initialize(AGORA_CONFIG.appId, {
        onUserJoined: (user, mediaType) => {
          console.log('👤 User joined:', user.uid, mediaType);
          setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
        },
        onUserLeft: (user, reason) => {
          console.log('👋 User left:', user.uid, reason);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        },
        onUserPublished: (user, mediaType) => {
          console.log('📡 User published:', user.uid, mediaType);
          setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? user : u));
        },
        onUserUnpublished: (user, mediaType) => {
          console.log('📴 User unpublished:', user.uid, mediaType);
          setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? user : u));
        },
        onConnectionStateChange: (curState, revState, reason) => {
          console.log('🔗 Connection state:', curState);
          setConnectionState(curState);
          setIsConnected(curState === 'CONNECTED');
        }
      });

      setIsInitialized(true);
      console.log('✅ Agora SDK initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Agora SDK:', error);
    }
  };

  const handleJoinChannel = async () => {
    try {
      console.log('🚪 DEBUG: Joining Agora channel...');

      if (!isInitialized) {
        await handleInitializeAgora();
      }

      const testChannel = generateChannelName('test-session-' + Date.now());

      console.log('🧪 DEBUG: Testing with null token first (testing mode)...');
      const uid = await agoraService.joinChannel(testChannel, null, null, 'host');

      setCurrentChannel(testChannel);
      setCurrentUID(String(uid));
      setIsConnected(true);

      console.log('✅ Joined channel:', testChannel, 'with UID:', uid);

    } catch (error) {
      console.error('❌ Failed to join channel:', error);
    }
  };

  const handleJoinWithToken = async () => {
    try {
      console.log('🚪 DEBUG: Joining Agora channel WITH TOKEN...');

      if (!isInitialized) {
        await handleInitializeAgora();
      }

      const testChannel = generateChannelName('test-session-' + Date.now());

      // Generate proper token
      console.log('🔑 DEBUG: Generating token for channel:', testChannel);
      const tokenService = getAgoraTokenService();
      const token = await tokenService.generateRtcToken({
        channelName: testChannel,
        uid: null,
        role: 'host',
        expirationTimeInSeconds: 3600
      });

      console.log('🧪 DEBUG: Testing with generated token:', token ? `${token.substring(0, 20)}...` : 'null');
      const uid = await agoraService.joinChannel(testChannel, token, null, 'host');

      setCurrentChannel(testChannel);
      setCurrentUID(String(uid));
      setIsConnected(true);

      console.log('✅ Joined channel with token:', testChannel, 'with UID:', uid);

    } catch (error) {
      console.error('❌ Failed to join channel with token:', error);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      console.log('🚪 DEBUG: Leaving Agora channel...');

      await agoraService.leaveChannel();

      setCurrentChannel('');
      setCurrentUID('');
      setIsConnected(false);
      setRemoteUsers([]);
      setLocalVideoTrack(null);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);

      console.log('✅ Left channel successfully');

    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      console.log('🎥 DEBUG: Toggling video...');

      if (!isVideoEnabled) {
        const track = await agoraService.startLocalVideo();
        setLocalVideoTrack(track);
        setIsVideoEnabled(true);
        console.log('✅ Video started successfully');
      } else {
        await agoraService.stopLocalVideo();
        setLocalVideoTrack(null);
        setIsVideoEnabled(false);
        console.log('✅ Video stopped successfully');
      }

    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
    }
  };

  const handleToggleAudio = async () => {
    try {
      console.log('🎤 DEBUG: Toggling audio...');

      if (!isAudioEnabled) {
        await agoraService.startLocalAudio();
        setIsAudioEnabled(true);
        console.log('✅ Audio started successfully');
      } else {
        await agoraService.stopLocalAudio();
        setIsAudioEnabled(false);
        console.log('✅ Audio stopped successfully');
      }

    } catch (error) {
      console.error('❌ Failed to toggle audio:', error);
    }
  };

  const handleTestCameraFirst = async () => {
    try {
      console.log('🔥 DEBUG: Testing camera with Agora approach...');

      // Step 1: Initialize Agora if needed
      if (!isInitialized) {
        await handleInitializeAgora();
      }

      // Step 2: Try to create video track directly (no channel needed)
      console.log('📹 Creating video track without joining channel...');
      const track = await agoraService.startLocalVideo();
      setLocalVideoTrack(track);
      setIsVideoEnabled(true);

      console.log('🎉 SUCCESS: Agora video track created successfully!');
      console.log('💡 This proves camera works with Agora SDK');

    } catch (error) {
      console.error('❌ Agora camera test failed:', error);
    }
  };

  const handleDetectDevices = async () => {
    try {
      console.log('🔍 AGORA DEBUG: Comprehensive device detection...');

      // Test 1: Browser-level device detection
      console.log('📱 Step 1: Browser-level device detection');
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        console.log('📹 Browser found devices:', devices.length, 'total');
        console.log('📹 Browser found video inputs:', videoInputs.length);
        videoInputs.forEach((device, index) => {
          console.log(`📹 Browser Camera ${index + 1}:`, {
            deviceId: device.deviceId,
            label: device.label || 'No label (permission needed)',
            groupId: device.groupId
          });
        });

        if (videoInputs.length === 0) {
          console.error('❌ BROWSER: No video devices detected!');
          console.error('💡 This explains DEVICE_NOT_FOUND errors');
        }
      } else {
        console.error('❌ Browser does not support device enumeration');
      }

      // Test 2: Direct getUserMedia test
      console.log('📱 Step 2: Direct getUserMedia test');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        console.log('✅ Browser getUserMedia SUCCESS:', {
          tracks: stream.getTracks().length,
          videoTracks: stream.getVideoTracks().length,
          videoTrackLabel: stream.getVideoTracks()[0]?.label
        });
        stream.getTracks().forEach(track => track.stop());
      } catch (userMediaError) {
        console.error('❌ Browser getUserMedia FAILED:', userMediaError);
        console.error('💡 This is why both Zoom and Agora fail with DEVICE_NOT_FOUND');
      }

      // Test 3: Agora AgoraRTC.getCameras() if available
      console.log('📱 Step 3: Agora SDK device detection');
      if (!isInitialized) {
        await handleInitializeAgora();
      }

      // Try to access Agora's camera enumeration
      try {
        const AgoraRTC = (window as any).AgoraRTC;
        if (AgoraRTC && AgoraRTC.getCameras) {
          const agoraCameras = await AgoraRTC.getCameras();
          console.log('📹 Agora SDK found cameras:', agoraCameras.length);
          agoraCameras.forEach((camera: any, index: number) => {
            console.log(`📹 Agora Camera ${index + 1}:`, {
              deviceId: camera.deviceId,
              label: camera.label,
              groupId: camera.groupId
            });
          });
        } else {
          console.warn('⚠️ Agora AgoraRTC.getCameras not available');
        }
      } catch (agoraDeviceError) {
        console.error('❌ Agora device detection failed:', agoraDeviceError);
      }

      // Test 4: Check browser and OS specific issues
      console.log('📱 Step 4: Browser and environment analysis');
      console.log('🖥️ Browser environment:', {
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        host: window.location.host,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        hasEnumerateDevices: !!navigator.mediaDevices?.enumerateDevices
      });

    } catch (error) {
      console.error('❌ Device detection test failed:', error);
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
        >
          <Bug className="w-4 h-4 mr-2" />
          Agora Test
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96">
      <Card className="bg-blue-900 border-blue-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-200 text-sm flex items-center">
              <Bug className="w-4 h-4 mr-2" />
              Agora SDK Test Panel
            </CardTitle>
            <Button
              onClick={() => setIsExpanded(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Connection Status */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Connection Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Initialized</div>
                <Badge variant={isInitialized ? "default" : "secondary"}>
                  {isInitialized ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Connected</div>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {connectionState}
                </Badge>
              </div>
            </div>
          </div>

          {/* Media Status */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Media Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Video</div>
                <Badge variant={isVideoEnabled ? "default" : "secondary"}>
                  {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                </Badge>
              </div>
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Audio</div>
                <Badge variant={isAudioEnabled ? "default" : "secondary"}>
                  {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Test Controls */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Quick Tests</h4>
            <div className="space-y-2">
              <Button
                onClick={handleDetectDevices}
                variant="outline"
                size="sm"
                className="w-full border-purple-600 text-purple-300 hover:bg-purple-700 text-xs h-8"
              >
                🔍 Detect Camera Devices
              </Button>
              <Button
                onClick={handleTestCameraFirst}
                variant="outline"
                size="sm"
                className="w-full border-green-600 text-green-300 hover:bg-green-700 text-xs h-8"
              >
                🚀 Test Camera with Agora
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleInitializeAgora}
                  disabled={isInitialized}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-300 hover:bg-blue-700 text-xs h-8"
                >
                  Initialize
                </Button>
                <Button
                  onClick={isConnected ? handleLeaveChannel : handleJoinChannel}
                  disabled={!isInitialized}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-300 hover:bg-blue-700 text-xs h-8"
                >
                  {isConnected ? 'Leave' : 'Join'} (No Token)
                </Button>
              </div>
              <Button
                onClick={handleJoinWithToken}
                disabled={!isInitialized || isConnected}
                variant="outline"
                size="sm"
                className="w-full border-orange-600 text-orange-300 hover:bg-orange-700 text-xs h-8"
              >
                🔑 Join with Token
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleToggleVideo}
                  disabled={!isInitialized}
                  variant="outline"
                  size="sm"
                  className="border-green-600 text-green-300 hover:bg-green-700 text-xs h-8"
                >
                  {isVideoEnabled ? 'Stop' : 'Start'} Video
                </Button>
                <Button
                  onClick={handleToggleAudio}
                  disabled={!isInitialized}
                  variant="outline"
                  size="sm"
                  className="border-yellow-600 text-yellow-300 hover:bg-yellow-700 text-xs h-8"
                >
                  {isAudioEnabled ? 'Stop' : 'Start'} Audio
                </Button>
              </div>
            </div>
          </div>

          {/* Session Info */}
          {currentChannel && (
            <div className="space-y-1">
              <h4 className="text-white font-medium">Session Info</h4>
              <div className="bg-blue-800 p-2 rounded space-y-1">
                <div className="flex justify-between">
                  <span className="text-blue-300">Channel:</span>
                  <span className="text-blue-200 text-xs truncate">{currentChannel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">UID:</span>
                  <span className="text-blue-200 text-xs">{currentUID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Users:</span>
                  <span className="text-blue-200 text-xs">{remoteUsers.length + 1}</span>
                </div>
              </div>
            </div>
          )}

          {/* Local Video Preview */}
          {localVideoTrack && (
            <div className="space-y-2">
              <h4 className="text-white font-medium">Local Video Preview</h4>
              <div className="w-full h-32">
                <AgoraVideoTile
                  localTrack={localVideoTrack}
                  isLocal={true}
                  displayName="You (Agora)"
                  isHost={true}
                  isMuted={!isAudioEnabled}
                  isVideoOff={!isVideoEnabled}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Environment Debug Info */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Environment Debug</h4>
            <div className="bg-gray-800 p-2 rounded space-y-1 text-xs">
              <div className="text-yellow-300 font-bold">🔍 Environment Variables:</div>
              <div className="text-green-300">
                VITE_AGORA_APP_ID: {import.meta.env.VITE_AGORA_APP_ID ? `${import.meta.env.VITE_AGORA_APP_ID.substring(0, 8)}...` : '❌ MISSING'}
              </div>
              <div className="text-green-300">
                VITE_AGORA_APP_CERTIFICATE: {import.meta.env.VITE_AGORA_APP_CERTIFICATE ? `${import.meta.env.VITE_AGORA_APP_CERTIFICATE.substring(0, 8)}...` : '❌ MISSING'}
              </div>

              <div className="text-yellow-300 font-bold mt-2">🔧 Token Service Status:</div>
              {(() => {
                try {
                  const tokenService = getAgoraTokenService();
                  const serviceInfo = tokenService.getServiceInfo();
                  return (
                    <>
                      <div className="text-blue-300">
                        App ID: {serviceInfo.appId}
                      </div>
                      <div className="text-blue-300">
                        Has Certificate: {serviceInfo.hasCertificate ? '✅ YES' : '❌ NO'}
                      </div>
                      <div className="text-blue-300">
                        Testing Mode: {serviceInfo.isTestingMode ? '⚠️ YES (INSECURE)' : '✅ NO (SECURE)'}
                      </div>
                      <div className="text-blue-300">
                        Valid Config: {serviceInfo.validation.isValid ? '✅ YES' : '❌ NO'}
                      </div>
                      {serviceInfo.validation.issues.length > 0 && (
                        <div className="text-red-300">
                          Issues: {serviceInfo.validation.issues.join(', ')}
                        </div>
                      )}
                    </>
                  );
                } catch (error) {
                  return <div className="text-red-300">❌ Token service error: {String(error)}</div>;
                }
              })()}

              <div className="text-yellow-300 font-bold mt-2">🌐 Browser Environment:</div>
              <div className="text-gray-300">
                Mode: {import.meta.env.MODE}
              </div>
              <div className="text-gray-300">
                Secure Context: {window.isSecureContext ? '✅' : '❌'}
              </div>
              <div className="text-gray-300">
                Protocol: {window.location.protocol}
              </div>
            </div>
          </div>

          <div className="text-xs text-blue-400 mt-2">
            💡 Testing Agora SDK as backup to Zoom SDK
          </div>
        </CardContent>
      </Card>
    </div>
  );
}