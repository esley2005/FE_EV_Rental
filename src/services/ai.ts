/* eslint-disable no-console */
import { apiCall } from '@/services/api';

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
  data?: AnalyzeResponse;
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
          // Normalize response format
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
      // Normalize response format - backend có thể trả về nhiều format
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



