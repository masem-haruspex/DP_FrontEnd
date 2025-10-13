// Menu/MainMenu.tsx
import { useState } from 'react';
import { useAtom } from 'jotai';
import styles from './MainMenu.module.scss';
import SinglePlayerModal from '../SinglePlayer/SinglePlayerModal';
import MultiplayerModal from '../Multiplayer/MultiplayerModal';
import AuthModal from '../Auth/AuthModal';
import SettingsModal from '../Settings/SettingsModal';
import LoginNeededModal from '../Auth/LoginNeededModal';
import { useAuth } from '../Auth/AuthContext';
import { protectedRouteAttemptAtom } from '../atoms/auth';

interface MainMenuProps {
  onSinglePlayer: () => void;
  onMultiplayerRoom: (roomCode: string) => void;
  isInitializing?: boolean;
}

export default function MainMenu({ onSinglePlayer, onMultiplayerRoom, isInitializing = false }: MainMenuProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [showSinglePlayerModal, setShowSinglePlayerModal] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [protectedRouteAttempt, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const { isAuthenticated, user, logout } = useAuth();

  const handleSinglePlayerClick = () => {
    setShowSinglePlayerModal(true);
  };

  const handleMultiplayerClick = () => {
    setShowMultiplayerModal(true);
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
    } else {
      setShowAuthModal(true);
    }
  };

  const handleFreePlay = () => {
    setShowSinglePlayerModal(false);
    onSinglePlayer();
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);

    if (protectedRouteAttempt) {
      setProtectedRouteAttempt(null);
    }
  };

  const handleAuthSuccess = () => {
    if (protectedRouteAttempt === '/host-room') {
      setShowMultiplayerModal(true);
    }
  };

  const handleMultiplayerRoomCreated = (roomCode: string) => {
    setShowMultiplayerModal(false);
    onMultiplayerRoom(roomCode);
  };

  return (
    <>
      <div className={styles.mainMenu}>
        <div className={styles.menuContent}>
          <h1 className={styles.menuTitle}>Virtual Piano</h1>

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
            <button className={styles.menuItem} onClick={() => setShowAbout(true)}>
              About
            </button>
            <button
              className={styles.menuItem}
              onClick={handleAuthClick}
            >
              {isAuthenticated ? `Logout (${user?.username})` : 'Login'}
            </button>
          </nav>
        </div>
      </div>

      {showAbout && (
        <div className={styles.modalOverlay} onClick={() => setShowAbout(false)}>
          <div className={styles.aboutModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.aboutTitle}>About Us</h2>
            <div className={styles.aboutContent}>
              <p>Created with love by [Your Name] and [Coworker's Name].</p>
              <p>We hope you enjoy playing as much as we enjoyed creating this ethereal musical journey.</p>
            </div>
            <button className={styles.closeButton} onClick={() => setShowAbout(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showSinglePlayerModal && (
        <SinglePlayerModal
          onClose={() => setShowSinglePlayerModal(false)}
          onFreePlay={handleFreePlay}
        />
      )}

      {showMultiplayerModal && (
        <MultiplayerModal
          onClose={() => setShowMultiplayerModal(false)}
          onRoomCreated={handleMultiplayerRoomCreated}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />

      <LoginNeededModal
        onOpenAuthModal={handleOpenAuthModal}
      />

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}
