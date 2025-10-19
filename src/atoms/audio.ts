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

export interface AudioSettings {
  volume: number;
  reverb: number;
  delay: number;
  distortion: number;
  chorus: number;
  bass: number;
  mid: number;
  treble: number;
}

export const defaultAudioSettings: AudioSettings = {
  volume: 0.2,
  reverb: 0.5,
  delay: 0.3,
  distortion: 0.2,
  chorus: 0.4,
  bass: 0,
  mid: 0,
  treble: 0
};

interface AudioState {
  resources: AudioResources | null;
  settings: AudioSettings;
  isReady: boolean;
}

export const audioStateAtom = atom<AudioState>({
  resources: null,
  settings: defaultAudioSettings,
  isReady: false
});

export const audioResourcesAtom = atom((get) => get(audioStateAtom).resources);
export const audioEffectsAtom = atom((get) => get(audioStateAtom).resources?.effects ?? null);
export const isAudioReadyAtom = atom((get) => get(audioStateAtom).isReady);
export const pianoInstanceAtom = atom((get) => get(audioStateAtom).resources?.pianoInstance ?? null);
export const currentAudioSettingsAtom = atom((get) => get(audioStateAtom).settings);

export const singlePlayerAudioSettingsAtom = atom<AudioSettings>(defaultAudioSettings);
export const multiplayerAudioSettingsAtom = atom<AudioSettings>(defaultAudioSettings);

export const initializeAudioAtom = atom(null, async (get, set) => {
  const currentState = get(audioStateAtom);
  if (currentState.resources) {
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

    if (DEBUG) console.log('[AUDIO] Creating effects...');
    const reverb = new Tone.Reverb(2.5);
    const delay = new Tone.Delay(0.25);
    const distortion = new Tone.Distortion(0.4);
    const chorus = new Tone.Chorus(2, 2.5, 0.5);
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    const volume = new Tone.Volume(0);

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

    const newResources: AudioResources = {
      Tone,
      Piano,
      pianoInstance,
      effects: { reverb, delay, distortion, chorus, eq, volume },
    };

    set(audioStateAtom, {
      resources: newResources,
      settings: defaultAudioSettings,
      isReady: true,
    });

    applyAudioSettingsToResources(newResources, defaultAudioSettings);

    if (DEBUG) console.log('[AUDIO] Audio initialization completed!');

  } catch (error) {
    console.error('[AUDIO] Audio initialization failed:', error);

    const Tone = await import('tone');
    await Tone.start();

    set(audioStateAtom, {
      resources: {
        Tone,
        Piano: null as any,
        pianoInstance: null,
        effects: null,
      },
      settings: defaultAudioSettings,
      isReady: false,
    });

    console.error('[AUDIO] Set basic audio resources (piano will not work)');
  }
});

function applyAudioSettingsToResources(resources: AudioResources, settings: AudioSettings) {
  const { effects, Tone } = resources;

  if (!effects) {
    console.warn('Audio effects not available');
    return;
  }

  try {
    if (effects.volume?.volume) {
      effects.volume.volume.value = Tone.gainToDb(settings.volume);
    }

    if (effects.reverb?.wet) {
      effects.reverb.wet.value = settings.reverb;
    }

    if (effects.delay) {
      const delayWithWet = effects.delay as any;
      if (delayWithWet.wet !== undefined) {
        delayWithWet.wet.value = settings.delay;
      } else {
        console.warn('Delay effect exists but no wet property found:', effects.delay);
      }
    } else {
      console.warn('Delay effect not available');
    }

    if (effects.distortion?.wet)
      effects.distortion.wet.value = settings.distortion;

    if (effects.chorus?.wet)
      effects.chorus.wet.value = settings.chorus;

    if (effects.eq) {
      if (effects.eq.low) effects.eq.low.value = settings.bass;
      if (effects.eq.mid) effects.eq.mid.value = settings.mid;
      if (effects.eq.high) effects.eq.high.value = settings.treble;
    }
  } catch (error) {
    console.warn('Failed to apply some audio settings:', error);
  }
}

export const updateAudioSettingAtom = atom(
  null,
  (get, set, update: { setting: keyof AudioSettings; value: number }) => {
    const currentState = get(audioStateAtom);
    const newSettings = {
      ...currentState.settings,
      [update.setting]: update.value
    };

    if (currentState.resources) {
      applyAudioSettingsToResources(currentState.resources, newSettings);
    }

    set(audioStateAtom, {
      ...currentState,
      settings: newSettings
    });
  }
);

export const applyAudioSettingsAtom = atom(
  null,
  (get, set, settings: AudioSettings) => {
    const currentState = get(audioStateAtom);

    if (currentState.resources) {
      applyAudioSettingsToResources(currentState.resources, settings);
    }

    set(audioStateAtom, {
      ...currentState,
      settings
    });
  }
);

export const updateSinglePlayerAudioSettingAtom = atom(
  null,
  (get, set, update: { setting: keyof AudioSettings; value: number }) => {
    set(updateAudioSettingAtom, update);

    const currentSinglePlayerSettings = get(singlePlayerAudioSettingsAtom);
    set(singlePlayerAudioSettingsAtom, {
      ...currentSinglePlayerSettings,
      [update.setting]: update.value
    });
  }
);

export const updateMultiplayerAudioSettingAtom = atom(
  null,
  (get, set, update: { setting: keyof AudioSettings; value: number }) => {
    set(updateAudioSettingAtom, update);

    const currentMultiplayerSettings = get(multiplayerAudioSettingsAtom);
    set(multiplayerAudioSettingsAtom, {
      ...currentMultiplayerSettings,
      [update.setting]: update.value
    });
  }
);
