import { createContext, useContext } from 'react';
import { useVideoFitnessPlatform } from '../hooks/useVideoFitnessPlatform';

// Create context to share fitness platform state with unified video service
export const FitnessPlatformContext = createContext<ReturnType<typeof useVideoFitnessPlatform> | null>(null);

export const useFitnessPlatformContext = () => {
  const context = useContext(FitnessPlatformContext);
  if (!context) {
    throw new Error('useFitnessPlatformContext must be used within FitnessPlatformProvider');
  }
  return context;
};