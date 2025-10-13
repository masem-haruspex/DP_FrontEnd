// atoms/auth.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { getOrCreateGuestId } from '../lib/cookies';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  provider?: string;
  providerId?: string;
  preferredKeyboard: 'Casio' | 'Midiplus';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const authAtom = atom<AuthState>({ user: null, token: null, isLoading: true, isAuthenticated: false });
export const guestIdAtom = atom<string>(getOrCreateGuestId());
export const preferredKeyboardAtom = atomWithStorage<'Casio' | 'Midiplus'>('preferred_keyboard', 'Casio');
export const rememberMeAtom = atomWithStorage('remember_me', false);
export const protectedRouteAttemptAtom = atom<string | null>(null);
export const loginNeededModalAtom = atom<boolean>(false);
