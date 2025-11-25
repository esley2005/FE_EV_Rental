/* eslint-disable no-console */
import { apiCall } from '@/services/api';

// New comprehensive Analysis Response
export interface Summary {
  totalCars: number;
  totalOrders: number;
  totalUsers: number;
  totalFeedbacks: number;
  totalRevenue: number;
  avgRating: number;
}

export interface CarStatistics {
  bySizeType: Array<{
    sizeType: string;
    count: number;
    avgPrice: number;
    avgBattery: number;
  }>;
  topCars: Array<{
    id: number;
    name: string;
    model: string;
    seats: number;
    batteryDuration: number;
    rentPricePerDay: number;
    sizeType: string;
    batteryType: string;
  }>;
}

export interface OrderStatistics {
  byStatus: Array<{
    status: string;
    count: number;
    totalRevenue: number;
  }>;
  driverOption: {
    withDriverCount: number;
    withoutDriverCount: number;
    withDriverPercentage: number;
    withoutDriverPercentage: number;
  };
  recentOrders: Array<{
    id: number;
    orderDate: string;
    pickupTime: string;
    expectedReturnTime: string;
    actualReturnTime: string | null;
    carName: string;
    locationName: string;
    total: number;
    status: string;
  }>;
}

export interface FeedbackStatistics {
  byRating: Array<{
    rating: number;
    count: number;
  }>;
  recentFeedbacks: Array<{
    id: number;
    title: string;
    content: string;
    rating: number;
    userName: string;
    createdAt: string;
  }>;
}

export interface PaymentStatistics {
  byMethod: Array<{
    paymentMethod: string;
    count: number;
    totalAmount: number;
  }>;
}

export interface LocationStatistics {
  locations: Array<{
    name: string;
    address: string;
    carCount: number;
    orderCount: number;
  }>;
}

export interface AnalysisResponse {
  aiAnalysis: string;
  summary: Summary;
  carStatistics: CarStatistics;
  orderStatistics: OrderStatistics;
  feedbackStatistics: FeedbackStatistics;
  paymentStatistics: PaymentStatistics;
  locationStatistics: LocationStatistics;
}

// Legacy types for backward compatibility
type AnalyzeResponse = {
  response?: string;
  analysis?: string;
  suggestions?: string;
  data?: string;
  message?: string;
  result?: string;
  $id?: string;
};

export async function analyzeAI(): Promise<{
  success: boolean;
  data?: AnalysisResponse | AnalyzeResponse;
  error?: string;
}> {
  try {
    const result = await apiCall<any>('/AI/analyze', {
      method: 'GET',
      skipAuth: false, // API có thể cần auth, thử với auth trước
    });

    console.log('[AI Service] analyzeAI response:', result);

    if (!result.success) {
      // Nếu fail với auth, thử lại không auth
      if (result.error?.includes('Unauthorized') || result.error?.includes('401')) {
        console.log('[AI Service] Retrying without auth...');
        const retryResult = await apiCall<any>('/AI/analyze', {
          method: 'GET',
          skipAuth: true,
        });
        console.log('[AI Service] Retry response:', retryResult);
        
        if (retryResult.success && retryResult.data) {
          // Check if new format (has summary, carStatistics, etc.)
          if (retryResult.data.summary || retryResult.data.carStatistics) {
            return {
              success: true,
              data: normalizeNewAnalysisResponse(retryResult.data),
            };
          }
          // Normalize response format (legacy)
          const normalizedData = normalizeAIResponse(retryResult.data);
          return {
            success: true,
            data: normalizedData,
          };
        }
      }
      return result;
    }

    if (result.data) {
      // Check if new format (has summary, carStatistics, etc.)
      if (result.data.summary || result.data.carStatistics) {
        return {
          success: true,
          data: normalizeNewAnalysisResponse(result.data),
        };
      }
      // Normalize response format - backend có thể trả về nhiều format (legacy)
      const normalizedData = normalizeAIResponse(result.data);
      return {
        success: true,
        data: normalizedData,
      };
    }

    return {
      success: false,
      error: 'Response không có dữ liệu',
    };
  } catch (error: any) {
    console.error('[AI Service] analyzeAI error:', error);
    return {
      success: false,
      error: error?.message || 'Đã xảy ra lỗi khi gọi API',
    };
  }
}

// Normalize new comprehensive analysis response
function normalizeNewAnalysisResponse(data: any): AnalysisResponse {
  // Handle $values arrays from .NET
  const normalizeArray = (arr: any) => {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (arr.$values && Array.isArray(arr.$values)) return arr.$values;
    return [];
  };

  return {
    aiAnalysis: data.aiAnalysis || data.analysis || data.response || '',
    summary: data.summary || {
      totalCars: 0,
      totalOrders: 0,
      totalUsers: 0,
      totalFeedbacks: 0,
      totalRevenue: 0,
      avgRating: 0,
    },
    carStatistics: {
      bySizeType: normalizeArray(data.carStatistics?.bySizeType || []),
      topCars: normalizeArray(data.carStatistics?.topCars || []),
    },
    orderStatistics: {
      byStatus: normalizeArray(data.orderStatistics?.byStatus || []),
      driverOption: data.orderStatistics?.driverOption || {
        withDriverCount: 0,
        withoutDriverCount: 0,
        withDriverPercentage: 0,
        withoutDriverPercentage: 0,
      },
      recentOrders: normalizeArray(data.orderStatistics?.recentOrders || []),
    },
    feedbackStatistics: {
      byRating: normalizeArray(data.feedbackStatistics?.byRating || []),
      recentFeedbacks: normalizeArray(data.feedbackStatistics?.recentFeedbacks || []),
    },
    paymentStatistics: {
      byMethod: normalizeArray(data.paymentStatistics?.byMethod || []),
    },
    locationStatistics: {
      locations: normalizeArray(data.locationStatistics?.locations || []),
    },
  };
}

type AnalyzeCarUsageResponse = {
  response?: string;
  analysis?: string;
  suggestions?: string;
  data?: string;
  message?: string;
  summary?: unknown;
  perCar?: unknown;
  $id?: string;
};

export async function analyzeCarUsage(): Promise<{
  success: boolean;
  data?: AnalyzeCarUsageResponse;
  error?: string;
}> {
  try {
    const result = await apiCall<any>('/AI/car-usage', {
      method: 'GET',
      skipAuth: false,
    });

    console.log('[AI Service] analyzeCarUsage response:', result);

    if (!result.success) {
      // Nếu fail với auth, thử lại không auth
      if (result.error?.includes('Unauthorized') || result.error?.includes('401')) {
        console.log('[AI Service] Retrying car-usage without auth...');
        const retryResult = await apiCall<any>('/AI/car-usage', {
          method: 'GET',
          skipAuth: true,
        });
        console.log('[AI Service] Retry response:', retryResult);
        
        if (retryResult.success && retryResult.data) {
          const normalizedData = normalizeCarUsageResponse(retryResult.data);
          return {
            success: true,
            data: normalizedData,
          };
        }
      }
      return result;
    }

    if (result.data) {
      const normalizedData = normalizeCarUsageResponse(result.data);
      return {
        success: true,
        data: normalizedData,
      };
    }

    return {
      success: false,
      error: 'Response không có dữ liệu',
    };
  } catch (error: any) {
    console.error('[AI Service] analyzeCarUsage error:', error);
    return {
      success: false,
      error: error?.message || 'Đã xảy ra lỗi khi gọi API',
    };
  }
}

// Helper function để normalize response từ nhiều format khác nhau
function normalizeAIResponse(data: any): AnalyzeResponse {
  // Nếu data là string trực tiếp
  if (typeof data === 'string') {
    return { response: data };
  }

  // Nếu data là object
  if (typeof data === 'object' && data !== null) {
    // Backend trả về: { analysis: "...", suggestions: "..." } hoặc { response: "..." }
    // Kết hợp analysis và suggestions thành response nếu cần
    let responseText = '';
    
    if (data.analysis && data.suggestions) {
      responseText = `${data.analysis}\n\n${data.suggestions}`;
    } else {
      responseText = data.response || data.analysis || data.data || data.message || data.result || data.suggestions || '';
    }
    
    return {
      response: responseText,
      analysis: data.analysis,
      suggestions: data.suggestions,
      $id: data.$id,
    };
  }

  // Fallback
  return { response: String(data) };
}

// Helper riêng cho car-usage response
function normalizeCarUsageResponse(data: any): AnalyzeCarUsageResponse {
  // Nếu data là string trực tiếp
  if (typeof data === 'string') {
    return { response: data };
  }

  // Nếu data là object - format từ backend: { $id: "1", analysis: "...", suggestions: "..." }
  if (typeof data === 'object' && data !== null) {
    // Kết hợp analysis và suggestions thành response
    let responseText = '';
    
    if (data.analysis && data.suggestions) {
      responseText = `${data.analysis}\n\nGợi ý:\n${data.suggestions}`;
    } else {
      responseText = data.response || data.analysis || data.data || data.message || data.result || data.suggestions || '';
    }
    
    return {
      response: responseText,
      analysis: data.analysis,
      suggestions: data.suggestions,
      summary: data.summary,
      perCar: data.perCar,
      $id: data.$id,
    };
  }

  // Fallback
  return { response: String(data) };
}



