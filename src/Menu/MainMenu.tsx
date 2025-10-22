// Menu/MainMenu.tsx
import { useState } from 'react';
import { useAtom } from 'jotai';
import styles from './MainMenu.module.scss';
import MultiplayerMenu from './MultiplayerMenu';
import AuthMenu from './AuthMenu';
import LoginNeededModal from '../Auth/LoginNeededModal';
import { useAuth } from '../Auth/AuthContext';
import { protectedRouteAttemptAtom, loginNeededModalAtom } from '../atoms/auth';
import {
  setSinglePlayerMenuAtom,
  setMultiplayerMenuAtom,
  setSettingsMenuAtom,
  setAboutMenuAtom
} from '../atoms/menuState';
import SinglePlayerMenu from './SinglePlayerMenu';
import SettingsMenu from './SettingsMenu';
import AboutMenu from './AboutMenu';

interface MainMenuProps {
  onSinglePlayer: () => void;
  onMultiplayerRoom: (roomCode: string) => void;
  isInitializing?: boolean;
}

type MenuView = 'main' | 'singlePlayer' | 'multiplayer' | 'settings' | 'about' | 'auth';

export default function MainMenu({ onSinglePlayer, onMultiplayerRoom, isInitializing = false }: MainMenuProps) {
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const [, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const [, setShowLoginNeededModal] = useAtom(loginNeededModalAtom);
  const [, setSinglePlayerMenu] = useAtom(setSinglePlayerMenuAtom); 
  const [, setMultiplayerMenu] = useAtom(setMultiplayerMenuAtom); 
  const [, setSettingsMenu] = useAtom(setSettingsMenuAtom); 
  const [, setAboutMenu] = useAtom(setAboutMenuAtom); 
  const { isAuthenticated, user, logout } = useAuth();

  const handleBackToMain = () => {
    setCurrentView('main');
    setSinglePlayerMenu(false);
    setMultiplayerMenu(false);
    setSettingsMenu(false);
    setAboutMenu(false);
  };

  const handleSinglePlayerClick = () => {
    setCurrentView('singlePlayer');
    setSinglePlayerMenu(true); 
  };

  const handleMultiplayerClick = () => {
    setCurrentView('multiplayer');
    setMultiplayerMenu(true); 
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
    setSettingsMenu(true);
  };

  const handleAboutClick = () => {
    setCurrentView('about');
    setAboutMenu(true);
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      setCurrentView('main');
    } else {
      setCurrentView('auth');
    }
  };

  const handleFreePlay = () => {
    setSinglePlayerMenu(false); 
    onSinglePlayer();
  };

  const handleMultiplayerRoomCreated = (roomCode: string) => {
    setMultiplayerMenu(false); 
    setCurrentView('main');
    onMultiplayerRoom(roomCode);
  };

  const handleAuthSuccess = () => {
    setCurrentView('main');
    setProtectedRouteAttempt(null);
  };

  const handleOpenAuthModal = () => {
    setShowLoginNeededModal(false);
    setCurrentView('auth');
  };

  function renderContent(){
    switch (currentView) {
      case 'singlePlayer':
        return(<SinglePlayerMenu onBack={handleBackToMain} onFreePlay={handleFreePlay} />);

      case 'multiplayer':
        return(<MultiplayerMenu onBack={handleBackToMain} onRoomCreated={handleMultiplayerRoomCreated} />);

      case 'settings':
        return(<SettingsMenu onBack={handleBackToMain} />);

      case 'about':
        return(<AboutMenu onBack={handleBackToMain} />);

      case 'auth':
        return (<AuthMenu onBack={handleBackToMain} onAuthSuccess={handleAuthSuccess} />);

      default:
        return (
          <>
            <h1 className={styles.menuTitle}>Duo Piano</h1>
            <nav className={styles.menuNav}>
              <button
                className={styles.menuItem}
                onClick={handleSinglePlayerClick}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <span className={styles.loadingText}>Initializing Audio...</span>
                ) : (
                  'Single Player'
                )}
              </button>
              <button
                className={styles.menuItem}
                onClick={handleMultiplayerClick}
              >
                Multi Player
              </button>
              <button className={styles.menuItem} onClick={handleSettingsClick}>
                Settings
              </button>
              <button className={styles.menuItem} onClick={handleAboutClick}>
                About
              </button>
              <button
                className={styles.menuItem}
                onClick={handleAuthClick}
              >
                {isAuthenticated ? `Logout (${user?.username})` : 'Login'}
              </button>
            </nav>
          </>
        );
    }
  };

  return (
    <>
      <div className={styles.mainMenu}>
        <div className={styles.menuContent}>
          {renderContent()}
        </div>
      </div>

      <LoginNeededModal onOpenAuthModal={handleOpenAuthModal} />
    </>
  );
}
