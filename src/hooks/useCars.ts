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

// Helper: lấy location info từ car
function getLocationInfoFromCar(car: any): { name: string | null; address: string | null } {
  const rl = car?.carRentalLocations;
  if (!rl) return { name: null, address: null };
  
  // .NET có thể trả về dạng { $values: [...] }
  const list = Array.isArray(rl) ? rl : rl.$values || [];
  if (!Array.isArray(list) || list.length === 0) return { name: null, address: null };

  // Ưu tiên location đang active, nếu không có thì lấy phần tử đầu tiên
  const active = list.find((l: any) => (l?.isActive ?? l?.IsActive) && !(l?.isDeleted ?? l?.IsDeleted)) || list[0];
  
  // Lấy từ nested rentalLocation object
  const locationInfo = active?.rentalLocation ?? active?.RentalLocation ?? active;
  
  const name = locationInfo?.name ?? locationInfo?.Name ?? active?.name ?? active?.Name;
  const address = locationInfo?.address ?? locationInfo?.Address ?? active?.address ?? active?.Address;
  
  return {
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    address: typeof address === 'string' && address.trim() ? address.trim() : null
  };
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

// Helper: chuẩn hóa dữ liệu .NET có thể trả về dạng { $values: [...] }
function toArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.$values)) return data.$values as T[];
  return [];
}

// Helper: làm giàu 1 car với location data đầy đủ
async function enrichCarWithCoords(car: any) {
  try {
    console.log(`[enrichCarWithCoords] 🚗 Processing car ${car?.id} - ${car?.name}`);
    let enriched = car;
    let locationInfo = getLocationInfoFromCar(car);
    console.log(`[enrichCarWithCoords] Initial locationInfo:`, locationInfo);

    // ✅ Fetch và enrich location data
    if (car?.id != null) {
      try {
        const locationResponse = await carRentalLocationApi.getByCarId(Number(car.id));
        
        if (locationResponse.success && locationResponse.data) {
          const locationsData = Array.isArray(locationResponse.data)
            ? locationResponse.data
            : (locationResponse.data as any)?.$values || [];
          
          // ✅ Fetch rentalLocation cho mỗi relation
          const enrichedLocations = await Promise.all(
            locationsData.map(async (rel: any) => {
              // Nếu đã có rentalLocation, giữ nguyên
              if (rel?.rentalLocation?.name || rel?.RentalLocation?.Name) {
                return rel;
              }

              // Fetch từ locationId
              const locationId = rel?.locationId ?? rel?.LocationId ?? rel?.rentalLocationId ?? rel?.RentalLocationId;
              if (!locationId) return rel;

              try {
                const response = await rentalLocationApi.getById(locationId);
                if (response.success && response.data) {
                  return { ...rel, rentalLocation: response.data };
                }
              } catch {
                // Ignore
              }
              return rel;
            })
          );
          
          // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location)
          enriched = {
            ...enriched,
            carRentalLocations: enrichedLocations.length > 0 ? [enrichedLocations[0]] : []
          };
          
          locationInfo = getLocationInfoFromCar(enriched);
        }
      } catch {
        // Ignore error
      }
    }

    // Geocode address nếu có
    if (locationInfo.address) {
      const coords = await geocodeAddress(locationInfo.address);
      if (coords) {
        return { 
          ...enriched, 
          coords, 
          primaryAddress: locationInfo.address,
          primaryLocationName: locationInfo.name
        };
      }
      return { 
        ...enriched, 
        primaryAddress: locationInfo.address,
        primaryLocationName: locationInfo.name
      };
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
        
        // ✅ Làm giàu dữ liệu từng xe để có location data đầy đủ
        console.log('[useCars] Starting to enrich cars with location data...', activeCars.length, 'cars');
        const carsWithLocation = await Promise.all(activeCars.map(enrichCarWithCoords));
        
        console.log('[useCars] ✅ Enrichment complete. Sample car:', carsWithLocation[0]);
        console.log('[useCars] Sample carRentalLocations:', carsWithLocation[0]?.carRentalLocations);
        
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
