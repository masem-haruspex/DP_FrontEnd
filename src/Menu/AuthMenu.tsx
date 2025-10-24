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
  onBack,
  onAuthSuccess
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const {
  login: authContextLogin,
  register: authContextRegister,
  loginWithOAuth2,
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
  const [rememberMe, setRememberMe] = useAtom(rememberMeAtom);

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

  useEffect(() => {
    if (touched.login) {
      validateLoginForm();
    }
  }, [loginForm, touched.login]);

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

      //if (protectedRouteAttempt) {
      //  handleProtectedRouteRedirect(protectedRouteAttempt);
      //  setProtectedRouteAttempt(null);
      //}

      onAuthSuccess?.();
      onBack();
    } catch (error) {
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

      //if (protectedRouteAttempt) {
      //  handleProtectedRouteRedirect(protectedRouteAttempt);
      //  setProtectedRouteAttempt(null);
      //}

      onAuthSuccess?.();
      onBack();
    } catch (error) {
      console.error('Registration error in AuthModal:', error);
    }
  };

  function handleGoogleLogin(){
  loginWithOAuth2('google', () => {
    onAuthSuccess?.();
    onBack();
  });
};

function handleFacebookLogin(){
  loginWithOAuth2('facebook', () => {
    onAuthSuccess?.();
    onBack();
  });
};

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
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Login with Google</span>
                </button>
                <button
                  type="button"
                  className={`${styles.socialButton} ${styles.facebook}`}
                  onClick={handleFacebookLogin}
                  disabled={authLoading}
                >
                  <svg viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Login with Facebook</span>
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
