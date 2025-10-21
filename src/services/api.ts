// Service layer để call API - tập trung tất cả API calls ở đây
import { authUtils } from '@/utils/auth';
import type { Car } from '@/types/car';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027';

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
    console.log(`[API] Response text (first 200 chars):`, text.substring(0, 200));

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Nếu không phải JSON nhưng response OK (200-299), coi như success
      if (response.ok) {
        console.log('[API] Plain text response (success):', text);
        return {
          success: true,
          data: text as any,
          message: text
        };
      }
      // Nếu không OK và không phải JSON, throw error
      console.error('[API] Failed to parse JSON:', text);
      throw new Error(`Server error: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    // Wrap response để đảm bảo có field success
    return {
      success: true,
      data: data,
      message: data.message || data.Message
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
  getAll: () => apiCall<Car[]>('/api/cars'),

  // Lấy xe theo ID
  getById: (id: string) => apiCall<Car>(`/api/cars/${id}`),

  // Tạo xe mới
  create: (carData: Partial<Car>) => 
    apiCall<Car>('/api/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    }),

  // Cập nhật xe
  update: (id: string, carData: Partial<Car>) =>
    apiCall<Car>(`/api/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    }),

  // Xóa xe
  delete: (id: string) =>
    apiCall(`/api/cars/${id}`, {
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
    apiCall<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  // Lấy danh sách bookings
  getAll: (filters?: { status?: string; carId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.carId) params.append('carId', filters.carId);
    
    const query = params.toString();
    return apiCall<Booking[]>(`/api/bookings${query ? `?${query}` : ''}`);
  },
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
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  // Đăng nhập
  login: (loginData: LoginData) =>
    apiCall<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    }),

  // Đăng ký
  register: (userData: Partial<User> & { password: string }) =>
    apiCall<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Xác nhận email/OTP
  confirmEmail: (token: string) =>
    apiCall<{ message: string }>(`/api/auth/confirm-email?token=${token}`, {
      method: 'GET',
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
    apiCall<RentalOrder>('/api/RentalOrder', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  // Lấy đơn hàng theo ID
  getById: (id: number) =>
    apiCall<RentalOrder>(`/api/RentalOrder/${id}`),

  // Cập nhật trạng thái đơn hàng
  updateStatus: (id: number, status: number) =>
    apiCall<RentalOrder>(`/api/RentalOrder/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Lấy đơn hàng của user
  getByUserId: (userId: number) =>
    apiCall<RentalOrder[]>(`/api/RentalOrder/user/${userId}`),

  // Xóa đơn hàng
  delete: (id: number) =>
    apiCall(`/api/RentalOrder/${id}`, {
      method: 'DELETE',
    }),
};

// Export types
export type { ApiResponse };

