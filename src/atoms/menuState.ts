// atoms/menuState.ts
import { atom } from 'jotai';
import { degreesToRad } from '../lib/pianoHelpers';

export const CAMERA_POSITION_1 = [0, 0, 1] as [number, number, number];
export const CAMERA_ROTATION_1 = [0, 0, 0] as [number, number, number];

export const CAMERA_POSITION_2 = [2.494, 2.037, -2.364] as [number, number, number];
export const CAMERA_ROTATION_2 = [degreesToRad(-139.2), degreesToRad(38.6), degreesToRad(151.7)] as [number, number, number];

export type MenuState = {
  showSinglePlayerModal: boolean;
  showMultiplayerModal: boolean;
  selectedCat: 'black' | 'tuxedo' | 'both';
  introAnimationsPlayed: boolean;
};

const getRandomCat = (): 'black' | 'tuxedo' => {
  return Math.random() > 0.5 ? 'black' : 'tuxedo';
};

export const menuStateAtom = atom<MenuState>({
  showSinglePlayerModal: false,
  showMultiplayerModal: false,
  selectedCat: 'both',
  introAnimationsPlayed: false
});

export const setSinglePlayerModalAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showSinglePlayerModal: isOpen,
      selectedCat: isOpen ? getRandomCat() : 'both'
    });
  }
);

export const setMultiplayerModalAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showMultiplayerModal: isOpen,
      selectedCat: isOpen ? 'both' : 'both'
    });
  }
);

export const markIntroAnimationsPlayedAtom = atom(
  null,
  (get, set) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      introAnimationsPlayed: true
    });
  }
);

export const cameraPositionAtom = atom(
  (get) => {
    const menuState = get(menuStateAtom);
    return (menuState.showSinglePlayerModal || menuState.showMultiplayerModal)
      ? CAMERA_POSITION_2
      : CAMERA_POSITION_1;
  }
);

export const cameraRotationAtom = atom(
  (get) => {
    const menuState = get(menuStateAtom);
    return (menuState.showSinglePlayerModal || menuState.showMultiplayerModal)
      ? CAMERA_ROTATION_2
      : CAMERA_ROTATION_1;
  }
);
