// Toast/Toast.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { toastsAtom, type Toast } from '../atoms/toast';
import styles from './Toast.module.scss';

interface ToastProps {
  toast: Toast;
}

export default function Toast({ toast }: ToastProps) {
  const setToasts = useSetAtom(toastsAtom);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const interval = 50;
    const steps = duration / interval;
    const decrement = 100 / steps;

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.max(0, prev - decrement));
    }, interval);

    const dismissTimer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, duration);

    return () => {
      clearTimeout(dismissTimer);
      clearInterval(progressTimer);
    };
  }, [toast, setToasts]);

  const handleClose = () => {
    setToasts(prev => prev.filter(t => t.id !== toast.id));
  };

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type]}`}
      initial={{ opacity: 0, x: 300, scale: 0.8, rotate: 5 }}
      animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, x: 300, scale: 0.8, rotate: -5 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      onClick={handleClose}
    >
      <div className={styles.toastContent}>
        <div className={styles.toastIcon} />

        <div className={styles.messageContainer}>
          <span className={styles.message}>{toast.message}</span>
          {toast.submessage && (
            <span className={styles.submessage}>{toast.submessage}</span>
          )}
        </div>

        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>

      <div className={styles.progressBar} style={{ '--progress': `${progress}%` } as React.CSSProperties} />
    </motion.div>
  );
}
