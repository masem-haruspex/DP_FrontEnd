// components/AudioControls/AudioControlsPanel.tsx
import { useAtom } from 'jotai';
import {
  type AudioSettings,
  updateSinglePlayerAudioSettingAtom,
  updateMultiplayerAudioSettingAtom
} from '../atoms/audio';
import { AudioControlSlider } from './AudioControlSlider';
import styles from './AudioControls.module.scss';

interface AudioControlsPanelProps {
  settings: AudioSettings;
  onSettingsChange?: (settings: AudioSettings) => void;
  className?: string;
  showTitle?: boolean;
  mode?: 'singleplayer' | 'multiplayer'; // Add mode prop
}

export default function AudioControlsPanel({
  settings,
  onSettingsChange,
  className = '',
  showTitle = false,
  mode = 'singleplayer' // Default to singleplayer
}: AudioControlsPanelProps) {
  // Choose the correct updater based on mode
  const updaterAtom = mode === 'multiplayer'
    ? updateMultiplayerAudioSettingAtom
    : updateSinglePlayerAudioSettingAtom;

  const [, updateSetting] = useAtom(updaterAtom);

  const handleSettingChange = (setting: keyof AudioSettings, value: number) => {
    // Update the audio effects via Jotai
    updateSetting({ setting, value });

    // Notify parent component if provided
    if (onSettingsChange) {
      const newSettings = {
        ...settings,
        [setting]: value
      };
      onSettingsChange(newSettings);
    }
  };

  // ... rest of the component remains the same
  const formatPercentage = (value: number): string => `${(value * 100).toFixed(0)}%`;
  const formatEQ = (value: number): string => `${(value * 100).toFixed(0)}%`;

  const controlConfigs = [
    { key: 'volume' as const, label: 'Volume', min: 0, max: 1, step: 0.01, formatValue: formatPercentage },
    { key: 'reverb' as const, label: 'Reverb', min: 0, max: 1, step: 0.01, formatValue: formatPercentage },
    { key: 'delay' as const, label: 'Delay', min: 0, max: 1, step: 0.01, formatValue: formatPercentage },
    { key: 'distortion' as const, label: 'Distortion', min: 0, max: 1, step: 0.01, formatValue: formatPercentage },
    { key: 'chorus' as const, label: 'Chorus', min: 0, max: 1, step: 0.01, formatValue: formatPercentage },
    { key: 'bass' as const, label: 'Bass', min: -1, max: 1, step: 0.01, formatValue: formatEQ },
    { key: 'mid' as const, label: 'Mid', min: -1, max: 1, step: 0.01, formatValue: formatEQ },
    { key: 'treble' as const, label: 'Treble', min: -1, max: 1, step: 0.01, formatValue: formatEQ },
  ];

  return (
    <div className={`${styles.controlsPanel} ${className}`}>
      {showTitle && <h3>Audio Effects</h3>}
      {controlConfigs.map((config) => (
        <AudioControlSlider
          key={config.key}
          label={config.label}
          value={settings[config.key]}
          min={config.min}
          max={config.max}
          step={config.step}
          onChange={(value) => handleSettingChange(config.key, value)}
          formatValue={config.formatValue}
        />
      ))}
    </div>
  );
}
