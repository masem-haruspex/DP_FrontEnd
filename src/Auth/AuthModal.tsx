import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AuthModal.module.scss';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSwitchToRegister
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
    rememberMe: false
  });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submitted:', loginForm);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register submitted:', registerForm);
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook login clicked');
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
      setLoginForm({ identifier: '', password: '', rememberMe: false });
      setRegisterForm({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
      });
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
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`}
            onClick={() => setActiveTab('register')}
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
                <form className={styles.form} onSubmit={handleLoginSubmit}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Username or Email</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      id="rememberMe"
                      checked={loginForm.rememberMe}
                      onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    />
                    <label htmlFor="rememberMe" className={styles.rememberMe}>
                      Remember me
                    </label>
                  </div>

                  <button type="submit" className={styles.submitButton}>
                    Login
                  </button>
                </form>

                <div className={styles.socialButtons}>
                  <button className={`${styles.socialButton} ${styles.google}`} onClick={handleGoogleLogin}>
                    <span>Continue with Google</span>
                  </button>
                  <button className={`${styles.socialButton} ${styles.facebook}`} onClick={handleFacebookLogin}>
                    <span>Continue with Facebook</span>
                  </button>
                </div>

                <div className={styles.switchText}>
                  Don't have an account?{' '}
                  <button onClick={onSwitchToRegister}>Register here</button>
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
                <form className={styles.form} onSubmit={handleRegisterSubmit}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Username</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Confirm Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className={styles.submitButton}>
                    Register
                  </button>
                </form>

                <div className={styles.switchText}>
                  Already have an account?{' '}
                  <button onClick={onSwitchToLogin}>Login here</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
