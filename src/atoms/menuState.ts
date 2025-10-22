// atoms/menuState.ts
import { atom } from 'jotai';
import { degreesToRad } from '../lib/pianoHelpers';

export const CAMERA_POSITION_DEFAULT = [0, 0, 1] as [number, number, number];
export const CAMERA_ROTATION_DEFAULT = [0, 0, 0] as [number, number, number];

export const CAMERA_POSITION_PLAY = [-0.855, -0.190, -2.006] as [number, number, number];
export const CAMERA_ROTATION_PLAY = [degreesToRad(-169.2), degreesToRad(38.6), degreesToRad(171.7)] as [number, number, number];

export const CAMERA_POSITION_SETTINGS = [-0.855, -0.140, -2.006] as [number, number, number];
export const CAMERA_ROTATION_SETTINGS = [degreesToRad(-108.68), degreesToRad(39.59), degreesToRad(117.92)] as [number, number, number];

export const CAMERA_POSITION_ABOUT = [-1.3, 0.2, 0.1] as [number, number, number];
export const CAMERA_ROTATION_ABOUT = [degreesToRad(24.07), degreesToRad(-27.79), degreesToRad(11.8)] as [number, number, number];

export type MenuState = {
  showSinglePlayerMenu: boolean;
  showMultiplayerMenu: boolean;
  showSettingsMenu: boolean;
  showAboutMenu: boolean;
  selectedCat: 'black' | 'tuxedo' | 'both';
  introAnimationsPlayed: boolean;
};

const getRandomCat = (): 'black' | 'tuxedo' => {
  return Math.random() > 0.5 ? 'black' : 'tuxedo';
};

export const menuStateAtom = atom<MenuState>({
  showSinglePlayerMenu: false,
  showMultiplayerMenu: false,
  showSettingsMenu: false,
  showAboutMenu: false,
  selectedCat: 'both',
  introAnimationsPlayed: false
});

export const setSinglePlayerMenuAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showSinglePlayerMenu: isOpen,
      selectedCat: isOpen ? getRandomCat() : 'both'
    });
  }
);

export const setMultiplayerMenuAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showMultiplayerMenu: isOpen,
      selectedCat: 'both'
    });
  }
);

export const setSettingsMenuAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showSettingsMenu: isOpen,
      selectedCat: 'both'
    });
  }
);

export const setAboutMenuAtom = atom(
  null,
  (get, set, isOpen: boolean) => {
    const current = get(menuStateAtom);
    set(menuStateAtom, {
      ...current,
      showAboutMenu: isOpen,
      selectedCat: 'both'
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
	  if(menuState.showSinglePlayerMenu || menuState.showMultiplayerMenu)
		  return CAMERA_POSITION_PLAY;
	  else if(menuState.showSettingsMenu)
		  return CAMERA_POSITION_SETTINGS;
	  else if(menuState.showAboutMenu)
		  return CAMERA_POSITION_ABOUT;
	  else
		  return CAMERA_POSITION_DEFAULT
  }
);

export const cameraRotationAtom = atom(
  (get) => {
    const menuState = get(menuStateAtom);
	  if(menuState.showSinglePlayerMenu || menuState.showMultiplayerMenu)
		  return CAMERA_ROTATION_PLAY;
	  else if(menuState.showSettingsMenu)
		  return CAMERA_ROTATION_SETTINGS;
	  else if(menuState.showAboutMenu)
		  return CAMERA_ROTATION_ABOUT;
	  else
		  return CAMERA_ROTATION_DEFAULT
  }
);

