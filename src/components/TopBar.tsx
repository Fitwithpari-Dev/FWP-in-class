import { ClassSession, CoachMode } from '../types/fitness-platform';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { 
  Clock, 
  Circle, 
  Wifi, 
  Users,
  Settings,
  Eye,
  UserCheck,
  BookOpen,
  Dumbbell
} from 'lucide-react';

interface TopBarProps {
  classSession: ClassSession;
  elapsedTime: number;
  exerciseTimer: number;
  participantCount: number;
  formatTime: (seconds: number) => string;
  onSettingsClick: () => void;
  onToggleView?: () => void;
  currentView?: 'coach' | 'student';
  onCoachModeToggle?: (mode: CoachMode) => void;
}

export function TopBar({ 
  classSession, 
  elapsedTime, 
  exerciseTimer,
  participantCount,
  formatTime,
  onSettingsClick,
  onToggleView,
  currentView = 'coach',
  onCoachModeToggle
}: TopBarProps) {
  return (
    <div className="bg-fitness-dark border-b border-gray-700 px-2 md:px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Class Info & Coach Mode Toggle */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <h1 className="text-white text-sm md:text-lg font-bold truncate">{classSession.title}</h1>
          
          {/* Coach Mode Display for Student View */}
          {currentView === 'student' && (
            <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 py-1 bg-gray-800 rounded-lg">
              <span className="text-gray-400 text-xs md:text-sm">Mode:</span>
              <Badge className={classSession.coachMode === 'workout' ? 'bg-fitness-orange text-black' : 'bg-fitness-green text-black'}>
                {classSession.coachMode === 'workout' ? (
                  <>
                    <Dumbbell className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Workout</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Teach</span>
                  </>
                )}
              </Badge>
            </div>
          )}

          {/* Coach Mode Toggle */}
          {onCoachModeToggle && currentView === 'coach' && (
            <>
              {/* Desktop Coach Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 md:gap-2 border border-gray-600 rounded-lg p-1">
                <Button
                  variant={classSession.coachMode === 'teach' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onCoachModeToggle('teach')}
                  className={`h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm ${
                    classSession.coachMode === 'teach' 
                      ? 'bg-fitness-green text-black hover:bg-fitness-green/90' 
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">Teach</span>
                </Button>
                <Button
                  variant={classSession.coachMode === 'workout' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onCoachModeToggle('workout')}
                  className={`h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm ${
                    classSession.coachMode === 'workout' 
                      ? 'bg-fitness-orange text-black hover:bg-fitness-orange/90' 
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Dumbbell className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">Workout</span>
                </Button>
              </div>

              {/* Mobile Coach Mode Toggle - Compact Button */}
              <div className="flex sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCoachModeToggle(classSession.coachMode === 'teach' ? 'workout' : 'teach')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 px-2 py-1 h-8"
                >
                  {classSession.coachMode === 'teach' ? (
                    <>
                      <BookOpen className="w-3 h-3 mr-1 text-fitness-green" />
                      <span className="text-xs">Teach</span>
                    </>
                  ) : (
                    <>
                      <Dumbbell className="w-3 h-3 mr-1 text-fitness-orange" />
                      <span className="text-xs">Workout</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
          
          {/* Show exercise timer on mobile, full info on desktop */}
          {classSession.currentExercise && exerciseTimer > 0 && (
            <div className="flex sm:hidden items-center">
              <div className="bg-fitness-green text-black px-2 py-1 rounded text-xs font-bold">
                {formatTime(exerciseTimer)}
              </div>
            </div>
          )}
          
          {classSession.currentExercise && (
            <div className="hidden sm:flex items-center gap-2">
              <Badge className="bg-fitness-orange text-black text-xs">
                {classSession.currentExercise}
              </Badge>
              {exerciseTimer > 0 && (
                <div className="bg-fitness-green text-black px-2 py-1 rounded text-xs font-bold">
                  {formatTime(exerciseTimer)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Timer & View Toggle */}
        <div className="flex items-center gap-2 md:gap-6 min-w-0">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2 text-white">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="font-mono text-sm md:text-lg">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 text-white">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-sm md:text-base">{participantCount}</span>
            </div>
          </div>

          {/* View Toggle - Only show if onToggleView is provided (coach only) */}
          {onToggleView && (
            <>
              {/* Desktop View Toggle */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2 text-white">
                  <UserCheck className="w-4 h-4 text-fitness-green" />
                  <span className="text-sm">Coach</span>
                </div>
                
                <Switch
                  checked={currentView === 'student'}
                  onCheckedChange={onToggleView}
                  className="data-[state=checked]:bg-fitness-orange"
                />
                
                <div className="flex items-center gap-2 text-white">
                  <Eye className="w-4 h-4 text-fitness-orange" />
                  <span className="text-sm">Student View</span>
                </div>
              </div>

              {/* Mobile View Toggle - Compact Button */}
              <div className="flex lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleView}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 px-2 py-1 h-8"
                >
                  {currentView === 'coach' ? (
                    <>
                      <UserCheck className="w-3 h-3 mr-1 text-fitness-green" />
                      <span className="text-xs">Coach</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1 text-fitness-orange" />
                      <span className="text-xs">Student</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-1 md:gap-3">
          {classSession.isRecording && (
            <div className="flex items-center gap-1 md:gap-2">
              <Circle className="w-2 h-2 md:w-3 md:h-3 text-red-500 fill-current animate-pulse" />
              <span className="text-red-400 text-xs md:text-sm">REC</span>
            </div>
          )}
          
          <div className="hidden sm:flex items-center gap-1 text-fitness-green">
            <Wifi className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm">Good</span>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSettingsClick}
            className="text-gray-400 hover:text-white w-8 h-8 md:w-10 md:h-10"
          >
            <Settings className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}