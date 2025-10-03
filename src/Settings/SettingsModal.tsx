// src/Settings/SettingsModal.tsx
import { useState } from 'react';
import styles from './SettingsModal.module.scss';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  
  const [settings, setSettings] = useState({
    soundEnabled: true,
    visualEffects: true,
    autoSave: false,
    darkMode: true,
    notifications: true,
    showParticles: true,
    bloomEffect: true,
    showDebug: false
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        
        <h2 className={styles.modalTitle}>Settings</h2>
        
        <div className={styles.settingsSection}>
          <h3 className={styles.sectionTitle}>Audio & Visual</h3>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Sound Enabled</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={() => handleToggle('soundEnabled')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Visual Effects</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.visualEffects}
                onChange={() => handleToggle('visualEffects')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Bloom Effect</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.bloomEffect}
                onChange={() => handleToggle('bloomEffect')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Floating Particles</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.showParticles}
                onChange={() => handleToggle('showParticles')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
        
        <div className={styles.settingsSection}>
          <h3 className={styles.sectionTitle}>General</h3>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Dark Mode</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => handleToggle('darkMode')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Auto-Save</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={() => handleToggle('autoSave')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Notifications</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Show Debug Stats</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.showDebug}
                onChange={() => handleToggle('showDebug')}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
        
        <button className={styles.backButton} onClick={onClose}>
          ← Back to Menu
        </button>
      </div>
    </div>
  );
}
