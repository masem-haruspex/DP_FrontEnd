// Menu/SettingsMenu.tsx
import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { preferredKeyboardAtom } from '../atoms/auth';
import styles from './SettingsMenu.module.scss';
import { useAuth } from '../Auth/AuthContext';
import { toastsAtom } from '../atoms/toast';

interface SettingsMenuProps {
  onBack: () => void;
}

export default function SettingsMenu({ onBack }: SettingsMenuProps) {
  const [preferredKeyboard, setPreferredKeyboard] = useAtom(preferredKeyboardAtom);
  const { updatePreferredKeyboard, user } = useAuth();
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
  const [, setToasts] = useAtom(toastsAtom);

  useEffect(() => {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const handleKeyboardChange = async (keyboard: 'Casio' | 'Midiplus') => {
    setPreferredKeyboard(keyboard);

    if (user) {
      try {
        await updatePreferredKeyboard(keyboard);

        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Preference saved!',
          submessage: `Keyboard: ${keyboard}`,
          type: 'success',
          duration: 3000,
        }]);
      } catch (error) {
        console.error('Failed to update keyboard preference in database:', error);
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Failed to save preference',
          submessage: 'Local change applied only',
          type: 'warning',
          duration: 4000,
        }]);
      }
    } else {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Preference saved!',
        submessage: `Keyboard: ${keyboard}`,
        type: 'success',
        duration: 3000,
      }]);
    }
  };

  return (
    <>
      <h2 className={styles.menuTitle}>Settings</h2>

      {/* Keyboard Preference Section */}
      <div className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Keyboard Preference</h3>

        <div className={styles.keyboardOptions}>
          <button
            className={`${styles.keyboardOption} ${
              preferredKeyboard === 'Casio' ? styles.keyboardOptionActive : ''
            }`}
            onClick={() => handleKeyboardChange('Casio')}
          >
            <span className={styles.keyboardName}>Casio</span>
          </button>

          <button
            className={`${styles.keyboardOption} ${
              preferredKeyboard === 'Midiplus' ? styles.keyboardOptionActive : ''
            }`}
            onClick={() => handleKeyboardChange('Midiplus')}
          >
            <span className={styles.keyboardName}>Midiplus</span>
          </button>
        </div>
      </div>

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

      <button className={styles.backButton} onClick={onBack}>
        ← Back to Menu
      </button>
    </>
  );
}
