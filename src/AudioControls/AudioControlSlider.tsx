// AudioControls/AudioControlSlider.tsx
import styles from './AudioControls.module.scss';

interface AudioControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}

export function AudioControlSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue
}: AudioControlSliderProps) {
  return (
    <div className={styles.controlGroup}>
      <label className={styles.controlLabel}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.controlSlider}
      />
      <span className={styles.controlValue}>{formatValue(value)}</span>
    </div>
  );
}
