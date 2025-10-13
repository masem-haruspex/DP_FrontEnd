// Toast/Toast.tsx
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { toastsAtom, type Toast } from '../atoms/toast';
import styles from './Toast.module.scss';

interface ToastProps {
  toast: Toast;
}

export default function Toast({ toast }: ToastProps) {
  const setToasts = useSetAtom(toastsAtom);

  useEffect(() => {
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast, setToasts]);

  const handleClose = () => {
    setToasts(prev => prev.filter(t => t.id !== toast.id));
  };

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type]}`}
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      onClick={handleClose}
    >
      <div className={styles.toastContent}>
        <span className={styles.message}>{toast.message}</span>
        <button className={styles.closeButton} onClick={handleClose}>
          ✕
        </button>
      </div>
    </motion.div>
  );
}
