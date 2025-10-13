// src/components/LoginNeededModal.tsx
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { loginNeededModalAtom, protectedRouteAttemptAtom } from '../atoms/auth';
import { useAuth } from '../Auth/AuthContext';
import styles from './LoginNeededModal.module.scss';

interface LoginNeededModalProps {
  onOpenAuthModal: () => void;
}

export default function LoginNeededModal({ onOpenAuthModal }: LoginNeededModalProps) {
  const [showModal, setShowModal] = useAtom(loginNeededModalAtom);
  const [protectedRouteAttempt, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const { isAuthenticated } = useAuth();

  const handleClose = () => {
    setShowModal(false);
    setProtectedRouteAttempt(null);
  };

  const handleLogin = () => {
    setShowModal(false);
    onOpenAuthModal();
  };

  const getCustomMessage = () => {
    switch (protectedRouteAttempt) {
      case '/host-room':
        return {
          title: 'Login Required to Host Room',
          message: 'To host a multiplayer room, you need to be logged in.',
          reason: 'Hosting rooms requires an account to manage room settings and permissions.'
        };
      default:
        return {
          title: 'Login Required',
          message: 'You need to be logged in to access this feature.',
          reason: 'This feature requires user authentication for security and personalization.'
        };
    }
  };

  const customMessage = getCustomMessage();

  if (!showModal || isAuthenticated) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className={styles.title}>{customMessage.title}</h2>

          <div className={styles.content}>
            <p className={styles.message}>{customMessage.message}</p>

            <div className={styles.reason}>
              <strong>Why login?</strong>
              <p>{customMessage.reason}</p>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelButton} onClick={handleClose}>
                Cancel
              </button>
              <button className={styles.loginButton} onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
