// Cars API - tách riêng domain cars
import { httpClient } from './httpClient';
import type { Car } from '@/types/car';

export const carsApi = {
  // Lấy tất cả xe
  getAll: () => httpClient<Car[]>('/Car'),

  // Lấy xe theo ID
  getById: (id: string) => httpClient<Car>(`/Car/${id}`),

  // Tạo xe mới
  create: (carData: Partial<Car>) => 
    httpClient<Car>('/Car', {
      method: 'POST',
      body: JSON.stringify(carData),
    }),

  // Cập nhật xe
  update: (id: number | string, carData: Partial<Car>) =>
    httpClient<Car>(`/Car/${id}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    }),

  // Xóa xe
  delete: (id: number | string) =>
    httpClient(`/Car/${id}`, {
      method: 'DELETE',
    }),
};
