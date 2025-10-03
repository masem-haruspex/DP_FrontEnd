import { atom } from 'jotai';

export interface LoadedModels {
    whiteKeyModels: any[];
    blackKeyModels: any[];
    noteModel: any;
    casioBasisModel: any;
}

export const modelsAtom = atom<LoadedModels | null>(null);