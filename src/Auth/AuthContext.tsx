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

interface AuthContextType {
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  setPreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => void;
  updatePreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => Promise<void>;
  setProtectedRouteAttempt: (route: string | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEBUG = true;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useAtom(authAtom);
  const [rememberMe] = useAtom(rememberMeAtom);
  const setPreferredKeyboard = useSetAtom(preferredKeyboardAtom);
  const setProtectedRouteAttempt = useSetAtom(protectedRouteAttemptAtom);
  const setToasts = useSetAtom(toastsAtom);
  const queryClient = useQueryClient();

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

  const loginMutation = useMutation({
    mutationFn: async (credentials: { identifier: string; password: string }) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const payload = emailRegex.test(credentials.identifier)
        ? { email: credentials.identifier, password: credentials.password }
        : { username: credentials.identifier, password: credentials.password };

      const response = await axiosInstance.post('http://localhost:8080/api/auth/login', payload);
      return response.data;
    },
    onSuccess: (data) => {
      if(DEBUG) console.log('Login successful - User data:', data.user);
      if(DEBUG) console.log('Token received:', data.token);
      const expiresInDays = rememberMe ? 365 : 0; // 30 day token if "remember me", 0 means logged out as soon as you exit the tab
      setCookie('token', data.token, expiresInDays);

      localStorage.setItem('user', JSON.stringify(data.user));

      setAuth({
        user: data.user,
        token: data.token,
        isLoading: false,
        isAuthenticated: true,
      });

      if(DEBUG) console.log('Auth state after login:', { user: data.user, isAuthenticated: true });

      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.invalidateQueries({ queryKey: ['user'] });

      if (data.user.preferredKeyboard) {
        setPreferredKeyboard(data.user.preferredKeyboard);
      }

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Login successful!',
        type: 'success',
        duration: 3000,
      }]);
    },
    onError: (error: any) => {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.response?.data?.message || 'Login failed',
        type: 'error',
        duration: 5000,
      }]);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await axiosInstance.post('http://localhost:8080/api/auth/register', data);
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

      const response = await axiosInstance.put(`http://localhost:8080/api/auth/${userId}`, { preferredKeyboard: keyboard }, { withCredentials: true });
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

  const login = async (credentials: { identifier: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (data: { username: string; email: string; password: string }) => {
    await registerMutation.mutateAsync(data);
  };

  const updatePreferredKeyboard = async (keyboard: 'Casio' | 'Midiplus') => {
    if (!auth.user) {
      throw new Error('User must be logged in to update keyboard preference');
    }
    await updateKeyboardMutation.mutateAsync(keyboard);
  };

  const logout = () => {
    deleteCookie('token');
    localStorage.removeItem('user');

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
    login,
    register,
    logout,
    setPreferredKeyboard,
    updatePreferredKeyboard,
    setProtectedRouteAttempt,
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
