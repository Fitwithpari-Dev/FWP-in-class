import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserRole } from '../types/fitness-platform';
import { Users, Plus, LogIn } from 'lucide-react';

interface SessionManagerProps {
  onCreateSession: (sessionName: string, className: string, role: UserRole) => void;
  onJoinSession: (sessionId: string, role: UserRole) => void;
  isLoading?: boolean;
}

export function SessionManager({ onCreateSession, onJoinSession, isLoading = false }: SessionManagerProps) {
  const [sessionName, setSessionName] = useState('');
  const [className, setClassName] = useState('');
  const [joinSessionId, setJoinSessionId] = useState('');

  const generateSessionId = () => {
    const adjectives = ['morning', 'evening', 'power', 'gentle', 'dynamic', 'flow', 'strong', 'calm'];
    const activities = ['yoga', 'pilates', 'hiit', 'strength', 'cardio', 'stretching', 'meditation', 'core'];
    const randomId = Math.random().toString(36).substring(2, 8);

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    return `${randomAdjective}-${randomActivity}-${randomId}`;
  };

  const handleCreateSession = (role: UserRole) => {
    const finalSessionName = sessionName.trim() || generateSessionId();
    const finalClassName = className.trim() || `${finalSessionName} Class`;
    onCreateSession(finalSessionName, finalClassName, role);
  };

  const handleJoinSession = (role: UserRole) => {
    if (joinSessionId.trim()) {
      onJoinSession(joinSessionId.trim(), role);
    }
  };

  const generateSuggestion = () => {
    setSessionName(generateSessionId());
    setClassName(`Live Fitness Session - ${new Date().toLocaleDateString()}`);
  };

  return (
    <div className="min-h-screen bg-fitness-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            FitWithPari Live
          </h1>
          <p className="text-gray-400">
            Create or join a fitness session
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-fitness-gray">
            <TabsTrigger value="create" className="data-[state=active]:bg-fitness-orange">
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </TabsTrigger>
            <TabsTrigger value="join" className="data-[state=active]:bg-fitness-orange">
              <LogIn className="w-4 h-4 mr-2" />
              Join Session
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="bg-fitness-gray border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Create New Session
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Start a new fitness class as an instructor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Session ID
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., morning-yoga-123"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="bg-fitness-dark border-gray-600 text-white placeholder-gray-500"
                    />
                    <Button
                      onClick={generateSuggestion}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Class Name
                  </label>
                  <Input
                    placeholder="e.g., Morning Yoga Flow"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="bg-fitness-dark border-gray-600 text-white placeholder-gray-500"
                  />
                </div>

                <Button
                  onClick={() => handleCreateSession('coach')}
                  disabled={isLoading}
                  className="w-full bg-fitness-orange hover:bg-orange-600 text-white"
                >
                  {isLoading ? 'Creating Session...' : 'Start as Coach'}
                </Button>

                {sessionName && (
                  <div className="p-3 bg-fitness-dark rounded border border-gray-600">
                    <p className="text-sm text-gray-400 mb-1">Share this Session ID with students:</p>
                    <code className="text-fitness-green text-sm font-mono">
                      {sessionName || 'generated-session-id'}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="bg-fitness-gray border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Existing Session
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Enter a session ID to join as student or coach
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Session ID
                  </label>
                  <Input
                    placeholder="e.g., morning-yoga-123"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    className="bg-fitness-dark border-gray-600 text-white placeholder-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleJoinSession('student')}
                    disabled={!joinSessionId.trim() || isLoading}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {isLoading ? 'Joining...' : 'Join as Student'}
                  </Button>
                  <Button
                    onClick={() => handleJoinSession('coach')}
                    disabled={!joinSessionId.trim() || isLoading}
                    className="bg-fitness-orange hover:bg-orange-600 text-white"
                  >
                    {isLoading ? 'Joining...' : 'Join as Coach'}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Ask your instructor for the Session ID
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}