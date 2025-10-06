import api from "../../api/axiosInstance";

export const login = async (credentials: { username?: string; email?: string; password: string }) => {
  const res = await api.post("api/auth/login", credentials);
  return res.data;
};

export const register = async (data: { username: string; email: string; password: string }) => {
  const res = await api.post("api/auth/register", data);
  return res.data;
};