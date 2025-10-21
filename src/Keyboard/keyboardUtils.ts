// Keyboard/keyboardUtils.ts
export const WHITE_KEY_MAPPINGS = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
export const BLACK_KEY_MAPPINGS = ['w', 'e', 't', 'y', 'u'];
export const PRESSED_Y = -0.4;
export const KEY_SCALE = 0.3;
export const NOTE_LIFESPAN = 3 * 1000;

export function noteToMidi(note: string){
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(note.slice(-1));
  const noteName = note.slice(0, -1);
  return 12 + notes.indexOf(noteName) + (octave * 12);
};

export function getKeyMappings(octave: number): Record<string, string>{
  return {
    'a': `C${octave}`, 'w': `C#${octave}`, 's': `D${octave}`, 'e': `D#${octave}`,
    'd': `E${octave}`, 'f': `F${octave}`, 't': `F#${octave}`, 'g': `G${octave}`,
    'y': `G#${octave}`, 'h': `A${octave}`, 'u': `A#${octave}`, 'j': `B${octave}`,
    'k': `C${octave + 1}`, 'o': `C#${octave + 1}`, 'l': `D${octave + 1}`, 'p': `D#${octave + 1}`,
    ';': `E${octave + 1}`
  }
}

export function calculateKeyPosition(key: string, currentOctave: number, basePosition: [number, number, number]){
  const isWhiteKey = WHITE_KEY_MAPPINGS.includes(key);
  const isBlackKey = BLACK_KEY_MAPPINGS.includes(key);
  if(!isWhiteKey && !isBlackKey) return 0;

  const keyIndex = isWhiteKey ? WHITE_KEY_MAPPINGS.indexOf(key) : BLACK_KEY_MAPPINGS.indexOf(key);

  if(isWhiteKey) return (-74 + 2.9 * (2 + (7 * 0.88) * (currentOctave - 1) + keyIndex)) + basePosition[0];
  else return (-74 + 2.9 * (1 + (5 * 0.88) * (currentOctave - 1) + keyIndex) + 0.12) + basePosition[0];
};

export function validateKey(key: string): boolean {
  return WHITE_KEY_MAPPINGS.includes(key) || BLACK_KEY_MAPPINGS.includes(key);
}
