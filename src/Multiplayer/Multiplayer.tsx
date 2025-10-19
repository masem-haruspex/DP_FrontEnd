// Multiplayer/Multiplayer.tsx
import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useAuth } from '../Auth/AuthContext';
import { RoomService } from './RoomService';
import { type AudioSettings, multiplayerAudioSettingsAtom, applyAudioSettingsAtom } from '../atoms/audio';
import AudioControlsPanel from '../AudioControls/AudioControlPanel';
import ChatBox from './ChatBox';
import styles from './Multiplayer.module.scss';

interface MultiplayerProps {
  roomCode: string;
  onLeave: () => void;
  webSocketService: any;
  onSettingsChange: (settings: AudioSettings) => void;
}

export default function Multiplayer({ roomCode, onLeave, webSocketService, onSettingsChange }: MultiplayerProps) {
  const { user } = useAuth();
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [multiplayerSettings, setMultiplayerSettings] = useAtom(multiplayerAudioSettingsAtom);
  const [, applyAudioSettings] = useAtom(applyAudioSettingsAtom);
  const [isChatFocused, setIsChatFocused] = useState(false);

  useEffect(() => {
    const loadRoomData = async () => {
      try {
        const room = await RoomService.getRoom(roomCode);
        setRoomInfo(room);
      } catch (error) {
        console.error('Failed to load room data:', error);
      }
    };
    loadRoomData();
  }, [roomCode]);

  const handleLeaveRoom = async () => {
    if (user) {
      try {
        await RoomService.leaveRoom(roomCode, user.id);
        webSocketService.disconnect();
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
    onLeave();
  };

  const handleSettingsChange = (newSettings: AudioSettings) => {
    setMultiplayerSettings(newSettings);
    applyAudioSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className={styles.multiplayer}>
      <AudioControlsPanel
        settings={multiplayerSettings}
        onSettingsChange={handleSettingsChange}
        showTitle={true}
        mode="multiplayer"
      />

      <div className={styles.roomContent}>

        <div className={styles.roomHeader}>
          <button onClick={handleLeaveRoom} className={styles.leaveButton}>
            Leave
          </button>
          <div className={styles.roomInfo}>
            <h2>Name: {roomInfo?.name || "Untitled"}</h2>
            <h2>Code: {roomCode}</h2>
            <h2>Players: {roomInfo?.participantCount || 1}/{roomInfo?.maxParticipants || 2}</h2>
          </div>
        </div>

        <ChatBox 
          roomCode={roomCode} 
          webSocketService={webSocketService} 
          onFocusChange={setIsChatFocused} 
          isFocused={isChatFocused} 
          setIsFocused={setIsChatFocused} />

      </div>
    </div>
  );
}
