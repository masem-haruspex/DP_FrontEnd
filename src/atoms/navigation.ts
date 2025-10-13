// atoms/navigation.ts
import { atom } from 'jotai';

export const protectedRouteAttemptAtom = atom<string | null>(null);
export const loginNeededModalAtom = atom<boolean>(false);
