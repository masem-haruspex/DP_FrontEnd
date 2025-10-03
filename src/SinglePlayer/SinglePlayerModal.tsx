// src/SinglePlayer/SinglePlayerModal.tsx
import { useState } from 'react';
import styles from './SinglePlayerModal.module.scss';

interface SinglePlayerModalProps {
  onClose: () => void;
  onFreePlay: () => void;
}

const MOCK_SONGS = [
  "Für Elise - Ludwig van Beethoven",
  "Clair de Lune - Claude Debussy",
  "Moonlight Sonata - Ludwig van Beethoven",
  "The Entertainer - Scott Joplin",
  "Nocturne in E-flat Major - Frédéric Chopin",
  "Canon in D - Johann Pachelbel",
  "Gymnopédie No.1 - Erik Satie",
  "Rondo Alla Turca - Wolfgang Amadeus Mozart",
  "Prelude in C Major - Johann Sebastian Bach",
  "Waltz in A Minor - Frédéric Chopin"
];

export default function SinglePlayerModal({ onClose, onFreePlay }: SinglePlayerModalProps) {
  const [currentView, setCurrentView] = useState<'main' | 'songs'>('main');

  const handleFreePlay = () => {
    onFreePlay();
    onClose();
  };

  const handleSongs = () => {
    setCurrentView('songs');
  };

  const handleCompose = () => {
    // Do nothing for now
    console.log('Compose mode - not implemented yet');
  };

  const handleBack = () => {
    setCurrentView('main');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        
        {currentView === 'main' ? (
          <>
            <h2 className={styles.modalTitle}>Single Player</h2>
            <div className={styles.modeButtons}>
              <button className={styles.modeButton} onClick={handleFreePlay}>
                Free Play
              </button>
              <button className={styles.modeButton} onClick={handleSongs}>
                Songs
              </button>
              <button className={styles.modeButton} onClick={handleCompose}>
                Compose
              </button>
            </div>
            <button className={styles.backButton} onClick={onClose}>
              ← Back to Menu
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.modalTitle}>Songs</h2>
            <div className={styles.songsList}>
              {MOCK_SONGS.map((song, index) => (
                <div key={index} className={styles.songItem}>
                  <span className={styles.songName}>{song}</span>
                  <button className={styles.playButton} onClick={() => console.log('Play:', song)}>
                    Play
                  </button>
                </div>
              ))}
            </div>
            <button className={styles.backButton} onClick={handleBack}>
              ← Back to Modes
            </button>
          </>
        )}
      </div>
    </div>
  );
}
