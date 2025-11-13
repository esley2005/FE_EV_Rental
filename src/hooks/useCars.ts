// Data hooks - logic fetch và normalize data
"use client";

import { useState, useEffect } from "react";
import { carsApi, carRentalLocationApi, rentalLocationApi } from "@/services/api";
import type { Car } from "@/types/car";
import { geocodeAddress } from "@/utils/geocode";
import { mockCars } from '@/utils/apiTest';

export interface UseCarsResult {
  cars: Car[];
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  refetch: () => void;
}

// Helper: lấy địa chỉ từ bảng RentalLocations trả về kèm theo Car (nếu có)
function getPrimaryAddressFromCar(car: any): string | null {
  const rl = car?.carRentalLocations;
  if (!rl) return null;
  // .NET có thể trả về dạng { $values: [...] }
  const list = Array.isArray(rl) ? rl : rl.$values || [];
  if (!Array.isArray(list) || list.length === 0) return null;

  // Ưu tiên location đang active, nếu không có thì lấy phần tử đầu tiên
  const firstLocation = list.find((l: any) => {
    const isActive = l?.isActive ?? l?.IsActive ?? l?.rentalLocation?.isActive ?? l?.rentalLocation?.IsActive;
    const isDeleted = l?.isDeleted ?? l?.IsDeleted ?? l?.rentalLocation?.isDeleted ?? l?.rentalLocation?.IsDeleted;
    return (isActive === true || isActive === 1 || isActive === undefined) &&
           !(isDeleted === true || isDeleted === 1);
  }) || list[0];

  // Lấy thông tin location từ nested object hoặc trực tiếp
  const locationInfo = firstLocation?.rentalLocation ?? firstLocation?.RentalLocation ?? firstLocation;
  
  // Ưu tiên address, nếu không có thì lấy name
  const address = locationInfo?.address ?? locationInfo?.Address ?? firstLocation?.address ?? firstLocation?.Address;
  if (typeof address === 'string' && address.trim()) {
    return address.trim();
  }
  
  const name = locationInfo?.name ?? locationInfo?.Name ?? firstLocation?.name ?? firstLocation?.Name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  
  return null;
}

// Helper: chuẩn hóa dữ liệu .NET có thể trả về dạng { $values: [...] }
function toArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.$values)) return data.$values as T[];
  return [];
}

// Helper: lấy locationId từ CarRentalLocation
function getLocationIdFromRelation(relation: any): number | null {
  const candidates = [
    relation?.rentalLocationId,
    relation?.RentalLocationId,
    relation?.locationId,
    relation?.LocationId,
    relation?.rentalLocation?.id,
    relation?.rentalLocation?.Id,
    relation?.RentalLocation?.id,
    relation?.RentalLocation?.Id,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) {
      return Number(candidate);
    }
  }
  return null;
}

// Helper: làm giàu 1 car với tọa độ (nếu cần thì fetch chi tiết)
async function enrichCarWithCoords(car: any) {
  try {
    let enriched = car;
    let address = getPrimaryAddressFromCar(car);

    // Kiểm tra xem đã có carRentalLocations chưa
    const hasCarRentalLocations = car.carRentalLocations && 
      ((Array.isArray(car.carRentalLocations) && car.carRentalLocations.length > 0) ||
       (car.carRentalLocations.$values && car.carRentalLocations.$values.length > 0));

    // Nếu chưa có carRentalLocations hoặc không có address, fetch từ API
    if ((!hasCarRentalLocations || !address) && car?.id != null) {
      try {
        // Thử fetch carRentalLocations trước
        const locationResponse = await carRentalLocationApi.getByCarId(Number(car.id));
        if (locationResponse.success && locationResponse.data) {
          const locationsData = Array.isArray(locationResponse.data)
            ? locationResponse.data
            : (locationResponse.data as any)?.$values || [];
          
          // Nếu carRentalLocations không có đầy đủ thông tin rentalLocation, fetch thêm
          const enrichedLocations = await Promise.all(
            locationsData.map(async (rel: any) => {
              // Nếu đã có rentalLocation với đầy đủ thông tin, giữ nguyên
              if (rel?.rentalLocation?.address || rel?.RentalLocation?.Address) {
                return rel;
              }

              // Nếu chưa có, thử lấy locationId và fetch từ rentalLocationApi
              const locationId = getLocationIdFromRelation(rel);
              if (locationId) {
                try {
                  const rentalLocResponse = await rentalLocationApi.getById(locationId);
                  if (rentalLocResponse.success && rentalLocResponse.data) {
                    return {
                      ...rel,
                      rentalLocation: rentalLocResponse.data,
                    };
                  }
                } catch (err) {
                  console.warn(`[useCars] Failed to fetch rentalLocation ${locationId}:`, err);
                }
              }
              return rel;
            })
          );
          
          enriched = {
            ...enriched,
            carRentalLocations: enrichedLocations
          };
          
          // Lấy address từ carRentalLocations mới fetch
          address = getPrimaryAddressFromCar(enriched);
        }
      } catch (locationError) {
        console.warn(`[useCars] Failed to fetch carRentalLocations for car ${car.id}:`, locationError);
      }

      // Nếu vẫn không có address, thử getById để lấy đầy đủ relationships
      if (!address) {
        const detailResp = await carsApi.getById(String(car.id));
        if (detailResp.success && detailResp.data) {
          enriched = detailResp.data;
          address = getPrimaryAddressFromCar(detailResp.data);
        }
      }
    }

    if (address) {
      const coords = await geocodeAddress(address);
      if (coords) return { ...enriched, coords, primaryAddress: address };
      return { ...enriched, primaryAddress: address };
    }
    return enriched;
  } catch (error) {
    console.error(`[useCars] Error enriching car ${car?.id}:`, error);
    return car;
  }
}

/**
 * Hook: Lấy toàn bộ danh sách xe
 */
export function useCars(): UseCarsResult {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchCars = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsDemo(false);
      
      const response = await carsApi.getAll();
      
      if (response.success && response.data !== undefined) {
        // Normalize C# format: { $values: [...] } -> array
        const rawList = toArray<any>(response.data);
        
        // Filter active cars
        const activeCars = rawList.filter((car: Car) => car.isActive && !car.isDeleted);
        
        // ✅ Làm giàu dữ liệu từng xe để có tọa độ (cần thì gọi getById)
        const carsWithLocation = await Promise.all(activeCars.map(enrichCarWithCoords));
        
        setCars(carsWithLocation as unknown as Car[]);
        setError(null);
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
