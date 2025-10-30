// atoms/settings.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface AppSettings {
  audioLatency: number;
  showNoteNames: boolean;
  antiAliasing: 'off' | '2x' | '4x' | '8x';
  noteParticleColors: {
    local: string;
    remote: string;
  };
  reducedMotion: boolean;
  defaultOctave: number;
}

export const defaultSettings: AppSettings = {
  audioLatency: 0,
  showNoteNames: false,
  antiAliasing: '4x',
  noteParticleColors: {
    local: '#ffef00',
    remote: '#00ffef'
  },
  reducedMotion: false,
  defaultOctave: 4,
};

export const settingsAtom = atomWithStorage<AppSettings>('app_settings', defaultSettings);

export const audioLatencyAtom = atom(
  (get) => get(settingsAtom).audioLatency
);

export const showNoteNamesAtom = atom(
  (get) => get(settingsAtom).showNoteNames
);

export const antiAliasingAtom = atom(
  (get) => get(settingsAtom).antiAliasing
);

export const noteParticleColorsAtom = atom(
  (get) => get(settingsAtom).noteParticleColors
);

export const reducedMotionAtom = atom(
  (get) => get(settingsAtom).reducedMotion
);

export const defaultOctaveAtom = atom(
  (get) => get(settingsAtom).defaultOctave
);

export const preferredKeyboardAtom = atom(
  (get) => get(settingsAtom).preferredKeyboard
);
