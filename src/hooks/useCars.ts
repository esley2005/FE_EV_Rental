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

    // ✅ Nếu đã có carRentalLocations đầy đủ, sử dụng luôn
    const hasLocations = enriched.carRentalLocations &&
      (Array.isArray(enriched.carRentalLocations) ||
        (enriched.carRentalLocations as any)?.$values);
    
    if (hasLocations) {
      const locationsList = Array.isArray(enriched.carRentalLocations)
        ? enriched.carRentalLocations
        : (enriched.carRentalLocations as any)?.$values || [];
      
      if (locationsList.length > 0) {
        const firstLocation = locationsList[0];
        const hasFullInfo = firstLocation?.rentalLocation || firstLocation?.RentalLocation;
        
        if (hasFullInfo) {
          // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location)
          enriched = {
            ...enriched,
            carRentalLocations: [firstLocation]
          };
          locationInfo = getLocationInfoFromCar(enriched);
          return { 
            ...enriched, 
            primaryAddress: locationInfo.address,
            primaryLocationName: locationInfo.name
          };
        }
      }
    }

    // ✅ Fetch carRentalLocations cho xe này bằng cách dùng Car/GetByLocationId
    if (car?.id != null) {
      try {
        const carId = Number(car.id);
        if (Number.isNaN(carId)) {
          return { 
            ...enriched, 
            primaryAddress: locationInfo.address,
            primaryLocationName: locationInfo.name
          };
        }

        // ✅ Logic mới: Duyệt qua tất cả locations, check xem location nào có car này
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

              // Nếu tìm thấy car tại location này, thêm vào danh sách
              if (hasCar) {
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
                // Chỉ lấy location đầu tiên (1 xe = 1 location)
                break;
              }
            }
          } catch (error) {
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
        }
      } catch (err) {
        // Ignore errors
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
    let enriched = car;
    let locationInfo = getLocationInfoFromCar(car);

    // ✅ Sử dụng rentalLocationId từ Car object thay vì carRentalLocationApi
    if (car?.id != null) {
      try {
        // Nếu car có rentalLocationId, fetch location info trực tiếp
        if (car.rentalLocationId) {
          const locationResponse = await rentalLocationApi.getById(car.rentalLocationId);
          
          if (locationResponse.success && locationResponse.data) {
            const location = locationResponse.data;
            // Tạo relation object tương thích với code cũ
            const enrichedLocation = {
              rentalLocationId: location.id,
              RentalLocationId: location.id,
              rentalLocation: location,
              RentalLocation: location
            };
            
            // Location đã được fetch ở trên với đầy đủ thông tin
            // enrichedLocation đã có đầy đủ rentalLocation từ dòng 223-224
            enriched = {
              ...enriched,
              carRentalLocations: [enrichedLocation]
            };
            
            locationInfo = getLocationInfoFromCar(enriched);
          }
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
        
        // Filter active cars và normalize status
        const activeCars = rawList
          .filter((car: Car) => car.isActive && !car.isDeleted)
          .map((car: any) => ({
            ...car,
            // Normalize status: đảm bảo là number (0 hoặc 1)
            status: typeof car.status === 'number' 
              ? car.status 
              : (car.status === 1 || car.status === '1' ? 1 : 0),
          }));
        
        // ✅ Tối ưu: Batch fetch tất cả locations một lần thay vì fetch từng xe
        // Fetch tất cả locations một lần để tránh N+1 queries
        let allLocationsMap = new Map<number, any>();
        try {
          const locationsResponse = await rentalLocationApi.getAll();
          if (locationsResponse.success && locationsResponse.data) {
            const locationsList = Array.isArray(locationsResponse.data)
              ? locationsResponse.data
              : (locationsResponse.data as any)?.$values || [];
            locationsList.forEach((loc: any) => {
              const id = loc.id || loc.Id;
              if (id) allLocationsMap.set(id, loc);
            });
          }
        } catch (err) {
          console.warn('[useCars] Failed to batch load locations:', err);
        }
        
        // Enrich cars với location data đã cache (sử dụng optimized version)
        const carsWithLocation = await Promise.all(
          activeCars.map(async (car) => {
            try {
              // Sử dụng cached locations nếu có
              const enriched = await enrichCarWithCoordsOptimized(car, allLocationsMap);
              return enriched;
            } catch (err) {
              console.error(`[useCars] Error enriching car ${car.id}:`, err);
              return car;
            }
          })
        );
        
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
