// LoadingScreen/SplashScreen.tsx
import styles from './SplashScreen.module.scss';

interface SplashScreenProps {
  onEnterClick: () => void;
}

export default function SplashScreen({ onEnterClick }: SplashScreenProps) {
  return (
    <div className={styles.splashScreen} onClick={onEnterClick}>
      <div className={styles.splashContent}>
        <h1>Duo Piano</h1>
        <h2>Click anywhere to start</h2>
        <p>Welcome! Here you can play piano in a 3D enviorment, by yourself or with others.</p>
        <p>We hope you have a pleasant experience!</p>
      </div>
    </div>
  );
}
