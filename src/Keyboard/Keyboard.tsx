// Keyboard/Keyboard.tsx
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { modelsAtom } from '../atoms/models';
import { linearToDecibels } from '../lib/pianoHelpers';
import MusicNote from './MusicNote';
import { pianoInstanceAtom, audioEffectsAtom } from '../atoms/audio';
import {WHITE_KEY_MAPPINGS, BLACK_KEY_MAPPINGS, PRESSED_Y, KEY_SCALE, NOTE_LIFESPAN,
  noteToMidi, getKeyMappings, calculateKeyPosition, validateKey} from "./keyboardUtils";

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
  scale: number;
  position: [number, number, number];
  isLocalPlayer?: boolean;
  effectSettings: EffectSettings;
  webSocketService?: any;
  roomCode?: string;
  preferredKeyboard?: 'Casio' | 'Midiplus';
}

const whiteKeys = Array.from({ length: 52 }, (_, i) => ({ index: i, position: [i * 0.0, 0, 0] as [number, number, number] }));
const blackKeys = Array.from({ length: 36 }, (_, i) => ({ index: i, position: [i * 0.0 + 0.12, 0.1, -0.1] as [number, number, number] }));

export default function Keyboard({ userId, scale = 1.0, position, isLocalPlayer = false, effectSettings, webSocketService, roomCode, preferredKeyboard = 'Casio' }: KeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [activeNotes, setActiveNotes] = useState<{ id: string, position: [number, number, number] }[]>([]);
  const noteCounter = useRef(0);
  const pianoInstance = useAtomValue(pianoInstanceAtom);
  const audioEffects = useAtomValue(audioEffectsAtom);
  const models = useAtomValue(modelsAtom);

  const updateAudioEffects = useCallback(() => {
    if (!isLocalPlayer || !audioEffects) return;

    const { reverb, delay, distortion, chorus, eq, volume } = audioEffects;

    if (reverb) reverb.wet.value = effectSettings.reverb;
    if (delay) delay.delayTime.value = effectSettings.delay;
    if (distortion) distortion.wet.value = effectSettings.distortion;
    if (chorus) chorus.wet.value = effectSettings.chorus;
    if (eq) { eq.low.value = effectSettings.bass; eq.mid.value = effectSettings.mid; eq.high.value = effectSettings.treble; }
    if (volume) volume.volume.value = linearToDecibels(effectSettings.volume);
  }, [effectSettings, isLocalPlayer, audioEffects]);

  const handleNoteAudio = useCallback((noteName: string, type: 'play' | 'stop') => {
    if (pianoInstance?.loaded && noteName) {
      const midiNote = noteToMidi(noteName);
      type === 'play' ? pianoInstance.keyDown({ midi: midiNote, velocity: 0.7 }) : pianoInstance.keyUp({ midi: midiNote });
    }
  }, [pianoInstance]);

  const broadcastNoteEvent = useCallback((key: string, noteName: string, type: 'KEY_DOWN' | 'KEY_UP') => {
    if (isLocalPlayer && webSocketService && roomCode)
      webSocketService.sendKeyEvent(roomCode, { userId, key, noteName: type === 'KEY_DOWN' ? noteName : undefined, type });
  }, [isLocalPlayer, webSocketService, roomCode, userId]);

  const handleKeyAction = useCallback((key: string, action: 'spawn' | 'release', shouldBroadcast = true) => {

    const noteName = getKeyMappings(currentOctave)[key];

    if (action === 'spawn') {
      if (pressedKeys.has(key) || !validateKey(key)) return;

      setPressedKeys(prev => new Set(prev).add(key));

      const xPosition = calculateKeyPosition(key, currentOctave, position);
      const newNote = { id: `note-${userId}-${noteCounter.current++}-${key}-${Date.now()}`, position: [xPosition, position[1] - 4, position[2] - 21] as [number, number, number] };
      setActiveNotes(prev => [...prev, newNote]);

      if (noteName) {
        handleNoteAudio(noteName, 'play');
        if (shouldBroadcast) {
          broadcastNoteEvent(key, noteName, 'KEY_DOWN');
        }
      }
    } else {
      if (!pressedKeys.has(key)) return;

      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });

      if (noteName) {
        handleNoteAudio(noteName, 'stop');
        if (shouldBroadcast) {
          broadcastNoteEvent(key, noteName, 'KEY_UP');
        }
      }
    }
  }, [userId, currentOctave, position, pressedKeys, validateKey, handleNoteAudio, broadcastNoteEvent]);

  const handleRemoteKeyEvent = useCallback((payload: any) => {

    if (payload.userId === userId) {
      if (payload.type === 'KEY_DOWN') handleKeyAction(payload.key, 'spawn', false);
      else if (payload.type === 'KEY_UP') handleKeyAction(payload.key, 'release', false);
    }
  }, [handleKeyAction, userId]);

  const handleLocalKeyboardEvent = useCallback((e: KeyboardEvent, type: 'down' | 'up') => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    if (type === 'down' && e.key === 'Tab') {
      e.preventDefault();
      return;
    }
    if (type === 'up' && e.key === 'Tab') return;

    const key = e.key.toLowerCase();

    if (type === 'down' && e.key >= '1' && e.key <= '7') {
      setCurrentOctave(parseInt(e.key));
    } else if (validateKey(key)) {
      if (type === 'down' && e.repeat)
        return;
      handleKeyAction(key, type === 'down' ? 'spawn' : 'release', true);
    }
  }, [validateKey, handleKeyAction]);

  useEffect(() => { updateAudioEffects(); }, [updateAudioEffects]);

  useEffect(() => {
    const keepAlive = setInterval(() => { 
      if (Tone.context.state !== 'running') 
        Tone.context.resume(); 
    }, 1000);
    return () => clearInterval(keepAlive);
  }, []);

  useEffect(() => {
    if (/* !isLocalPlayer || */ !webSocketService) return;

    const handleKeyEvent = (data: any) => handleRemoteKeyEvent(data.payload);
    webSocketService.on('KEY_EVENT', handleKeyEvent);

    return () => { webSocketService.off('KEY_EVENT', handleKeyEvent); };
  }, [isLocalPlayer, webSocketService, handleRemoteKeyEvent]);

  useEffect(() => {
    if (!isLocalPlayer) return;

    const handleKeyDown = (e: KeyboardEvent) => handleLocalKeyboardEvent(e, 'down');
    const handleKeyUp = (e: KeyboardEvent) => handleLocalKeyboardEvent(e, 'up');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isLocalPlayer, handleLocalKeyboardEvent]);

  const removeNote = useCallback((id: string) => { setActiveNotes(prev => prev.filter(note => note.id !== id)); }, []);

  if (!models) return null;

  return (
    <group position={position} scale={KEY_SCALE * scale}>
      {preferredKeyboard === 'Casio' ? (
        <primitive object={models.casioBasisModel.scene.clone()} />
      ) : (
        <primitive object={models.midiplusBasisModel.scene.clone()} />
      )}

      {whiteKeys.map((key, index) => {
        const yPosition = WHITE_KEY_MAPPINGS.some(k =>
          pressedKeys.has(k) && key.index === 2 + 7 * (currentOctave - 1) + WHITE_KEY_MAPPINGS.indexOf(k)
      ) ? PRESSED_Y : 0;

        return (
          <group key={`white-${userId}-${index}`} position={[key.position[0], yPosition, key.position[2]]}>
            <primitive object={models.whiteKeyModels[index].scene.clone()} />
          </group>
        );
      })}

      {blackKeys.map((key, index) => {
        const yPosition = BLACK_KEY_MAPPINGS.some(k =>
          pressedKeys.has(k) && key.index === 1 + 5 * (currentOctave - 1) + BLACK_KEY_MAPPINGS.indexOf(k)
      ) ? PRESSED_Y : 0;

        return (
          <group key={`black-${userId}-${index}`} position={[key.position[0], yPosition, key.position[2]]}>
            <primitive object={models.blackKeyModels[index].scene.clone()} />
          </group>
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
