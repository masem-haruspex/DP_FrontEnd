// Menu/AboutMenu.tsx
import styles from './AboutMenu.module.scss';

interface AboutMenuProps {
  onBack: () => void;
}

export default function AboutMenu({ onBack }: AboutMenuProps) {
  return (
    <>
      <h2 className={styles.menuTitle}>About Us</h2>
      <div className={styles.aboutContent}>
        <p>Created with love by [Your Name] and [Coworker's Name].</p>
        <p>We hope you enjoy playing as much as we enjoyed creating this ethereal musical journey.</p>
      </div>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to Menu
      </button>
    </>
  );
}
