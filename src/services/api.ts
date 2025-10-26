// Service layer để call API - tập trung tất cả API calls ở đây
import { authUtils } from '@/utils/auth';
import type { Car } from '@/types/car';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7200/api';

// Auth storage helpers
export type AuthUser = { userId: string; role: string; fullName: string };
type AuthData = { token: string; user: AuthUser };

const AUTH_STORAGE_KEY = 'evr_auth';

export function setAuthData(auth: AuthData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function getAuthData(): AuthData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function clearAuthData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Generic API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

// Generic fetch wrapper với error handling và authentication
export async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Lấy token từ authUtils
    const token = authUtils.getToken();
    
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API] Calling ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    console.log(`[API] Response status: ${response.status} ${response.statusText}`);

    // Nếu response là 401, có thể token đã hết hạn
    if (response.status === 401) {
      // Sử dụng authUtils để logout
      authUtils.logout();
      throw new Error('Unauthorized - Please login again');
    }

    // Lấy text trước để kiểm tra
    const text = await response.text();
    console.log(`[API] Response text (first 500 chars):`, text.substring(0, 500));
    console.log(`[API] Response full text length:`, text.length);

    // Kiểm tra nếu response rỗng
    if (!text || text.trim() === '') {
      if (response.ok) {
        console.log('[API] Empty response but status OK');
        return {
          success: true,
          message: 'Success'
        };
      } else {
        throw new Error(`HTTP error! status: ${response.status} - Empty response`);
      }
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
      console.log('[API] Parsed JSON data:', data);
    } catch (e) {
      console.warn('[API] Response is not JSON, text content:', text.substring(0, 300));
      
      // Nếu không phải JSON nhưng response OK (200-299), coi như success
      if (response.ok) {
        console.log('[API] Plain text response (success)');
        return {
          success: true,
          data: text as any,
          message: text
        };
      }
      
      // Nếu không OK và không phải JSON (có thể là HTML error page)
      console.error('[API] Failed to parse JSON for non-OK response');
      
      // Kiểm tra nếu là HTML error page
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`Server returned HTML error page (Status ${response.status}). Check if API URL is correct.`);
      }
      
      throw new Error(`Server error (Status ${response.status}): ${text.substring(0, 150)}`);
    }

    // Kiểm tra response status sau khi parse JSON
    if (!response.ok) {
      const errorMsg = data?.error || data?.message || data?.Message || `HTTP error! status: ${response.status}`;
      console.error('[API] Error response:', errorMsg, data);
      throw new Error(errorMsg);
    }

    // Wrap response để đảm bảo có field success
    return {
      success: true,
      data: data,
      message: data.message || data.Message || 'Success'
    };
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Cars API
export const carsApi = {
  // Lấy tất cả xe
  getAll: () => apiCall<Car[]>('/cars'),

  // Lấy xe theo ID
  getById: (id: string) => apiCall<Car>(`/cars/${id}`),

  // Tạo xe mới
  create: (carData: Partial<Car>) => 
    apiCall<Car>('/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    }),

  // Cập nhật xe
  update: (id: string, carData: Partial<Car>) =>
    apiCall<Car>(`/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    }),

  // Xóa xe
  delete: (id: string) =>
    apiCall(`/cars/${id}`, {
      method: 'DELETE',
    }),
};

// Booking API
export interface BookingData {
  carId: string;
  fullName: string;
  phone: string;
  email?: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  notes?: string;
}

export interface Booking extends BookingData {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalDays: number;
  createdAt: string;
}

export const bookingsApi = {
  // Tạo booking mới
  create: (bookingData: BookingData) =>
    apiCall<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  // Lấy danh sách bookings
  getAll: (filters?: { status?: string; carId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.carId) params.append('carId', filters.carId);
    
    const query = params.toString();
    return apiCall<Booking[]>(`/bookings${query ? `?${query}` : ''}`);
  },

  // Lấy đơn hàng của user hiện tại
  getMyBookings: (filters?: { status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return apiCall<Booking[]>(`/bookings/my-bookings${query ? `?${query}` : ''}`);
  },

  // Lấy chi tiết booking theo ID
  getById: (id: string) =>
    apiCall<Booking>(`/bookings/${id}`),

  // Hủy booking
  cancel: (id: string, reason?: string) =>
    apiCall<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Auth API
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
    apiCall<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    }),

  // Đăng ký
  register: (userData: Partial<User> & { password: string }) =>
    apiCall<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Xác nhận email/OTP
  confirmEmail: (token: string) =>
    apiCall<{ message: string }>(`/auth/confirm-email?token=${token}`, {
      method: 'GET',
    }),

  // Quên mật khẩu - gửi OTP
  forgotPassword: (data: ForgotPasswordData) =>
    apiCall<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Đặt lại mật khẩu
  resetPassword: (data: ResetPasswordData) =>
    apiCall<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Lấy thông tin user hiện tại
  getProfile: () =>
    apiCall<User>('/user/profile', {
      method: 'GET',
    }),

  // Cập nhật thông tin user
  updateProfile: (data: UpdateProfileData) =>
    apiCall<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Đổi mật khẩu
  changePassword: (data: ChangePasswordData) =>
    apiCall<{ message: string }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Đăng xuất
  logout: () => {
    authUtils.logout();
  },
};

// Rental Order API
export interface RentalOrderData {
  subTotal: number;
  total: number;
  discount: number;
  extraFee: number;
  userId: number;
  carId: number;
}

export interface RentalOrder extends RentalOrderData {
  id: number;
  status: number;
  orderDate: string;
  createdAt: string;
  updatedAt?: string;
}

export const rentalOrderApi = {
  // Tạo đơn hàng mới
  create: (orderData: RentalOrderData) =>
    apiCall<RentalOrder>('/RentalOrder', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  // Lấy đơn hàng theo ID
  getById: (id: number) =>
    apiCall<RentalOrder>(`/RentalOrder/${id}`),

  // Cập nhật trạng thái đơn hàng
  updateStatus: (id: number, status: number) =>
    apiCall<RentalOrder>(`/RentalOrder/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Lấy đơn hàng của user
  getByUserId: (userId: number) =>
    apiCall<RentalOrder[]>(`/RentalOrder/user/${userId}`),

  // Xóa đơn hàng
  delete: (id: number) =>
    apiCall(`/RentalOrder/${id}`, {
      method: 'DELETE',
    }),
};

// Export types
export type { ApiResponse };

