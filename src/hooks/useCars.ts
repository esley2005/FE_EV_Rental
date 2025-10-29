// Data hooks - logic fetch và normalize data
import { useState, useEffect } from 'react';
import { Car } from '@/types/car';
import { carsApi } from '@/services/carsApi';
import { mockCars } from '@/utils/apiTest';

export interface UseCarsResult {
  cars: Car[];
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  refetch: () => void;
}

export function useCars(): UseCarsResult {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchCars = async () => {
    try {
      setError(null);
      setIsDemo(false);
      
      const response = await carsApi.getAll();
      
      if (response.success && response.data) {
        // Normalize C# format: { $values: [...] } -> array
        const carsData = (response.data as { $values?: Car[] })?.$values || response.data;
        
        // Filter active cars
        const activeCars = Array.isArray(carsData) 
          ? carsData.filter((car: Car) => car.isActive && !car.isDeleted)
          : [];
        
        setCars(activeCars);
      } else {
        // Fallback to mock data
        console.warn('API không khả dụng, sử dụng mock data');
        setCars(mockCars);
        setIsDemo(true);
        setError('Đang sử dụng dữ liệu demo');
      }
    } catch (err) {
      console.error('Lỗi tải danh sách xe:', err);
      setCars(mockCars);
      setIsDemo(true);
      setError('Đã xảy ra lỗi, đang sử dụng dữ liệu demo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  return {
    cars,
    loading,
    error,
    isDemo,
    refetch: fetchCars
  };
}