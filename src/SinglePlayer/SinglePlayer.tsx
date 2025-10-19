// SinglePlayer/SinglePlayer.tsx
import { useAtom } from 'jotai';
import { type AudioSettings, singlePlayerAudioSettingsAtom, applyAudioSettingsAtom } from '../atoms/audio';
import AudioControlsPanel from '../AudioControls/AudioControlPanel';
import styles from './SinglePlayer.module.scss';

interface SinglePlayerProps {
  onBack: () => void;
  onSettingsChange: (settings: AudioSettings) => void;
}

export default function SinglePlayer({ onBack, onSettingsChange }: SinglePlayerProps) {
  const [singlePlayerSettings, setSinglePlayerSettings] = useAtom(singlePlayerAudioSettingsAtom);
  const [, applyAudioSettings] = useAtom(applyAudioSettingsAtom);

  const handleSettingsChange = (newSettings: AudioSettings) => {
    setSinglePlayerSettings(newSettings);
    applyAudioSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className={styles.singlePlayerContainer}>
      <button className={styles.backButton} onClick={onBack}>
        ← Back
      </button>
      <AudioControlsPanel
        settings={singlePlayerSettings}
        onSettingsChange={handleSettingsChange}
        mode="singleplayer"
      />
    </div>
  );
}
