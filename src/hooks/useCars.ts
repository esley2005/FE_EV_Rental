<<<<<<< Updated upstream
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
=======
"use client";

import { useState, useEffect } from "react";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";
import { geocodeAddress } from "@/utils/geocode";

// Helper: lấy địa chỉ từ bảng RentalLocations trả về kèm theo Car (nếu có)
function getPrimaryAddressFromCar(car: any): string | null {
  const rl = car?.carRentalLocations;
  if (!rl) return null;
  // .NET có thể trả về dạng { $values: [...] }
  const list = Array.isArray(rl) ? rl : rl.$values || [];
  if (!Array.isArray(list) || list.length === 0) return null;

  // Ưu tiên location đang active, nếu không có thì lấy phần tử đầu tiên
  const active = list.find((l: any) => (l?.isActive ?? l?.IsActive) && !(l?.isDeleted ?? l?.IsDeleted)) || list[0];
  const addr = active?.address ?? active?.Address;
  return typeof addr === 'string' && addr.trim() ? addr : null;
}

// Helper: chuẩn hóa dữ liệu .NET có thể trả về dạng { $values: [...] }
function toArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.$values)) return data.$values as T[];
  return [];
}

// Helper: làm giàu 1 car với tọa độ (nếu cần thì fetch chi tiết)
async function enrichCarWithCoords(car: any) {
  try {
    let address = getPrimaryAddressFromCar(car);
    let enriched = car;

    // Nếu không có address trong payload ban đầu, thử gọi API getById để lấy đầy đủ relationships
    if (!address && car?.id != null) {
      const detailResp = await carsApi.getById(String(car.id));
      if (detailResp.success && detailResp.data) {
        enriched = detailResp.data;
        address = getPrimaryAddressFromCar(detailResp.data);
      }
    }

    if (address) {
      const coords = await geocodeAddress(address);
      if (coords) return { ...enriched, coords, primaryAddress: address };
      return { ...enriched, primaryAddress: address };
    }
    return enriched;
  } catch {
    return car;
  }
}

/**
 * Hook: Lấy toàn bộ danh sách xe
 */
export function useCars() {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
    async function fetchCars() {
      try {
        setLoading(true);
        const response = await carsApi.getAll();

        if (response.success && response.data !== undefined) {
          const rawList = toArray<any>(response.data);
          // ✅ Làm giàu dữ liệu từng xe để có tọa độ (cần thì gọi getById)
          const carsWithLocation = await Promise.all(rawList.map(enrichCarWithCoords));

          setCars(carsWithLocation as unknown as Car[]);
          setError(null);
        } else {
          setError(response.error || "Failed to fetch cars");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchCars();
  }, []);

  const refetch = async () => {
    setLoading(true);
    const response = await carsApi.getAll();
    if (response.success && response.data !== undefined) {
      const list = toArray<any>(response.data);
      const enriched = await Promise.all(list.map(enrichCarWithCoords));
      setCars(enriched as Car[]);
      setError(null);
    } else {
      setError(response.error || "Failed to fetch cars");
    }
    setLoading(false);
  };

  return { cars, loading, error, refetch };
}

/**
 * Hook: Lấy thông tin 1 xe cụ thể theo ID
 */
export function useCar(id: string) {
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCar() {
      if (!id) return;

      try {
        setLoading(true);
        const response = await carsApi.getById(id);

        if (response.success && response.data) {
          const carData: any = response.data;
          const address = getPrimaryAddressFromCar(carData);
          if (address) {
            const coords = await geocodeAddress(address);
            setCar({ ...carData, coords, primaryAddress: address } as Car);
          } else {
            setCar(carData as Car);
          }
          setError(null);
        } else {
          setError(response.error || "Car not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchCar();
  }, [id]);

  const refetch = async () => {
    if (!id) return;

    setLoading(true);
    const response = await carsApi.getById(id);
    if (response.success && response.data) {
      setCar(response.data);
      setError(null);
    } else {
      setError(response.error || "Car not found");
    }
    setLoading(false);
  };

  return { car, loading, error, refetch };
}
>>>>>>> Stashed changes
