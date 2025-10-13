// Auth/AuthModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { z } from 'zod';
import styles from './AuthModal.module.scss';
import { protectedRouteAttemptAtom, rememberMeAtom } from '../atoms/auth';
import { toastsAtom } from '../atoms/toast';
import { useAuth } from '../Auth/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

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

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const {
    login: authContextLogin,
    register: authContextRegister,
    isLoading: authLoading
  } = useAuth();

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    identifier: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loginErrors, setLoginErrors] = useState<Partial<LoginFormData>>({});
  const [registerErrors, setRegisterErrors] = useState<Partial<RegisterFormData>>({});
  const [touched, setTouched] = useState({
    login: false,
    register: false
  });
  const [protectedRouteAttempt, setProtectedRouteAttempt] = useAtom(protectedRouteAttemptAtom);
  const [rememberMe, setRememberMe] = useAtom(rememberMeAtom);
  const setToasts = useAtom(toastsAtom)[1];

  const baseURL = import.meta.env.VITE_BASE_URL;
  const authBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL;
  const redirectUri = encodeURIComponent(baseURL + "/oauth2/redirect");

  // Validation functions
  const validateLoginForm = (): boolean => {
    const result = loginSchema.safeParse(loginForm);

    if (!result.success) {
      const errors: Partial<LoginFormData> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;
        errors[field] = issue.message;
      });
      setLoginErrors(errors);
      return false;
    }

    setLoginErrors({});
    return true;
  };

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

  // Real-time validation for login form
  useEffect(() => {
    if (touched.login) {
      validateLoginForm();
    }
  }, [loginForm, touched.login]);

  // Real-time validation for register form
  useEffect(() => {
    if (touched.register) {
      validateRegisterForm();
    }
  }, [registerForm, touched.register]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, login: true }));

    if (!validateLoginForm()) {
      return;
    }

    try {
      await authContextLogin({
        identifier: loginForm.identifier,
        password: loginForm.password
      });

      if (protectedRouteAttempt) {
        handleProtectedRouteRedirect(protectedRouteAttempt);
        setProtectedRouteAttempt(null);
      }

      onAuthSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is already done in AuthContext, but we can add additional handling here if needed
      console.error('Login error in AuthModal:', error);
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

      if (protectedRouteAttempt) {
        handleProtectedRouteRedirect(protectedRouteAttempt);
        setProtectedRouteAttempt(null);
      }

      onAuthSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is already done in AuthContext, but we can add additional handling here if needed
      console.error('Registration error in AuthModal:', error);
    }
  };

  const handleGoogleLogin = () => {
    const url = `${authBaseUrl}/oauth2/authorize/google?redirect_uri=${redirectUri}`;
    window.location.href = url;
  };

  const handleFacebookLogin = () => {
    const url = `${authBaseUrl}/oauth2/authorize/facebook?redirect_uri=${redirectUri}`;
    window.location.href = url;
  };

  const handleSwitchToRegister = () => {
    setActiveTab('register');
    setLoginErrors({});
    setTouched(prev => ({ ...prev, login: false }));
  };

  const handleSwitchToLogin = () => {
    setActiveTab('login');
    setRegisterErrors({});
    setTouched(prev => ({ ...prev, register: false }));
  };

  const handleProtectedRouteRedirect = (route: string) => {
    switch (route) {
      case '/host-room':
        console.log('User authenticated, now they can host a room');
        break;
      default:
        console.log('Redirecting to protected route:', route);
    }
  };

  // Field change handlers with touch state
  const handleLoginChange = (field: keyof LoginFormData, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    if (!touched.login) {
      setTouched(prev => ({ ...prev, login: true }));
    }
  };

  const handleRegisterChange = (field: keyof RegisterFormData, value: string) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
    if (!touched.register) {
      setTouched(prev => ({ ...prev, register: true }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
      setLoginForm({ identifier: '', password: '' });
      setRegisterForm({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
      });
      setLoginErrors({});
      setRegisterErrors({});
      setTouched({ login: false, register: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.authModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

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
                <form className={styles.form} onSubmit={handleLoginSubmit} noValidate>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Username or Email</label>
                    <input
                      type="text"
                      className={`${styles.input} ${loginErrors.identifier ? styles.error : ''}`}
                      value={loginForm.identifier}
                      onChange={(e) => handleLoginChange('identifier', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, login: true }))}
                      required
                      disabled={authLoading}
                      placeholder="Enter your username or email"
                    />
                    {loginErrors.identifier && (
                      <span className={styles.errorMessage}>{loginErrors.identifier}</span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                      type="password"
                      className={`${styles.input} ${loginErrors.password ? styles.error : ''}`}
                      value={loginForm.password}
                      onChange={(e) => handleLoginChange('password', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, login: true }))}
                      required
                      disabled={authLoading}
                      placeholder="Enter your password"
                    />
                    {loginErrors.password && (
                      <span className={styles.errorMessage}>{loginErrors.password}</span>
                    )}
                  </div>

                  <div className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={authLoading}
                    />
                    <label htmlFor="rememberMe" className={styles.rememberMe}>
                      Remember me
                      <div className={styles.tooltip}>
                        <div><strong>Checked:</strong> Stay logged in for 1 year</div>
                        <div><strong>Unchecked:</strong> Log out when browser closes</div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <div className={styles.loadingSpinner}>
                        <div className={styles.spinner}></div>
                        Logging in...
                      </div>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>

                <div className={styles.socialButtons}>
                  <button
                    type="button"
                    className={`${styles.socialButton} ${styles.google}`}
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                  >
                    <span>Continue with Google</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.socialButton} ${styles.facebook}`}
                    onClick={handleFacebookLogin}
                    disabled={authLoading}
                  >
                    <span>Continue with Facebook</span>
                  </button>
                </div>

                <div className={styles.switchText}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToRegister}
                    disabled={authLoading}
                    className={styles.switchButton}
                  >
                    Register here
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

                <div className={styles.switchText}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToLogin}
                    disabled={authLoading}
                    className={styles.switchButton}
                  >
                    Login here
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
