// atoms/audio.ts
import type { Piano } from '@tonejs/piano';
import { atom } from 'jotai';
import type { Chorus, Delay, Distortion, EQ3, Reverb } from 'tone';

const DEBUG = false;
const MIN_NOTE = 21;
const MAX_NOTE = 108;

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

export const audioResourcesAtom = atom<AudioResources | null>(null);
export const isAudioReadyAtom = atom((get) => get(audioResourcesAtom) !== null);
export const pianoInstanceAtom = atom((get) => get(audioResourcesAtom)?.pianoInstance ?? null);
export const audioEffectsAtom = atom((get) => get(audioResourcesAtom)?.effects ?? null);

export const initializeAudioAtom = atom(null, async (get, set) => {
  if (get(audioResourcesAtom)) {
    if (DEBUG) console.log('[AUDIO] Audio already initialized, skipping');
    return;
  }

  if (DEBUG) console.log('[AUDIO] Starting audio initialization...');

  try {
    if (DEBUG) console.log('[AUDIO] Importing Tone.js and Piano...');
    const [Tone, { Piano }] = await Promise.all([
      import('tone'),
      import('@tonejs/piano'),
    ]);
    if (DEBUG) console.log('[AUDIO] Imports successful');

    if (DEBUG) console.log('[AUDIO] Starting Tone context...');
    await Tone.start();
    if (DEBUG) console.log('[AUDIO] Tone context state:', Tone.context.state);

    if (DEBUG) console.log('[AUDIO] Creating piano instance with local samples...');

    const pianoInstance = new Piano({
      velocities: 3,
      minNote: MIN_NOTE,
      maxNote: MAX_NOTE,
      url: '/audio-samples/'
    });

    if (DEBUG) console.log('[AUDIO] Piano instance created with baseUrl:');

    if (DEBUG) console.log('[AUDIO] Creating effects...');
    const reverb = new Tone.Reverb(2.5);
    const delay = new Tone.Delay(0.25);
    const distortion = new Tone.Distortion(0.4);
    const chorus = new Tone.Chorus(2, 2.5, 0.5);
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    const volume = new Tone.Volume(0);
    if (DEBUG) console.log('[AUDIO] Effects created');

    if (DEBUG) console.log('[AUDIO] Setting up audio chain...');
    pianoInstance.chain(
      eq,
      distortion,
      chorus,
      delay,
      reverb,
      volume,
      Tone.Destination
    );
    if (DEBUG) console.log('[AUDIO] Audio chain set up');

    if (DEBUG) console.log('[AUDIO] Loading piano samples from local files...');

    try {
      const loadPromise = pianoInstance.load();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Piano loading timeout after 15 seconds')), 15000)
      );

      await Promise.race([loadPromise, timeoutPromise]);
      if (DEBUG) console.log('[AUDIO] Piano loaded successfully from local samples');
    } catch (pianoError) {
      console.error('[AUDIO] Piano loading failed:', pianoError);
    }

    if (DEBUG) console.log('[AUDIO] Setting audio resources atom...');
    set(audioResourcesAtom, {
      Tone,
      Piano,
      pianoInstance,
      effects: { reverb, delay, distortion, chorus, eq, volume },
    });

    if (DEBUG) console.log('[AUDIO] Audio initialization completed!');
    if (DEBUG) console.log('[AUDIO] Piano loaded status:', pianoInstance.loaded);
    if (DEBUG) console.log('[AUDIO] isAudioReadyAtom should now be true');

  } catch (error) {
    console.error('[AUDIO] Audio initialization failed:', error);

    const Tone = await import('tone');
    await Tone.start();

    set(audioResourcesAtom, {
      Tone,
      Piano: null as any,
      pianoInstance: null,
      effects: null,
    });

    console.error('[AUDIO] Set basic audio resources (piano will not work)');
  }
});
