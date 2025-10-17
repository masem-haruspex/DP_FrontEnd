// Keyboard/Keyboard.tsx
import { useAtomValue } from 'jotai';
import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { modelsAtom } from '../atoms/models';
import { linearToDecibels } from '../lib/pianoHelpers';
import Key from './Key';
import MusicNote from './MusicNote';
import CasioBasis from './CasioBasis';
import MidiplusBasis from './MidiplusBasis';
import { pianoInstanceAtom, audioEffectsAtom } from '../atoms/audio';

const DEBUG = true;

type EffectSettings = {
  volume: number;
  reverb: number;
  delay: number;
  distortion: number;
  chorus: number;
  bass: number;
  mid: number;
  treble: number;
};

interface KeyboardProps {
  userId: string;
  position: [number, number, number];
  isLocalPlayer?: boolean;
  effectSettings: EffectSettings;
  webSocketService?: any;
  roomCode?: string;
  preferredKeyboard?: 'Casio' | 'Midiplus';
}

const WHITE_KEY_MAPPINGS = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
const BLACK_KEY_MAPPINGS = ['w', 'e', 't', 'y', 'u'];
const PRESSED_Y = -0.4;
const KEY_SCALE = 0.3;
const NOTE_LIFESPAN = 3 * 1000;

const noteToMidi = (note: string): number => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(note.slice(-1));
  const noteName = note.slice(0, -1);
  return 12 + notes.indexOf(noteName) + (octave * 12);
};

const getKeyMappings = (octave: number): Record<string, string> => ({
  'a': `C${octave}`, 'w': `C#${octave}`, 's': `D${octave}`, 'e': `D#${octave}`,
  'd': `E${octave}`, 'f': `F${octave}`, 't': `F#${octave}`, 'g': `G${octave}`,
  'y': `G#${octave}`, 'h': `A${octave}`, 'u': `A#${octave}`, 'j': `B${octave}`,
  'k': `C${octave + 1}`, 'o': `C#${octave + 1}`, 'l': `D${octave + 1}`, 'p': `D#${octave + 1}`,
  ';': `E${octave + 1}`
});

const whiteKeys = Array.from({ length: 52 }, (_, i) => ({
  index: i,
  position: [i * 0.0, 0, 0] as [number, number, number],
}));

const blackKeys = Array.from({ length: 36 }, (_, i) => ({
  index: i,
  position: [i * 0.0 + 0.12, 0.1, -0.1] as [number, number, number],
}));

export default function Keyboard({
  userId,
  position,
  isLocalPlayer = false,
  effectSettings,
  webSocketService,
  roomCode,
  preferredKeyboard = 'Casio'
}: KeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [activeNotes, setActiveNotes] = useState<{ id: string, position: [number, number, number] }[]>([]);
  const noteCounter = useRef(0);
  const activeKeyPresses = useRef<Set<string>>(new Set());
  const pianoInstance = useAtomValue(pianoInstanceAtom);
  const audioEffects = useAtomValue(audioEffectsAtom);

  const models = useAtomValue(modelsAtom);

  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
    }, 1000);
    return () => clearInterval(keepAlive);
  }, []);

  useEffect(() => {
    if (!isLocalPlayer) return;

    if (pianoInstance && audioEffects) {
      if(DEBUG) console.log('Using preloaded piano and effects');
    }
  }, [isLocalPlayer, pianoInstance, audioEffects]);

  useEffect(() => {
    if (!isLocalPlayer || !audioEffects) return;

    const { reverb, delay, distortion, chorus, eq, volume } = audioEffects;

    if (reverb) reverb.wet.value = effectSettings.reverb;
    if (delay) delay.delayTime.value = effectSettings.delay;
    if (distortion) distortion.wet.value = effectSettings.distortion;
    if (chorus) chorus.wet.value = effectSettings.chorus;
    if (eq) {
      eq.low.value = effectSettings.bass;
      eq.mid.value = effectSettings.mid;
      eq.high.value = effectSettings.treble;
    }
    if (volume) {
      volume.volume.value = linearToDecibels(effectSettings.volume);
    }
  }, [effectSettings, isLocalPlayer, audioEffects]);

  useEffect(() => {
    if (isLocalPlayer || !webSocketService) return;

    const handleRemoteKeyDown = (data: { userId: string, key: string, noteName: string }) => {
      if (data.userId === userId) {
        spawnNote(data.key, data.noteName, false);
      }
    };

    const handleRemoteKeyUp = (data: { userId: string, key: string }) => {
      if (data.userId === userId) {
        handleKeyRelease(data.key, false);
      }
    };

    webSocketService.on('KEY_EVENT', (data: any) => {
      if (data.userId === userId) {
        if (data.type === 'KEY_DOWN') {
          spawnNote(data.key, data.noteName, false);
        } else if (data.type === 'KEY_UP') {
          handleKeyRelease(data.key, false);
        }
      }
    });

    return () => {
      webSocketService.off('KEY_EVENT', handleRemoteKeyDown);
      webSocketService.off('KEY_EVENT', handleRemoteKeyUp);
    };
  }, [userId, isLocalPlayer, webSocketService]);

  const spawnNote = useCallback((key: string, noteName?: string, shouldBroadcast = true) => {
    if (activeKeyPresses.current.has(key)) return;

    const isWhiteKey = WHITE_KEY_MAPPINGS.includes(key);
    const isBlackKey = BLACK_KEY_MAPPINGS.includes(key);
    if (!isWhiteKey && !isBlackKey) return;

    activeKeyPresses.current.add(key);
    setPressedKeys(prev => new Set(prev).add(key));

    const keyIndex = isWhiteKey
      ? WHITE_KEY_MAPPINGS.indexOf(key)
      : BLACK_KEY_MAPPINGS.indexOf(key);

    const xPosition = isWhiteKey
      ? (-74 + 2.9 * (2 + (7 * 0.88) * (currentOctave - 1) + keyIndex))
      : (-74 + 2.9 * (1 + (5 * 0.88) * (currentOctave - 1) + keyIndex) + 0.12);

    const newNote = {
      id: `note-${userId}-${noteCounter.current++}-${key}-${Date.now()}`,
      position: [xPosition + position[0], position[1] - 4, position[2] - 21] as [number, number, number]
    };
    setActiveNotes(prev => [...prev, newNote]);

    if (pianoInstance?.loaded && noteName) {
      const midiNote = noteToMidi(noteName);
      pianoInstance.keyDown({ midi: midiNote, velocity: 0.7 });

      if (shouldBroadcast && isLocalPlayer && webSocketService && roomCode) {
        webSocketService.sendKeyEvent(roomCode, {
          userId,
          key,
          noteName,
          type: 'KEY_DOWN'
        });
      }
    }
  }, [userId, currentOctave, position, isLocalPlayer, webSocketService, roomCode, pianoInstance]);

  const handleKeyRelease = useCallback((key: string, shouldBroadcast = true) => {
    activeKeyPresses.current.delete(key);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    if (pianoInstance?.loaded) {
      const noteName = getKeyMappings(currentOctave)[key];
      if (noteName) {
        const midiNote = noteToMidi(noteName);
        pianoInstance.keyUp({ midi: midiNote });

        if (shouldBroadcast && isLocalPlayer && webSocketService && roomCode) {
          webSocketService.sendKeyEvent(roomCode, {
            userId,
            key,
            type: 'KEY_UP'
          });
        }
      }
    }
  }, [userId, currentOctave, isLocalPlayer, webSocketService, roomCode, pianoInstance]);

  useEffect(() => {
    if (!isLocalPlayer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }

      if (e.key >= '1' && e.key <= '7') {
        setCurrentOctave(parseInt(e.key));
      } else {
        const noteName = getKeyMappings(currentOctave)[key];
        if (noteName) {
          spawnNote(key, noteName, true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Tab') {
        return;
      }

      handleKeyRelease(e.key.toLowerCase(), true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentOctave, isLocalPlayer, spawnNote, handleKeyRelease]);

  const removeNote = (id: string) => {
    setActiveNotes(prev => prev.filter(note => note.id !== id));
  };

  if (!models) return null;

  return (
    <group position={position} scale={[KEY_SCALE, KEY_SCALE, KEY_SCALE]}>
      <Suspense fallback={null}>
        {preferredKeyboard === 'Casio' ? (
          <CasioBasis gltf={models.casioBasisModel} />
        ) : (
          <MidiplusBasis gltf={models.midiplusBasisModel} />
        )}
      </Suspense>

      {whiteKeys.map((key, index) => {
        const yPosition = WHITE_KEY_MAPPINGS.some(k =>
          pressedKeys.has(k) && key.index === 2 + 7 * (currentOctave - 1) + WHITE_KEY_MAPPINGS.indexOf(k)
        ) ? PRESSED_Y : 0;

        return (
          <Key
            key={`white-${userId}-${index}`}
            gltf={models.whiteKeyModels[index]}
            position={[key.position[0], yPosition, key.position[2]]}
          />
        );
      })}

      {blackKeys.map((key, index) => {
        const yPosition = BLACK_KEY_MAPPINGS.some(k =>
          pressedKeys.has(k) && key.index === 1 + 5 * (currentOctave - 1) + BLACK_KEY_MAPPINGS.indexOf(k)
        ) ? PRESSED_Y : 0;

        return (
          <Key
            key={`black-${userId}-${index}`}
            gltf={models.blackKeyModels[index]}
            position={[key.position[0], yPosition, key.position[2]]}
          />
        );
      })}

      {activeNotes.map(note => (
        <MusicNote
          key={note.id}
          gltf={models.noteModel}
          initialPosition={note.position}
          lifespan={NOTE_LIFESPAN}
          onExpired={() => removeNote(note.id)}
          glowColor={isLocalPlayer ? '#ffef00' : '#00ffef'}
        />
      ))}
    </group>
  );
}
