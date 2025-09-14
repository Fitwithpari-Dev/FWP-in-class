import { UserRole } from '../types/fitness-platform';
import { Button } from './ui/button';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Hand, 
  MessageCircle,
  Heart,
  ThumbsUp,
  Smile,
  Phone,
  Grid3X3,
  Focus,
  Users,
  Volume2
} from 'lucide-react';

interface ControlBarProps {
  userRole: UserRole;
  isLocalVideoOn: boolean;
  isLocalAudioOn: boolean;
  hasRaisedHand: boolean;
  viewMode: 'spotlight' | 'gallery';
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onRaiseHand: () => void;
  onToggleChat: () => void;
  onSwitchView: () => void;
  onMuteAll?: () => void;
  onLeave: () => void;
}

export function ControlBar({
  userRole,
  isLocalVideoOn,
  isLocalAudioOn,
  hasRaisedHand,
  viewMode,
  onToggleVideo,
  onToggleAudio,
  onRaiseHand,
  onToggleChat,
  onSwitchView,
  onMuteAll,
  onLeave
}: ControlBarProps) {
  return (
    <div className="bg-fitness-dark border-t border-gray-700 px-2 md:px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Main Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant={isLocalAudioOn ? "default" : "destructive"}
            size="icon"
            onClick={onToggleAudio}
            className={`w-10 h-10 md:w-12 md:h-12 ${isLocalAudioOn ? "bg-gray-700 hover:bg-gray-600" : ""}`}
          >
            {isLocalAudioOn ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
          </Button>

          <Button
            variant={isLocalVideoOn ? "default" : "destructive"}
            size="icon"
            onClick={onToggleVideo}
            className={`w-10 h-10 md:w-12 md:h-12 ${isLocalVideoOn ? "bg-gray-700 hover:bg-gray-600" : ""}`}
          >
            {isLocalVideoOn ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
          </Button>

          {userRole === 'coach' && onMuteAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMuteAll}
              className="hidden sm:flex border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Mute All</span>
            </Button>
          )}
        </div>

        {/* Center: Reactions & Interactions */}
        <div className="flex items-center gap-1 md:gap-2">
          {userRole === 'student' && (
            <Button
              variant={hasRaisedHand ? "default" : "outline"}
              size="icon"
              onClick={onRaiseHand}
              className={`w-10 h-10 ${hasRaisedHand ? "bg-fitness-orange hover:bg-orange-600" : "border-gray-600 text-gray-300 hover:bg-gray-700"}`}
            >
              <Hand className="w-4 h-4" />
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-400 hover:bg-gray-700 w-8 h-8"
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-fitness-green hover:bg-gray-700 w-8 h-8"
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-yellow-400 hover:bg-gray-700 w-8 h-8"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onToggleChat}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 w-10 h-10"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: View Controls & Leave */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchView}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 px-2 md:px-3"
          >
            {viewMode === 'spotlight' ? (
              <>
                <Grid3X3 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Gallery</span>
              </>
            ) : (
              <>
                <Focus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Spotlight</span>
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onLeave}
            className="px-2 md:px-3"
          >
            <Phone className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Leave</span>
          </Button>
        </div>
      </div>
    </div>
  );
}