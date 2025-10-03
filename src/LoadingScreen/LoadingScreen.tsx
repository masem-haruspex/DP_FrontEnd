// LoadingScreen.tsx
import { useEffect, useRef, useState } from "react";

const DEBUG = false;

interface IProps {
  progress: number;
  audioInitialized: boolean;
  modelsLoaded: boolean;
  onComplete: () => void;
  onAnimationComplete: () => void;
}

export default function LoadingScreen({
  progress,
  audioInitialized,
  modelsLoaded,
  onComplete,
  onAnimationComplete
}: IProps) {
  const animationDuration = 6000; // 6 seconds
  const hasStartedRef = useRef(false);
  const [localAnimationComplete, setLocalAnimationComplete] = useState(false);

  // Only start animation timer when models are loaded
  useEffect(() => {
    if (modelsLoaded && !hasStartedRef.current) {
      hasStartedRef.current = true;

      if(DEBUG) console.log('[LOADING SCREEN] Starting animation timer (models loaded)');

      const timer = setTimeout(() => {
        if(DEBUG) console.log('[LOADING SCREEN] Animation complete');
        setLocalAnimationComplete(true);
        onAnimationComplete();
      }, animationDuration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [modelsLoaded, onAnimationComplete, animationDuration]);

  // Check for overall completion
  useEffect(() => {
    const allComplete = localAnimationComplete && modelsLoaded && audioInitialized;
    if(DEBUG) console.log('[LOADING SCREEN] Completion check:', {
      localAnimationComplete,
      modelsLoaded,
      audioInitialized,
      allComplete
    });

    if (allComplete) {
      if(DEBUG) console.log('[LOADING SCREEN] All conditions met, calling onComplete');
      onComplete();
    }
  }, [localAnimationComplete, modelsLoaded, audioInitialized, onComplete]);

  return null;
}
