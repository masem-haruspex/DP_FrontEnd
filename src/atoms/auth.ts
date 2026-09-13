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

export const authAtom = atom<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false
});

export const guestIdAtom = atom<string>(getOrCreateGuestId());
export const rememberMeAtom = atomWithStorage('remember_me', false);
export const protectedRouteAttemptAtom = atom<string | null>(null);
export const loginNeededModalAtom = atom<boolean>(false);

export const preferredKeyboardAtom = atom(
  (get) => {
    const auth = get(authAtom);
    const localStorageKeyboard = localStorage.getItem('preferred_keyboard');

    if (auth.user && auth.isAuthenticated)
      return auth.user.preferredKeyboard;
    return (localStorageKeyboard as 'Casio' | 'Midiplus') || 'Casio';
  },
  (get, set, update: 'Casio' | 'Midiplus') => {
    const auth = get(authAtom);
    localStorage.setItem('preferred_keyboard', update);
    set(authAtom, { ...auth });
  }
);
