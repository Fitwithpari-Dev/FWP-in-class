import { useState, useEffect } from 'react';
import { useFitnessPlatformContext } from '../App';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Eye, EyeOff, RefreshCw, Play, Square, Bug } from 'lucide-react';

export function VideoDebugPanel() {
  const {
    participants,
    isLocalVideoOn,
    isLocalAudioOn,
    currentUser,
    sdk,
    zoomSDK
  } = useFitnessPlatformContext();

  const [isExpanded, setIsExpanded] = useState(false);
  const [testToggleCount, setTestToggleCount] = useState(0);

  // Temporarily enable in production for debugging
  // if (process.env.NODE_ENV === 'production') {
  //   return null;
  // }

  const handleTestToggle = async () => {
    try {
      console.log('🧪 Debug: Test toggle video');
      await sdk.toggleVideo();
      setTestToggleCount(prev => prev + 1);
    } catch (error) {
      console.error('🧪 Debug: Test toggle failed:', error);
    }
  };

  const handleForceRefresh = () => {
    console.log('🧪 Debug: Force refreshing participant states');
    // This will trigger re-renders and video checks
    window.location.reload();
  };

  const handleTestVideoElement = async () => {
    console.log('🧪 Debug: Testing direct video rendering');

    if (!zoomSDK || !currentUser?.id) {
      console.error('🧪 Debug: No SDK or current user available');
      return;
    }

    try {
      // Create a test video element
      const testVideo = document.createElement('video');
      testVideo.width = 320;
      testVideo.height = 240;
      testVideo.autoplay = true;
      testVideo.muted = true;
      testVideo.playsInline = true;
      testVideo.style.border = '2px solid orange';
      testVideo.style.position = 'fixed';
      testVideo.style.top = '10px';
      testVideo.style.right = '10px';
      testVideo.style.zIndex = '9999';
      testVideo.style.backgroundColor = '#374151';

      // Add to DOM temporarily
      document.body.appendChild(testVideo);

      console.log('🧪 Debug: Created test video element:', {
        width: testVideo.width,
        height: testVideo.height,
        currentUserId: currentUser.id
      });

      // Try to render current user's video to this element
      console.log('🧪 Debug: Attempting direct attachVideo call...');
      await zoomSDK.renderVideo(currentUser.id, testVideo, 320, 240, false);

      console.log('✅ Debug: Direct video rendering successful! Check top-right corner for test video.');

      // Remove test element after 10 seconds
      setTimeout(() => {
        if (testVideo.parentNode) {
          testVideo.parentNode.removeChild(testVideo);
          console.log('🧪 Debug: Removed test video element');
        }
      }, 10000);

    } catch (error) {
      console.error('❌ Debug: Direct video rendering failed:', error);
      console.error('❌ Debug: Error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        currentUserId: currentUser?.id,
        hasZoomSDK: !!zoomSDK
      });
    }
  };

  const handleForceStartVideo = async () => {
    console.log('🚨 Debug: Force starting video stream...');

    if (!zoomSDK) {
      console.error('🚨 Debug: No Zoom SDK available');
      return;
    }

    try {
      // First, stop any existing video
      console.log('🛑 Debug: Stopping existing video stream...');
      await zoomSDK.stopVideo();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // NEW: Initialize camera explicitly first
      console.log('🔧 Debug: Initializing camera before starting video...');
      try {
        // Test if we can access the stream and camera list
        const stream = (zoomSDK as any).stream;
        if (stream && stream.getCameraList) {
          const cameras = await stream.getCameraList();
          console.log('📹 Debug: Available cameras:', cameras);

          if (cameras && cameras.length > 0) {
            console.log('🎯 Debug: Setting camera to:', cameras[0]);
            await stream.switchCamera(cameras[0].deviceId);
            console.log('✅ Debug: Camera initialized successfully');
          }
        }
      } catch (cameraInitError) {
        console.warn('⚠️ Debug: Camera initialization warning:', cameraInitError);
      }

      // Then start video with detailed logging
      console.log('🎬 Debug: Starting video stream with enhanced logging...');
      await zoomSDK.startVideo();

      console.log('✅ Debug: Force start video completed');

      // Try the test video element again after force start
      setTimeout(() => {
        console.log('🔄 Debug: Retrying test video element after force start...');
        handleTestVideoElement();
      }, 2000);

    } catch (error) {
      console.error('❌ Debug: Force start video failed:', error);
      console.error('❌ Debug: Force start error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        hasZoomSDK: !!zoomSDK,
        errorObject: error
      });

      // Try to extract more detailed error information
      if (typeof error === 'object' && error !== null) {
        console.error('🔍 Debug: Error object analysis:', {
          type: (error as any).type,
          reason: (error as any).reason,
          code: (error as any).code,
          message: (error as any).message
        });
      }
    }
  };

  const handleExplicitPermissionRequest = async () => {
    console.log('🔐 Debug: Requesting explicit camera and microphone permissions...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('✅ Debug: Permissions granted successfully!', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoEnabled: stream.getVideoTracks()[0]?.enabled,
        audioEnabled: stream.getAudioTracks()[0]?.enabled
      });

      // Stop the test stream
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Debug: Stopped ${track.kind} track`);
      });

      console.log('💡 Debug: Permissions granted - now try starting video in Zoom');

    } catch (error) {
      console.error('❌ Debug: Permission request failed:', error);
      console.error('❌ Debug: Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });

      if (error.name === 'NotAllowedError') {
        console.error('🔒 User explicitly denied camera/microphone access');
        console.error('💡 Solution: Click the camera icon in browser address bar and allow permissions');
      } else if (error.name === 'NotFoundError') {
        console.error('📷 No camera/microphone found on this device');
      } else if (error.name === 'NotReadableError') {
        console.error('🔧 Camera/microphone is already in use by another application');
      }
    }
  };

  const handleNetworkTest = async () => {
    console.log('🌐 Debug: Testing network connectivity to Zoom servers...');

    const testUrls = [
      'https://zoom.us',
      'https://api.zoom.us',
      'https://wss.zoom.us'
    ];

    for (const url of testUrls) {
      try {
        console.log(`🔍 Testing connection to: ${url}`);
        const response = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        console.log(`✅ ${url}: OK`);
      } catch (error) {
        console.error(`❌ ${url}: Failed`, error);
      }
    }

    // Test WebSocket connectivity
    try {
      console.log('🔍 Testing WebSocket connectivity...');
      const ws = new WebSocket('wss://echo.websocket.org');
      ws.onopen = () => {
        console.log('✅ WebSocket: OK - Basic connectivity works');
        ws.close();
      };
      ws.onerror = (error) => {
        console.error('❌ WebSocket: Failed - May indicate firewall/proxy issues', error);
      };
      ws.onclose = () => {
        console.log('🔒 WebSocket: Connection closed');
      };
    } catch (error) {
      console.error('❌ WebSocket test failed:', error);
    }

    // Check user agent and browser compatibility
    console.log('🖥️ Browser info:', {
      userAgent: navigator.userAgent,
      webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webSocket: !!WebSocket,
      webAssembly: !!WebAssembly
    });
  };

  const currentUserData = participants.find(p => p.id === currentUser?.id);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-fitness-dark border-fitness-orange text-fitness-orange hover:bg-fitness-orange hover:text-white"
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-fitness-dark border-fitness-orange">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-fitness-orange text-sm flex items-center">
              <Bug className="w-4 h-4 mr-2" />
              Video Debug Panel
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
          {/* Local Video State */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Local Video State</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-fitness-gray p-2 rounded">
                <div className="text-gray-400">UI State</div>
                <Badge variant={isLocalVideoOn ? "default" : "secondary"}>
                  {isLocalVideoOn ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="bg-fitness-gray p-2 rounded">
                <div className="text-gray-400">Participant State</div>
                <Badge variant={currentUserData?.isVideoOn ? "default" : "secondary"}>
                  {currentUserData?.isVideoOn ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Participants Video States */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">All Participants ({participants.length})</h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {participants.map(participant => (
                <div key={participant.id} className="flex items-center justify-between bg-fitness-gray p-1 rounded text-xs">
                  <span className="text-gray-300 truncate flex-1">
                    {participant.name}
                    {participant.isHost && <span className="text-fitness-orange ml-1">(HOST)</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant={participant.isVideoOn ? "default" : "secondary"} className="h-4 text-xs px-1">
                      {participant.isVideoOn ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Controls */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Debug Controls</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleTestToggle}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-8"
              >
                <Play className="w-3 h-3 mr-1" />
                Test Toggle ({testToggleCount})
              </Button>
              <Button
                onClick={handleForceRefresh}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Force Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={handleTestVideoElement}
                variant="outline"
                size="sm"
                className="border-orange-600 text-orange-300 hover:bg-orange-700 text-xs h-8"
              >
                <Bug className="w-3 h-3 mr-1" />
                Test Direct Video Rendering
              </Button>
              <Button
                onClick={handleForceStartVideo}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-300 hover:bg-red-700 text-xs h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Force Start Video Stream
              </Button>
              <Button
                onClick={handleExplicitPermissionRequest}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-300 hover:bg-blue-700 text-xs h-8"
              >
                <Bug className="w-3 h-3 mr-1" />
                Request Camera Permissions
              </Button>
              <Button
                onClick={async () => {
                  console.log('🔥 DEBUG: Testing camera warm-up approach...');

                  try {
                    // Step 1: Get camera access first with browser API
                    console.log('📹 Getting camera access with getUserMedia...');
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    console.log('✅ Browser camera access successful');

                    // Keep the stream for a moment to "warm up" the camera
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Step 2: Release browser camera
                    console.log('🛑 Releasing browser camera...');
                    stream.getTracks().forEach(track => track.stop());

                    // Step 3: Wait a moment for camera to be released
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Step 4: Now try Zoom SDK
                    console.log('🎯 Now trying Zoom SDK after camera warm-up...');
                    if (zoomSDK) {
                      await zoomSDK.startVideo();
                      console.log('🎉 SUCCESS: Video started after camera warm-up!');
                    }

                  } catch (error) {
                    console.error('❌ Camera warm-up failed:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-300 hover:bg-green-700 text-xs h-8"
              >
                <Bug className="w-3 h-3 mr-1" />
                Try Camera Warm-up
              </Button>
              <Button
                onClick={handleNetworkTest}
                variant="outline"
                size="sm"
                className="border-yellow-600 text-yellow-300 hover:bg-yellow-700 text-xs h-8"
              >
                <Bug className="w-3 h-3 mr-1" />
                Test Network Connectivity
              </Button>
            </div>
          </div>

          {/* SDK Info */}
          <div className="space-y-1">
            <h4 className="text-white font-medium">SDK Status</h4>
            <div className="bg-fitness-gray p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">SDK Initialized:</span>
                <Badge variant={zoomSDK ? "default" : "destructive"}>
                  {zoomSDK ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current User ID:</span>
                <span className="text-gray-300 text-xs">{currentUser?.id || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            💡 Use browser dev tools console to see detailed video logs
          </div>
        </CardContent>
      </Card>
    </div>
  );
}