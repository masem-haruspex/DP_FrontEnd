import type { Piano } from '@tonejs/piano';
import { atom } from 'jotai';
import type { Chorus, Delay, Distortion, EQ3, Reverb } from 'tone';

type AudioResources = {
  Tone: typeof import('tone');
  Piano: typeof Piano;
  pianoInstance: Piano | null;
  effects: {
    reverb: Reverb | null;
    delay: Delay | null;
    distortion: Distortion | null;
    chorus: Chorus | null;
    eq: EQ3 | null;
    volume: any | null;
  } | null;
};

// Atoms for audio state
export const audioResourcesAtom = atom<AudioResources | null>(null);
export const isAudioReadyAtom = atom((get) => get(audioResourcesAtom) !== null);
export const pianoInstanceAtom = atom(
  (get) => get(audioResourcesAtom)?.pianoInstance ?? null
);
export const audioEffectsAtom = atom(
  (get) => get(audioResourcesAtom)?.effects ?? null
);

// Atom for initializing audio
export const initializeAudioAtom = atom(null, async (get, set) => {
  if (get(audioResourcesAtom)) return;

  const [Tone, { Piano }] = await Promise.all([
    import('tone'),
    import('@tonejs/piano'),
  ]);

  await Tone.start();

  const pianoInstance = new Piano({
    velocities: 3,
    minNote: 21,
    maxNote: 108,
  });

  const reverb = new Tone.Reverb(2.5);
  const delay = new Tone.Delay(0.25);
  const distortion = new Tone.Distortion(0.4);
  const chorus = new Tone.Chorus(2, 2.5, 0.5);
  const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
  const volume = new Tone.Volume(0);

  pianoInstance.chain(
    eq,
    distortion,
    chorus,
    delay,
    reverb,
    volume,
    Tone.Destination
  );

  await pianoInstance.load();

  set(audioResourcesAtom, {
    Tone,
    Piano,
    pianoInstance,
    effects: { reverb, delay, distortion, chorus, eq, volume },
  });
});