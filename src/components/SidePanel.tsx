import { useState } from 'react';
import { Participant, UserRole, StudentLevel, HealthConsideration } from '../types/fitness-platform';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Users, 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Hand,
  MoreVertical,
  X,
  Target,
  Heart,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SidePanelProps {
  participants: Participant[];
  userRole: UserRole;
  isVisible: boolean;
  onClose: () => void;
  onSpotlight?: (participantId: string) => void;
  onMute?: (participantId: string) => void;
  onRemove?: (participantId: string) => void;
  highlightedLevel?: StudentLevel | null;
  onHighlightLevel?: (level: StudentLevel | null) => void;
  showLevelGroups?: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isFromSelf?: boolean;
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Sarah Johnson',
    content: 'Welcome to HIIT Cardio Blast! Ready to sweat? 💪',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    sender: 'Mike Chen',
    content: 'Let\'s do this!',
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: '3',
    sender: 'Emma Davis',
    content: 'Can we get a quick warm-up first?',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: '4',
    sender: 'You',
    content: 'Great energy everyone!',
    timestamp: new Date(Date.now() - 60000),
    isFromSelf: true,
  },
];

export function SidePanel({
  participants,
  userRole,
  isVisible,
  onClose,
  onSpotlight,
  onMute,
  onRemove,
  highlightedLevel,
  onHighlightLevel,
  showLevelGroups = false
}: SidePanelProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        content: newMessage,
        timestamp: new Date(),
        isFromSelf: true,
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Group participants by level
  const groupedParticipants = participants.reduce((groups, participant) => {
    const level = participant.level || 'unassigned';
    if (!groups[level]) {
      groups[level] = [];
    }
    groups[level].push(participant);
    return groups;
  }, {} as Record<string, Participant[]>);

  const levelOrder: string[] = ['beginner', 'intermediate', 'advanced', 'unassigned'];
  const levelColors = {
    beginner: 'bg-blue-500',
    intermediate: 'bg-yellow-500', 
    advanced: 'bg-red-500',
    unassigned: 'bg-gray-500'
  };
  const levelLabels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced', 
    unassigned: 'Unassigned'
  };

  if (!isVisible) return null;

  return (
    <div className="w-full md:w-80 bg-fitness-gray border-l md:border-l border-gray-700 flex flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div className="bg-fitness-dark border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h3 className="text-white font-medium">Class Panel</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={showLevelGroups ? "groups" : "considerations"} className="flex-1 flex flex-col min-h-0">
        <TabsList className={`grid w-full ${showLevelGroups ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-800 flex-shrink-0`}>
          {showLevelGroups && (
            <TabsTrigger value="groups" className="data-[state=active]:bg-fitness-green data-[state=active]:text-black">
              <Target className="w-4 h-4 mr-2" />
              Groups
            </TabsTrigger>
          )}
          <TabsTrigger value="considerations" className="data-[state=active]:bg-fitness-green data-[state=active]:text-black">
            <Heart className="w-4 h-4 mr-2" />
            Health Notes
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-fitness-green data-[state=active]:text-black">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        {showLevelGroups && (
          <TabsContent value="groups" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4 py-4">
              <div className="space-y-4">
                {levelOrder.map((level) => {
                  const levelParticipants = groupedParticipants[level];
                  if (!levelParticipants || levelParticipants.length === 0) return null;

                  const isHighlighted = highlightedLevel === level;

                  return (
                    <div key={level} className="space-y-2">
                      {/* Level Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${levelColors[level]}`} />
                          <h4 className="text-white font-medium">{levelLabels[level]}</h4>
                          <span className="text-gray-400 text-sm">({levelParticipants.length})</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onHighlightLevel?.(isHighlighted ? null : level as StudentLevel)}
                          className={`text-xs ${
                            isHighlighted 
                              ? 'bg-fitness-green text-black border-fitness-green' 
                              : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {isHighlighted ? 'Clear' : 'Highlight'}
                        </Button>
                      </div>

                      {/* Level Participants */}
                      <div className="space-y-1 pl-6">
                        {levelParticipants.map((participant) => (
                          <div 
                            key={participant.id}
                            className={`bg-gray-800 rounded-lg p-2 flex items-center justify-between transition-all ${
                              isHighlighted ? 'ring-2 ring-fitness-green ring-opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-fitness-green to-fitness-orange rounded-full flex items-center justify-center text-black font-medium text-xs">
                                {participant.name.charAt(0)}
                              </div>
                              <span className="text-white text-sm">{participant.name}</span>
                              {participant.isHost && (
                                <Badge className="bg-fitness-orange text-black text-xs px-1 py-0">
                                  HOST
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {participant.isAudioOn ? (
                                <Mic className="w-3 h-3 text-fitness-green" />
                              ) : (
                                <MicOff className="w-3 h-3 text-red-400" />
                              )}
                              {participant.isVideoOn ? (
                                <Video className="w-3 h-3 text-fitness-green" />
                              ) : (
                                <VideoOff className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* Health Considerations Tab */}
        <TabsContent value="considerations" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-3">
              {participants
                .filter(participant => !participant.isHost && (participant.healthConsiderations?.length || participant.medicalNotes))
                .map((participant) => {
                  const getSeverityColor = (severity: string) => {
                    switch (severity) {
                      case 'high': return 'text-red-400 bg-red-400/10';
                      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
                      case 'low': return 'text-blue-400 bg-blue-400/10';
                      default: return 'text-gray-400 bg-gray-400/10';
                    }
                  };

                  const getSeverityIcon = (severity: string) => {
                    switch (severity) {
                      case 'high': return <AlertTriangle className="w-3 h-3" />;
                      case 'medium': return <Info className="w-3 h-3" />;
                      case 'low': return <Heart className="w-3 h-3" />;
                      default: return <Info className="w-3 h-3" />;
                    }
                  };

                  return (
                    <div 
                      key={participant.id}
                      className="bg-gray-800 rounded-lg p-3 space-y-2"
                    >
                      {/* Participant Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-fitness-green to-fitness-orange rounded-full flex items-center justify-center text-black font-medium text-sm">
                            {participant.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {participant.name}
                              </span>
                              {participant.level && (
                                <Badge 
                                  className={`text-white text-xs px-1 py-0 ${levelColors[participant.level]}`}
                                >
                                  {participant.level.charAt(0).toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {userRole === 'coach' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-gray-400 hover:text-fitness-green"
                              onClick={() => onSpotlight?.(participant.id)}
                            >
                              <Users className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Health Considerations */}
                      {participant.healthConsiderations?.map((consideration, index) => (
                        <div 
                          key={index}
                          className={`rounded-lg p-2 border ${getSeverityColor(consideration.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(consideration.severity)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  {consideration.description}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs capitalize ${getSeverityColor(consideration.severity)}`}
                                >
                                  {consideration.type}
                                </Badge>
                              </div>
                              
                              {consideration.affectedExercises && consideration.affectedExercises.length > 0 && (
                                <div className="text-xs text-gray-400">
                                  <strong>Avoid:</strong> {consideration.affectedExercises.join(', ')}
                                </div>
                              )}
                              
                              {consideration.recommendedModifications && consideration.recommendedModifications.length > 0 && (
                                <div className="text-xs text-fitness-green">
                                  <strong>Alternatives:</strong> {consideration.recommendedModifications.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Medical Notes */}
                      {participant.medicalNotes && (
                        <div className="bg-gray-700 rounded-lg p-2">
                          <div className="flex items-start gap-2">
                            <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-gray-300">
                              <strong className="text-blue-400">Notes:</strong> {participant.medicalNotes}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {participants.filter(p => !p.isHost && (p.healthConsiderations?.length || p.medicalNotes)).length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No health considerations recorded</p>
                  <p className="text-xs text-gray-500 mt-1">All participants are cleared for standard exercises</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex flex-col gap-1 ${
                    message.isFromSelf ? 'items-end' : 'items-start'
                  }`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.isFromSelf
                        ? 'bg-fitness-green text-black'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    {!message.isFromSelf && (
                      <div className="text-xs text-gray-400 mb-1">
                        {message.sender}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-gray-700 p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-gray-800 border-gray-600 text-white"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button 
                size="icon"
                onClick={sendMessage}
                className="bg-fitness-green text-black hover:bg-green-400"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}