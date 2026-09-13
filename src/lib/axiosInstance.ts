// lib/axiosInstance.ts
import axios from 'axios';
import { getCookie, setCookie, deleteCookie } from './cookies';

const URL_BACKEND_AUTH = import.meta.env.VITE_URL_BACKEND_AUTH || 'http://localhost:8080';

const axiosInstance = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
	withCredentials: true,
});

const getCsrfToken = (): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; XSRF-TOKEN=`);
    if (parts.length === 2) {
        const token = parts.pop()!.split(';').shift()!;
        return decodeURIComponent(token);
    }
    return null;
};

const showToast = (toastData: { message: string; type: 'success' | 'error' | 'warning' | 'info'; submessage?: string; duration?: number }) => {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('show-toast', {
            detail: {
                id: Date.now().toString(),
                ...toastData
            }
        });
        window.dispatchEvent(event);
    }
};

const refreshCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(`${URL_BACKEND_AUTH}/csrf`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const csrfToken = getCsrfToken();
            console.log('CSRF token refreshed successfully');
            return csrfToken;
        }
    } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
    }
    return null;
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = getCookie('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      let csrfToken = getCsrfToken();
      if (!csrfToken) 
        csrfToken = await refreshCsrfToken();
      if (csrfToken)
        config.headers['X-XSRF-TOKEN'] = csrfToken;
    }

    config.withCredentials = true;
    return config;
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (t:string)=>void, reject: (e:any)=>void }> = [];

const processQueue = (token: string|null, error: any) => {
  failedQueue.forEach(p => token ? p.resolve(token) : p.reject(error));
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;

    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((res, rej) => {
          failedQueue.push({ resolve: (t) => { orig.headers.Authorization='Bearer '+t; res(axiosInstance(orig)); }, reject: rej });
        });
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        const rt = getCookie('refresh_token');
        if (!rt) throw 'no refresh';

        const { data } = await axios.post(
          `${import.meta.env.VITE_AUTH_API_BASE_URL}/oauth2/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: rt,
            client_id: 'internal-client',
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, withCredentials: true }
        );

        const { access_token, refresh_token } = data;
        setCookie('token', access_token, 0);          
        if (refresh_token) setCookie('refresh_token', refresh_token, 365);

        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        processQueue(access_token, null);
        return axiosInstance(orig);

      } catch (refreshError) {
        processQueue(null, refreshError);
        deleteCookie('token');
        deleteCookie('refresh_token');
        localStorage.removeItem('user');
		  showToast({ message: "Login needed now", type: "error" });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
