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
  preferredKeyboard: 'Casio' | 'Midiplus';
  darkMode: boolean;
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
  preferredKeyboard: 'Casio',
  darkMode: false,
};

const migrateSettings = (loadedValue: any): AppSettings => {
  if (!loadedValue) return defaultSettings;

  return {
    ...defaultSettings,
    ...loadedValue,
    noteParticleColors: {
      ...defaultSettings.noteParticleColors,
      ...(loadedValue.noteParticleColors || {})
    }
  };
};

const baseSettingsAtom = atomWithStorage('app_settings', defaultSettings);

export const settingsAtom = atom(
  (get): AppSettings => {
    const settings = get(baseSettingsAtom);
    return migrateSettings(settings);
  },
  (get, set, update: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    const current = get(settingsAtom);
    const newValue = typeof update === 'function' ? update(current) : update;
    const migrated = migrateSettings(newValue);
    set(baseSettingsAtom, migrated);
  }
);

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
