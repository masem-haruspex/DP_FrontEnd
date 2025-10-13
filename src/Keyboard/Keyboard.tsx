// Keyboard/Keyboard.tsx
import { useGLTF } from '@react-three/drei';
import { Piano } from '@tonejs/piano';
import { useAtomValue } from 'jotai';
import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { modelsAtom } from '../atoms/models';
import { linearToDecibels } from '../lib/pianoHelpers';
import Key from './Key';
import MusicNote from './MusicNote';

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
const MIN_NOTE = 21;
const MAX_NOTE = 108;

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

function CasioBasis() {
  const { scene } = useGLTF('/models/casio_basis.glb');
  return <primitive object={scene} />;
}

function MidiplusBasis() {
  const { scene } = useGLTF('/models/midiplus_basis.glb');
  return <primitive object={scene} />;
}

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
  const pianoRef = useRef<Piano | null>(null);
  const effectsRef = useRef<any>(null);

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
    if (pianoRef.current || !isLocalPlayer) return;

    const initPiano = async () => {
      try {
        const pianoInstance = new Piano({
          velocities: 3,
          minNote: MIN_NOTE,
          maxNote: MAX_NOTE
        });

        const reverb = new Tone.Reverb(2.5);
        const delay = new Tone.Delay(0.25);
        const distortion = new Tone.Distortion(0.4);
        const chorus = new Tone.Chorus(2, 2.5, 0.5);
        const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
        const volume = new Tone.Volume(0);

        pianoInstance.chain(eq, distortion, chorus, delay, reverb, volume, Tone.Destination);

        effectsRef.current = { reverb, delay, distortion, chorus, eq, volume };
        pianoRef.current = pianoInstance;

        await Promise.all([pianoInstance.load(), reverb.generate()]);
        updateEffects(effectSettings);

        console.log('Piano loaded for', isLocalPlayer ? 'local player' : 'remote player');
      } catch (err) {
        console.error('Piano init failed:', err);
      }
    };

    initPiano();

    return () => {
      if (pianoRef.current) {
        pianoRef.current.dispose();
        pianoRef.current = null;
      }
    };
  }, [isLocalPlayer]);

  useEffect(() => {
    if (isLocalPlayer) {
      updateEffects(effectSettings);
    }
  }, [effectSettings, isLocalPlayer]);

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

  const updateEffects = (newSettings: EffectSettings) => {
    if (!effectsRef.current || !isLocalPlayer) return;
    const { reverb, delay, distortion, chorus, eq, volume } = effectsRef.current;
    reverb.wet.value = newSettings.reverb;
    delay.delayTime.value = newSettings.delay;
    distortion.wet.value = newSettings.distortion;
    chorus.wet.value = newSettings.chorus;
    eq.low.value = newSettings.bass;
    eq.mid.value = newSettings.mid;
    eq.high.value = newSettings.treble;
    volume.volume.value = linearToDecibels(newSettings.volume);
  };

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

    if (pianoRef.current?.loaded && noteName) {
      const midiNote = noteToMidi(noteName);
      pianoRef.current.keyDown({ midi: midiNote, velocity: 0.7 });

      if (shouldBroadcast && isLocalPlayer && webSocketService && roomCode) {
        webSocketService.sendKeyEvent(roomCode, {
          userId,
          key,
          noteName,
          type: 'KEY_DOWN'
        });
      }
    }
  }, [userId, currentOctave, position, isLocalPlayer, webSocketService, roomCode]);

  const handleKeyRelease = useCallback((key: string, shouldBroadcast = true) => {
    activeKeyPresses.current.delete(key);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    if (pianoRef.current?.loaded) {
      const noteName = getKeyMappings(currentOctave)[key];
      if (noteName) {
        const midiNote = noteToMidi(noteName);
        pianoRef.current.keyUp({ midi: midiNote });

        if (shouldBroadcast && isLocalPlayer && webSocketService && roomCode) {
          webSocketService.sendKeyEvent(roomCode, {
            userId,
            key,
            type: 'KEY_UP'
          });
        }
      }
    }
  }, [userId, currentOctave, isLocalPlayer, webSocketService, roomCode]);

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
        {preferredKeyboard === 'Casio' ? <CasioBasis /> : <MidiplusBasis />}
      </Suspense>

      {/* White keys */}
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

      {/* Black keys */}
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

      {/* Music notes */}
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
