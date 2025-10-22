// Menu/AuthMenu.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { z } from 'zod';
import styles from './AuthMenu.module.scss';
import { rememberMeAtom } from '../atoms/auth';
import { useAuth } from '../Auth/AuthContext';

interface AuthModalProps {
  onBack: () => void;
  onAuthSuccess?: () => void;
}

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  username: z.string()
  .min(4, 'Username must be at least 4 characters')
  .max(50, 'Username cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthModal({
  onBack,
  onAuthSuccess
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const {
    loginWithOAuth2,
    register: authContextRegister,
    isLoading: authLoading
  } = useAuth();

  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [registerErrors, setRegisterErrors] = useState<Partial<RegisterFormData>>({});
  const [touched, setTouched] = useState({
    login: false,
    register: false
  });

  // TODO implement remember me if required
  const [rememberMe, setRememberMe] = useAtom(rememberMeAtom);

  const validateRegisterForm = (): boolean => {
    const result = registerSchema.safeParse(registerForm);

    if (!result.success) {
      const errors: Partial<RegisterFormData> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterFormData;
        errors[field] = issue.message;
      });
      setRegisterErrors(errors);
      return false;
    }

    setRegisterErrors({});
    return true;
  };


  // Real-time validation for register form
  useEffect(() => {
    if (touched.register) {
      validateRegisterForm();
    }
  }, [registerForm, touched.register]);

  const handleOAuth2Login = async () => {
  try {
    await loginWithOAuth2();
  } catch (error) {
    console.error('OAuth2 login initiation failed:', error);
  }
};


  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, register: true }));

    if (!validateRegisterForm()) {
      return;
    }

    try {
      await authContextRegister({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      });

      //if (protectedRouteAttempt) {
      //  handleProtectedRouteRedirect(protectedRouteAttempt);
      //  setProtectedRouteAttempt(null);
      //}

      onAuthSuccess?.();
      onBack();
    } catch (error) {
      // Error handling is already done in AuthContext, but we can add additional handling here if needed
      console.error('Registration error in AuthModal:', error);
    }
  };



  const handleRegisterChange = (field: keyof RegisterFormData, value: string) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
    if (!touched.register) {
      setTouched(prev => ({ ...prev, register: true }));
    }
  };

  useEffect(() => {
    setActiveTab('login');
    setRegisterForm({
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
    setRegisterErrors({});
    setTouched({ login: false, register: false });
  }, []);

  return (
    <div  onClick={(e) => e.stopPropagation()}>
      <h2 className={styles.menuTitle}>{activeTab === 'login' ? 'Login' : 'Register'}</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`}
          onClick={() => setActiveTab('login')}
          disabled={authLoading}
        >
          Login
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`}
          onClick={() => setActiveTab('register')}
          disabled={authLoading}
        >
          Register
        </button>
      </div>

      <div className={styles.formContainer}>
        <AnimatePresence mode="wait">
          {activeTab === 'login' && (
            <motion.div
              key="login"
              className={`${styles.formContent} ${styles.visible}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
                <div className={styles.socialButtons}>
                  <button
                    type="button"
                    className={`${styles.socialButton} ${styles.oauth}`}
                    onClick={handleOAuth2Login}
                    disabled={authLoading}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Login with OAuth2 (PKCE)</span>
                  </button>
                </div>
            </motion.div>
          )}

          {activeTab === 'register' && (
            <motion.div
              key="register"
              className={`${styles.formContent} ${styles.visible}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form className={styles.form} onSubmit={handleRegisterSubmit} noValidate>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={`${styles.input} ${registerErrors.email ? styles.error : ''}`}
                    value={registerForm.email}
                    onChange={(e) => handleRegisterChange('email', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, register: true }))}
                    required
                    disabled={authLoading}
                    placeholder="Enter your email"
                  />
                  {registerErrors.email && (
                    <span className={styles.errorMessage}>{registerErrors.email}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Username</label>
                  <input
                    type="text"
                    className={`${styles.input} ${registerErrors.username ? styles.error : ''}`}
                    value={registerForm.username}
                    onChange={(e) => handleRegisterChange('username', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, register: true }))}
                    required
                    disabled={authLoading}
                    placeholder="Choose a username (4-50 characters)"
                  />
                  {registerErrors.username && (
                    <span className={styles.errorMessage}>{registerErrors.username}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${registerErrors.password ? styles.error : ''}`}
                    value={registerForm.password}
                    onChange={(e) => handleRegisterChange('password', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, register: true }))}
                    required
                    disabled={authLoading}
                    placeholder="Create a password (min. 6 characters)"
                  />
                  {registerErrors.password && (
                    <span className={styles.errorMessage}>{registerErrors.password}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${registerErrors.confirmPassword ? styles.error : ''}`}
                    value={registerForm.confirmPassword}
                    onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, register: true }))}
                    required
                    disabled={authLoading}
                    placeholder="Confirm your password"
                  />
                  {registerErrors.confirmPassword && (
                    <span className={styles.errorMessage}>{registerErrors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <div className={styles.loadingSpinner}>
                      <div className={styles.spinner}></div>
                      Registering...
                    </div>
                  ) : (
                    'Register'
                  )}
                </button>
              </form>

            </motion.div>
          )}
          <button className={styles.backButton} onClick={onBack}>
            ← Back to Menu
          </button>
        </AnimatePresence>
      </div>
    </div>
  );
}
