// Menu/SinglePlayerMenu.tsx
import { useState } from 'react';
import styles from './SinglePlayerMenu.module.scss';

interface SinglePlayerMenuProps {
  onBack: () => void;
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

export default function SinglePlayerMenu({ onBack, onFreePlay }: SinglePlayerMenuProps) {
  const [currentView, setCurrentView] = useState<'main' | 'songs'>('main');

  const handleSongs = () => {
    setCurrentView('songs');
  };

  const handleCompose = () => {
    console.log('Compose mode - not implemented yet');
  };

  const handleBackToModes = () => {
    setCurrentView('main');
  };

  if (currentView === 'songs') {
    return (
      <>
        <h2 className={styles.menuTitle}>Songs</h2>
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
        <button className={styles.backButton} onClick={handleBackToModes}>
          ← Back to Modes
        </button>
      </>
    );
  }

  return (
    <>
      <h2 className={styles.menuTitle}>Single Player</h2>
      <div className={styles.modeButtons}>
        <button className={styles.modeButton} onClick={onFreePlay}>
          Free Play
        </button>
        <button className={styles.modeButton} onClick={handleSongs}>
          Songs
        </button>
        <button className={styles.modeButton} onClick={handleCompose}>
          Compose
        </button>
      </div>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to Menu
      </button>
    </>
  );
}
