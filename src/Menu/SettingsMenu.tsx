// Menu/SettingsMenu.tsx
import { useAtom } from 'jotai';
import { preferredKeyboardAtom } from '../atoms/auth';
import { settingsAtom, type AppSettings, defaultSettings } from '../atoms/settings';
import styles from './SettingsMenu.module.scss';
import { useAuth } from '../Auth/AuthContext';
import { toastsAtom } from '../atoms/toast';
import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { RefreshCw } from 'lucide-react';

interface SettingsMenuProps {
  onBack: () => void;
}

export default function SettingsMenu({ onBack }: SettingsMenuProps) {
  const [preferredKeyboard, setPreferredKeyboard] = useAtom(preferredKeyboardAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const { updatePreferredKeyboard, user } = useAuth();
  const [, setToasts] = useAtom(toastsAtom);
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateNestedSetting = <K extends keyof AppSettings, N extends keyof AppSettings[K]>(parentKey: K, nestedKey: N, value: AppSettings[K][N]) => {
      setSettings(prev => {
        const parentValue = prev[parentKey];

        if (typeof parentValue !== 'object' || parentValue === null) {
          console.warn(`Cannot update nested setting: ${String(parentKey)} is not an object.`);
          return prev;
      }

      return {
        ...prev,
        [parentKey]: {
          ...parentValue,
          [nestedKey]: value
      }
      };
      });
      };

      const handleKeyboardChange = async (keyboard: 'Casio' | 'Midiplus') => {
        setPreferredKeyboard(keyboard);

        if (user) {
          try {
            await updatePreferredKeyboard(keyboard);
            showToast('Preference saved!', `Keyboard: ${keyboard}`);
      } catch (error) {
        console.error('Failed to update keyboard preference:', error);
        showToast('Failed to save preference', 'Local change applied only', 'warning');
      }
      } else {
        showToast('Preference saved!', `Keyboard: ${keyboard}`);
      }
      };

      const showToast = (message: string, submessage?: string, type: 'success' | 'warning' = 'success') => {
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message,
          submessage,
          type,
          duration: 3000,
      }]);
      };

      const resetToDefaults = () => {
        setSettings(defaultSettings);
        showToast('Settings reset to defaults', 'All preferences have been reset', 'success');
      };

      return (
      <>
        <h2 className={styles.menuTitle}>Settings</h2>

        <div className={styles.settingsSection}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Keyboard Preference</span>
              <span className={styles.settingDescription}>
                Choose your preferred keyboard model
              </span>
            </div>
            <select
              value={preferredKeyboard}
              onChange={(e) => handleKeyboardChange(e.target.value as 'Casio' | 'Midiplus')}
              className={styles.select}
            >
              <option value="Casio">Casio</option>
              <option value="Midiplus">Midiplus</option>
            </select>
          </div>
        </div>

        <div className={styles.settingsSection}>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Audio Latency Compensation</span>
              <span className={styles.settingDescription}>
                Adjust if notes feel out of sync ({settings.audioLatency}ms)
              </span>
            </div>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={settings.audioLatency}
                onChange={(e) => updateSetting('audioLatency', parseInt(e.target.value))}
                className={styles.rangeSlider}
              />
              <span className={styles.settingValue}>{settings.audioLatency}ms</span>
            </div>
          </div>
        </div>

        <div className={styles.settingsSection}>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Show Note Names on Keys</span>
              <span className={styles.settingDescription}>
                Display C, D, E, etc. on piano keys
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.showNoteNames}
                onChange={(e) => updateSetting('showNoteNames', e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Anti-aliasing</span>
              <span className={styles.settingDescription}>
                Improves edge smoothness (may affect performance)
              </span>
            </div>
            <select
              value={settings.antiAliasing}
              onChange={(e) => updateSetting('antiAliasing', e.target.value as any)}
              className={styles.select}
            >
              <option value="off">Off</option>
              <option value="2x">2x</option>
              <option value="4x">4x</option>
              <option value="8x">8x</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Note Particle Colors</span>
              <span className={styles.settingDescription}>
                Colors for local and remote player notes
              </span>
            </div>
            <div className={styles.colorPickers}>
              <div className={styles.colorPickerGroup}>
                <label className={styles.colorLabel}>Local</label>
                <input
                  type="color"
                  value={settings.noteParticleColors.local}
                  onChange={(e) => updateNestedSetting('noteParticleColors', 'local', e.target.value)}
                  className={styles.colorPicker}
                />
              </div>
              <div className={styles.colorPickerGroup}>
                <label className={styles.colorLabel}>Remote</label>
                <input
                  type="color"
                  value={settings.noteParticleColors.remote}
                  onChange={(e) => updateNestedSetting('noteParticleColors', 'remote', e.target.value)}
                  className={styles.colorPicker}
                />
              </div>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Reduced Motion</span>
              <span className={styles.settingDescription}>
                Instant camera transitions instead of animations
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={styles.settingsSection}>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabel}>Default Starting Octave</span>
              <span className={styles.settingDescription}>
                Octave range when you start playing (1-7)
              </span>
            </div>
            <select
              value={settings.defaultOctave}
              onChange={(e) => updateSetting('defaultOctave', parseInt(e.target.value))}
              className={styles.select}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
            </select>
          </div>
        </div>

        <div className={styles.settingsSection}>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabelDisabled}>MIDI Device</span>
              <span className={styles.settingDescription}>
                Select connected MIDI keyboard
              </span>
            </div>
            <select disabled className={styles.selectDisabled}>
              <option>MIDI support coming soon</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabelDisabled}>MIDI Channel</span>
              <span className={styles.settingDescription}>
                MIDI input channel (1-16)
              </span>
            </div>
            <select disabled className={styles.selectDisabled}>
              <option>MIDI support coming soon</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabelGroup}>
              <span className={styles.settingLabelDisabled}>Velocity Curve</span>
              <span className={styles.settingDescription}>
                Adjust MIDI velocity response
              </span>
            </div>
            <select disabled className={styles.selectDisabled}>
              <option>MIDI support coming soon</option>
            </select>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.backButton} onClick={onBack}>
            ← Back to Menu
          </button>
        </div>

        <div className={styles.bottomLeftActions}>
          <button
            className={styles.themeToggleButton}
            onClick={() => setDarkMode(!darkMode)}
            title={!darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className={`${styles.themeIcon} ${!darkMode ? styles.moon : styles.sun}`}>
              {!darkMode ? '🌙' : '☀️'}
            </span>
          </button>

          <button
            className={styles.resetButton}
            onClick={resetToDefaults}
            title="Reset all settings to defaults"
          >
                <RefreshCw size={24} />
          </button>
        </div>

      </>
      );
      }
