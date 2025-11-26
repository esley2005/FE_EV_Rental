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
  getProfile: async () => {
    // Lấy userId từ localStorage
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let userId: number | null = null;
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        userId = userData.id || userData.userId;
      } catch (e) {
        // Ignore
      }
    }
    
    // Sử dụng endpoint GetById nếu có userId
    if (userId) {
      return httpClient<User>(`/User/GetById?id=${userId}`, {
        method: 'GET',
      });
    }
    
    // Fallback về localStorage nếu không có userId
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        return Promise.resolve({
          success: true,
          data: userData as User,
        });
      } catch (e) {
        // Ignore
      }
    }
    
    return Promise.resolve({
      success: false,
      error: 'User not found',
    });
  },

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
    
    // Nếu không có trong data, thử lấy từ localStorage với nhiều field name khác nhau
    if (!userId) {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          // Thử nhiều field name khác nhau để tương thích với nhiều format
          userId = userData.id || userData.userId || userData.Id || userData.UserId;
          
          // Nếu vẫn không có, thử convert sang number nếu là string
          if (!userId && (userData.id || userData.userId || userData.Id || userData.UserId)) {
            const idValue = userData.id || userData.userId || userData.Id || userData.UserId;
            userId = typeof idValue === 'string' ? parseInt(idValue, 10) : idValue;
            if (isNaN(userId as number)) {
              userId = undefined;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    // Nếu vẫn không có userId, thử lấy từ token hoặc gọi getProfile
    if (!userId) {
      try {
        const profileResponse = await authApi.getProfile();
        if (profileResponse.success && 'data' in profileResponse && profileResponse.data) {
          const profileData = profileResponse.data;
          userId = profileData.id || (profileData as any).userId || (profileData as any).Id || (profileData as any).UserId;
        }
      } catch (e) {
        console.error('Error getting userId from getProfile:', e);
      }
    }
    
    // Nếu vẫn không có userId, trả về lỗi
    if (!userId || userId === 0) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.'
      };
    }
    
    // Format dữ liệu theo yêu cầu backend: { userId, oldPassword, newPassword }
    const requestData = {
      userId: Number(userId), // Đảm bảo là number
      oldPassword: data.oldPassword,
      newPassword: data.newPassword
    };
    
    // Gọi endpoint đúng theo Swagger: PUT /User/UpdateCustomerPassword
    console.log('[ChangePassword] Request data:', {
      userId: requestData.userId,
      oldPasswordLength: requestData.oldPassword.length,
      newPasswordLength: requestData.newPassword.length
    });
    const response = await httpClient<{ message: string }>('/User/UpdateCustomerPassword', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
    console.log('[ChangePassword] Response:', response);
    
    return response;
  },
};
