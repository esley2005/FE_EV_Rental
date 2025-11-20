/* eslint-disable no-console */
// Service layer để call API - tập trung tất cả API calls ở đây
import { authUtils } from '@/utils/auth';
import type { Car } from '@/types/car';

// Backend có thể chạy trên HTTPS (7200) hoặc HTTP (5027)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7200/api';
const API_BASE_URL_HTTP = process.env.NEXT_PUBLIC_API_URL_HTTP || 'http://localhost:5027/api';

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
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  try {
    const { skipAuth, ...fetchOptions } = options;
    
    // Thử HTTPS trước, nếu fail thì thử HTTP
    let url = `${API_BASE_URL}${endpoint}`;
    let useHttp = false;
    
  logger.log(`[API] Calling ${fetchOptions.method || 'GET'} ${url}${skipAuth ? ' (no auth - public endpoint)' : ''}`);
    
    // Build headers conditionally to avoid triggering unnecessary CORS preflight (405 on OPTIONS)
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };

    // Only set Content-Type when we actually send a body (POST/PUT/PATCH) and it's not FormData
    const hasBody = typeof fetchOptions.body !== 'undefined' && fetchOptions.body !== null;
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    if (hasBody && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // CHỈ THÊM TOKEN KHI KHÔNG PHẢI PUBLIC ENDPOINT
    // Nếu skipAuth = true, đảm bảo KHÔNG có Authorization header
    if (skipAuth) {
      // Xóa bỏ Authorization header nếu có (từ options.headers)
      delete headers['Authorization'];
      delete headers['authorization'];
    } else {
      // Chỉ thêm token khi không phải public endpoint
      const token = authUtils.getToken();
      if (token && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    } catch (fetchError: any) {
      // Nếu HTTPS fail với connection error, thử HTTP
      if ((fetchError.message?.includes('Failed to fetch') || 
           fetchError.message?.includes('ERR_CONNECTION_REFUSED') ||
           fetchError.message?.includes('NetworkError')) &&
          url.startsWith('https://') && !useHttp) {
        logger.warn(`[API] HTTPS failed, trying HTTP fallback...`);
        url = `${API_BASE_URL_HTTP}${endpoint}`;
        useHttp = true;
        try {
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } catch (httpError) {
          logger.error(`[API] Both HTTPS and HTTP failed for ${endpoint}`);
          return {
            success: false,
            error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem backend server đã chạy chưa (https://localhost:7200 hoặc http://localhost:5027)'
          };
        }
      } else {
        throw fetchError;
      }
    }

  logger.log(`[API] Response status: ${response.status} ${response.statusText}${useHttp ? ' (via HTTP fallback)' : ''}`);

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

    // Xử lý 405 Method Not Allowed - endpoint có thể không tồn tại hoặc không hỗ trợ method này
    // Không log error vì đây là expected behavior khi endpoint không tồn tại
    if (response.status === 405) {
  logger.warn(`[API] ⚠️ 405 Method Not Allowed: ${endpoint} - endpoint may not exist, treating as non-critical`);
      return {
        success: false,
        error: `Method not allowed: ${endpoint}`
      };
    }

    // Nếu response là 401, có thể token đã hết hạn
    if (response.status === 401) {
      // Nếu là public endpoint (skipAuth), thử lại không có token
      if (skipAuth) {
        logger.warn(`[API] 401 on public endpoint ${endpoint}, retrying without token...`);
        
        // Tạo lại request hoàn toàn không có token
        const cleanHeaders: Record<string, string> = {
          ...(fetchOptions.headers as Record<string, string> | undefined),
        };
        
        // Remove Authorization header nếu có (cả chữ hoa và chữ thường)
        delete cleanHeaders['Authorization'];
        delete cleanHeaders['authorization'];
        delete cleanHeaders['AUTHORIZATION'];
        
        logger.log(`[API] Retrying ${endpoint} with headers:`, Object.keys(cleanHeaders));
        
        // Retry request không có token
        try {
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: cleanHeaders,
          });
          
          logger.log(`[API] Retry response status: ${retryResponse.status} ${retryResponse.statusText}`);
          
          // Nếu retry thành công, xử lý như response bình thường
          if (retryResponse.ok) {
            const retryText = await retryResponse.text();
            logger.log(`[API] Retry response text length: ${retryText.length}`);
            
            if (!retryText || retryText.trim() === '') {
              return {
                success: true,
                message: 'Operation completed successfully'
              };
            }
            
            try {
              const retryData = JSON.parse(retryText);
              logger.log(`[API] Retry successful, data type:`, Array.isArray(retryData) ? 'array' : typeof retryData);
              return {
                success: true,
                data: retryData,
                message: retryData.message || retryData.Message || 'Success'
              };
            } catch (e) {
              logger.error('[API] Failed to parse retry response:', e);
              return {
                success: true,
                data: retryText as any,
                message: retryText
              };
            }
          } else {
            logger.warn(`[API] Retry still failed with status ${retryResponse.status}`);
          }
        } catch (retryError) {
          logger.error('[API] Retry failed with exception:', retryError);
        }
      }
      
      // Chỉ logout nếu user đã đăng nhập VÀ không phải public endpoint
      if (!skipAuth && authUtils.isAuthenticated()) {
  logger.warn('[API] Token expired, logging out...');
        authUtils.logout();
      }
      
      // Nếu là public endpoint sau khi retry vẫn fail
      if (skipAuth) {
        // Đọc body để xem có data không (một số backend trả về data kèm 401)
        try {
          // Clone response để có thể đọc lại body
          const clonedResponse = response.clone();
          const bodyText = await clonedResponse.text();
          logger.warn(`[API] Public endpoint ${endpoint} 401, body length: ${bodyText.length}`);
          
          // Nếu có body và là JSON hợp lệ, thử parse
          if (bodyText && bodyText.trim() && !bodyText.includes('<!DOCTYPE') && !bodyText.includes('<html')) {
            try {
              const bodyData = JSON.parse(bodyText);
              // Nếu có data trong body dù là 401, có thể backend vẫn trả về data
              if (bodyData && (Array.isArray(bodyData) || bodyData.$values || (typeof bodyData === 'object' && Object.keys(bodyData).length > 0))) {
                logger.warn(`[API] 401 but has data in body, returning data anyway`);
                return {
                  success: true,
                  data: bodyData,
                  message: 'Data retrieved despite 401 status'
                };
              }
            } catch (e) {
              // Không phải JSON hợp lệ, bỏ qua
            }
          }
        } catch (e) {
          logger.error('[API] Failed to read 401 response body:', e);
        }
        
        // Nếu không có data trong body, trả về error
        logger.warn(`[API] Public endpoint ${endpoint} requires auth, returning error`);
        return {
          success: false,
          error: 'Endpoint này yêu cầu đăng nhập. Vui lòng đăng nhập để xem danh sách xe.',
          data: [] as T
        };
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
        // 405 đã được xử lý ở trên, không log error lại
        if (response.status === 405) {
          return {
            success: false,
            error: `Method not allowed: ${endpoint}`
          };
        }
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
    // Backend C# có thể trả về nhiều format:
    // 1. { isSuccess: true, data: {...} } hoặc { isSuccess: true, data: { $values: [...] } }
    // 2. { message: '...', data: { $id: '...', $values: [...] } }
    // 3. Trực tiếp array hoặc object
    // Nên cần extract data từ response.data hoặc response.isSuccess
    
    // Kiểm tra isSuccess nếu có
    if (data?.isSuccess === false) {
      logger.error('[API] Backend returned isSuccess: false', data);
      return {
        success: false,
        error: data.message || data.Message || 'Request failed',
        data: data.data
      };
    }
    
    // Extract data từ nhiều format
    let responseData = data;
    if (data?.data !== undefined) {
      // Format: { isSuccess: true, data: {...} } hoặc { data: {...} }
      responseData = data.data;
    }
    
    logger.log(`[API] Response data structure:`, {
      hasData: !!data,
      hasDataData: !!data?.data,
      isSuccess: data?.isSuccess,
      dataType: typeof data,
      dataDataType: typeof data?.data,
      isArray: Array.isArray(responseData),
      hasValues: !!(responseData as any)?.$values,
      valuesLength: Array.isArray((responseData as any)?.$values) ? (responseData as any).$values.length : 0
    });
    
    return {
      success: true,
      data: responseData,
      message: data.message || data.Message || 'Success'
    };
  } catch (error) {
  logger.error(`API call failed for ${endpoint}:`, error);
    
    // Xử lý các loại lỗi connection
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed')) {
      return {
        success: false,
        error: 'Không thể kết nối đến máy chủ. Vui lòng đảm bảo backend server đang chạy:\n' +
               '- HTTPS: https://localhost:7200\n' +
               '- HTTP: http://localhost:5027\n' +
               'Hoặc kiểm tra biến môi trường NEXT_PUBLIC_API_URL'
      };
    }
    
    return {
      success: false,
      error: errorMessage || 'Unknown error occurred'
    };
  }
}

// Cars API
export const carsApi = {
  // Lấy tất cả xe (public endpoint - đã được AllowAnonymous ở backend)
  getAll: () => apiCall<Car[]>('/Car', { skipAuth: true }),

  // Lấy xe theo ID - backend không có endpoint này, sẽ lấy từ danh sách
  getById: async (id: string) => {
    // Backend không có endpoint /Car/{id}, nên lấy từ danh sách và filter
    const response = await apiCall<Car[]>('/Car', { skipAuth: true });
    if (response.success && response.data) {
      const carsData = (response.data as any)?.$values || response.data || [];
      const carId = parseInt(id);
      const car = Array.isArray(carsData) 
        ? carsData.find((c: Car) => c.id === carId)
        : null;
      
      if (car) {
        return {
          success: true,
          data: car,
          message: 'Car found'
        };
      }
      return {
        success: false,
        error: 'Car not found'
      };
    }
    return response;
  },

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

export interface RentalLocation {
  id: number;
  name: string;
  address?: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string; // Customer, Staff, Admin
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  avatar?: string;
  driverLicenseStatus?: number; // 0 = chưa cập nhật/chưa xác thực, 1 = đã xác thực, 2 = bị từ chối
  citizenIdStatus?: number; // 0 = chưa cập nhật/chưa xác thực, 1 = đã xác thực, 2 = bị từ chối
  isEmailConfirmed?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  locationId?: number; // ID của điểm thuê (legacy field)
  rentalLocationId?: number; // ID của điểm thuê
  rentalLocation?: RentalLocation; // Navigation property
  // Collection counts (optional, may be included in API response)
  feedbackCount?: number;
  rentalOrdersCount?: number;
  paymentsCount?: number;
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
  avatar?: string;
  userId?: number; // Optional userId, sẽ lấy từ localStorage nếu không có
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  userId?: number; // Optional userId, sẽ lấy từ localStorage nếu không có
}

// Driver License API
export interface DriverLicenseData {
  id?: number;
  name: string;
  licenseNumber?: string;
  imageUrl: string; // Mặt trước
  imageUrl2?: string; // Mặt sau
  rentalOrderId?: number | null;
  status?: string; // Pending, Approved, Rejected hoặc 0, 1, 2
  createdAt?: string;
  updatedAt?: string;
}

// Citizen ID API
export interface CitizenIdData {
  id?: number;
  name: string;
  citizenIdNumber: string;
  birthDate: string; // YYYY-MM-DD format
  imageUrl: string; // Mặt trước
  imageUrl2?: string; // Mặt sau
  rentalOrderId?: number | null;
  status?: string; // Pending, Approved, Rejected hoặc 0, 1, 2
  createdAt?: string;
  updatedAt?: string;
}
// Feedback API
export interface FeedbackData {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  userFullName: string;
  rentalOrderId: number;
  userId?: number;
  carId?: number;
}

export const feedbackApi = {
  // Lấy tất cả feedback
  getAll: () =>
    apiCall<{ $values: FeedbackData[] }>("/Feedback/GetAll", {
      method: "GET",
      skipAuth: true, // Nếu public, không cần token
    }),

  // Lấy feedback theo ID
  getById: async (id: number) => {
    const res = await feedbackApi.getAll();
    if (res.success && res.data?.$values) {
      const fb = res.data.$values.find((f) => f.id === id);
      if (fb) {
        return { success: true, data: fb };
      } else {
        return { success: false, error: "Feedback not found" };
      }
    }
    return res;
  },

  // Tạo feedback mới
  create: (feedback: Partial<FeedbackData>) =>
    apiCall<FeedbackData>("/Feedback/Create", {
      method: "POST",
      body: JSON.stringify(feedback),
    }),

  // Cập nhật feedback
  update: (feedback: Partial<FeedbackData>) =>
    apiCall<FeedbackData>("/Feedback/Update", {
      method: "PUT",
      body: JSON.stringify(feedback),
    }),

  // Xóa feedback
  delete: (id: number) =>
    apiCall(`/Feedback/Delete/${id}`, {
      method: "DELETE",
    }),
};

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

  // Lấy tất cả user (khách hàng) từ hệ thống auth
  getAllUsers: async () => {
    const candidates = [
      '/User', 
      // '/users', 
      // '/user/all',
      //  '/auth/users',
      // '/User', '/User/all', 
      // '/User/GetAll', 
      // '/User/List'
    ];
    for (const ep of candidates) {
      const res = await apiCall<any>(ep, { method: 'GET' });
      const raw = (res as any)?.data ?? res;
      // Unwrap common server response shapes
      const data = raw?.data ?? raw; // supports { isSuccess, data } or direct array
      const values = data?.$values ?? data?.data?.$values; // supports .data.$values
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(values)
        ? values
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : null;
      if (arr) {
        // Normalize field names to match User type
        const normalized = (arr as any[]).map((u) => ({
          id: u.userId ?? u.id,
          email: u.email,
          fullName: u.fullName ?? u.name,
          role: u.role ?? 'Customer',
          phone: u.phone ?? u.phoneNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId,
          rentalLocationId: u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId,
        })) as User[];
        return { success: true, data: normalized } as ApiResponse<User[]>;
      }
    }
    return { success: true, data: [] } as ApiResponse<User[]>;
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
    return await apiCall<User>('/User/UpdateCustomerName', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  },

  // Đổi mật khẩu
  changePassword: async (data: ChangePasswordData) => {
    // Backend yêu cầu endpoint /User/UpdateCustomerPassword với userId, oldPassword, newPassword
    // Lấy userId từ localStorage
    let userId: number | undefined;
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        userId = userData.id;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    
    // Nếu không có userId, trả về lỗi
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
    return await apiCall<{ message: string }>('/User/UpdateCustomerPassword', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  },

  // Đăng xuất
  logout: () => {
    authUtils.logout();
  },
};

// Driver License API
export const driverLicenseApi = {
  // Upload/Create driver license
  upload: (data: DriverLicenseData) => {
    // Backend requires RentalOrderId as int (not nullable)
    // Convert to PascalCase to match backend DTO
    const createData = {
      Name: data.name,
      LicenseNumber: data.licenseNumber || '',
      ImageUrl: data.imageUrl || '',
      ImageUrl2: data.imageUrl2 || '',
      RentalOrderId: data.rentalOrderId || 0, // Use 0 if no order yet
    };
    
    return apiCall<{ message: string }>('/DriverLicense/Create', {
      method: 'POST',
      body: JSON.stringify(createData),
    });
  },

  // Update driver license info
  update: (data: DriverLicenseData & { id: number }) => {
    // Backend expects [FromForm] for UpdateInfo, so we need to send FormData
    const formData = new FormData();
    formData.append('Id', data.id.toString());
    formData.append('Name', data.name);
    if (data.licenseNumber) formData.append('LicenseNumber', data.licenseNumber);
    if (data.imageUrl) formData.append('ImageUrl', data.imageUrl);
    if (data.imageUrl2) formData.append('ImageUrl2', data.imageUrl2);
    
    return apiCall<{ message: string }>('/DriverLicense/UpdateDriverLicenseInfo', {
      method: 'PUT',
      body: formData,
      // Don't set headers - apiCall will handle FormData correctly
    });
  },

  // Get current user's driver license
  getCurrent: () =>
    apiCall<DriverLicenseData>('/DriverLicense/GetById', {
      method: 'GET',
    }),

  // Get all driver licenses (Admin/Staff only)
  getAll: () =>
    apiCall<DriverLicenseData[]>('/DriverLicense/GetAll', {
      method: 'GET',
    }),

  // Update driver license status (Admin/Staff only)
  // Status: 0 = Pending, 1 = Approved, 2 = Rejected
  updateStatus: (driverLicenseId: number, status: 0 | 1 | 2) => {
    const formData = new FormData();
    formData.append('DriverLicenseId', driverLicenseId.toString());
    formData.append('Status', status.toString());
    
    return apiCall<{ message: string }>('/DriverLicense/UpdateDriverLicenseStatus', {
      method: 'PUT',
      body: formData,
    });
  },
};

// Citizen ID API
export const citizenIdApi = {
  // Upload/Create citizen ID
  upload: (data: CitizenIdData) => {
    // Backend requires RentalOrderId as int (not nullable)
    // Convert to PascalCase to match backend DTO
    const createData = {
      Name: data.name,
      CitizenIdNumber: data.citizenIdNumber,
      BirthDate: data.birthDate, // YYYY-MM-DD format
      ImageUrl: data.imageUrl || '',
      ImageUrl2: data.imageUrl2 || '',
      RentalOrderId: data.rentalOrderId ?? 0, 
    };
    
    return apiCall<{ message: string }>('/CitizenId/Create', {
      method: 'POST',
      body: JSON.stringify(createData),
    });
  },

  // Update citizen ID info
  update: (data: CitizenIdData & { id: number }) => {

    const updateData = {
      Id: data.id,
      Name: data.name,
      CitizenIdNumber: data.citizenIdNumber,
      BirthDate: data.birthDate,
      ImageUrl: data.imageUrl,
      ImageUrl2: data.imageUrl2 || '',
    };
    
    return apiCall<{ message: string }>('/CitizenId/UpdateCitizenIdInfo', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // Get current user's citizen ID
  getCurrent: () =>
    apiCall<CitizenIdData>('/CitizenId/GetById', {
      method: 'GET',
    }),

  // Get all citizen IDs (Admin/Staff only)
  getAll: () =>
    apiCall<CitizenIdData[]>('/CitizenId/GetAll', {
      method: 'GET',
    }),

  // Update citizen ID status (Admin/Staff only)
  // Status: 0 = Pending, 1 = Approved, 2 = Rejected
  updateStatus: (citizenIdId: number, status: 0 | 1 | 2) => {
    const formData = new FormData();
    formData.append('CitizenIdId', citizenIdId.toString());
    formData.append('Status', status.toString());
    
    return apiCall<{ message: string }>('/CitizenId/UpdateCitizenIdStatus', {
      method: 'PUT',
      body: formData,
    });
  },
};

// Rental Location API
export interface RentalLocationData {
  id: number;
  name: string;
  address: string;
  coordinates: string;
  isActive: boolean;
}

export const rentalLocationApi = {
  // Lấy tất cả địa điểm cho thuê
  getAll: () =>
    apiCall<RentalLocationData[]>('/RentalLocation/GetAll', {
      method: 'GET',
      skipAuth: true, // Có thể public
    }),

  // Lấy địa điểm cho thuê theo ID
  getById: (id: number | string) =>
    apiCall<RentalLocationData>(`/RentalLocation/GetById?id=${id}`, {
      method: 'GET',
      skipAuth: true, // Public endpoint - không cần auth
    }),

  // Lấy tất cả nhân viên theo locationId
  getAllStaffByLocationId: (locationId: number) =>
    apiCall<User[]>(`/RentalLocation/GetAllStaffByLocationId?locationId=${locationId}`, {
      method: 'GET',
    }),
};
// Payment API
export interface PaymentData {
  id: number;
  userId: number;
  rentalOrderId?: number;
  amount: number;
  paymentDate: string;
  status: string; // Pending, Completed, Cancelled
  rentalLocationId?: number;
  rentalLocationName?: string;
}

// Payment API
export interface RevenueByLocationData {
  rentalLocationId: number;
  rentalLocationName: string;
  totalRevenue: number;
  totalOrders: number;
}

export interface CreatePaymentDTO {
  userId: number;
  rentalOrderId: number;
  amount: number;
  status: string;
  rentalLocationId?: number;
}

export interface UpdatePaymentStatusDTO {
  paymentId: number;
  status: string;
}
// Car Rental Location API
export interface CarRentalLocationData {
  id: number;
  carId: number;
  locationId: number;
  quantity: number;
}

export interface CreateCarRentalLocationData {
  carId: number;
  locationId: number;
  quantity: number;
}

export const carRentalLocationApi = {
  // Tạo mới quan hệ xe - địa điểm
  create: (data: CreateCarRentalLocationData) =>
    apiCall<CarRentalLocationData>('/CarRentalLocation/Create', {
      method: 'POST',
      body: JSON.stringify({
        CarId: data.carId,
        LocationId: data.locationId,
        Quantity: data.quantity,
      }),
    }),

  // Lấy danh sách theo carId (nếu cần)
  getByCarId: (carId: number) =>
    apiCall<CarRentalLocationData[]>(`/CarRentalLocation/GetByCarId?carId=${carId}`, {
      method: 'GET',
    }),

  // Xóa quan hệ xe - địa điểm
  delete: (id: number) =>
    apiCall(`/CarRentalLocation/${id}`, {
      method: 'DELETE',
    }),

  // Xóa quan hệ theo carId và locationId
  deleteByCarAndLocation: (carId: number, locationId: number) =>
    apiCall(`/CarRentalLocation/DeleteByCarAndLocation?carId=${carId}&locationId=${locationId}`, {
      method: 'DELETE',
    }),
};

// Rental Order API
export interface CreateRentalOrderData {
  phoneNumber: string;
  pickupTime: string; 
  expectedReturnTime: string; 
  withDriver: boolean;
  userId: number;
  carId: number;
  rentalLocationId: number;
}

export interface RentalOrderData {
  id: number;
  phoneNumber: string;
  orderDate: string;
  pickupTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  subTotal?: number;
  deposit?: number;
  total?: number;
  discount?: number;
  extraFee?: number;
  damageFee?: number;
  damageNotes?: string;
  withDriver: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  userId: number;
  carId: number;
  rentalLocationId: number;
  rentalContactId?: number;
  citizenId?: number;
  driverLicenseId?: number;
  paymentId?: number;
}

export const rentalOrderApi = {
  // Lấy tất cả đơn hàng (Admin/Staff only)
  getAll: () =>
    apiCall<RentalOrderData[]>('/RentalOrder/GetAll', {
      method: 'GET',
    }),

  // Tạo đơn hàng mới
  create: (orderData: CreateRentalOrderData) =>
    apiCall<RentalOrderData>('/RentalOrder/Create', {
      method: 'POST',
      body: JSON.stringify({
        PhoneNumber: orderData.phoneNumber,
        PickupTime: orderData.pickupTime,
        ExpectedReturnTime: orderData.expectedReturnTime,
        WithDriver: orderData.withDriver,
        UserId: orderData.userId,
        CarId: orderData.carId,
        RentalLocationId: orderData.rentalLocationId,
      }),
    }),

  // Lấy đơn hàng theo ID
  getById: (id: number) =>
    apiCall<RentalOrderData>(`/RentalOrder/GetById?id=${id}`, {
      method: 'GET',
    }),

  // Lấy đơn hàng của user
  getByUserId: (userId: number) =>
    apiCall<RentalOrderData[]>(`/RentalOrder/GetByUserId?userId=${userId}`, {
      method: 'GET',
    }),

  // Cập nhật trạng thái đơn hàng (Admin/Staff only)
  // Status enum: Pending=0, DocumentsSubmitted=1, DepositPending=2, Confirmed=3, 
  // Renting=4, Returned=5, PaymentPending=6, Cancelled=7, Completed=8
  // Note: Backend endpoint này có thể không tồn tại, cần kiểm tra backend
  updateStatus: (orderId: number, status: number) => {
    return apiCall<RentalOrderData>('/RentalOrder/UpdateStatus', {
      method: 'PUT',
      body: JSON.stringify({
        OrderId: orderId,
        Status: status,
      }),
    });
  },

  // Cập nhật tổng tiền đơn hàng (Admin/Staff only)
  updateTotal: (orderId: number, extraFee: number, damageFee: number, damageNotes?: string) => {
    return apiCall<RentalOrderData>('/RentalOrder/UpdateTotal', {
      method: 'PUT',
      body: JSON.stringify({
        OrderId: orderId,
        ExtraFee: extraFee,
        DamageFee: damageFee,
        DamageNotes: damageNotes || '',
      }),
    });
  },

  // Xác nhận tổng tiền (tạo payment record) (Admin/Staff only)
  confirmTotal: (orderId: number) => {
    return apiCall<{ success: boolean; message?: string }>(`/RentalOrder/ConfirmTotal?orderId=${orderId}`, {
      method: 'PUT',
    });
  },

  // Xác nhận thanh toán đã hoàn thành (Admin/Staff only)
  confirmPayment: (orderId: number) => {
    return apiCall<{ success: boolean; message?: string }>(`/RentalOrder/ConfirmPayment?orderId=${orderId}`, {
      method: 'PUT',
    });
  },

  // Hủy đơn hàng
  cancelOrder: (orderId: number) => {
    // Backend sử dụng HttpDelete với [FromForm]
    // Với DELETE, một số browser không hỗ trợ body, nên thử dùng URLSearchParams
    // hoặc gửi như form-urlencoded
    const formData = new URLSearchParams();
    formData.append('orderId', orderId.toString());
    
    return apiCall<RentalOrderData>(`/RentalOrder/CancelOrder`, {
      method: 'DELETE',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },

  // Xác nhận giấy tờ ở quầy (Staff only) - chuyển từ DocumentsSubmitted sang DepositPending
  confirmDocuments: (orderId: number) => {
    return apiCall<{ success: boolean; message?: string }>(`/RentalOrder/ConfirmDocuments?orderId=${orderId}`, {
      method: 'PUT',
    });
  },
};

export const carDeliveryHistoryApi = {
  // Tạo lịch sử giao xe (Bắt đầu thuê)
  create: (data: {
    deliveryDate: string;
    odometerStart: number;
    batteryLevelStart: number;
    vehicleConditionStart: string;
    orderId: number;
  }) => {
    return apiCall<{ message: string }>('/CarDeliveryHistory', {
      method: 'POST',
      body: JSON.stringify({
        DeliveryDate: data.deliveryDate,
        OdometerStart: data.odometerStart,
        BatteryLevelStart: data.batteryLevelStart,
        VehicleConditionStart: data.vehicleConditionStart,
        OrderId: data.orderId,
      }),
    });
  },
};

export const carReturnHistoryApi = {
  // Tạo lịch sử trả xe
  create: (data: {
    returnDate: string;
    odometerEnd: number;
    batteryLevelEnd: number;
    vehicleConditionEnd: string;
    orderId: number;
  }) => {
    return apiCall<{ message: string }>('/CarReturnHistory', {
      method: 'POST',
      body: JSON.stringify({
        ReturnDate: data.returnDate,
        OdometerEnd: data.odometerEnd,
        BatteryLevelEnd: data.batteryLevelEnd,
        VehicleConditionEnd: data.vehicleConditionEnd,
        OrderId: data.orderId,
      }),
    });
  },
};

export const paymentApi = {
  // Lấy doanh thu theo từng điểm thuê (Admin/Staff)
  getRevenueByLocation: () =>
    apiCall<RevenueByLocationData[]>("/Payment/ByRentalLocation", {
      method: "GET",
    }),

  // Xác nhận thanh toán đặt cọc (Admin/Staff only)
  confirmDepositPayment: (orderId: number) => {
    return apiCall<{ success: boolean; message?: string }>(`/Payment/ConfirmDepositPayment?orderId=${orderId}`, {
      method: 'PUT',
    });
  },
};
// Export types
export type { ApiResponse };

