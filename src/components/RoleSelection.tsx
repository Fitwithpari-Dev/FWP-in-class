import { UserRole } from '../types/fitness-platform';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Users, 
  User, 
  Play, 
  Settings,
  MessageCircle,
  Eye
} from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  errorMessage?: string;
  onReset?: () => void;
}

export function RoleSelection({ onSelectRole, errorMessage, onReset }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-fitness-dark flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            FitClass Pro
          </h1>
          <p className="text-gray-400 text-lg">
            Join your fitness class session
          </p>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-300 mb-3">
                Connection failed: {errorMessage}
              </p>
              {onReset && (
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="border-red-600 text-red-300 hover:bg-red-900/20"
                >
                  Start Over
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Coach Card */}
          <Card className="bg-fitness-gray border-gray-700 hover:border-fitness-green transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-fitness-green rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-black" />
              </div>
              <CardTitle className="text-white text-2xl">Coach / Instructor</CardTitle>
              <CardDescription className="text-gray-400">
                Lead your fitness class with full participant management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Settings className="w-5 h-5 text-fitness-green" />
                  <span>Full participant management</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Play className="w-5 h-5 text-fitness-green" />
                  <span>Class timer & exercise controls</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Eye className="w-5 h-5 text-fitness-green" />
                  <span>Spotlight & gallery view switching</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <MessageCircle className="w-5 h-5 text-fitness-green" />
                  <span>Moderation tools & chat management</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-fitness-green text-black hover:bg-green-400 font-medium"
                onClick={() => onSelectRole('coach')}
              >
                Join as Coach
              </Button>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="bg-fitness-gray border-gray-700 hover:border-fitness-orange transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-fitness-orange rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <User className="w-10 h-10 text-black" />
              </div>
              <CardTitle className="text-white text-2xl">Student / Trainee</CardTitle>
              <CardDescription className="text-gray-400">
                Focus on your workout with an immersive experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Eye className="w-5 h-5 text-fitness-orange" />
                  <span>Immersive instructor spotlight view</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Play className="w-5 h-5 text-fitness-orange" />
                  <span>Live exercise timer & rep counter</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Users className="w-5 h-5 text-fitness-orange" />
                  <span>Raise hand & reactions</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <MessageCircle className="w-5 h-5 text-fitness-orange" />
                  <span>Chat with other participants</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-fitness-orange text-black hover:bg-orange-400 font-medium"
                onClick={() => onSelectRole('student')}
              >
                Join as Student
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Zoom Video SDK • FitClass Pro v1.0</p>
        </div>
      </div>
    </div>
  );
}