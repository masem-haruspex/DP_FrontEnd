// Multiplayer/MultiplayerMenu.tsx
import { useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../Auth/AuthContext';
import { protectedRouteAttemptAtom, loginNeededModalAtom } from '../atoms/auth';
import { CreateRoomSchema, type CreateRoomData } from '../Multiplayer/Room';
import styles from './MultiplayerMenu.module.scss';
import * as z from 'zod';
import { RoomService } from '../Multiplayer/RoomService';
import { toastsAtom } from '../atoms/toast';
import { guestIdAtom } from '../atoms/auth';

type ModalView = 'main' | 'host';

interface MultiplayerMenuProps {
  onBack: () => void;
  onRoomCreated: (roomCode: string) => void;
}

export default function MultiplayerMenu({ onBack, onRoomCreated }: MultiplayerMenuProps) {
  const [, setToasts] = useAtom(toastsAtom);
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [currentView, setCurrentView] = useState<ModalView>('main');
  const [isCreating, setIsCreating] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuth();
  const [, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const [, setShowLoginNeededModal] = useAtom(loginNeededModalAtom);
  const [guestId] = useAtom(guestIdAtom);

  const [hostForm, setHostForm] = useState<CreateRoomData>({
    isPrivate: false,
    password: '',
    maxParticipants: 2
  });

  const handleJoinRoom = async () => {
    try {
       const userId = user?.id || guestId;

    if (!userId) {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Unable to join room',
        submessage: 'Please try refreshing the page',
        type: 'error',
        duration: 5000,
      }]);
      return;
    }

      await RoomService.joinRoom(roomCode, userId, roomPassword || undefined);

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Room joined successfully!',
        type: 'success',
        duration: 3000,
      }]);

      onRoomCreated(roomCode);
    } catch (error: any) {
      console.error('Failed to join room:', error);

      let errorMessage = 'Failed to join room';
      let submessage = 'Please check the room code and password';

      if (error.response?.status === 404) {
        errorMessage = 'Room not found';
        submessage = 'Please check the room code';
      } else if (error.response?.status === 403) {
        errorMessage = 'Room is full';
        submessage = 'Maximum participants reached';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid password';
        submessage = 'Please check the room password';
      }else{
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: errorMessage,
          submessage,
          type: 'error',
          duration: 5000,
        }]);
      }
    }
  };

  const handleHostRoomClick = () => {
    if (!isAuthenticated) {
      setProtectedRouteAttempt('/host-room');
      setShowLoginNeededModal(true);
      return;
    }
    setCurrentView('host');
  };

  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setCreateRoomError(null);

      const validatedData = CreateRoomSchema.parse(hostForm);
      const roomData = await RoomService.createRoom(user!.id, validatedData);

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Room created!',
        submessage: `Share code: ${roomData.code}`,
        type: 'success',
        duration: 5000,
      }]);

      onRoomCreated(roomData.code);

    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        setCreateRoomError(error.issues[0].message);
      } else {
        setCreateRoomError(error instanceof Error ? error.message : 'Failed to create room');
      }

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to create room',
        submessage: 'Please try again later',
        type: 'error',
        duration: 5000,
      }]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setCreateRoomError(null);
    setHostForm({
      isPrivate: false,
      maxParticipants: 2
    });
  };

  const renderMainView = () => (
    <motion.div
      key="main"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
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
          <label className={styles.label}>Room Password (if private)</label>
          <input
            type="password"
            className={styles.input}
            value={roomPassword}
            onChange={(e) => setRoomPassword(e.target.value)}
            placeholder="Enter password (if room is private)"
          />
        </div>

        <div className={styles.actionButtons}>
          <button type="submit" className={`${styles.actionButton} ${styles.join}`}>
            Join Room
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.host}`}
            onClick={handleHostRoomClick}
          >
            Host Room
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderHostView = () => (
  <motion.div
    key="host"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    <div className={styles.form}>

      <div className={styles.inputGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={hostForm.isPrivate}
            onChange={(e) => setHostForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
            className={styles.checkbox}
          />
          Private Room
        </label>
      </div>

      {hostForm.isPrivate && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>Room Password</label>
          <input
            type="password"
            className={styles.input}
            value={hostForm.password}
            onChange={(e) => setHostForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter room password"
          />
        </div>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Max Participants</label>
        <div className={styles.stepperContainer}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => {
              setHostForm(prev => ({
                ...prev,
                maxParticipants: Math.max(2, prev.maxParticipants - 1)
              }));
            }}
            disabled={hostForm.maxParticipants <= 2}
          >
            −
          </button>
          <div className={styles.stepperValue}>
            {hostForm.maxParticipants}
          </div>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => {
              setHostForm(prev => ({
                ...prev,
                maxParticipants: Math.min(10, prev.maxParticipants + 1)
              }));
            }}
            disabled={hostForm.maxParticipants >= 10}
          >
            +
          </button>
        </div>
      </div>

      {createRoomError && (
        <div className={styles.errorMessage}>
          {createRoomError}
        </div>
      )}

      <div className={styles.actionButtons}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.create}`}
          onClick={handleCreateRoom}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.back}`}
          onClick={handleBackToMain}
          disabled={isCreating}
        >
          Back
        </button>
      </div>
    </div>
  </motion.div>
);

  const getModalTitle = () => {
    switch (currentView) {
      case 'host':
        return 'Host Room';
      default:
        return 'Multiplayer';
    }
  };

  return (
    <>
      <h2 className={styles.modalTitle}>{getModalTitle()}</h2>

      <AnimatePresence mode="wait">
        {currentView === 'main' && renderMainView()}
        {currentView === 'host' && renderHostView()}
      </AnimatePresence>

      {currentView === 'main' && (
        <button className={styles.backButton} onClick={onBack}>
          ← Back to Menu
        </button>
      )}
    </>
  );
}
