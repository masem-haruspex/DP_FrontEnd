// Auth/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useAuth } from './AuthContext';
import { protectedRouteAttemptAtom, loginNeededModalAtom } from '../atoms/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const [, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const [, setShowLoginNeededModal] = useAtom(loginNeededModalAtom);

  useEffect(() => {
    if (!isAuthenticated) {
      setProtectedRouteAttempt(window.location.pathname);
      setShowLoginNeededModal(true);
    }
  }, [isAuthenticated, setProtectedRouteAttempt, setShowLoginNeededModal]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
