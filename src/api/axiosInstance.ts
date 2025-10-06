import axios from "axios";

const baseURL = import.meta.env.VITE_AUTH_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach JWT token if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response handler
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    // If token expired, you could handle refresh here later
    if (err.response?.status === 401) {
      console.warn("Unauthorized, redirecting to login...");
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;