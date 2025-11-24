// Data hooks - logic fetch và normalize data
"use client";

import { useState, useEffect } from "react";
import { carsApi, rentalLocationApi } from "@/services/api";
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

// Helper: làm giàu 1 car với location data đầy đủ (optimized version với cache)
async function enrichCarWithCoordsOptimized(car: any, locationsCache: Map<number, any>) {
  try {
    let enriched = car;
    let locationInfo = getLocationInfoFromCar(car);
    const carId = Number(car.id);

    // ✅ Sử dụng Car/GetByLocationId thay vì CarRentalLocation/GetByCarId
    if (carId && !Number.isNaN(carId)) {
      try {
        // Duyệt qua tất cả locations trong cache, check xem location nào có car này
        const carLocations: any[] = [];

        for (const [locationId, locationData] of locationsCache.entries()) {
          try {
            // Gọi Car/GetByLocationId để lấy danh sách cars tại location này
            const carsResponse = await carsApi.getByLocationId(locationId);
            
            if (carsResponse.success && carsResponse.data) {
              // Parse danh sách cars từ response
              const carsData = carsResponse.data as any;
              const carsList = Array.isArray(carsData)
                ? carsData
                : Array.isArray(carsData?.$values)
                ? carsData.$values
                : Array.isArray(carsData?.data)
                ? carsData.data
                : Array.isArray(carsData?.data?.$values)
                ? carsData.data.$values
                : [];

              // Check xem car hiện tại có trong danh sách không
              const hasCar = carsList.some((c: any) => {
                const cId = Number(c?.id ?? c?.Id ?? c?.carId ?? c?.CarId);
                return !Number.isNaN(cId) && cId === carId;
              });

              if (hasCar) {
                // Location này có car, thêm vào danh sách
                carLocations.push({
                  locationId: locationId,
                  rentalLocation: {
                    id: locationData.id || locationData.Id,
                    name: locationData.name || locationData.Name,
                    address: locationData.address || locationData.Address,
                    coordinates: locationData.coordinates || locationData.Coordinates,
                    isActive: locationData.isActive ?? locationData.IsActive,
                  },
                });
              }
            }
          } catch (error) {
            console.warn(`[enrichCarWithCoordsOptimized] Car ${car.id} - Error checking location ${locationId}:`, error);
            // Tiếp tục với location tiếp theo
          }
        }

        // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location)
        if (carLocations.length > 0) {
          enriched = {
            ...enriched,
            carRentalLocations: [carLocations[0]]
          };
          
          locationInfo = getLocationInfoFromCar(enriched);
        } else {
          // Không tìm thấy location nào có car này
          enriched = {
            ...enriched,
            carRentalLocations: []
          };
        }
      } catch (err) {
        console.warn(`[enrichCarWithCoordsOptimized] Car ${car.id} - Error:`, err);
      }
    }

    // ✅ Geocode chỉ khi cần thiết (có thể skip để tăng tốc)
    // Comment out geocode để tăng tốc độ load
    // if (locationInfo.address) {
    //   const coords = await geocodeAddress(locationInfo.address);
    //   if (coords) {
    //     return { 
    //       ...enriched, 
    //       coords, 
    //       primaryAddress: locationInfo.address,
    //       primaryLocationName: locationInfo.name
    //     };
    //   }
    // }
    
    return { 
      ...enriched, 
      primaryAddress: locationInfo.address,
      primaryLocationName: locationInfo.name
    };
  } catch (error) {
    console.error(`[enrichCarWithCoordsOptimized] Error enriching car ${car?.id}:`, error);
    return car;
  }
}

// Helper: làm giàu 1 car với location data đầy đủ (original version - giữ lại để backward compatibility)
async function enrichCarWithCoords(car: any) {
  try {
    console.log(`[enrichCarWithCoords] 🚗 Processing car ${car?.id} - ${car?.name}`);
    let enriched = car;
    let locationInfo = getLocationInfoFromCar(car);
    console.log(`[enrichCarWithCoords] Initial locationInfo:`, locationInfo);

    // ✅ Sử dụng Car/GetByLocationId thay vì CarRentalLocation/GetByCarId
    // Logic: Lấy tất cả locations, rồi check xem location nào có car này
    if (car?.id != null) {
      try {
        const carId = Number(car.id);
        if (Number.isNaN(carId)) {
          console.warn(`[enrichCarWithCoords] Car ${car.id} - Invalid car ID`);
          return car;
        }

        console.log(`[enrichCarWithCoords] 🚗 Car ${car.id} - Starting enrichment using Car/GetByLocationId...`);
        
        // Lấy tất cả locations
        const locationsResponse = await rentalLocationApi.getAll();
        if (!locationsResponse.success || !locationsResponse.data) {
          console.warn(`[enrichCarWithCoords] Car ${car.id} - Failed to fetch locations`);
          return car;
        }

        const locationsList = Array.isArray(locationsResponse.data)
          ? locationsResponse.data
          : (locationsResponse.data as any)?.$values || [];

        console.log(`[enrichCarWithCoords] Car ${car.id} - Found ${locationsList.length} locations`);

        // Duyệt qua tất cả locations, check xem location nào có car này
        const carLocations: any[] = [];

        for (const locationData of locationsList) {
          const locationId = Number(locationData?.id ?? locationData?.Id);
          if (Number.isNaN(locationId)) continue;

          try {
            // Gọi Car/GetByLocationId để lấy danh sách cars tại location này
            const carsResponse = await carsApi.getByLocationId(locationId);
            
            if (carsResponse.success && carsResponse.data) {
              // Parse danh sách cars từ response
              const carsData = carsResponse.data as any;
              const carsList = Array.isArray(carsData)
                ? carsData
                : Array.isArray(carsData?.$values)
                ? carsData.$values
                : Array.isArray(carsData?.data)
                ? carsData.data
                : Array.isArray(carsData?.data?.$values)
                ? carsData.data.$values
                : [];

              // Check xem car hiện tại có trong danh sách không
              const hasCar = carsList.some((c: any) => {
                const cId = Number(c?.id ?? c?.Id ?? c?.carId ?? c?.CarId);
                return !Number.isNaN(cId) && cId === carId;
              });

              if (hasCar) {
                // Location này có car, thêm vào danh sách
                carLocations.push({
                  locationId: locationId,
                  rentalLocation: {
                    id: locationData.id || locationData.Id,
                    name: locationData.name || locationData.Name,
                    address: locationData.address || locationData.Address,
                    coordinates: locationData.coordinates || locationData.Coordinates,
                    isActive: locationData.isActive ?? locationData.IsActive,
                  },
                });
                console.log(`[enrichCarWithCoords] ✅ Car ${car.id} - Found at location ${locationId}`);
              }
            }
          } catch (error) {
            console.warn(`[enrichCarWithCoords] Car ${car.id} - Error checking location ${locationId}:`, error);
            // Tiếp tục với location tiếp theo
          }
        }

        // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location)
        if (carLocations.length > 0) {
          enriched = {
            ...enriched,
            carRentalLocations: [carLocations[0]]
          };
          
          locationInfo = getLocationInfoFromCar(enriched);
          console.log(`[enrichCarWithCoords] Car ${car.id} - Final locationInfo:`, locationInfo);
        } else {
          console.warn(`[enrichCarWithCoords] Car ${car.id} - No locations found`);
          enriched = {
            ...enriched,
            carRentalLocations: []
          };
        }
      } catch (err) {
        console.error(`[enrichCarWithCoords] Car ${car.id} - Exception:`, err);
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
        
        // ✅ Filter xe có quantity > 0 (ẩn xe hết hàng)
        const carsWithQuantity = carsWithLocation.filter((car: any) => {
          const carLocations = car.carRentalLocations;
          if (!carLocations) {
            // Nếu không có location, vẫn hiển thị (backward compatibility)
            return true;
          }

          // Handle .NET format: có thể là array hoặc { $values: [...] }
          const locationsList = Array.isArray(carLocations)
            ? carLocations
            : (carLocations as any)?.$values || [];

          if (!Array.isArray(locationsList) || locationsList.length === 0) {
            // Không có location nào, vẫn hiển thị (backward compatibility)
            return true;
          }

          // Lấy location đầu tiên (1 xe = 1 location)
          const firstLocation = locationsList[0];
          if (!firstLocation) {
            return true;
          }

          // Lấy quantity từ relation
          const quantity = firstLocation?.quantity ?? 
                          firstLocation?.Quantity ?? 
                          firstLocation?.availableQuantity ?? 
                          firstLocation?.AvailableQuantity ?? 
                          firstLocation?.stock ?? 
                          firstLocation?.Stock ?? 
                          firstLocation?.carQuantity ?? 
                          firstLocation?.CarQuantity ?? 
                          null;

          // Nếu quantity là null/undefined, vẫn hiển thị (backward compatibility)
          if (quantity === null || quantity === undefined) {
            return true;
          }

          // Chỉ hiển thị xe có quantity > 0
          const quantityNum = Number(quantity);
          if (Number.isNaN(quantityNum)) {
            return true; // Nếu không parse được, vẫn hiển thị
          }

          return quantityNum > 0;
        });
        
        console.log(`[useCars] After quantity filter (quantity > 0): ${carsWithQuantity.length} cars`);
        
        setCars(carsWithQuantity as unknown as Car[]);
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
    
    // ✅ Listen to paymentSuccess event để refresh danh sách xe
    const handlePaymentSuccess = () => {
      console.log('[useCars] Payment success event received, refreshing cars list...');
      fetchCars();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('paymentSuccess', handlePaymentSuccess);
      
      return () => {
        window.removeEventListener('paymentSuccess', handlePaymentSuccess);
      };
    }
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
          // Lấy address từ carRentalLocations
          const locationInfo = getLocationInfoFromCar(carData);
          if (locationInfo.address) {
            const coords = await geocodeAddress(locationInfo.address);
            setCar({ ...carData, coords, primaryAddress: locationInfo.address, primaryLocationName: locationInfo.name } as Car);
          } else {
            setCar(carData as Car);
          }
          setError(null);
        } else {
          setError((response as any).error || "Car not found");
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
      setError((response as any).error || "Car not found");
    }
    setLoading(false);
  };

  return { car, loading, error, refetch };
}
