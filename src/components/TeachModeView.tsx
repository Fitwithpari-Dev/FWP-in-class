import { Participant, ClassSession, StudentLevel } from '../types/fitness-platform';
import { ParticipantTile } from './ParticipantTile';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Target, Users, Eye, EyeOff } from 'lucide-react';

interface TeachModeViewProps {
  classSession: ClassSession;
  coachParticipant: Participant | null;
  userRole: 'coach' | 'student';
  studentLevel?: StudentLevel; // For filtering content by student level
}

export function TeachModeView({ 
  classSession, 
  coachParticipant, 
  userRole,
  studentLevel
}: TeachModeViewProps) {
  // Determine if student can see the current exercise content
  const canSeeExercise = () => {
    if (userRole === 'coach') return true; // Coach always sees everything
    if (!classSession.currentExerciseContent) return true; // No targeting, show default
    
    const targetAudience = classSession.currentExerciseContent.targetAudience;
    return targetAudience === 'all' || targetAudience === studentLevel;
  };

  const getTargetAudienceInfo = () => {
    if (!classSession.currentExerciseContent) return null;
    const target = classSession.currentExerciseContent.targetAudience;
    
    if (target === 'all') {
      return { label: 'All Students', color: 'bg-fitness-green text-black', icon: Users };
    } else {
      const colors = {
        beginner: 'bg-blue-500 text-white',
        intermediate: 'bg-yellow-500 text-black', 
        advanced: 'bg-red-500 text-white'
      };
      return { 
        label: `${target.charAt(0).toUpperCase() + target.slice(1)} Group`, 
        color: colors[target], 
        icon: Target 
      };
    }
  };

  const targetInfo = getTargetAudienceInfo();
  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Mobile Layout - Vertical stacking with coach prominence */}
      <div className="flex flex-col h-full md:hidden">
        {/* Coach Video Section - Primary focus */}
        <div className="flex-1 p-3 flex flex-col items-center justify-center min-h-0">
          {coachParticipant && (
            <div className="relative w-full h-full flex items-center justify-center">
              <ParticipantTile
                participant={coachParticipant}
                userRole={userRole}
                isSpotlighted={true}
                size="large"
                className="w-full h-full"
              />
              
              {/* Coach Indicator */}
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-fitness-green text-black text-sm font-bold">
                  INSTRUCTOR
                </Badge>
              </div>

              {/* Current Exercise Overlay */}
              {(classSession.currentExerciseContent?.name || classSession.currentExercise) && (
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {classSession.currentExerciseContent?.name || classSession.currentExercise}
                        </h3>
                        <div className="w-8 h-1 bg-fitness-orange rounded-full mt-1" />
                      </div>
                      {targetInfo && userRole === 'coach' && (
                        <Badge className={`${targetInfo.color} text-xs`}>
                          {targetInfo.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Exercise Info - Compact secondary section */}
        <div className="flex-shrink-0 max-h-64 overflow-y-auto bg-gradient-to-t from-fitness-dark to-gray-900/50 border-t border-gray-800">
          <div className="p-4 space-y-3 text-center">
            {canSeeExercise() ? (
              <>
                {/* Exercise GIF/Image - Smaller for mobile */}
                {(classSession.currentExerciseContent?.gifUrl || classSession.exerciseGifUrl) && (
                  <div className="relative w-full aspect-video max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-800">
                    <ImageWithFallback
                      src={classSession.currentExerciseContent?.gifUrl || classSession.exerciseGifUrl || ''}
                      alt={`${classSession.currentExerciseContent?.name || classSession.currentExercise} demonstration`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Exercise Benefits - Compact */}
                {(classSession.currentExerciseContent?.benefits || classSession.exerciseBenefits) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-fitness-green">
                      Exercise Benefits
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {classSession.currentExerciseContent?.benefits || classSession.exerciseBenefits}
                    </p>
                  </div>
                )}

                {/* Key Points - Compact */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-fitness-orange">
                    Key Points
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-1 text-left max-w-xs mx-auto">
                    {classSession.currentExerciseContent?.keyPoints ? (
                      classSession.currentExerciseContent.keyPoints.slice(0, 4).map((point, index) => (
                        <li key={index}>• {point}</li>
                      ))
                    ) : (
                      <>
                        <li>• Keep your core engaged throughout</li>
                        <li>• Maintain proper form over speed</li>
                        <li>• Breathe consistently</li>
                        <li>• Listen to your body</li>
                      </>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 space-y-2 text-gray-500">
                <EyeOff className="w-8 h-8" />
                <div className="text-center">
                  <h3 className="text-sm font-bold mb-1">Exercise in Progress</h3>
                  <p className="text-xs">The instructor is working with a specific group.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Coach-focused split */}
      <div className="hidden md:flex h-full">
        {/* Coach Video Section - Larger prominence */}
        <div className="w-2/3 p-4 flex flex-col items-center justify-center border-r border-gray-700">
          {coachParticipant && (
            <div className="relative w-full h-full flex items-center justify-center">
              <ParticipantTile
                participant={coachParticipant}
                userRole={userRole}
                isSpotlighted={true}
                size="large"
                className="w-full h-full max-w-2xl"
              />
              
              {/* Coach Indicator */}
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-fitness-green text-black text-lg font-bold px-4 py-2">
                  INSTRUCTOR
                </Badge>
              </div>

              {/* Current Exercise Overlay */}
              {(classSession.currentExerciseContent?.name || classSession.currentExercise) && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-2xl">
                          {classSession.currentExerciseContent?.name || classSession.currentExercise}
                        </h3>
                        <div className="w-12 h-1 bg-fitness-orange rounded-full mt-2" />
                      </div>
                      {targetInfo && userRole === 'coach' && (
                        <div className="flex items-center gap-2">
                          <targetInfo.icon className="w-4 h-4" />
                          <Badge className={`${targetInfo.color} text-sm`}>
                            {targetInfo.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Exercise Info & GIF Section - Secondary sidebar */}
        <div className="w-1/3 p-6 flex flex-col justify-center bg-gradient-to-br from-fitness-dark to-gray-900 overflow-y-auto">
          <div className="w-full space-y-6">
            {canSeeExercise() ? (
              <>
                {/* Exercise GIF/Image */}
                {(classSession.currentExerciseContent?.gifUrl || classSession.exerciseGifUrl) && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-800">
                    <ImageWithFallback
                      src={classSession.currentExerciseContent?.gifUrl || classSession.exerciseGifUrl || ''}
                      alt={`${classSession.currentExerciseContent?.name || classSession.currentExercise} demonstration`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}

                {/* Exercise Benefits */}
                {(classSession.currentExerciseContent?.benefits || classSession.exerciseBenefits) && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-fitness-green">
                      Exercise Benefits
                    </h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      {classSession.currentExerciseContent?.benefits || classSession.exerciseBenefits}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                <div className="space-y-3">
                  <h4 className="text-md font-bold text-fitness-orange">
                    Key Points
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-2 text-left">
                    {classSession.currentExerciseContent?.keyPoints ? (
                      classSession.currentExerciseContent.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-fitness-orange mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-fitness-orange mt-1">•</span>
                          <span>Keep your core engaged throughout the movement</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-fitness-orange mt-1">•</span>
                          <span>Maintain proper form over speed</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-fitness-orange mt-1">•</span>
                          <span>Breathe consistently during the exercise</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-fitness-orange mt-1">•</span>
                          <span>Listen to your body and modify as needed</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Target Audience Indicator (for coaches) */}
                {userRole === 'coach' && targetInfo && (
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-center gap-2">
                      <targetInfo.icon className="w-4 h-4" />
                      <Badge className={`${targetInfo.color} text-sm`}>
                        {targetInfo.label}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Content not visible to this student */
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-500">
                <EyeOff className="w-16 h-16" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Exercise in Progress</h3>
                  <p className="text-sm">
                    The instructor is currently working with a specific group.
                  </p>
                  <p className="text-xs mt-2 text-gray-600">
                    Stay ready for your next exercise!
                  </p>
                </div>
                {targetInfo && (
                  <Badge className={`${targetInfo.color} opacity-60`}>
                    For {targetInfo.label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}