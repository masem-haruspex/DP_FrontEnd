// Toast/ToastContainer.tsx
import { useAtom } from 'jotai';
import { createPortal } from 'react-dom';
import { toastsAtom } from '../atoms/toast';
import Toast from './Toast';
import styles from './ToastContainer.module.scss';
import { useEffect, useState } from 'react';

export default function ToastContainer() {
  const [toasts] = useAtom(toastsAtom);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}
