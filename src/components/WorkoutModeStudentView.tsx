import { Participant, ClassSession } from '../types/fitness-platform';
import { ParticipantTile } from './ParticipantTile';
import { Badge } from './ui/badge';
import { Clock, Target, Zap } from 'lucide-react';

interface WorkoutModeStudentViewProps {
  classSession: ClassSession;
  currentUser: Participant | null;
  coachParticipant: Participant | null;
  exerciseTimer: number;
  formatTime: (seconds: number) => string;
}

export function WorkoutModeStudentView({
  classSession,
  currentUser,
  coachParticipant,
  exerciseTimer,
  formatTime,
}: WorkoutModeStudentViewProps) {
  return (
    <div className="flex-1 bg-fitness-dark">
      {/* Mobile Layout - Optimized vertical stacking */}
      <div className="flex flex-col h-full lg:hidden overflow-hidden">
        {/* Streamlined header */}
        <div className="flex-shrink-0 bg-gray-900/40 p-2 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium text-sm">Workout Mode</h3>
              <Badge className="bg-fitness-green text-black text-xs">
                {currentUser?.level?.toUpperCase() || 'STUDENT'}
              </Badge>
            </div>
            {classSession.currentExercise && (
              <div className="text-right">
                <div className="text-white text-sm font-medium">{classSession.currentExercise}</div>
                {exerciseTimer > 0 && (
                  <div className="text-fitness-green text-xs font-mono">
                    {formatTime(exerciseTimer)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main content - vertical stack */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Your view - primary focus */}
          <div className="flex-1 p-3 min-h-0">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-fitness-orange rounded-full"></div>
                  Your View
                </span>
                {currentUser?.repCount && (
                  <div className="bg-fitness-orange text-black px-3 py-1 rounded-full font-bold text-sm">
                    {currentUser.repCount} reps
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                {currentUser && (
                  <div className="relative w-full h-full max-w-sm">
                    <ParticipantTile
                      participant={currentUser}
                      userRole="student"
                      size="large"
                      className="w-full h-full ring-2 ring-fitness-orange ring-opacity-60"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exercise timer - compact */}
          {(classSession.currentExercise || exerciseTimer > 0) && (
            <div className="flex-shrink-0 bg-gray-900/30 p-3 border-t border-gray-800">
              <div className="text-center">
                {classSession.currentExercise && (
                  <div className="mb-2">
                    <h2 className="text-base font-bold text-white mb-1">
                      {classSession.currentExercise}
                    </h2>
                    <div className="flex items-center justify-center gap-1 text-fitness-orange">
                      <Target className="w-3 h-3" />
                      <span className="text-xs uppercase tracking-wide">Active</span>
                    </div>
                  </div>
                )}

                {exerciseTimer > 0 && (
                  <div className="space-y-2">
                    <div className="text-xl font-mono font-bold text-fitness-green">
                      {formatTime(exerciseTimer)}
                    </div>
                    
                    <div className="w-40 h-1 bg-gray-700 rounded-full mx-auto">
                      <div 
                        className="h-full bg-fitness-green rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.max(0, (exerciseTimer / 180) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coach view - bottom section */}
          <div className="flex-shrink-0 h-36 p-3 border-t border-gray-800">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-fitness-green rounded-full"></div>
                  Instructor
                </span>
                <Badge className="bg-fitness-green text-black text-xs">LIVE</Badge>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                {coachParticipant && (
                  <div className="relative w-full h-full max-w-xs">
                    <ParticipantTile
                      participant={coachParticipant}
                      userRole="student"
                      size="medium"
                      className="w-full h-full ring-2 ring-fitness-green ring-opacity-60"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex h-full">
        {/* Student's Full View */}
        <div className="w-1/2 p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Your View</h3>
            <Badge className="bg-fitness-green text-black">
              {currentUser?.level?.toUpperCase() || 'STUDENT'}
            </Badge>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            {currentUser && (
              <div className="relative w-full h-full max-w-lg max-h-96">
                <ParticipantTile
                  participant={currentUser}
                  userRole="student"
                  size="large"
                  className="!w-full !h-full"
                />
                
                {/* Rep Counter Overlay */}
                {currentUser.repCount && (
                  <div className="absolute bottom-4 right-4 bg-fitness-orange text-black px-4 py-2 rounded-full font-bold text-lg z-10">
                    {currentUser.repCount} reps
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timer and Coach Section */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Timer & Exercise Info */}
          <div className="h-1/2 p-6 border-b border-gray-700 border-l border-gray-700 flex items-center justify-center">
            <div className="text-center space-y-4">
              {/* Current Exercise */}
              {classSession.currentExercise && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {classSession.currentExercise}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-fitness-orange">
                    <Target className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wide">
                      Current Exercise
                    </span>
                  </div>
                </div>
              )}

              {/* Timer */}
              {exerciseTimer > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wide">Time Remaining</span>
                  </div>
                  <div className="text-4xl font-mono font-bold text-fitness-green">
                    {formatTime(exerciseTimer)}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                    <div 
                      className="h-full bg-fitness-green rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.max(0, (exerciseTimer / 180) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Motivational Elements */}
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-fitness-orange" />
                  <span>Keep Going!</span>
                </div>
                <div className="w-1 h-1 bg-gray-600 rounded-full" />
                <span>You've Got This!</span>
              </div>
            </div>
          </div>

          {/* Coach View */}
          <div className="h-1/2 p-4 border-l border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Instructor</h3>
              <Badge className="bg-fitness-orange text-black">
                LIVE
              </Badge>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              {coachParticipant && (
                <div className="relative w-full h-full max-w-sm max-h-48">
                  <ParticipantTile
                    participant={coachParticipant}
                    userRole="student"
                    size="medium"
                    className="!w-full !h-full"
                  />
                  
                  {/* Coach Indicator */}
                  <div className="absolute top-2 left-2 bg-fitness-green text-black px-2 py-1 rounded text-xs font-bold z-10">
                    COACH
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}