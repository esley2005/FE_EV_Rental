// Auth API - tách riêng domain auth
import { httpClient } from './httpClient';
import { authUtils } from '@/utils/auth';

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
  userId?: number; // Optional userId, sẽ lấy từ localStorage nếu không có
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  userId?: number; // Optional userId, sẽ lấy từ localStorage nếu không có
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
  updateProfile: async (data: UpdateProfileData) => {
    // Backend yêu cầu endpoint /User/UpdateCustomerName với userId và fullName
    // Lấy userId từ data hoặc localStorage
    let userId: number | undefined = data.userId;
    
    // Nếu không có trong data, thử lấy từ localStorage
    if (!userId) {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userId = userData.id || userData.userId;
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    // Nếu vẫn không có userId, trả về lỗi
    if (!userId) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.'
      };
    }
    
    // Format dữ liệu theo yêu cầu backend: { userId, fullName }
    const requestData = {
      userId: userId,
      fullName: data.fullName || ''
    };
    
    // Gọi endpoint đúng theo Swagger: PUT /User/UpdateCustomerName
    const response = await httpClient<User>('/User/UpdateCustomerName', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
    
    return response;
  },

  // Đổi mật khẩu
  changePassword: async (data: ChangePasswordData) => {
    // Backend yêu cầu endpoint /User/UpdateCustomerPassword với userId, oldPassword, newPassword
    // Lấy userId từ data hoặc localStorage
    let userId: number | undefined = data.userId;
    
    // Nếu không có trong data, thử lấy từ localStorage
    if (!userId) {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userId = userData.id || userData.userId;
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    // Nếu vẫn không có userId, trả về lỗi
    if (!userId) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.'
      };
    }
    
    // Format dữ liệu theo yêu cầu backend: { userId, oldPassword, newPassword }
    const requestData = {
      userId: userId,
      oldPassword: data.oldPassword,
      newPassword: data.newPassword
    };
    
    // Gọi endpoint đúng theo Swagger: PUT /User/UpdateCustomerPassword
    console.log('[ChangePassword] Request data:', requestData);
    const response = await httpClient<{ message: string }>('/User/UpdateCustomerPassword', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
    console.log('[ChangePassword] Response:', response);
    
    return response;
  },
};
