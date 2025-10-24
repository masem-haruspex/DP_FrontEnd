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
  const [participantCount, setParticipantCount] = useState(0);
  const [multiplayerSettings, setMultiplayerSettings] = useAtom(multiplayerAudioSettingsAtom);
  const [, applyAudioSettings] = useAtom(applyAudioSettingsAtom);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('connecting');

  const refreshRoomData = async () => {
    try {
      const room = await RoomService.getRoom(roomCode);
      const participants = await RoomService.getRoomParticipants(roomCode);
      setRoomInfo(room);
      setParticipantCount(participants.length);
    } catch (error) {
      console.error('Failed to refresh room data:', error);
    }
  };

  useEffect(() => {
    const loadRoomData = async () => {
      try {
        const room = await RoomService.getRoom(roomCode);
        const participants = await RoomService.getRoomParticipants(roomCode);
        setParticipantCount(participants.length);
        setRoomInfo(room);
      } catch (error) {
        console.error('Failed to load room data:', error);
      }
    };

    loadRoomData();

    const intervalId = setInterval(() => {
      refreshRoomData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [roomCode]);

  useEffect(() => {
    if (!webSocketService) return;

    const handleConnectionEvent = (data: any) => {
      switch (data.type) {
        case 'CONNECTION_ESTABLISHED':
        case 'RECONNECTED':
          setConnectionStatus('connected');
          refreshRoomData();
          break;
        case 'CONNECTION_LOST':
        case 'RECONNECTING':
          setConnectionStatus('reconnecting');
          break;
        case 'CONNECTION_PERMANENTLY_LOST':
        case 'DISCONNECTED':
          setConnectionStatus('disconnected');
          break;
        default:
          break;
      }
    };

    webSocketService.on('CONNECTION_EVENT', handleConnectionEvent);

    return () => {
      webSocketService.off('CONNECTION_EVENT', handleConnectionEvent);
    };
  }, [webSocketService]);

  useEffect(() => {
    if (!webSocketService) return;

    const handlePlayerJoined = () => {
      refreshRoomData();
    };

    const handlePlayerLeft = () => {
      refreshRoomData();
    };

    webSocketService.on('PLAYER_JOINED', handlePlayerJoined);
    webSocketService.on('PLAYER_LEFT', handlePlayerLeft);

    return () => {
      webSocketService.off('PLAYER_JOINED', handlePlayerJoined);
      webSocketService.off('PLAYER_LEFT', handlePlayerLeft);
    };
  }, [webSocketService, roomCode]);

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
            <h2>Players: {participantCount}/{roomInfo?.maxParticipants}</h2>
            <h2>Status: {connectionStatus}</h2>
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
