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
        <p>Created by Masem Haruspex with the help of KaeL-0.</p>
        <p>We hope you enjoy playing as much as we enjoyed creating this ethereal musical journey.</p>
      </div>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to Menu
      </button>
    </>
  );
}
