import type { Vector3 } from '@react-three/fiber';
import { Piano } from '@tonejs/piano';
import { useAtomValue } from 'jotai';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { modelsAtom } from '../atoms/models';
import { linearToDecibels } from '../pianoHelpers';
import CasioBasis from "./CasioBasis.tsx";
import Key from './Key';
import MusicNote from './MusicNote.tsx';

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

const WHITE_KEY_MAPPINGS = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
const BLACK_KEY_MAPPINGS = ['w', 'e', 't', 'y', 'u'];
const PRESSED_Y = -0.4;
const KEY_SCALE = 0.3;
const KEYBOARD_POSITION: Vector3 = [0, -8, -16];
const WHITE_START = 2;
const BLACK_START = 1;
const OCTAVE_OFFSET_WHITE = 7;
const OCTAVE_OFFSET_BLACK = 5;
const NOTE_LIFESPAN = 3 * 1000;
const MIN_NOTE = 21; // A0
const MAX_NOTE = 108; // C8

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

interface IKey {
  index: number;
  url: string;
  position: [number, number, number];
}

export default function PianoKeyboard() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [activeNotes, setActiveNotes] = useState<{ id: string, position: [number, number, number] }[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const noteCounter = useRef(0);
  const activeKeyPresses = useRef<Set<string>>(new Set());
  const [settings, _] = useState<EffectSettings>({
    volume: 0.2,
    reverb: 0.5,
    delay: 0.3,
    distortion: 0.2,
    chorus: 0.4,
    bass: 0,
    mid: 0,
    treble: 0
  });
  const pianoRef = useRef<Piano | null>(null);
  const effectsRef = useRef<any>(null);

  const models = useAtomValue(modelsAtom);

  const whiteKeys: IKey[] = Array.from({ length: 52 }, (_, i) => ({
    index: i,
    url: `/models/white_keys/white_keys.${(i + 1).toString().padStart(3, '0')}.glb`,
    position: [i * 0.0, 0, 0] as [number, number, number],
  }));

  const blackKeys: IKey[] = Array.from({ length: 36 }, (_, i) => ({
    index: i,
    url: `/models/black_keys/black_keys.${(i + 1).toString().padStart(3, '0')}.glb`,
    position: [i * 0.0 + 0.12, 0.1, -0.1] as [number, number, number],
  }));

  // Keep audio context alive
  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
    }, 1000);
    return () => clearInterval(keepAlive);
  }, []);

  // Initialize piano ONCE when component mounts (after user gesture!)
  useEffect(() => {
    if (pianoRef.current) return;

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
        setIsLoaded(true);
        updateEffects(settings);

        console.log('Piano is fully loaded');
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
  }, []);

  function updateEffects(newSettings: EffectSettings) {
    if (!effectsRef.current) return;
    const { reverb, delay, distortion, chorus, eq, volume } = effectsRef.current;
    reverb.wet.value = newSettings.reverb;
    delay.delayTime.value = newSettings.delay;
    distortion.wet.value = newSettings.distortion;
    chorus.wet.value = newSettings.chorus;
    eq.low.value = newSettings.bass;
    eq.mid.value = newSettings.mid;
    eq.high.value = newSettings.treble;
    volume.volume.value = linearToDecibels(newSettings.volume);
  }

  function spawnNote(key: string) {
    if (!isLoaded || activeKeyPresses.current.has(key)) return;
    const isWhiteKey = WHITE_KEY_MAPPINGS.includes(key);
    const isBlackKey = BLACK_KEY_MAPPINGS.includes(key);
    if (!isWhiteKey && !isBlackKey) return;

    activeKeyPresses.current.add(key);
    setPressedKeys(prev => new Set(prev).add(key));

    const keyIndex = isWhiteKey
      ? WHITE_KEY_MAPPINGS.indexOf(key)
      : BLACK_KEY_MAPPINGS.indexOf(key);

    const xPosition = isWhiteKey
      ? (-74 + 2.9 * (WHITE_START + (OCTAVE_OFFSET_WHITE * 0.88) * (currentOctave - 1) + keyIndex))
      : (-74 + 2.9 * (BLACK_START + (OCTAVE_OFFSET_BLACK * 0.88) * (currentOctave - 1) + keyIndex) + 0.12);

    const newNote = {
      id: `note-${noteCounter.current++}-${key}-${Date.now()}`,
      position: [xPosition, -4, -21] as [number, number, number]
    };
    setActiveNotes(prev => [...prev, newNote]);

    if (pianoRef.current?.loaded) {
      const noteName = getKeyMappings(currentOctave)[key];
      if (noteName) {
        const midiNote = noteToMidi(noteName);
        pianoRef.current.keyDown({ midi: midiNote, velocity: 0.7 });
      }
    }
  }

  const handleKeyRelease = (key: string) => {
    activeKeyPresses.current.delete(key);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    if (pianoRef.current?.loaded && isLoaded) {
      const noteName = getKeyMappings(currentOctave)[key];
      if (noteName) {
        const midiNote = noteToMidi(noteName);
        pianoRef.current.keyUp({ midi: midiNote });
      }
    }
  };

  const removeNote = (id: string) => {
    setActiveNotes(prev => prev.filter(note => note.id !== id));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key >= '1' && e.key <= '7') {
        setCurrentOctave(parseInt(e.key));
      } else {
        spawnNote(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      handleKeyRelease(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentOctave, isLoaded]);

  if (!models) return null;

    return (
      <group position={KEYBOARD_POSITION} scale={[KEY_SCALE, KEY_SCALE, KEY_SCALE]}>
        <Suspense fallback={null}>
          <CasioBasis />
        </Suspense>

        {whiteKeys.map((key, index) => {
          const yPosition = WHITE_KEY_MAPPINGS.some(k =>
            pressedKeys.has(k) &&
              key.index === WHITE_START + OCTAVE_OFFSET_WHITE * (currentOctave - 1) + WHITE_KEY_MAPPINGS.indexOf(k)
        ) ? PRESSED_Y : 0;

          return (
            <Key
              key={`white-${index}`}
              gltf={models.whiteKeyModels[index]}
              position={[key.position[0], yPosition, key.position[2]]}
            />
          );
        })}

        {blackKeys.map((key, index) => {
          const yPosition = BLACK_KEY_MAPPINGS.some(k =>
            pressedKeys.has(k) &&
              key.index === BLACK_START + OCTAVE_OFFSET_BLACK * (currentOctave - 1) + BLACK_KEY_MAPPINGS.indexOf(k)
        ) ? PRESSED_Y : 0;

          return (
            <Key
              key={`black-${index}`}
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
          />
        ))}
      </group>
    );
}
