import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { 
  Mic, 
  Video, 
  Speaker, 
  Monitor,
  Volume2,
  Camera
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedCamera, setSelectedCamera] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  // Mock device options
  const audioInputs = [
    { id: 'default', name: 'Default - MacBook Pro Microphone' },
    { id: 'airpods', name: 'AirPods Pro' },
    { id: 'webcam', name: 'HD Pro Webcam C920' },
  ];

  const videoInputs = [
    { id: 'default', name: 'FaceTime HD Camera (Built-in)' },
    { id: 'webcam', name: 'HD Pro Webcam C920' },
    { id: 'virtual', name: 'OBS Virtual Camera' },
  ];

  const audioOutputs = [
    { id: 'default', name: 'Default - MacBook Pro Speakers' },
    { id: 'airpods', name: 'AirPods Pro' },
    { id: 'monitor', name: 'Studio Display' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-fitness-gray border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="text-white">Audio & Video Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your microphone, camera, and speaker settings for the best class experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audio Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-fitness-green" />
              <Label className="text-white">Microphone</Label>
            </div>
            <Select value={selectedMic} onValueChange={setSelectedMic}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {audioInputs.map((device) => (
                  <SelectItem key={device.id} value={device.id} className="text-white hover:bg-gray-700">
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Mic Level Indicator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div className="bg-fitness-green h-2 rounded-full w-3/4"></div>
              </div>
              <span className="text-xs text-gray-400">Input Level</span>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Video Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-fitness-green" />
              <Label className="text-white">Camera</Label>
            </div>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {videoInputs.map((device) => (
                  <SelectItem key={device.id} value={device.id} className="text-white hover:bg-gray-700">
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Camera Preview */}
            <div className="bg-gray-800 rounded-lg h-24 sm:h-32 flex items-center justify-center">
              <div className="text-2xl sm:text-4xl">📷</div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Audio Output */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Speaker className="w-4 h-4 text-fitness-green" />
              <Label className="text-white">Speaker</Label>
            </div>
            <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {audioOutputs.map((device) => (
                  <SelectItem key={device.id} value={device.id} className="text-white hover:bg-gray-700">
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Test Speaker
            </Button>
          </div>

          <Separator className="bg-gray-700" />

          {/* Audio Processing */}
          <div className="space-y-4">
            <Label className="text-white">Audio Processing</Label>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Noise Cancellation</span>
              <Switch 
                checked={noiseCancellation} 
                onCheckedChange={setNoiseCancellation}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Auto Gain Control</span>
              <Switch 
                checked={autoGainControl} 
                onCheckedChange={setAutoGainControl}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Echo Cancellation</span>
              <Switch 
                checked={echoCancellation} 
                onCheckedChange={setEchoCancellation}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={onClose}
              className="flex-1 bg-fitness-green text-black hover:bg-green-400"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}