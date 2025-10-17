import api from "@/app/api/axiosClient";

export interface LoginResponse {
  Token: string;
  UserId: number;
  Role: string;
  FullName: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/api/Auth/login', { Email: email, Password: password });
  return res.data;
};

export const register = async (email: string, password: string, fullName: string) => {
  const res = await api.post('/api/Auth/register', { Email: email, Password: password, FullName: fullName });
  return res.data;
};

export const confirmEmail = async (token: string) => {
  const res = await api.get(`/api/Auth/confirm-email?token=${encodeURIComponent(token)}`);
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post('/api/Auth/forgot-password', { Email: email });
  return res.data;
};

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const res = await api.post('/api/Auth/reset-password', { Email: email, OTP: otp, NewPassword: newPassword });
  return res.data;
};

export default { login, register, confirmEmail, forgotPassword, resetPassword };
