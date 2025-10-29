// Auth API - tách riêng domain auth
import { httpClient } from './httpClient';

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export const authApi = {
  // Đăng nhập
  login: (loginData: LoginData) =>
    httpClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    }),

  // Đăng ký
  register: (userData: Partial<User> & { password: string }) =>
    httpClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Xác nhận email/OTP
  confirmEmail: (token: string) =>
    httpClient<{ message: string }>(`/auth/confirm-email?token=${token}`, {
      method: 'GET',
    }),

  // Quên mật khẩu - gửi OTP
  forgotPassword: (data: ForgotPasswordData) =>
    httpClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Đặt lại mật khẩu
  resetPassword: (data: ResetPasswordData) =>
    httpClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Lấy thông tin user hiện tại
  getProfile: () =>
    httpClient<User>('/user/profile', {
      method: 'GET',
    }),

  // Cập nhật thông tin user
  updateProfile: (data: UpdateProfileData) =>
    httpClient<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Đổi mật khẩu
  changePassword: (data: ChangePasswordData) =>
    httpClient<{ message: string }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
