// src/Multiplayer/MultiplayerModal.tsx
import { useState } from 'react';
import styles from './MultiplayerModal.module.scss';

interface MultiplayerModalProps {
  onClose: () => void;
}

export default function MultiplayerModal({ onClose }: MultiplayerModalProps) {
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const handleJoinRoom = () => {
    console.log('Join Room:', { roomCode, roomPassword });
    // Do nothing for now, just log
  };

  const handleHostRoom = () => {
    console.log('Host Room clicked');
    // Do nothing for now
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        
        <h2 className={styles.modalTitle}>Multiplayer</h2>
        
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleJoinRoom(); }}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Room Code</label>
            <input
              type="text"
              className={styles.input}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Room Password</label>
            <input
              type="password"
              className={styles.input}
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Enter password (optional)"
            />
          </div>
          
          <div className={styles.actionButtons}>
            <button type="submit" className={`${styles.actionButton} ${styles.join}`}>
              Join Room
            </button>
            <button 
              type="button" 
              className={`${styles.actionButton} ${styles.host}`}
              onClick={handleHostRoom}
            >
              Host Room
            </button>
          </div>
        </form>
        
        <button className={styles.backButton} onClick={onClose}>
          ← Back to Menu
        </button>
      </div>
    </div>
  );
}
