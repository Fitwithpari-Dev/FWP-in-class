import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Copy, Share2, Users, ExternalLink, Check } from 'lucide-react';

interface SessionInfoProps {
  sessionId: string;
  participantCount: number;
  userRole: 'coach' | 'student';
}

export function SessionInfo({ sessionId, participantCount, userRole }: SessionInfoProps) {
  const [copiedRecently, setCopiedRecently] = useState(false);

  const sessionUrl = `${window.location.origin}/?session=${sessionId}`;
  const joinInstructions = `Join my fitness class!\n\n1. Go to: ${window.location.origin}\n2. Click "Join Session"\n3. Enter Session ID: ${sessionId}\n4. Select "Join as Student"\n\nSee you in class! 💪`;

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (err) {
      console.error('Failed to copy session ID:', err);
    }
  };

  const handleCopyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch (err) {
      console.error('Failed to copy join link:', err);
    }
  };

  const handleShareInstructions = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my fitness class!',
          text: joinInstructions,
        });
      } else {
        await navigator.clipboard.writeText(joinInstructions);
        setCopiedRecently(true);
        setTimeout(() => setCopiedRecently(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  if (userRole === 'student') {
    return (
      <div className="bg-fitness-gray border border-gray-600 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-fitness-green text-fitness-green">
              <Users className="w-3 h-3 mr-1" />
              Session: {sessionId}
            </Badge>
            <span className="text-gray-400 text-sm">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            onClick={handleCopySessionId}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            {copiedRecently ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-fitness-gray border border-gray-600 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Share Session with Students
        </h3>
        <Badge variant="outline" className="border-fitness-orange text-fitness-orange">
          <Users className="w-3 h-3 mr-1" />
          {participantCount} joined
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Session ID */}
        <div>
          <label className="text-gray-400 text-sm block mb-1">Session ID</label>
          <div className="flex items-center gap-2">
            <code className="bg-fitness-dark px-3 py-2 rounded border border-gray-600 text-fitness-green font-mono text-sm flex-1">
              {sessionId}
            </code>
            <Button
              onClick={handleCopySessionId}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {copiedRecently ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Join Link */}
        <div>
          <label className="text-gray-400 text-sm block mb-1">Quick Join Link</label>
          <div className="flex items-center gap-2">
            <div className="bg-fitness-dark px-3 py-2 rounded border border-gray-600 text-gray-300 text-sm flex-1 truncate">
              {sessionUrl}
            </div>
            <Button
              onClick={handleCopyJoinLink}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          onClick={handleShareInstructions}
          className="w-full bg-fitness-orange hover:bg-orange-600 text-white"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Join Instructions
        </Button>

        <div className="text-xs text-gray-500 mt-2">
          💡 Students can join by entering the Session ID or using the Quick Join Link
        </div>
      </div>
    </div>
  );
}