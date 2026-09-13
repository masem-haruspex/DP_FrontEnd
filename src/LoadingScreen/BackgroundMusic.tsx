// LoadingScreen/BackgroundMusic.tsx
// Not implemented yet
import { useEffect, useRef, useState } from 'react';

interface BackgroundMusicProps {
  startAnimation: boolean;
  onIntroComplete: () => void;
}

export default function BackgroundMusic({ startAnimation, onIntroComplete }: BackgroundMusicProps) {
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const loopAudioRef = useRef<HTMLAudioElement | null>(null);
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);

  useEffect(() => {
    introAudioRef.current = new Audio('/audio/intro-music.mp3');
    loopAudioRef.current = new Audio('/audio/loop-music.mp3');

    if (loopAudioRef.current) {
      loopAudioRef.current.loop = true;
    }

    if (introAudioRef.current) {
      introAudioRef.current.addEventListener('ended', () => {
        setHasIntroPlayed(true);
        onIntroComplete();

        if (loopAudioRef.current) {
          loopAudioRef.current.play().catch(console.error);
        }
      });
    }

    return () => {
      if (introAudioRef.current) {
        introAudioRef.current.pause();
        introAudioRef.current.removeEventListener('ended', () => {});
      }
      if (loopAudioRef.current) {
        loopAudioRef.current.pause();
      }
    };
  }, [onIntroComplete]);

  useEffect(() => {
    if (startAnimation && !hasIntroPlayed && introAudioRef.current) {
      introAudioRef.current.play().catch(error => {
        console.log('Audio play failed (might need user interaction):', error);
      });
    }
  }, [startAnimation, hasIntroPlayed]);

  if (!startAnimation) {
    return null;
    return (
      <button
        onClick={() => {
          if (introAudioRef.current) {
            introAudioRef.current.play().catch(console.error);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: '1px solid white',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Enable Music
      </button>
    );
  }

  return null;
}
