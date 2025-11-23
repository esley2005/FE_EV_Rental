"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Search, Zap, Users, XCircle, MapPin } from "lucide-react";
import { 
  Card,
  Input,
  Button,
  Select,
  Pagination,
  Empty,
  Spin,
  notification as antdNotification,
  Tag,
  Alert
} from "antd";
import { carsApi, rentalLocationApi, carRentalLocationApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalLocationData, CarRentalLocationData } from "@/services/api";

export default function AllCarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [api, contextHolder] = antdNotification.useNotification();
  
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<RentalLocationData | null>(null);
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      const response = await rentalLocationApi.getAll();
      if (response.success && response.data) {
        const raw = response.data as any;
        let locationsData: RentalLocationData[] = [];

        if (Array.isArray(raw)) {
          locationsData = raw;
        } else if (Array.isArray(raw.$values)) {
          locationsData = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          locationsData = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          locationsData = raw.data;
        }

        const activeLocations = locationsData.filter(
          (loc) => loc && (loc.isActive || loc.isActive === undefined || loc.isActive === null)
        );

        setLocations(activeLocations);
      }
    } catch (error) {
      console.error('Load locations error:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedLocationId && locations.length > 0) {
      const matchedLocation = locations.find(
        (loc) => Number(loc.id) === Number(selectedLocationId)
      );

      if (matchedLocation) {
        setSelectedLocation(matchedLocation);
      }
    }
  }, [selectedLocationId, locations]);

  useEffect(() => {
    // Lấy params từ URL và cập nhật state
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const locationName = searchParams.get('location');
    
    if (page) {
      setPageIndex(parseInt(page) - 1);
    } else {
      setPageIndex(0);
    }
    
    if (search) {
      setKeyword(search);
      setSearchInput(search);
    } else {
      setKeyword("");
      setSearchInput("");
    }

    // Load location info if locationId exists
    if (locationId) {
      const locId = parseInt(locationId);
      setSelectedLocationId(locId);
      loadLocationInfo(locId, locationName || undefined);
    } else {
      setSelectedLocationId(null);
      setSelectedLocation(null);
    }
  }, [searchParams]);

  const loadLocationInfo = async (locationId: number, locationName?: string) => {
    try {
      const response = await rentalLocationApi.getAll();
      if (response.success && response.data) {
        // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
        const raw = response.data as any;
        let locationsData: RentalLocationData[] = [];
        
        if (Array.isArray(raw)) {
          locationsData = raw;
        } else if (Array.isArray(raw.$values)) {
          locationsData = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          locationsData = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          locationsData = raw.data;
        }

        const activeLocations = locationsData.filter(
          (loc) => loc && (loc.isActive || loc.isActive === undefined || loc.isActive === null)
        );

        if (activeLocations.length > 0) {
          setLocations((prev) => (prev.length > 0 ? prev : activeLocations));
        }

        const location = activeLocations.find((loc: RentalLocationData) => loc.id === locationId);
        if (location) {
          setSelectedLocation(location);
        } else if (locationName) {
          // Fallback: create a temporary location object
          setSelectedLocation({
            id: locationId,
            name: locationName,
            address: '',
            coordinates: '',
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Load location info error:', error);
    }
  };

  useEffect(() => {
    // Tải lại danh sách xe khi pageIndex, keyword hoặc selectedLocationId thay đổi
    loadCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, keyword, selectedLocationId]);

  const loadCars = async () => {
    setLoading(true);
    try {
      const response = await carsApi.getAll();

      if (response.success && response.data) {
        console.log('[All Cars Page] Response data:', response.data);
        console.log('[All Cars Page] Response data type:', typeof response.data);
        console.log('[All Cars Page] Is array:', Array.isArray(response.data));
        console.log('[All Cars Page] Has $values:', !!(response.data as any)?.$values);
        
        // Backend C# có thể trả về { "$values": [...] } hoặc array trực tiếp
        const allCars = (response.data as any)?.$values || response.data || [];
        
        console.log('[All Cars Page] All cars after processing:', allCars);
        console.log('[All Cars Page] All cars length:', Array.isArray(allCars) ? allCars.length : 0);
        
        // Lọc xe active và chưa xóa
        let activeCars = Array.isArray(allCars) 
          ? allCars.filter((car: any) => {
              // Backend có thể trả về boolean hoặc number (0/1)
              const isActive = car.isActive !== false && car.isActive !== 0 && car.isActive !== undefined;
              const notDeleted = car.isDeleted !== true && car.isDeleted !== 1 && (car.isDeleted === false || car.isDeleted === 0 || car.isDeleted === undefined);
              return isActive && notDeleted;
            })
          : [];
        
        console.log('[All Cars Page] After filter - activeCars length:', activeCars.length);
        
        // ✅ Đồng bộ với admin: LUÔN fetch carRentalLocations cho TẤT CẢ xe để hiển thị location
        // vì API getAll() có thể không trả về relationships
        console.log(`[All Cars Page] Fetching carRentalLocations for all cars to display location...`);
        
        // Fetch chi tiết cho TẤT CẢ xe để lấy carRentalLocations
        const carsWithDetails = await Promise.all(
          activeCars.map(async (car: any) => {
            const carResult = { ...car };
            try {
              // Nếu đã có carRentalLocations dạng array hoặc $values, kiểm tra xem có đầy đủ không
              const hasLocations = carResult.carRentalLocations &&
                (Array.isArray(carResult.carRentalLocations) ||
                  (carResult.carRentalLocations as any)?.$values);
              
              if (hasLocations) {
                const locationsList = Array.isArray(carResult.carRentalLocations)
                  ? carResult.carRentalLocations
                  : (carResult.carRentalLocations as any)?.$values || [];
                
                if (locationsList.length > 0) {
                  // Kiểm tra xem location đầu tiên có đầy đủ thông tin không
                  const firstLocation = locationsList[0];
                  const hasFullInfo = firstLocation?.rentalLocation || firstLocation?.RentalLocation;
                  
                  if (hasFullInfo) {
                    // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location) - đồng bộ với admin
                    carResult.carRentalLocations = [firstLocation];
                    console.log(`[Car ${car.id}] Đã có carRentalLocations đầy đủ, chỉ lấy location đầu tiên`);
                    return carResult;
                  }
                }
              }

              console.log(`[Car ${car.id}] Fetching carRentalLocations via carRentalLocationApi...`);
              const carLocationResponse = await carRentalLocationApi.getByCarId(Number(car.id));

              if (carLocationResponse.success && carLocationResponse.data) {
                const rawLocations = carLocationResponse.data as any;
                let locationsData: CarRentalLocationData[] = [];

                if (Array.isArray(rawLocations)) {
                  locationsData = rawLocations;
                } else if (Array.isArray(rawLocations.$values)) {
                  locationsData = rawLocations.$values;
                } else if (rawLocations.data && Array.isArray(rawLocations.data.$values)) {
                  locationsData = rawLocations.data.$values;
                } else if (rawLocations.data && Array.isArray(rawLocations.data)) {
                  locationsData = rawLocations.data;
                }

                // ✅ Đồng bộ với admin: Chỉ lấy location đầu tiên (1 xe = 1 location)
                if (locationsData.length > 0) {
                  // Fetch rentalLocation đầy đủ cho location đầu tiên nếu chưa có
                  const firstLocation = locationsData[0] as any;
                  if (!firstLocation.rentalLocation && !firstLocation.RentalLocation) {
                    const locationId = firstLocation.locationId ?? firstLocation.LocationId ?? 
                                      firstLocation.rentalLocationId ?? firstLocation.RentalLocationId;
                    if (locationId) {
                      try {
                        const locationDetailResponse = await rentalLocationApi.getById(locationId);
                        if (locationDetailResponse.success && locationDetailResponse.data) {
                          firstLocation.rentalLocation = locationDetailResponse.data;
                        }
                      } catch (err) {
                        console.warn(`[Car ${car.id}] Failed to fetch location detail for ${locationId}:`, err);
                      }
                    }
                  }
                  carResult.carRentalLocations = [firstLocation]; // Chỉ lấy location đầu tiên
                } else {
                  carResult.carRentalLocations = [];
                }

                console.log(
                  `[Car ${car.id}] carRentalLocationApi returned ${locationsData.length} records, using first location only`
                );

                return carResult;
              }

              // Nếu carRentalLocationApi không trả về data, thử fallback lấy chi tiết xe
              console.warn(
                `[Car ${car.id}] carRentalLocationApi không trả về data, thử fallback getById`
              );
              const detailResponse = await carsApi.getById(String(car.id));
              if (detailResponse.success && detailResponse.data) {
                const detailCar = detailResponse.data as any;
                const detailLocations = detailCar.carRentalLocations || 
                  (detailCar.carRentalLocations as any)?.$values || [];
                // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location) - đồng bộ với admin
                return {
                  ...detailCar,
                  carRentalLocations: detailLocations.length > 0 ? [detailLocations[0]] : [],
                };
              }
            } catch (error) {
              console.error(`[All Cars Page] Error fetching locations for car ${car.id}:`, error);
            }

              return carResult;
            })
          );
          
        // Cập nhật lại activeCars với dữ liệu chi tiết
        activeCars = carsWithDetails;
        console.log(`[All Cars Page] Fetched details for ${activeCars.length} cars`);
        
        console.log('[All Cars Page] Active cars:', activeCars);

        // Tìm kiếm theo keyword nếu có
        if (keyword && keyword.trim()) {
          const searchTerm = keyword.toLowerCase().trim();
          activeCars = activeCars.filter((car: Car) => 
            car.name?.toLowerCase().includes(searchTerm) ||
            car.model?.toLowerCase().includes(searchTerm) ||
            car.sizeType?.toLowerCase().includes(searchTerm)
          );
          console.log('[All Cars Page] After search filter:', activeCars.length);
        }

        // Filter theo location nếu có (dựa trên CarRentalLocation)
        if (selectedLocationId) {
          console.log('[All Cars Page] ========== FILTERING BY LOCATION ==========');
          console.log('[All Cars Page] Filtering by locationId:', selectedLocationId, 'type:', typeof selectedLocationId);
          console.log('[All Cars Page] Total cars before filter:', activeCars.length);
          
          activeCars = activeCars.filter((car: Car) => {
            const carLocations = car.carRentalLocations;
            
            // Debug: log cấu trúc carRentalLocations
            console.log(`\n[Car ${car.id}] ========== CHECKING CAR ==========`);
            console.log(`[Car ${car.id}] carRentalLocations type:`, typeof carLocations);
            console.log(`[Car ${car.id}] carRentalLocations:`, carLocations);
            console.log(`[Car ${car.id}] carRentalLocations is array:`, Array.isArray(carLocations));
            
            // Nếu xe không có carRentalLocations, không hiển thị khi filter theo location
            if (!carLocations) {
              console.log(`❌ [Car ${car.id}] Không có carRentalLocations - BỎ QUA`);
              return false;
            }

            // Handle .NET format: có thể là array hoặc { $values: [...] }
            const locationsList = Array.isArray(carLocations)
              ? carLocations
              : (carLocations as any)?.$values || [];

            console.log(`[Car ${car.id}] locationsList length:`, locationsList?.length);
            console.log(`[Car ${car.id}] locationsList:`, JSON.stringify(locationsList, null, 2));

            // Nếu danh sách location rỗng, không hiển thị
            if (!Array.isArray(locationsList) || locationsList.length === 0) {
              console.log(`❌ [Car ${car.id}] carRentalLocations rỗng hoặc không phải array - BỎ QUA`);
              return false;
            }

            // Kiểm tra xem có location nào trùng với selectedLocationId không
            // CarRentalLocation là bảng trung gian: có carId và rentalLocationId
            // Logic: Tìm CarRentalLocation có rentalLocationId = selectedLocationId và carId = car.id
            const hasMatchingLocation = locationsList.some((loc: any) => {
              console.log(`[Car ${car.id}] Checking CarRentalLocation object:`, JSON.stringify(loc, null, 2));
              
              // Log tất cả keys để debug
              const allKeys = Object.keys(loc || {});
              console.log(`[Car ${car.id}] CarRentalLocation keys:`, allKeys);
              console.log(`[Car ${car.id}] CarRentalLocation full object:`, loc);
              
              // CarRentalLocation có 2 field chính:
              // - carId hoặc CarId: ID của xe
              // - rentalLocationId hoặc RentalLocationId: ID của địa điểm
              
              // Lấy rentalLocationId từ CarRentalLocation - thử TẤT CẢ các cách có thể
              let rentalLocationId = undefined;
              
              // Thử các field name phổ biến
              if (loc?.rentalLocationId !== undefined && loc?.rentalLocationId !== null) {
                rentalLocationId = loc.rentalLocationId;
              } else if (loc?.RentalLocationId !== undefined && loc?.RentalLocationId !== null) {
                rentalLocationId = loc.RentalLocationId;
              } else if (loc?.locationId !== undefined && loc?.locationId !== null) {
                rentalLocationId = loc.locationId;
              } else if (loc?.LocationId !== undefined && loc?.LocationId !== null) {
                rentalLocationId = loc.LocationId;
              } else if (loc?.rentalLocation?.id !== undefined && loc?.rentalLocation?.id !== null) {
                rentalLocationId = loc.rentalLocation.id;
              } else if (loc?.rentalLocation?.Id !== undefined && loc?.rentalLocation?.Id !== null) {
                rentalLocationId = loc.rentalLocation.Id;
              } else if (loc?.rentalLocation?.rentalLocationId !== undefined && loc?.rentalLocation?.rentalLocationId !== null) {
                rentalLocationId = loc.rentalLocation.rentalLocationId;
              } else if (loc?.rentalLocation?.RentalLocationId !== undefined && loc?.rentalLocation?.RentalLocationId !== null) {
                rentalLocationId = loc.rentalLocation.RentalLocationId;
              } else if (loc?.RentalLocation?.id !== undefined && loc?.RentalLocation?.id !== null) {
                rentalLocationId = loc.RentalLocation.id;
              } else if (loc?.RentalLocation?.Id !== undefined && loc?.RentalLocation?.Id !== null) {
                rentalLocationId = loc.RentalLocation.Id;
              } else if (loc?.RentalLocation?.rentalLocationId !== undefined && loc?.RentalLocation?.rentalLocationId !== null) {
                rentalLocationId = loc.RentalLocation.rentalLocationId;
              } else if (loc?.RentalLocation?.RentalLocationId !== undefined && loc?.RentalLocation?.RentalLocationId !== null) {
                rentalLocationId = loc.RentalLocation.RentalLocationId;
              }
              
              // Lấy carId từ CarRentalLocation (để verify)
              const carIdFromLocation = loc?.carId ?? 
                                        loc?.CarId ??
                                        loc?.car?.id ??
                                        loc?.Car?.Id;
              
              console.log(`[Car ${car.id}] CarRentalLocation - rentalLocationId:`, rentalLocationId, 'type:', typeof rentalLocationId);
              console.log(`[Car ${car.id}] CarRentalLocation - carId:`, carIdFromLocation);
              console.log(`[Car ${car.id}] Selected locationId:`, selectedLocationId, 'type:', typeof selectedLocationId);
              
              // Nếu không tìm thấy rentalLocationId, log toàn bộ object để debug
              if (rentalLocationId === undefined || rentalLocationId === null) {
                console.warn(`⚠️ [Car ${car.id}] Không tìm thấy rentalLocationId trong CarRentalLocation!`);
                console.warn(`⚠️ [Car ${car.id}] Object keys:`, allKeys);
                console.warn(`⚠️ [Car ${car.id}] Full object structure:`, JSON.stringify(loc, null, 2));
                // Thử tìm bất kỳ field nào có chứa "location" hoặc "Location"
                const locationFields = allKeys.filter(key => 
                  key.toLowerCase().includes('location') || key.toLowerCase().includes('id')
                );
                console.warn(`⚠️ [Car ${car.id}] Fields with 'location' or 'id':`, locationFields);
                locationFields.forEach(key => {
                  console.warn(`⚠️ [Car ${car.id}] ${key}:`, loc[key]);
                });
              }
              
              // So sánh rentalLocationId với selectedLocationId
              // CarRentalLocation.rentalLocationId === selectedLocationId nghĩa là xe này ở location đó
              const rentalLocIdNum = rentalLocationId !== undefined && rentalLocationId !== null ? Number(rentalLocationId) : null;
              const selectedIdNum = selectedLocationId !== null && selectedLocationId !== undefined ? Number(selectedLocationId) : null;
              
              // So sánh với nhiều cách để đảm bảo match
              const matches = rentalLocationId !== undefined && 
                            rentalLocationId !== null && 
                            selectedLocationId !== null && 
                            selectedLocationId !== undefined && (
                rentalLocationId == selectedLocationId ||  // Loose equality để tự động convert type
                rentalLocIdNum === selectedIdNum ||
                rentalLocationId === selectedIdNum ||
                rentalLocIdNum === selectedLocationId ||
                String(rentalLocationId) === String(selectedLocationId) ||
                Number(rentalLocationId) === Number(selectedLocationId)
              );
              
              console.log(`[Car ${car.id}] Comparing: rentalLocationId=${rentalLocationId} (${typeof rentalLocationId}) vs selectedLocationId=${selectedLocationId} (${typeof selectedLocationId})`);
              console.log(`[Car ${car.id}] As numbers: ${rentalLocIdNum} vs ${selectedIdNum}`);
              console.log(`[Car ${car.id}] Match result: ${matches}`);
              
              if (matches) {
                console.log(`✅ [Car ${car.id}] MATCH - CarRentalLocation có rentalLocationId=${rentalLocationId} match với selectedLocationId=${selectedLocationId}`);
              } else {
                console.log(`❌ [Car ${car.id}] NO MATCH - rentalLocationId: ${rentalLocationId} (${typeof rentalLocationId}), selectedLocationId: ${selectedLocationId} (${typeof selectedLocationId})`);
              }
              return !!matches;
            });

            if (hasMatchingLocation) {
              console.log(`✅ [Car ${car.id}] GIỮ LẠI - có location match`);
            } else {
              console.log(`❌ [Car ${car.id}] BỎ QUA - không có location match`);
            }

            return hasMatchingLocation;
          });
          
          console.log('[All Cars Page] ========== FILTER RESULT ==========');
          console.log('[All Cars Page] After location filter:', activeCars.length, 'cars match location', selectedLocationId);
          console.log('[All Cars Page] Cars that match:', activeCars.map(c => c.id));
          
          // Nếu không có xe nào match, có thể là do lỗi logic - hãy log thêm
          if (activeCars.length === 0) {
            console.warn('⚠️ WARNING: No cars match location filter!');
            console.warn('⚠️ This could mean:');
            console.warn('  1. No cars have CarRentalLocation with rentalLocationId =', selectedLocationId);
            console.warn('  2. Logic comparison is incorrect');
            console.warn('  3. Data structure is different than expected');
          }
        }

        // Lưu tổng số xe (trước khi phân trang)
        setTotalCount(activeCars.length);
        console.log('[All Cars Page] ========== FINAL DATA ==========');
        console.log('[All Cars Page] Total count:', activeCars.length);
        console.log('[All Cars Page] Active cars IDs:', activeCars.map(c => c.id));
        console.log('[All Cars Page] Page index:', pageIndex, 'Page size:', pageSize);

        // Phân trang phía client
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCars = activeCars.slice(startIndex, endIndex);
        
        console.log('[All Cars Page] Paginated cars:', paginatedCars.length, 'from', startIndex, 'to', endIndex);
        console.log('[All Cars Page] Paginated cars IDs:', paginatedCars.map(c => c.id));
        console.log('[All Cars Page] Paginated cars data:', paginatedCars);
        
        // Set state - đảm bảo đây là bước cuối cùng
        console.log('[All Cars Page] Setting cars state with', paginatedCars.length, 'cars');
        setCars(paginatedCars);
        console.log('[All Cars Page] State updated!');
      } else {
        api.error({
          message: 'Lỗi tải dữ liệu',
          description: response.error || 'Không thể tải danh sách xe!',
          placement: 'topRight',
          icon: <XCircle color="#ff4d4f" />, 
        });
      }
    } catch (error) {
      console.error('Load cars error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể kết nối đến máy chủ!',
        placement: 'topRight',
  icon: <XCircle color="#ff4d4f" />, 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (value: number | string | null) => {
    const newLocationId =
      value !== null && value !== undefined ? Number(value) : null;

    setSelectedLocationId(newLocationId);
    setPageIndex(0);

    let selectedLoc: RentalLocationData | null = null;
    if (newLocationId !== null) {
      selectedLoc =
        locations.find((loc) => Number(loc.id) === newLocationId) || null;
    }
    setSelectedLocation(selectedLoc);

    const params = new URLSearchParams(searchParams.toString());

    if (newLocationId !== null && selectedLoc) {
      params.set('locationId', String(newLocationId));
      params.set('location', selectedLoc.name);
      if (selectedLoc.address) {
        params.set('locationAddress', selectedLoc.address);
      } else {
        params.delete('locationAddress');
      }
    } else if (newLocationId !== null) {
      params.set('locationId', String(newLocationId));
      params.delete('location');
      params.delete('locationAddress');
    } else {
      params.delete('locationId');
      params.delete('location');
      params.delete('locationAddress');
    }

    params.set('page', '1');

    // Keep current search keyword in the URL if it exists
    if (keyword && keyword.trim()) {
      params.set('search', keyword.trim());
    } else {
      params.delete('search');
    }

    router.push(`/cars/all?${params.toString()}`);
  };

  const handleSearch = () => {
    const trimmedSearch = searchInput.trim();
    setKeyword(trimmedSearch);
    setPageIndex(0);
    
    // Update URL
    const params = new URLSearchParams();
    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    }
    if (selectedLocationId !== null) {
      params.set('locationId', String(selectedLocationId));
      if (selectedLocation?.name) {
        params.set('location', selectedLocation.name);
      }
      if (selectedLocation?.address) {
        params.set('locationAddress', selectedLocation.address);
      }
    }
    params.set('page', '1');
    router.push(`/cars/all?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    setPageIndex(page - 1);
    
    // Update URL
    const params = new URLSearchParams();
    if (keyword && keyword.trim()) {
      params.set('search', keyword.trim());
    }
    if (selectedLocationId !== null) {
      params.set('locationId', String(selectedLocationId));
      if (selectedLocation?.name) {
        params.set('location', selectedLocation.name);
      }
      if (selectedLocation?.address) {
        params.set('locationAddress', selectedLocation.address);
      }
    }
    params.set('page', page.toString());
    router.push(`/cars/all?${params.toString()}`);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const getStatusTag = (status: number) => {
    return status === 1 ? (
      <Tag color="blue">Sẵn sàng</Tag>
    ) : (
      <Tag color="red">Hết xe</Tag>
    );
  };

  return (
    <>
      {contextHolder}
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
    {/* Header chung */}
    <Header />

    {/* Add top padding to avoid header overlap */}
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
          {/* Page title + count */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Danh sách xe</h1>
            <div className="text-sm text-gray-600">
              Tổng: <strong>{totalCount}</strong> xe
            </div>
          </div>
          {/* Location Filter Info */}
          {selectedLocation && (
            <Alert
              message={
                <div className="flex items-center gap-2">
                  <MapPin />
                  <span>
                    Đang tìm xe tại: <strong>{selectedLocation.name}</strong>
                    {selectedLocation.address && ` - ${selectedLocation.address}`}
                  </span>
                </div>
              }
              type="info"
              showIcon
              closable
              onClose={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('locationId');
                params.delete('location');
                params.delete('locationAddress');
                router.push(`/cars/all?${params.toString()}`);
              }}
              className="mb-4"
            />
          )}

          {/* Search & Filter */}
          <Card className="mb-6 shadow-md">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  size="large"
                  placeholder="Tìm kiếm theo tên xe, model..."
                  prefix={<Search />}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </div>
              <div className="md:w-72">
                <Select
                  size="large"
                  placeholder="Chọn địa điểm nhận xe"
                  value={selectedLocationId ?? undefined}
                  onChange={(value) => handleLocationChange(value)}
                  allowClear
                  loading={locationsLoading}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<MapPin size={16} />}
                  options={locations.map((location) => ({
                    value: location.id,
                    label: location.address
                      ? `${location.name} - ${location.address}`
                      : location.name,
                  }))}
                  filterOption={(input, option) => {
                    const optionLabel = ((option?.label ?? '') as string).toLowerCase();
                    return optionLabel.includes(input.toLowerCase());
                  }}
                />
              </div>
              <div className="md:w-auto">
                <Button
                  type="primary"
                  size="large"
                  icon={<Search />}
                  onClick={handleSearch}
                  className="bg-blue-600 w-full md:w-auto"
                >
                  Tìm kiếm
                </Button>
              </div>
            </div>
          </Card>

  <br></br>

          {/* Cars Grid */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
              <Spin size="large" />
              <p className="text-gray-600">Đang tải danh sách xe...</p>
            </div>
          ) : cars.length === 0 ? (
            <Card className="shadow-md">
              <Empty
                description={
                  keyword 
                    ? `Không tìm thấy xe phù hợp với "${keyword}"`
                    : "Chưa có xe nào trong hệ thống"
                }
              >
                {keyword && (
                  <Button 
                    type="primary" 
                    onClick={() => {
                      setKeyword("");
                      setSearchInput("");
                      router.push('/cars/all');
                    }}
                    className="bg-blue-600"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car) => (
                  <Card
                    key={car.id}
                    hoverable
                    className="shadow-md overflow-hidden"
                    cover={
                      <div className="h-48 bg-gray-100 relative">
                        <img
                          src={car.imageUrl || '/logo_ev.png'}
                          alt={car.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo_ev.png';
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          {getStatusTag(car.status)}
                        </div>
                      </div>
                    }
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (selectedLocationId) {
                        params.set('locationId', String(selectedLocationId));
                      }
                      const queryString = params.toString();
                      router.push(`/cars/${car.id}${queryString ? `?${queryString}` : ''}`);
                    }}
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {car.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{car.model}</p>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="text-blue-600" />
                          <span>{car.seats} chỗ</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Zap className="text-yellow-600" />
                          <span>{car.batteryDuration} km</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {car.sizeType}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500">Giá thuê/ngày</div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(car.rentPricePerDay)}
                            </div>
                          </div>
                          <Button 
                            type="primary" 
                            size="small"
                            className="bg-blue-600"
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    current={pageIndex + 1}
                    pageSize={pageSize}
                    total={totalCount}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total) => `Tổng ${total} xe`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

