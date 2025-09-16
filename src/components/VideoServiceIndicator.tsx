// Video Service Indicator - Shows which video service is currently active
// Provides visual feedback and switching capabilities

import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Settings, RefreshCw, Info } from 'lucide-react';
import { VIDEO_SERVICE, SERVICE_NAMES, getVideoConfigInfo } from '../config/video.config';
import { useFitnessPlatformContext } from '../context/FitnessPlatformContext';

export function VideoServiceIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { switchToFallback, getServiceInfo } = useFitnessPlatformContext();

  const configInfo = getVideoConfigInfo();
  const serviceInfo = getServiceInfo();

  if (!isExpanded) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
        >
          <Settings className="w-4 h-4 mr-2" />
          {SERVICE_NAMES[VIDEO_SERVICE]}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80">
      <Card className="bg-blue-900 border-blue-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-200 text-sm flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Video Service Config
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
          {/* Active Service */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Active Service</h4>
            <div className="bg-blue-800 p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-300">Primary:</span>
                <Badge variant="default" className="bg-green-600">
                  {configInfo.primaryServiceName}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-300">Fallback:</span>
                <Badge variant="secondary">
                  {configInfo.fallbackServiceName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Service Status */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Initialized</div>
                <Badge variant={serviceInfo?.hasCurrentService ? "default" : "secondary"}>
                  {serviceInfo?.hasCurrentService ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="bg-blue-800 p-2 rounded">
                <div className="text-blue-300">Connected</div>
                <Badge variant={serviceInfo?.connectionState === 'Connected' ? "default" : "secondary"}>
                  {serviceInfo?.connectionState || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Configuration Details */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Configuration</h4>
            <div className="bg-blue-800 p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-300">Config Valid:</span>
                <Badge variant={configInfo.isValid ? "default" : "destructive"}>
                  {configInfo.isValid ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">Participants:</span>
                <span className="text-blue-200">{serviceInfo?.participantCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">Video:</span>
                <Badge variant={serviceInfo?.isLocalVideoOn ? "default" : "secondary"}>
                  {serviceInfo?.isLocalVideoOn ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">Audio:</span>
                <Badge variant={serviceInfo?.isLocalAudioOn ? "default" : "secondary"}>
                  {serviceInfo?.isLocalAudioOn ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Service Actions */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Actions</h4>
            <div className="space-y-2">
              <Button
                onClick={async () => {
                  try {
                    console.log('🔄 VideoServiceIndicator: Switching to fallback service...');
                    await switchToFallback();
                    console.log('✅ VideoServiceIndicator: Switched to fallback successfully');
                  } catch (error) {
                    console.error('❌ VideoServiceIndicator: Failed to switch to fallback:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full border-orange-600 text-orange-300 hover:bg-orange-700 text-xs h-8"
                disabled={!serviceInfo?.hasFallbackService}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Switch to {configInfo.fallbackServiceName}
              </Button>
            </div>
          </div>

          {/* Quick Config Change Info */}
          <div className="bg-blue-800 p-2 rounded">
            <div className="flex items-start space-x-2">
              <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-300 text-xs">
                <div className="font-medium">Quick Switch:</div>
                <div>Change VIDEO_SERVICE in</div>
                <div className="font-mono">src/config/video.config.ts</div>
                <div>from '{VIDEO_SERVICE}' to '{configInfo.fallbackService}'</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-blue-400 mt-2">
            💡 Modular video service architecture
          </div>
        </CardContent>
      </Card>
    </div>
  );
}