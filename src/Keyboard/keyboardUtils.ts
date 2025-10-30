// Keyboard/keyboardUtils.ts
export const WHITE_KEY_MAPPINGS = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
export const BLACK_KEY_MAPPINGS = ['w', 'e', 't', 'y', 'u'];
export const PRESSED_Y = -0.4;
export const KEY_SCALE = 0.3;
export const NOTE_LIFESPAN = 12 * 1000;

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

	// keyIndex in the current octave, 0 - 7 for white, 0-5 for black
	const keyIndex = isWhiteKey ? WHITE_KEY_MAPPINGS.indexOf(key) : BLACK_KEY_MAPPINGS.indexOf(key);
	let blackKeyInnerOffset = 0;
	if(keyIndex === 0)
		blackKeyInnerOffset = 0.8;
	else if(keyIndex === 1)
		blackKeyInnerOffset = 1.8;
	else if(keyIndex === 2)
		blackKeyInnerOffset = 3.8;
	else if(keyIndex === 3)
		blackKeyInnerOffset = 4.8;
	else if(keyIndex === 4)
		blackKeyInnerOffset = 5.8;

	currentOctave--; // 1-7 to 0-6

	const keyWidth = 3.5;
	const octaveWidth = keyWidth * 7;
	const offset = -92;

	const octavePositioning = octaveWidth * currentOctave;
	const inOctavePositioning = isWhiteKey ? keyWidth * keyIndex : keyWidth * blackKeyInnerOffset

	return (offset + octavePositioning + inOctavePositioning + basePosition[0]);
};

export function validateKey(key: string): boolean {
	return WHITE_KEY_MAPPINGS.includes(key) || BLACK_KEY_MAPPINGS.includes(key);
}
