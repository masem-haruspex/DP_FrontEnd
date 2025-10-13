// atoms/toast.ts
import { atom } from 'jotai';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const toastsAtom = atom<Toast[]>([]);
