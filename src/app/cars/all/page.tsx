"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Search, XCircle, MapPin } from "lucide-react";
import { 
  Card,
  Input,
  Button,
  Select,
  Pagination,
  Empty,
  Spin,
  notification as antdNotification,
  Alert
} from "antd";
import { carsApi, rentalLocationApi, carRentalLocationApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalLocationData, CarRentalLocationData } from "@/services/api";
import CarCard from "@/components/CarCard";

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
  const [selectedCarType, setSelectedCarType] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [availableCarTypes, setAvailableCarTypes] = useState<string[]>([]);

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
    const carType = searchParams.get('carType');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    
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

    if (carType) {
      setSelectedCarType(carType);
    } else {
      setSelectedCarType(null);
    }

    if (minPriceParam) {
      setMinPrice(minPriceParam);
    } else {
      setMinPrice("");
    }

    if (maxPriceParam) {
      setMaxPrice(maxPriceParam);
    } else {
      setMaxPrice("");
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
    // Tải lại danh sách xe khi pageIndex, keyword, selectedLocationId, selectedCarType, minPrice, maxPrice thay đổi
    // Hoặc khi locations đã được load (để có thể sử dụng trong loadCars)
    loadCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, keyword, selectedLocationId, selectedCarType, minPrice, maxPrice, locations]);

  // ✅ Listen to paymentSuccess event để refresh danh sách xe
  useEffect(() => {
    const handlePaymentSuccess = () => {
      console.log('[All Cars Page] Payment success event received, refreshing cars list...');
      loadCars();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('paymentSuccess', handlePaymentSuccess);
      
      return () => {
        window.removeEventListener('paymentSuccess', handlePaymentSuccess);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        
        // console.log('[All Cars Page] After filter - activeCars length:', activeCars.length);
        
        // Khởi tạo cache cho locations
        let locationsCache = new Map<number, any>();
        
        // Lấy tất cả locations và cache lại
        if (locationsCache.size === 0) {
        try {
          const locationsResponse = await rentalLocationApi.getAll();
          if (locationsResponse.success && locationsResponse.data) {
            const locationsList = Array.isArray(locationsResponse.data)
              ? locationsResponse.data
              : (locationsResponse.data as any)?.$values || [];
            locationsList.forEach((loc: any) => {
              const id = loc.id || loc.Id;
              if (id) locationsCache.set(Number(id), loc);
            });
            console.log(`[All Cars Page] ✅ Loaded ${locationsCache.size} locations into cache`);
          }
        } catch (err) {
          console.warn('[All Cars Page] Failed to load locations cache:', err);
          }
        }
        
        // Fetch locations cho TẤT CẢ xe bằng cách dùng Car/GetByLocationId
        const carsWithDetails = await Promise.all(
          activeCars.map(async (car: any) => {
            const carResult = { ...car };
            const carId = Number(car.id);
            
            if (Number.isNaN(carId)) {
              console.warn(`[Car ${car.id}] Invalid car ID`);
              carResult.carRentalLocations = [];
              return carResult;
            }

            try {
              // Nếu đã có carRentalLocations dạng array hoặc $values với đầy đủ thông tin, sử dụng luôn
              const hasLocations = carResult.carRentalLocations &&
                (Array.isArray(carResult.carRentalLocations) ||
                  (carResult.carRentalLocations as any)?.$values);
              
              if (hasLocations) {
                const locationsList = Array.isArray(carResult.carRentalLocations)
                  ? carResult.carRentalLocations
                  : (carResult.carRentalLocations as any)?.$values || [];
                
                if (locationsList.length > 0) {
                  const firstLocation = locationsList[0];
                  const hasFullInfo = firstLocation?.rentalLocation || firstLocation?.RentalLocation;
                  
                  if (hasFullInfo) {
                    // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location)
                    carResult.carRentalLocations = [firstLocation];
                    console.log(`[Car ${car.id}] Đã có carRentalLocations đầy đủ, chỉ lấy location đầu tiên`);
                    return carResult;
                  }
                }
              }

              // ✅ Logic mới: Duyệt qua tất cả locations, check xem location nào có car này
              console.log(`[Car ${car.id}] Finding locations using Car/GetByLocationId...`);
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
                  console.warn(`[Car ${car.id}] Error checking location ${locationId}:`, error);
                  // Tiếp tục với location tiếp theo
                }
              }

              // ✅ Chỉ lấy location đầu tiên (1 xe = 1 location) - đồng bộ với admin
              if (carLocations.length > 0) {
                carResult.carRentalLocations = [carLocations[0]];
                console.log(`[Car ${car.id}] ✅ Found ${carLocations.length} locations, using first location only`);
                } else {
                  carResult.carRentalLocations = [];
                console.log(`[Car ${car.id}] ⚠️ No locations found`);
                }

                return carResult;
            } catch (error) {
              console.error(`[All Cars Page] Error fetching locations for car ${car.id}:`, error);
              carResult.carRentalLocations = [];
              return carResult;
            }
            })
          );
          
        // Cập nhật lại activeCars với dữ liệu chi tiết
        activeCars = carsWithDetails;
        console.log(`[All Cars Page] Fetched details for ${activeCars.length} cars`);
        
        // Lấy danh sách loại xe có sẵn từ dữ liệu
        const uniqueCarTypes = Array.from(
          new Set(activeCars.map((car: Car) => car.sizeType).filter(Boolean))
        ) as string[];
        setAvailableCarTypes(uniqueCarTypes.sort());
      
        activeCars = activeCars.filter((car: any) => {
          const carLocations = car.carRentalLocations;
          if (!carLocations) {
            // Nếu không có location, vẫn hiển thị (backward compatibility)
            return true;
          }

          // Handle .NET format: có thể là array hoặc { $values: [...] }
          const locationsList = Array.isArray(carLocations)
            ? carLocations
            : (carLocations as any)?.$values || [];

          if (locationsList.length === 0) {
            // Nếu không có location, vẫn hiển thị (backward compatibility)
            return true;
          }

          // Lấy location đầu tiên
          const firstLocation = locationsList[0];
          const rentalLocation = firstLocation?.rentalLocation || firstLocation?.RentalLocation;
          
          if (!rentalLocation) {
            // Nếu không có rentalLocation, vẫn hiển thị (backward compatibility)
            return true;
          }

          // Filter theo location nếu có selectedLocationId
          if (selectedLocationId !== null) {
            const locationId = rentalLocation.id || rentalLocation.Id;
            return Number(locationId) === Number(selectedLocationId);
          }

          return true;
        });

        // Filter theo keyword (tên xe)
        if (keyword) {
          activeCars = activeCars.filter((car: any) => {
            const carName = (car.name || car.Name || "").toLowerCase();
            return carName.includes(keyword.toLowerCase());
          });
        }

        // Filter theo loại xe
        if (selectedCarType) {
          activeCars = activeCars.filter((car: any) => {
            return car.sizeType === selectedCarType;
          });
        }

        // Filter theo giá
        if (minPrice) {
          const min = parseFloat(minPrice);
          if (!isNaN(min)) {
            activeCars = activeCars.filter((car: any) => {
              const price = parseFloat(car.pricePerDay || car.PricePerDay || 0);
              return price >= min;
            });
          }
        }

        if (maxPrice) {
          const max = parseFloat(maxPrice);
          if (!isNaN(max)) {
            activeCars = activeCars.filter((car: any) => {
              const price = parseFloat(car.pricePerDay || car.PricePerDay || 0);
              return price <= max;
            });
          }
        }

        // Tính tổng số xe sau khi filter
        setTotalCount(activeCars.length);

        // Phân trang
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCars = activeCars.slice(startIndex, endIndex);
        
        setCars(paginatedCars);
        console.log(`[All Cars Page] Displaying ${paginatedCars.length} cars (page ${pageIndex + 1})`);
      }
    } catch (error) {
      console.error('[All Cars Page] Load cars error:', error);
      api.error({
        message: 'Lỗi tải danh sách xe',
        description: 'Không thể tải danh sách xe. Vui lòng thử lại sau.',
        placement: 'topRight',
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

    updateURLParams({ locationId: newLocationId, selectedLoc });
  };

  const handleCarTypeChange = (value: string | null) => {
    setSelectedCarType(value);
    setPageIndex(0);
    updateURLParams({ carType: value });
  };

  const formatPriceInput = (value: string) => {
    // Remove all non-digit characters
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    // Format with thousand separators
    return Number(numericValue).toLocaleString('vi-VN');
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    // Store raw numeric value (without formatting)
    const numericValue = value.replace(/[^\d]/g, '');
    if (type === 'min') {
      setMinPrice(numericValue);
    } else {
      setMaxPrice(numericValue);
    }
    setPageIndex(0);
  };

  const handlePriceBlur = (type: 'min' | 'max') => {
    const priceValue = type === 'min' ? minPrice : maxPrice;
    if (priceValue) {
      updateURLParams({ [type === 'min' ? 'minPrice' : 'maxPrice']: priceValue });
    }
  };

  const updateURLParams = (params: {
    page?: number;
    search?: string;
    locationId?: number | null;
    selectedLoc?: RentalLocationData | null;
    carType?: string | null;
    minPrice?: string;
    maxPrice?: string;
  }) => {
    const newParams = new URLSearchParams();
    
    if (params.page !== undefined && params.page !== null) {
      newParams.set('page', String(params.page + 1));
    } else if (pageIndex !== undefined) {
      newParams.set('page', String(pageIndex + 1));
    }
    
    if (params.search !== undefined) {
      newParams.set('search', params.search);
    } else if (keyword) {
      newParams.set('search', keyword);
    }
    
    if (params.locationId !== undefined) {
      if (params.locationId !== null) {
        newParams.set('locationId', String(params.locationId));
        if (params.selectedLoc) {
          newParams.set('location', params.selectedLoc.name || '');
        }
      }
    } else if (selectedLocationId !== null) {
      newParams.set('locationId', String(selectedLocationId));
      if (selectedLocation) {
        newParams.set('location', selectedLocation.name || '');
      }
    }
    
    if (params.carType !== undefined) {
      if (params.carType !== null) {
        newParams.set('carType', params.carType);
      }
    } else if (selectedCarType) {
      newParams.set('carType', selectedCarType);
    }
    
    if (params.minPrice !== undefined) {
      newParams.set('minPrice', params.minPrice);
    } else if (minPrice) {
      newParams.set('minPrice', minPrice);
    }
    
    if (params.maxPrice !== undefined) {
      newParams.set('maxPrice', params.maxPrice);
    } else if (maxPrice) {
      newParams.set('maxPrice', maxPrice);
    }
    
    const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  const handleSearch = () => {
    setKeyword(searchInput);
    setPageIndex(0);
    updateURLParams({ search: searchInput, page: 0 });
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
    if (selectedCarType) {
      params.set('carType', selectedCarType);
    }
    if (minPrice) {
      params.set('minPrice', minPrice);
    }
    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    }
    params.set('page', page.toString());
    router.push(`/cars/all?${params.toString()}`);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div className="space-y-4">
              {/* Row 1: Search input and location */}
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
              
              {/* Row 2: Car type and price filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-64">
                  <Select
                    size="large"
                    placeholder="Chọn loại xe"
                    value={selectedCarType ?? undefined}
                    onChange={(value) => handleCarTypeChange(value)}
                    allowClear
                    className="w-full"
                    options={availableCarTypes.map((type) => ({
                      value: type,
                      label: type,
                    }))}
                  />
                </div>
                <div className="flex-1 flex gap-2">
                  <Input
                    size="large"
                    placeholder="Giá tối thiểu (VNĐ)"
                    value={minPrice ? formatPriceInput(minPrice) : ''}
                    onChange={(e) => {
                      handlePriceChange('min', e.target.value);
                    }}
                    onBlur={() => handlePriceBlur('min')}
                    allowClear
                    className="flex-1"
                  />
                  <span className="self-center text-gray-500">-</span>
                  <Input
                    size="large"
                    placeholder="Giá tối đa (VNĐ)"
                    value={maxPrice ? formatPriceInput(maxPrice) : ''}
                    onChange={(e) => {
                      handlePriceChange('max', e.target.value);
                    }}
                    onBlur={() => handlePriceBlur('max')}
                    allowClear
                    className="flex-1"
                  />
                </div>
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
                  keyword || selectedLocationId || selectedCarType || minPrice || maxPrice
                    ? `Không tìm thấy xe phù hợp với bộ lọc đã chọn`
                    : "Chưa có xe nào trong hệ thống"
                }
              >
                {(keyword || selectedLocationId || selectedCarType || minPrice || maxPrice) && (
                  <Button 
                    type="primary" 
                    onClick={() => {
                      setKeyword("");
                      setSearchInput("");
                      setSelectedLocationId(null);
                      setSelectedLocation(null);
                      setSelectedCarType(null);
                      setMinPrice("");
                      setMaxPrice("");
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
                  <CarCard key={car.id} car={car} />
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

