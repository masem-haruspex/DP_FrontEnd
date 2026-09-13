// Auth/AuthContext.tsx
import { createContext, useContext, useEffect, useRef } from 'react';
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
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  setPreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => void;
  updatePreferredKeyboard: (keyboard: 'Casio' | 'Midiplus') => Promise<void>;
  setProtectedRouteAttempt: (route: string | null) => void;
  loginWithOAuth2: (provider: 'google' | 'facebook', onSuccess?: () => void) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEBUG = true;
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5min

async function fetchUserInfo(accessToken: string): Promise<User> {
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));

      return {
        id: payload.sub || payload.user_id,
        username: payload.username,
        email: payload.email,
        passwordHash: '',
        provider: payload.provider,
        providerId: payload.provider_id,
        preferredKeyboard: payload.preferred_keyboard || 'Casio',
      };
    }
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
  }

  throw new Error('Could not retrieve user information from JWT');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useAtom(authAtom);
  const [rememberMe] = useAtom(rememberMeAtom);
  const setPreferredKeyboard = useSetAtom(preferredKeyboardAtom);
  const setProtectedRouteAttempt = useSetAtom(protectedRouteAttemptAtom);
  const setToasts = useSetAtom(toastsAtom);
  const queryClient = useQueryClient();

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  const authApiUrl = import.meta.env.VITE_URL_BACKEND_AUTH;
  const oauthTokenApiUrl = import.meta.env.VITE_URL_BACKEND_OAUTH_TOKEN;

  const scheduleTokenRefresh = (expiresIn: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const refreshTime = Math.max(expiresIn - TOKEN_REFRESH_BUFFER, 0);

    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken();
    }, refreshTime);

    if (DEBUG) console.log(`Token refresh scheduled in ${refreshTime}ms`);
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = getCookie('refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(oauthTokenApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenValue,
          client_id: 'internal-client',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || errorData.error || 'Token refresh failed');
      }

      const tokenData = await response.json();
      await handleTokenResponse(tokenData);

      retryCountRef.current = 0;

      if (DEBUG) console.log('Token refreshed successfully');

    } catch (error) {
      console.error('Token refresh failed:', error);
      handleRefreshFailure();
    }
  };

  const handleRefreshFailure = () => {
    retryCountRef.current++;
    const maxRetries = 3;

    if (retryCountRef.current <= maxRetries) {
      const retryDelay = 30000 * retryCountRef.current; // Exponential backoff: 30s, 60s, 90s
      if (DEBUG) console.log(`Scheduling retry ${retryCountRef.current} in ${retryDelay}ms`);

      setTimeout(() => {
        refreshToken();
      }, retryDelay);
    } else {
      if (DEBUG) console.log('Max refresh retries exceeded, logging out');
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Session expired',
        submessage: 'Please log in again',
        type: 'warning',
        duration: 5000,
      }]);
      logout(); 
    }
  };

  const extractTokenExpiry = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; 
    } catch {
      return null;
    }
  };

  const fetchCsrfTokenWithRetry = async (maxRetries: number = 3, baseDelay: number = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${authApiUrl}/csrf`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          if (DEBUG) console.log('CSRF token fetched successfully');
          return true;
        } else {
          console.warn(`CSRF fetch attempt ${attempt} failed: ${response.status}`);
        }
      } catch (error) {
        console.warn(`CSRF fetch attempt ${attempt} error:`, error);
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        if (DEBUG) console.log(`Retrying CSRF fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('All CSRF token fetch attempts failed');
    setToasts(prev => [...prev, {
      id: Date.now().toString(),
      message: 'Security session setup failed',
      submessage: 'Some features may not work properly',
      type: 'warning',
      duration: 5000,
    }]);

    return false;
  };

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(`${authApiUrl}/csrf`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        if (DEBUG) console.log('CSRF token fetched successfully');
      } else {
        console.warn('Failed to fetch CSRF token');
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
    }
  };

  const handleTokenResponse = async (tokenData: any) => {
    if (DEBUG) console.log('Token received:', tokenData);

    const expiresInDays = rememberMe ? 365 : 0;
    setCookie('token', tokenData.access_token, expiresInDays);

    if (tokenData.refresh_token) {
      setCookie('refresh_token', tokenData.refresh_token, expiresInDays);
    }

    const user = await fetchUserInfo(tokenData.access_token);
    localStorage.setItem('user', JSON.stringify(user));

    setAuth({
      user: user,
      token: tokenData.access_token,
      isLoading: false,
      isAuthenticated: true,
    });

    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokenData.access_token}`;
    queryClient.invalidateQueries({ queryKey: ['user'] });

    if (user.preferredKeyboard) {
      setPreferredKeyboard(user.preferredKeyboard);
    }

    const tokenExpiry = extractTokenExpiry(tokenData.access_token);
    if (tokenExpiry) {
      const timeUntilExpiry = tokenExpiry - Date.now();
      scheduleTokenRefresh(timeUntilExpiry);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          id: Date.now().toString(),
          message: 'Login successful!',
          type: 'success',
          duration: 3000
        }
      }));
    }

    await fetchCsrfTokenWithRetry();
  };

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

        const tokenExpiry = extractTokenExpiry(token);
        if (tokenExpiry) {
          const timeUntilExpiry = tokenExpiry - Date.now();
          if (timeUntilExpiry > TOKEN_REFRESH_BUFFER) {
            scheduleTokenRefresh(timeUntilExpiry);
          } else if (timeUntilExpiry > 0) {
            if (DEBUG) console.log('Token about to expire, refreshing immediately');
            refreshToken();
          } else {
            if (DEBUG) console.log('Token expired, attempting refresh');
            refreshToken();
          }
        }
      } catch (error) {
        deleteCookie('token');
        deleteCookie('refresh_token');
        localStorage.removeItem('user');
        setAuth(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [setAuth]);

  useEffect(() => {
    const checkCsrfToken = async () => {
      if (auth.isAuthenticated && !auth.isLoading) {
        await fetchCsrfToken();
      }
    };

    checkCsrfToken();
  }, [auth.isAuthenticated, auth.isLoading]);

  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      sessionStorage.setItem('code_verifier', codeVerifier);

      const tokenResponse = await fetch(oauthTokenApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password_pkce',
          username: credentials.identifier,
          password: credentials.password,
          client_id: 'internal-client',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          scope: 'openid profile email',
        }),
      });

      if (!tokenResponse.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await tokenResponse.json();
          errorMessage = errorData.error_description || errorData.error || errorMessage;
        } catch (e) {
          switch (tokenResponse.status) {
            case 401:
              errorMessage = 'Invalid username or password';
              break;
            case 403:
              errorMessage = 'Account is locked or disabled';
              break;
            case 404:
              errorMessage = 'Login service not found';
              break;
            case 500:
              errorMessage = 'Server error, please try again later';
              break;
            default:
              errorMessage = `Login failed (${tokenResponse.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const tokenData = await tokenResponse.json();
      await handleTokenResponse(tokenData);

    } catch (error: any) {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.message || 'Login failed',
        type: 'error',
        duration: 5000,
      }]);
      throw error;
    }
  };

  const loginWithOAuth2 = (provider: 'google' | 'facebook', onSuccess?: () => void) => {
    try {
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const authUrl = `${authApiUrl}/oauth2/authorization/${provider}`;

      const popup = window.open(
        authUrl,
        'oauth2_login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup blocked! Please allow popups for this site.');
      }

      const messageHandler = async (event: MessageEvent) => {
        console.log('📨 Message received:', event.data);

        if (event.origin !== window.location.origin && event.origin !== authApiUrl && event.origin !== "http://localhost:8080" && event.origin !== "https://masemharuspex.com") {
          console.log('❌ Wrong origin:', event.origin);
          return;
        }

        if (event.data.type === 'OAUTH2_CODE') {
          console.log('✅ OAUTH2_CODE received, processing...');

          window.removeEventListener('message', messageHandler);

          const tokenData = {
            access_token: event.data.accessToken,
            token_type: 'Bearer'
          };

          console.log('🔑 Token data:', tokenData);

          await handleTokenResponse(tokenData);
          console.log('✅ handleTokenResponse completed');
          onSuccess?.();

        } else if (event.data.type === 'OAUTH2_ERROR') {
          console.log('OAUTH2_ERROR:', event.data.error);
          window.removeEventListener('message', messageHandler);
          setToasts(prev => [...prev, {
            id: Date.now().toString(),
            message: event.data.error || 'OAuth2 login failed',
            type: 'error',
            duration: 5000,
          }]);
        }
      };

      window.addEventListener('message', messageHandler);

    } catch (error: any) {
      console.log('OAUTH2_ERROR:', error.message);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.message || 'Failed to initiate OAuth2 login',
        type: 'error',
        duration: 5000,
      }]);
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await axiosInstance.post(`${authApiUrl}/register`, data);
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await login({
        identifier: variables.username,
        password: variables.password
      });
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
      console.log('Making keyboard update request for user:', userId);
      console.log('axiosInstance defaults:', axiosInstance.defaults.headers);
      const response = await axiosInstance.put(
        `${authApiUrl}/${userId}`,
        { preferredKeyboard: keyboard },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
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

  const logout = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    retryCountRef.current = 0;

    deleteCookie('token');
    deleteCookie('refresh_token');
    localStorage.removeItem('user');
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
      type: 'success',
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
