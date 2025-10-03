// src/SinglePlayer/SinglePlayer.tsx
import { useState, useCallback } from 'react';
import styles from './SinglePlayer.module.scss';

interface SinglePlayerProps {
  onBack: () => void;
}

export default function SinglePlayer({ onBack }: SinglePlayerProps) {
  const [settings, setSettings] = useState({
    volume: 0.2,
    reverb: 0.5,
    delay: 0.3,
    distortion: 0.2,
    chorus: 0.4,
    bass: 0,
    mid: 0,
    treble: 0
  });

  const handleSettingChange = useCallback((setting: keyof typeof settings, value: number) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    // In a real implementation, you'd update the audio effects here
    // For now, this just updates the UI state
  }, []);

  const formatValue = (value: number): string => {
    return (value * 100).toFixed(0) + '%';
  };

  return (
    <div className={styles.singlePlayerContainer}>
      <div className={styles.controlsPanel}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back to Menu
        </button>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{formatValue(settings.volume)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Reverb</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.reverb}
            onChange={(e) => handleSettingChange('reverb', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{formatValue(settings.reverb)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Delay</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.delay}
            onChange={(e) => handleSettingChange('delay', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{formatValue(settings.delay)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Distortion</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.distortion}
            onChange={(e) => handleSettingChange('distortion', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{formatValue(settings.distortion)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Chorus</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.chorus}
            onChange={(e) => handleSettingChange('chorus', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{formatValue(settings.chorus)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Bass</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={settings.bass}
            onChange={(e) => handleSettingChange('bass', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{(settings.bass * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Mid</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={settings.mid}
            onChange={(e) => handleSettingChange('mid', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{(settings.mid * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Treble</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={settings.treble}
            onChange={(e) => handleSettingChange('treble', parseFloat(e.target.value))}
            className={styles.controlSlider}
          />
          <span className={styles.controlValue}>{(settings.treble * 100).toFixed(0)}%</span>
        </div>
      </div>
      
    </div>
  );
}
