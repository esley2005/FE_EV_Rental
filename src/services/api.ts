/* eslint-disable no-console */
// Service layer để call API - tập trung tất cả API calls ở đây
import { authUtils } from '@/utils/auth';
import type { Car } from '@/types/car';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7200/api';

// Lightweight logger: only logs in development to avoid eslint no-console in prod
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  },
};

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
  logger.log(`[API] Calling ${options.method || 'GET'} ${url}`);
    
    // Build headers conditionally to avoid triggering unnecessary CORS preflight (405 on OPTIONS)
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    // Only set Content-Type when we actually send a body (POST/PUT/PATCH) and it's not FormData
    const hasBody = typeof options.body !== 'undefined' && options.body !== null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (hasBody && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization only if token exists
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

  logger.log(`[API] Response status: ${response.status} ${response.statusText}`);

    // Xử lý 204 No Content (DELETE, PUT thành công nhưng không có body)
    if (response.status === 204) {
  logger.log('[API] 204 No Content - operation successful');
      return {
        success: true,
        message: 'Operation completed successfully'
      };
    }

    // Xử lý 404 Not Found
    if (response.status === 404) {
  logger.error(`[API] ❌ 404 Not Found: ${url}`);
      return {
        success: false,
        error: `Endpoint not found: ${endpoint}`
      };
    }

    // Nếu response là 401, có thể token đã hết hạn
    if (response.status === 401) {
      // Chỉ logout nếu user đã đăng nhập
      if (authUtils.isAuthenticated()) {
  logger.warn('[API] Token expired, logging out...');
        authUtils.logout();
      }
      return {
        success: false,
        error: 'Unauthorized - Please login again'
      };
    }

    // Lấy text trước để kiểm tra
    const text = await response.text();
  logger.log(`[API] Response text (first 500 chars):`, text.substring(0, 500));
  logger.log(`[API] Response full text length:`, text.length);

    // Kiểm tra nếu response rỗng
    if (!text || text.trim() === '') {
      if (response.ok) {
  logger.log('[API] Empty response but status OK - treating as success');
        return {
          success: true,
          message: 'Operation completed successfully'
        };
      } else {
  logger.error(`[API] Empty response with error status: ${response.status}`);
        return {
          success: false,
          error: `HTTP error! status: ${response.status} - Empty response`
        };
      }
    }


    let data;
    try {
      data = JSON.parse(text);
  logger.log('[API] Parsed JSON data:', data);
    } catch (e) {
  logger.warn('[API] Response is not JSON, text content:', text.substring(0, 300));
      
      // check nếu repo ok thì return success
      if (response.ok) {
  logger.log('[API] Plain text response (success)');
        return {
          success: true,
          data: text as any,
          message: text
        };
      }
      
  
  logger.error('[API] Failed to parse JSON for non-OK response');
      
      // Kiểm tra nếu là HTML error page
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        logger.error('[API] Server returned HTML error page - API server might be down or URL incorrect');
        return {
          success: false,
          error: `API server không khả dụng. Vui lòng kiểm tra lại kết nối hoặc liên hệ quản trị viên. (Status: ${response.status})`
        };
      }
      
   
      return {
        success: false,
        error: `Lỗi server (Status ${response.status}): ${text.substring(0, 150)}`
      };
    }

    if (!response.ok) {
      // Xử lý validation errors (400)
      if (response.status === 400 && data?.errors) {
  logger.error('[API] ❌ Validation Errors:', data.errors);
        const validationErrors = Object.entries(data.errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join(' | ');
  logger.error('[API] Validation details:', validationErrors);
        
        return {
          success: false,
          error: `Validation error: ${validationErrors}`
        };
      }
      
      const errorMsg = data?.error || data?.message || data?.Message || data?.title || `HTTP error! status: ${response.status}`;
  logger.error('[API] Error response:', errorMsg, data);
      return {
        success: false,
        error: errorMsg
      };
    }

    // Wrap response để đảm bảo có field success
    return {
      success: true,
      data: data,
      message: data.message || data.Message || 'Success'
    };
  } catch (error) {
  logger.error(`API call failed for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Cars API
export const carsApi = {
  // Lấy tất cả xe
  getAll: () => apiCall<Car[]>('/Car'),

  // Lấy danh sách xe thuê nhiều nhất
  getTopRented: (topCount: number = 6) =>
    apiCall<Car[]>(`/Car/TopRented?topCount=${encodeURIComponent(topCount)}`),

  // Lấy xe theo ID
  getById: (id: string) => apiCall<Car>(`/Car/${id}`),

  // Tạo xe mới
  create: (carData: Partial<Car>) => 
    apiCall<Car>('/Car', {
      method: 'POST',
      body: JSON.stringify(carData),
    }),

  // Cập nhật xe
  update: (id: number | string, carData: Partial<Car>) =>
    apiCall<Car>(`/Car/${id}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    }),

  // Xóa xe
  delete: (id: number | string) =>
    apiCall(`/Car/${id}`, {
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

