// Multiplayer/MultiplayerRoom.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { RoomService } from './RoomService';
import ChatBox from './ChatBox';
import styles from './MultiplayerRoom.module.scss';

interface MultiplayerRoomProps {
  roomCode: string;
  onLeave: () => void;
  webSocketService: any;
  onSettingsChange: (settings: any) => void;
  currentSettings: any;
}

export default function MultiplayerRoom({
  roomCode,
  onLeave,
  webSocketService,
  onSettingsChange,
  currentSettings
}: MultiplayerRoomProps) {
  const { user } = useAuth();
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [settings, setSettings] = useState(currentSettings);
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

  const handleSettingChange = (setting: keyof typeof settings, value: number) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const formatValue = (value: number): string => {
    return (value * 100).toFixed(0) + '%';
  };

  return (
    <div className={styles.multiplayerRoom}>
      <div className={styles.roomHeader}>
        <h2>Room: {roomInfo?.name || roomCode}</h2>
        <div className={styles.roomInfo}>
          <span>Players: {roomInfo?.participantCount || 1}/{roomInfo?.maxParticipants || 2}</span>
          <span className={styles.focusIndicator}>
            {isChatFocused ? 'Chat Focused (Tab to switch)' : 'Keyboard Focused (Tab to switch)'}
          </span>
          <button onClick={handleLeaveRoom} className={styles.leaveButton}>
            Leave Room
          </button>
        </div>
      </div>

      <div className={styles.roomContent}>
        <div className={styles.sidePanel}>
          <div className={styles.controlsPanel}>
            <h3>Audio Effects</h3>

            <div className={styles.controlGroup}>
              <label>Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.volume}
                onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
              />
              <span>{formatValue(settings.volume)}</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Reverb</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.reverb}
                onChange={(e) => handleSettingChange('reverb', parseFloat(e.target.value))}
              />
              <span>{formatValue(settings.reverb)}</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Delay</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.delay}
                onChange={(e) => handleSettingChange('delay', parseFloat(e.target.value))}
              />
              <span>{formatValue(settings.delay)}</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Distortion</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.distortion}
                onChange={(e) => handleSettingChange('distortion', parseFloat(e.target.value))}
              />
              <span>{formatValue(settings.distortion)}</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Chorus</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.chorus}
                onChange={(e) => handleSettingChange('chorus', parseFloat(e.target.value))}
              />
              <span>{formatValue(settings.chorus)}</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Bass</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={settings.bass}
                onChange={(e) => handleSettingChange('bass', parseFloat(e.target.value))}
              />
              <span>{(settings.bass * 100).toFixed(0)}%</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Mid</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={settings.mid}
                onChange={(e) => handleSettingChange('mid', parseFloat(e.target.value))}
              />
              <span>{(settings.mid * 100).toFixed(0)}%</span>
            </div>

            <div className={styles.controlGroup}>
              <label>Treble</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={settings.treble}
                onChange={(e) => handleSettingChange('treble', parseFloat(e.target.value))}
              />
              <span>{(settings.treble * 100).toFixed(0)}%</span>
            </div>
          </div>

          <ChatBox roomCode={roomCode} webSocketService={webSocketService} onFocusChange={setIsChatFocused} />
        </div>
      </div>
    </div>
  );
}
