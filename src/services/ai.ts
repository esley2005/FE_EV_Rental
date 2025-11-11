/* eslint-disable no-console */
import { apiCall } from '@/services/api';

type AnalyzeResponse = {
  response: string;
};

export async function analyzeAI(): Promise<{
  success: boolean;
  data?: AnalyzeResponse;
  error?: string;
}> {
  const result = await apiCall<AnalyzeResponse>('/AI/analyze', {
    method: 'GET',
  });
  return result;
}

type AnalyzeCarUsageResponse = {
  response: string;
  // Backend có thể trả thêm summary, perCar – FE hiện tại chỉ cần response
  summary?: unknown;
  perCar?: unknown;
};

export async function analyzeCarUsage(): Promise<{
  success: boolean;
  data?: AnalyzeCarUsageResponse;
  error?: string;
}> {
  const result = await apiCall<AnalyzeCarUsageResponse>('/AI/car-usage', {
    method: 'GET',
  });
  return result;
}



