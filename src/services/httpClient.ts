// HTTP Client - cấu hình chung cho tất cả API calls
import { authUtils } from '@/utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7200/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export async function httpClient<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = authUtils.getToken();
    
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    console.log(`[API] Response: ${response.status} ${response.statusText}`);

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true, message: 'Operation completed successfully' };
    }

    // Handle 404
    if (response.status === 404) {
      return {
        success: false,
        error: `Endpoint not found: ${endpoint}`
      };
    }

    // Handle 401 - token expired
    if (response.status === 401) {
      if (authUtils.isAuthenticated()) {
        console.warn('[API] Token expired, logging out...');
        authUtils.logout();
      }
      return {
        success: false,
        error: 'Unauthorized - Please login again'
      };
    }

    const text = await response.text();
    
    // Handle empty response
    if (!text || text.trim() === '') {
      if (response.ok) {
        return { success: true, message: 'Operation completed successfully' };
      } else {
        return {
          success: false,
          error: `HTTP error! status: ${response.status} - Empty response`
        };
      }
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn('[API] Response is not JSON:', text.substring(0, 300));
      
      if (response.ok) {
        return { success: true, data: text as any, message: text };
      }
      
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        return {
          success: false,
          error: `API server không khả dụng. Vui lòng kiểm tra lại kết nối. (Status: ${response.status})`
        };
      }
      
      return {
        success: false,
        error: `Lỗi server (Status ${response.status}): ${text.substring(0, 150)}`
      };
    }

    // Handle error responses
    if (!response.ok) {
      if (response.status === 400 && data?.errors) {
        const validationErrors = Object.entries(data.errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join(' | ');
        
        return {
          success: false,
          error: `Validation error: ${validationErrors}`
        };
      }
      
      const errorMsg = data?.error || data?.message || data?.Message || data?.title || `HTTP error! status: ${response.status}`;
      return { success: false, error: errorMsg };
    }

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
