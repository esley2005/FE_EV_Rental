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


