import { useState } from 'react';
import { StudentLevel, ExerciseContent } from '../types/fitness-platform';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Target, Users, Zap, CheckCircle } from 'lucide-react';

interface ExerciseTargetSelectorProps {
  onExerciseSet: (content: ExerciseContent) => void;
  currentContent?: ExerciseContent;
}

// Predefined exercise templates
const exerciseTemplates = {
  'push-ups': {
    name: 'Push-ups',
    benefits: 'Build upper body and core strength, improve posture, and enhance functional movement patterns.',
    keyPoints: [
      'Keep your body in a straight line from head to heels',
      'Lower your chest to within an inch of the floor',
      'Push through your palms, not fingertips',
      'Engage your core throughout the movement'
    ]
  },
  'squats': {
    name: 'Squats',
    benefits: 'Strengthen your legs and glutes, improve mobility, and build functional lower body power.',
    keyPoints: [
      'Keep your chest up and back straight',
      'Lower until thighs are parallel to the floor',
      'Drive through your heels to stand up',
      'Keep knees aligned with your toes'
    ]
  },
  'burpees': {
    name: 'Burpees',
    benefits: 'Full-body exercise that combines strength training and cardio for maximum calorie burn.',
    keyPoints: [
      'Start in standing position, drop to plank',
      'Perform a push-up (optional)',
      'Jump feet to hands, then jump up',
      'Land softly and repeat'
    ]
  },
  'mountain-climbers': {
    name: 'Mountain Climbers',
    benefits: 'Improve cardiovascular endurance while strengthening core, arms, and legs.',
    keyPoints: [
      'Start in plank position',
      'Alternate bringing knees to chest quickly',
      'Keep hips level and core engaged',
      'Maintain steady breathing rhythm'
    ]
  }
};

export function ExerciseTargetSelector({ onExerciseSet, currentContent }: ExerciseTargetSelectorProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customBenefits, setCustomBenefits] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | StudentLevel>('all');
  const [isCustom, setIsCustom] = useState(false);

  const handleExerciseSelect = (exerciseKey: string) => {
    if (exerciseKey === 'custom') {
      setIsCustom(true);
      setSelectedExercise('');
    } else {
      setIsCustom(false);
      setSelectedExercise(exerciseKey);
      setCustomName('');
      setCustomBenefits('');
    }
  };

  const handleSetExercise = () => {
    let exerciseContent: ExerciseContent;

    if (isCustom && customName) {
      exerciseContent = {
        name: customName,
        benefits: customBenefits || 'Custom exercise for fitness improvement.',
        targetAudience,
        keyPoints: [
          'Maintain proper form throughout',
          'Listen to your body and modify as needed',
          'Focus on controlled movements',
          'Breathe consistently during exercise'
        ]
      };
    } else if (selectedExercise && exerciseTemplates[selectedExercise as keyof typeof exerciseTemplates]) {
      const template = exerciseTemplates[selectedExercise as keyof typeof exerciseTemplates];
      exerciseContent = {
        ...template,
        targetAudience,
        gifUrl: 'https://images.unsplash.com/photo-1734873477108-6837b02f2b9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwke2ZpdG5lc3MlMjBleGVyY2lzZSUyMCR7c2VsZWN0ZWRFeGVyY2lzZX18ZW58MXx8fHwxNzU3ODE0MDAwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
      };
    } else {
      return; // No valid exercise selected
    }

    onExerciseSet(exerciseContent);
  };

  const getAudienceColor = (audience: 'all' | StudentLevel) => {
    switch (audience) {
      case 'all': return 'bg-fitness-green text-black';
      case 'beginner': return 'bg-blue-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-black';
      case 'advanced': return 'bg-red-500 text-white';
    }
  };

  const getAudienceIcon = (audience: 'all' | StudentLevel) => {
    return audience === 'all' ? Users : Target;
  };

  return (
    <Card className="bg-fitness-gray border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-fitness-orange" />
          Set Exercise for Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Choose Exercise</label>
          <Select onValueChange={handleExerciseSelect}>
            <SelectTrigger className="bg-fitness-dark border-gray-600 text-white">
              <SelectValue placeholder="Select an exercise..." />
            </SelectTrigger>
            <SelectContent className="bg-fitness-gray border-gray-600">
              {Object.entries(exerciseTemplates).map(([key, template]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-fitness-dark">
                  {template.name}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="text-fitness-orange hover:bg-fitness-dark">
                Custom Exercise
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Exercise Fields */}
        {isCustom && (
          <div className="space-y-3 p-3 border border-gray-600 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Exercise Name</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter exercise name..."
                className="bg-fitness-dark border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Benefits (Optional)</label>
              <Textarea
                value={customBenefits}
                onChange={(e) => setCustomBenefits(e.target.value)}
                placeholder="Describe the exercise benefits..."
                className="bg-fitness-dark border-gray-600 text-white resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Target Audience Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Target Audience</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTargetAudience('all')}
              className={`p-3 rounded-lg border-2 transition-all ${
                targetAudience === 'all' 
                  ? 'border-fitness-green bg-fitness-green/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <Users className="w-4 h-4 text-fitness-green" />
                <span className="text-white text-sm font-medium">All Students</span>
              </div>
            </button>
            
            {(['beginner', 'intermediate', 'advanced'] as StudentLevel[]).map((level) => {
              const Icon = getAudienceIcon(level);
              return (
                <button
                  key={level}
                  onClick={() => setTargetAudience(level)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    targetAudience === level 
                      ? `border-${level === 'beginner' ? 'blue' : level === 'intermediate' ? 'yellow' : 'red'}-500 bg-${level === 'beginner' ? 'blue' : level === 'intermediate' ? 'yellow' : 'red'}-500/10` 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Icon className={`w-4 h-4 ${level === 'beginner' ? 'text-blue-500' : level === 'intermediate' ? 'text-yellow-500' : 'text-red-500'}`} />
                    <span className="text-white text-sm font-medium capitalize">{level}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Selection Preview */}
        {(selectedExercise || customName) && (
          <div className="p-3 bg-fitness-dark/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">
                {isCustom ? customName : exerciseTemplates[selectedExercise as keyof typeof exerciseTemplates]?.name}
              </span>
              <Badge className={getAudienceColor(targetAudience)}>
                {targetAudience === 'all' ? 'All Students' : targetAudience.toUpperCase()}
              </Badge>
            </div>
            {currentContent?.name === (isCustom ? customName : selectedExercise) && 
             currentContent?.targetAudience === targetAudience && (
              <div className="flex items-center gap-1 text-fitness-green text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Currently Active</span>
              </div>
            )}
          </div>
        )}

        {/* Set Exercise Button */}
        <Button
          onClick={handleSetExercise}
          disabled={!selectedExercise && !customName}
          className="w-full bg-fitness-orange hover:bg-fitness-orange/80 text-black font-medium"
        >
          <Zap className="w-4 h-4 mr-2" />
          Set Exercise for {targetAudience === 'all' ? 'All Students' : `${targetAudience} Group`}
        </Button>
      </CardContent>
    </Card>
  );
}