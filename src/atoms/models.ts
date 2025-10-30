// atoms/models.ts
import { atom } from 'jotai';

export interface LoadedModels {
	catBlackModel: any;
	catTuxedoModel: any;
	pianoModel: any;
	titleModel: any;
	whiteKeyModels: any[];
	blackKeyModels: any[];
	noteModel: any;
	casioBasisModel: any;
	midiplusBasisModel: any;
}

export const modelsAtom = atom<LoadedModels | null>(null);
