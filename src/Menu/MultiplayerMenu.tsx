// Multiplayer/MultiplayerMenu.tsx
import { useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../Auth/AuthContext';
import { protectedRouteAttemptAtom, loginNeededModalAtom } from '../atoms/auth';
import { CreateRoomSchema, type CreateRoomData, type Room } from '../Multiplayer/Room';
import styles from './MultiplayerMenu.module.scss';
import * as z from 'zod';
import { RoomService } from '../Multiplayer/RoomService';
import { toastsAtom } from '../atoms/toast';

type ModalView = 'main' | 'host' | 'room-created';

interface MultiplayerMenuProps {
  onBack: () => void;
  onRoomCreated: (roomCode: string) => void;
}

export default function MultiplayerMenu({ onBack, onRoomCreated }: MultiplayerMenuProps) {
  const [, setToasts] = useAtom(toastsAtom);
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [currentView, setCurrentView] = useState<ModalView>('main');
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuth();
  const [, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const [, setShowLoginNeededModal] = useAtom(loginNeededModalAtom);

  const [hostForm, setHostForm] = useState<CreateRoomData>({
    name: '',
    isPrivate: false,
    password: '',
    maxParticipants: 2
  });

  const handleJoinRoom = async () => {
    try {
      if (!user) {
        return;
      }

      await RoomService.joinRoom(roomCode, user.id, roomPassword || undefined);

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
      }

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: errorMessage,
        submessage,
        type: 'error',
        duration: 5000,
      }]);
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

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Creating room...',
        type: 'info',
        duration: 2000,
      }]);

      const validatedData = CreateRoomSchema.parse(hostForm);
      const roomData = await RoomService.createRoom(user!.id, validatedData);

      setCreatedRoom(roomData);
      setCurrentView('room-created');

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Room created!',
        submessage: `Share code: ${roomData.code}`,
        type: 'success',
        duration: 5000,
      }]);
      onRoomCreated(createdRoom!.code);

    } catch (error) {
      if (error instanceof z.ZodError) {
        setCreateRoomError(error.issues[0].message);
      } else {
        setCreateRoomError(error instanceof Error ? error.message : 'Failed to create room');
      }

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to create room',
        submessage: 'Please try again',
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
      name: '',
      isPrivate: false,
      maxParticipants: 2
    });
  };

  const handleBackToHost = () => {
    setCurrentView('host');
    setCreatedRoom(null);
  };

  const handleStartGame = () => {
    if (createdRoom) {
      console.log('Start game clicked for room:', createdRoom);
      onRoomCreated(createdRoom.code);
    }
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
          <label className={styles.label}>Room Name</label>
          <input
            type="text"
            className={styles.input}
            value={hostForm.name}
            onChange={(e) => setHostForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter room name"
            maxLength={100}
            required
          />
        </div>

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
          <input
            type="number"
            className={styles.input}
            value={hostForm.maxParticipants}
            onChange={(e) => setHostForm(prev => ({
              ...prev,
              maxParticipants: Math.min(10, Math.max(2, parseInt(e.target.value) || 2))
            }))}
            min={2}
            max={10}
            required
          />
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
            disabled={isCreating || !hostForm.name.trim()}
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

  const renderRoomCreatedView = () => (
    <motion.div
      key="room-created"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.roomCreated}>

        {createdRoom && (
          <div className={styles.roomDetails}>
            <div className={styles.roomDetail}>
              <span className={styles.detailLabel}>Room Name:</span>
              <span className={styles.detailValue}>{createdRoom.name}</span>
            </div>
            <div className={styles.roomDetail}>
              <span className={styles.detailLabel}>Room Code:</span>
              <span className={styles.detailValue}>{createdRoom.code}</span>
            </div>
            <div className={styles.roomDetail}>
              <span className={styles.detailLabel}>Privacy:</span>
              <span className={styles.detailValue}>
                {createdRoom.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
            <div className={styles.roomDetail}>
              <span className={styles.detailLabel}>Max Participants:</span>
              <span className={styles.detailValue}>{createdRoom.maxParticipants}</span>
            </div>
            <div className={styles.roomDetail}>
              <span className={styles.detailLabel}>Created:</span>
              <span className={styles.detailValue}>
                {new Date(createdRoom.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className={styles.roomActions}>
          <button
            className={`${styles.actionButton} ${styles.start}`}
            onClick={handleStartGame}
          >
            Start Game
          </button>
          <button
            className={`${styles.actionButton} ${styles.back}`}
            onClick={handleBackToHost}
          >
            Back to Host
          </button>
        </div>
      </div>
    </motion.div>
  );

  const getModalTitle = () => {
    switch (currentView) {
      case 'host':
        return 'Host Room';
      case 'room-created':
        return 'Room Created';
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
        {currentView === 'room-created' && renderRoomCreatedView()}
      </AnimatePresence>

      {currentView === 'main' && (
        <button className={styles.backButton} onClick={onBack}>
          ← Back to Menu
        </button>
      )}
    </>
  );
}
