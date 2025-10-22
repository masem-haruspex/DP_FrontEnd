// Auth/AuthContext.tsx
import { createContext, useContext, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../lib/axiosInstance';
import {
  authAtom,
  preferredKeyboardAtom,
  rememberMeAtom,
  protectedRouteAttemptAtom,
  type User
} from '../atoms/auth';
import { toastsAtom } from '../atoms/toast';
import { setCookie, deleteCookie, getCookie } from '../lib/cookies';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce';

interface AuthContextType {
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  setPreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => void;
  updatePreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => Promise<void>;
  setProtectedRouteAttempt: (route: string | null) => void;
  loginWithOAuth2: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEBUG = true;

function generateRandomState() {
  return Math.random().toString(36).substring(2, 15);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useAtom(authAtom);
  const [rememberMe] = useAtom(rememberMeAtom);
  const setPreferredKeyboard = useSetAtom(preferredKeyboardAtom);
  const setProtectedRouteAttempt = useSetAtom(protectedRouteAttemptAtom);
  const setToasts = useSetAtom(toastsAtom);
  const queryClient = useQueryClient();

  const baseURL = import.meta.env.VITE_BASE_URL;
  const authApiUrl = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:8080';

  useEffect(() => {
    const token = getCookie('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuth({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        deleteCookie('token');
        localStorage.removeItem('user');
        setAuth(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, [setAuth]);

  // Handle OAuth2 callback
  useEffect(() => {
    const handleOAuth2Callback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        console.error('OAuth2 error:', error);
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: `OAuth2 login failed: ${error}`,
          type: 'error',
          duration: 5000,
        }]);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        const codeVerifier = sessionStorage.getItem('code_verifier');
        const savedState = sessionStorage.getItem('oauth_state');

        if (!codeVerifier) {
          console.error('No code verifier found');
          setToasts(prev => [...prev, {
            id: Date.now().toString(),
            message: 'OAuth2 session expired. Please try again.',
            type: 'error',
            duration: 5000,
          }]);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        if (state !== savedState) {
          console.error('State mismatch');
          setToasts(prev => [...prev, {
            id: Date.now().toString(),
            message: 'OAuth2 security validation failed. Please try again.',
            type: 'error',
            duration: 5000,
          }]);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        try {
          const response = await fetch(`${authApiUrl}/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: `${baseURL}`,
              client_id: 'internal-client',
              code_verifier: codeVerifier,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || errorData.error);
          }

          const tokenData = await response.json();
          
          if (DEBUG) console.log('OAuth2 token received:', tokenData);

          // Store tokens
          const expiresInDays = rememberMe ? 365 : 0;
          setCookie('token', tokenData.access_token, expiresInDays);
          
          if (tokenData.refresh_token) {
            sessionStorage.setItem('refresh_token', tokenData.refresh_token);
          }

          let userData = tokenData.user;
          if (!userData) {
            // extract info directly from access_token JWT
            const tokenParts = tokenData.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              userData = {
                id: payload.user_id,
                username: payload.sub,
                email: payload.email,
                preferredKeyboard: payload.preferred_keyboard,
              };
            }
          }

          localStorage.setItem('user', JSON.stringify(userData));

          setAuth({
            user: userData,
            token: tokenData.access_token,
            isLoading: false,
            isAuthenticated: true,
          });

          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokenData.access_token}`;
          queryClient.invalidateQueries({ queryKey: ['user'] });

          if (userData?.preferredKeyboard) {
            setPreferredKeyboard(userData.preferredKeyboard);
          }

          setToasts(prev => [...prev, {
            id: Date.now().toString(),
            message: 'OAuth2 login successful!',
            type: 'success',
            duration: 3000,
          }]);

          // Clean up
          sessionStorage.removeItem('code_verifier');
          sessionStorage.removeItem('oauth_state');
          window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error: any) {
          console.error('Token exchange failed:', error);
          setToasts(prev => [...prev, {
            id: Date.now().toString(),
            message: error.message || 'Failed to complete OAuth2 login',
            type: 'error',
            duration: 5000,
          }]);
          sessionStorage.removeItem('code_verifier');
          sessionStorage.removeItem('oauth_state');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleOAuth2Callback();
  }, [setAuth, setToasts, setPreferredKeyboard, queryClient, rememberMe, authApiUrl, baseURL]);



  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await axiosInstance.post(`${authApiUrl}/api/auth/register`, data);
      return response.data;
    },
    onSuccess: (data) => {
      setCookie('token', data.token, rememberMe ? 365 : 0);
      localStorage.setItem('user', JSON.stringify(data.user));

      setAuth({
        user: data.user,
        token: data.token,
        isLoading: false,
        isAuthenticated: true,
      });

      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.invalidateQueries({ queryKey: ['user'] });

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Registration successful!',
        type: 'success',
        duration: 3000,
      }]);
    },
    onError: (error: any) => {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.response?.data?.message || 'Registration failed',
        type: 'error',
        duration: 5000,
      }]);
    },
  });

  const updateKeyboardMutation = useMutation({
    mutationFn: async (keyboard: 'Casio' | 'Midiplus') => {
      const userId = auth.user?.id;
      const response = await axiosInstance.put(
        `${authApiUrl}/api/auth/${userId}`, 
        { preferredKeyboard: keyboard }, 
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: (data, keyboard) => {
      setPreferredKeyboard(keyboard);

      if (auth.user) {
        const updatedUser = {
          ...auth.user,
          preferredKeyboard: keyboard,
          username: data.username || auth.user.username
        };
        setAuth(prev => ({ ...prev, user: updatedUser }));
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Keyboard preference updated!',
        type: 'success',
        duration: 3000,
      }]);
    },
    onError: (error: any) => {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.response?.data?.message || 'Failed to update keyboard preference',
        type: 'error',
        duration: 5000,
      }]);
    },
  });

  const register = async (data: { username: string; email: string; password: string }) => {
    await registerMutation.mutateAsync(data);
  };

  const updatePreferredKeyboard = async (keyboard: 'Casio' | 'Midiplus') => {
    if (!auth.user) {
      throw new Error('User must be logged in to update keyboard preference');
    }
    await updateKeyboardMutation.mutateAsync(keyboard);
  };

  const loginWithOAuth2 = async () => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomState();

      sessionStorage.setItem('code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);

      const params = new URLSearchParams({
        client_id: 'internal-client',
        redirect_uri: `${baseURL}`,
        response_type: 'code',
        scope: 'openid profile email read write',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      });

      window.location.href = `${authApiUrl}/oauth2/authorize?${params}`;
    } catch (error) {
      console.error('Failed to initiate OAuth2 login:', error);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to initiate OAuth2 login',
        type: 'error',
        duration: 5000,
      }]);
    }
  };

  const logout = () => {
    deleteCookie('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('code_verifier');
    sessionStorage.removeItem('oauth_state');

    setAuth({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });

    delete axiosInstance.defaults.headers.common['Authorization'];
    queryClient.clear();

    setToasts(prev => [...prev, {
      id: Date.now().toString(),
      message: 'Logged out successfully',
      type: 'info',
      duration: 3000,
    }]);
  };

  const value: AuthContextType = {
    register,
    logout,
    setPreferredKeyboard,
    updatePreferredKeyboard,
    setProtectedRouteAttempt,
    loginWithOAuth2,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};