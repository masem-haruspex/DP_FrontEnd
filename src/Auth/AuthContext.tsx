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
import { generateCodeVerifier, generateCodeChallenge, generateRandomState } from '../lib/pkce';

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

// Fetch user info from token or userinfo endpoint
async function fetchUserInfo(accessToken: string): Promise<User> {
  try {
    // Try userinfo endpoint first
    const response = await fetch('http://localhost:8080/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      return {
        id: userInfo.user_id || userInfo.sub,
        username: userInfo.preferred_username || userInfo.username || userInfo.sub,
        email: userInfo.email,
        passwordHash: '', // Not needed from token
        provider: userInfo.provider,
        providerId: userInfo.provider_id,
        preferredKeyboard: userInfo.preferred_keyboard || 'Casio',
      };
    }
  } catch (error) {
    console.warn('Failed to fetch userinfo, decoding token instead:', error);
  }

  // Fallback: decode token directly
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      return {
        id: payload.user_id || payload.sub,
        username: payload.preferred_username || payload.username || payload.sub,
        email: payload.email,
        passwordHash: '',
        provider: payload.provider,
        providerId: payload.provider_id,
        preferredKeyboard: payload.preferred_keyboard || 'Casio',
      };
    }
  } catch (error) {
    console.error('Failed to decode token:', error);
  }

  throw new Error('Could not retrieve user information');
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

  // Traditional login using OAuth2 Password Grant
  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier for token exchange
      sessionStorage.setItem('code_verifier', codeVerifier);

      // Make OAuth2 token request with password grant
      const tokenResponse = await fetch(`${authApiUrl}/oauth2/token`, {
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
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error_description || errorData.error || 'Login failed');
      }

      const tokenData = await tokenResponse.json();

      // Process the token response
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

        // Use Spring Security's built-in OAuth2 endpoint
        const authUrl = `${authApiUrl}/oauth2/authorization/${provider}`;

        const popup = window.open(
            authUrl,
            'oauth2_login',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            throw new Error('Popup blocked! Please allow popups for this site.');
        }

        // Listen for message from popup
        const messageHandler = async (event: MessageEvent) => {
            console.log('📨 Message received:', event.data); // Add this line

          if (event.origin !== window.location.origin && event.origin !== "http://localhost:8080") {
        console.log('❌ Wrong origin:', event.origin);
        return;
    }

            if (event.data.type === 'OAUTH2_CODE') {
                      console.log('✅ OAUTH2_CODE received, processing...');

                window.removeEventListener('message', messageHandler);

                  // Use the token directly from backend
    const tokenData = {
        access_token: event.data.accessToken,
        token_type: 'Bearer'
    };

                      console.log('🔑 Token data:', tokenData);

    await handleTokenResponse(tokenData); // This will call fetchUserInfo
                      console.log('✅ handleTokenResponse completed');
              onSuccess?.();


                //// User is authenticated, now get a token using your existing password_pkce flow
                //const user = event.data.user;

                //// Generate PKCE parameters for token exchange
                //const codeVerifier = generateCodeVerifier();
                //const codeChallenge = await generateCodeChallenge(codeVerifier);
                //sessionStorage.setItem('code_verifier', codeVerifier);

                //// Get JWT token using password_pkce grant
                //const tokenResponse = await fetch(`${authApiUrl}/oauth2/token`, {
                //    method: 'POST',
                //    headers: {
                //        'Content-Type': 'application/x-www-form-urlencoded',
                //    },
                //    body: new URLSearchParams({
                //        grant_type: 'password_pkce',
                //        username: user.username,
                //        password: 'oauth-user', // Use a placeholder since OAuth users don't have passwords
                //        client_id: 'internal-client',
                //        code_challenge: codeChallenge,
                //        code_challenge_method: 'S256',
                //        scope: 'openid profile email',
                //    }),
                //});

                //if (tokenResponse.ok) {
                //    const tokenData = await tokenResponse.json();
                //    await handleTokenResponse(tokenData);
                //} else {
                //    throw new Error('Failed to get token after OAuth login');
                //}

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

  // Exchange authorization code for tokens
  const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    try {
      const response = await fetch(`${authApiUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: 'internal-client',
          code_verifier: codeVerifier,
          redirect_uri: `${baseURL}/oauth-callback`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
      }

      const tokenData = await response.json();
      await handleTokenResponse(tokenData);

    } catch (error: any) {
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: error.message || 'Failed to complete OAuth2 login',
        type: 'error',
        duration: 5000,
      }]);
      throw error;
    }
  };

  // Common token handling for both login types
  const handleTokenResponse = async (tokenData: any) => {
    if (DEBUG) console.log('Token received:', tokenData);

    const expiresInDays = rememberMe ? 365 : 0;
    setCookie('token', tokenData.access_token, expiresInDays);

    // Get user info from token
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

    setToasts(prev => [...prev, {
      id: Date.now().toString(),
      message: 'Login successful!',
      type: 'success',
      duration: 3000,
    }]);
  };

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await axiosInstance.post(`${authApiUrl}/api/auth/register`, data);
      return response.data;
    },
    onSuccess: async (_, variables) => {
      // After successful registration, automatically log the user in
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

  const logout = () => {
    deleteCookie('token');
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
