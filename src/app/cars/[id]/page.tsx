"use client";

import React, { useState, useEffect, useCallback } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spin, message, notification, Modal, Button, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;
// Removed @ant-design/icons to standardize on lucide-react icons
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import CarMap from "@/components/CarMap";
import { carsApi, authApi, rentalLocationApi, carRentalLocationApi, rentalOrderApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { User } from "@/services/api";
import { authUtils } from "@/utils/auth";
import { geocodeAddress } from "@/utils/geocode";
import {
  MapPin,
  Bluetooth,
  Camera,
  Video,
  Navigation,
  Cog,
  Wind,
  Usb,
  Monitor,
  Snowflake,
  Sun,
  Speaker,
  Lightbulb,
  Armchair,
  AlertTriangle,
  Star,
  Share2,
  Heart,
  Shield,
  HelpCircle,
  Info,
  Phone,
  CheckCircle,
  Sparkles,
  Calendar,
} from "lucide-react";

//1
// params.id chính là số ID của xe trong đường dẫn (VD: /cars/5 → id = "5")
interface CarDetailPageProps {
  params: Promise<{ id: string }>;
}

type CarLocationDisplay = {
  id: number;
  name: string | null;
  address: string | null;
  quantity: number | null;
};

const extractCarRentalLocationList = (source: any): any[] => {
  if (!source) return [];
  const raw = source?.carRentalLocations ?? source;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.$values)) {
    return raw.$values;
  }

  if (raw?.data) {
    if (Array.isArray(raw.data)) {
      return raw.data;
    }
    if (Array.isArray(raw.data?.$values)) {
      return raw.data.$values;
    }
  }

  return [];
};

const normalizeRentalLocationsData = (raw: any): any[] => {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.$values)) {
    return raw.$values;
  }

  if (raw?.data) {
    if (Array.isArray(raw.data)) {
      return raw.data;
    }
    if (Array.isArray(raw.data?.$values)) {
      return raw.data.$values;
    }
  }

  return [];
};

const getLocationIdFromRelation = (relation: any): number | null => {
  const candidates = [
    relation?.locationId,
    relation?.LocationId,
    relation?.rentalLocationId,
    relation?.RentalLocationId,
    relation?.rentalLocation?.id,
    relation?.rentalLocation?.Id,
    relation?.rentalLocation?.locationId,
    relation?.rentalLocation?.LocationId,
    relation?.RentalLocation?.id,
    relation?.RentalLocation?.Id,
    relation?.RentalLocation?.locationId,
    relation?.RentalLocation?.LocationId,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) {
      return Number(candidate);
    }
  }

  return null;
};

const getNameFromSource = (source: any): string | null => {
  const candidates = [
    source?.name,
    source?.Name,
    source?.locationName,
    source?.LocationName,
    source?.rentalLocation?.name,
    source?.rentalLocation?.Name,
    source?.RentalLocation?.name,
    source?.RentalLocation?.Name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const getAddressFromSource = (source: any): string | null => {
  const candidates = [
    source?.address,
    source?.Address,
    source?.locationAddress,
    source?.LocationAddress,
    source?.rentalLocation?.address,
    source?.rentalLocation?.Address,
    source?.RentalLocation?.address,
    source?.RentalLocation?.Address,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const getQuantityFromRelation = (relation: any): number | null => {
  const candidates = [
    relation?.quantity,
    relation?.Quantity,
    relation?.availableQuantity,
    relation?.AvailableQuantity,
    relation?.stock,
    relation?.Stock,
    relation?.carQuantity,
    relation?.CarQuantity,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

export default function CarDetailPage({ params }: CarDetailPageProps) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  //2
  // car: xe hiện tại
  // otherCars: các xe khác để hiển thị bên dưới
  // loading: hiển thị vòng xoay loading khi chờ API

  const [car, setCar] = useState<Car | null>(null);
  const [otherCars, setOtherCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [carCoords, setCarCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [carAddress, setCarAddress] = useState<string | null>(null);
  const [carLocations, setCarLocations] = useState<CarLocationDisplay[]>([]);
  const [carLocationsLoading, setCarLocationsLoading] = useState(false);
  const [userOrderIdForCar, setUserOrderIdForCar] = useState<number | null>(null);
  const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false);
  const [selectedLocationFromUrl, setSelectedLocationFromUrl] = useState<{ id: number; name: string; address: string } | null>(null);
  const [dateRangeValue, setDateRangeValue] = useState<[Dayjs, Dayjs] | null>(null);

  // Load location from URL if locationId exists
  useEffect(() => {
    const locationId = searchParams?.get('locationId');
    if (locationId) {
      const loadLocationFromUrl = async () => {
        try {
          const locationIdNum = parseInt(locationId);
          const response = await rentalLocationApi.getAll();
          if (response.success && response.data) {
            const locationsData = response.data as any;
            const locationsList = Array.isArray(locationsData)
              ? locationsData
              : (locationsData?.$values && Array.isArray(locationsData.$values) ? locationsData.$values : []);
            
            const location = locationsList.find((loc: any) => {
              const locId = loc.id ?? loc.Id ?? loc.locationId ?? loc.LocationId;
              return Number(locId) === locationIdNum;
            });
            
            if (location) {
              setSelectedLocationFromUrl({
                id: location.id ?? location.Id ?? locationIdNum,
                name: location.name ?? location.Name ?? '',
                address: location.address ?? location.Address ?? '',
              });
            }
          }
        } catch (error) {
          console.error('Load location from URL error:', error);
        }
      };
      
      loadLocationFromUrl();
    } else {
      setSelectedLocationFromUrl(null);
    }
  }, [searchParams]);

  // Debug: Log khi otherCars thay đổi
  useEffect(() => {
    console.log('[Car Detail] otherCars state updated:', otherCars);
    console.log('[Car Detail] otherCars length:', otherCars.length);
  }, [otherCars]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [documentType, setDocumentType] = useState<'id' | 'passport'>('id');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [documentWarningModal, setDocumentWarningModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: '', content: '' });

  const loadCarLocations = useCallback(async (carData: Car) => {
    setCarLocationsLoading(true);

    try {
      let relations = extractCarRentalLocationList(carData);

      if (!relations.length) {
        console.log('[Car Detail] loadCarLocations: No carRentalLocations in car data, fetching via carRentalLocationApi...');
        try {
          const relationResponse = await carRentalLocationApi.getByCarId(Number(carData.id));
          if (relationResponse.success && relationResponse.data) {
            relations = extractCarRentalLocationList({ carRentalLocations: relationResponse.data });
          }
        } catch (error) {
          console.warn('[Car Detail] loadCarLocations: Failed to load carRentalLocations via API', error);
        }
      }

      if (!relations.length) {
        console.log('[Car Detail] loadCarLocations: No relations found');
        setCarLocations([]);
        return;
      }

      const locationIds = new Set<number>();
      const relationsByLocation = new Map<number, any[]>();

      relations.forEach((relation: any) => {
        const locId = getLocationIdFromRelation(relation);
        if (locId === null) {
          return;
        }

        locationIds.add(locId);
        if (!relationsByLocation.has(locId)) {
          relationsByLocation.set(locId, []);
        }
        relationsByLocation.get(locId)?.push(relation);
      });

      if (!locationIds.size) {
        console.log('[Car Detail] loadCarLocations: No location IDs resolved from relations');
        setCarLocations([]);
        return;
      }

      const locationInfoMap = new Map<number, { name: string | null; address: string | null }>();

      relations.forEach((relation: any) => {
        const locId = getLocationIdFromRelation(relation);
        if (locId === null) return;

        const infoSource = relation?.rentalLocation ?? relation?.RentalLocation ?? relation;
        const name = getNameFromSource(infoSource);
        const address = getAddressFromSource(infoSource);

        if ((name || address) && !locationInfoMap.has(locId)) {
          locationInfoMap.set(locId, {
            name: name ?? null,
            address: address ?? null,
          });
        }
      });

      if (locationInfoMap.size < locationIds.size) {
        console.log('[Car Detail] loadCarLocations: Fetching rental locations list for missing details...');
        try {
          const locationsResponse = await rentalLocationApi.getAll();
          if (locationsResponse.success && locationsResponse.data) {
            const locationsList = normalizeRentalLocationsData(locationsResponse.data);
            // CHỈ lấy thông tin cho các locationIds đã có trong relations (có xe này)
            locationsList.forEach((location: any) => {
              const locId = Number(
                location?.id ??
                  location?.Id ??
                  location?.locationId ??
                  location?.LocationId ??
                  location?.rentalLocationId ??
                  location?.RentalLocationId
              );

              // CHỈ lấy thông tin nếu locationId có trong danh sách locations có xe này
              if (!Number.isNaN(locId) && locationIds.has(locId)) {
                locationInfoMap.set(locId, {
                  name: getNameFromSource(location),
                  address: getAddressFromSource(location),
                });
              }
            });
          }
        } catch (error) {
          console.warn('[Car Detail] loadCarLocations: Unable to fetch rental locations list', error);
        }
      }

      // ✅ Đồng bộ với admin: Lấy location đầu tiên TRƯỚC KHI sort/filter
      // Lấy relation đầu tiên từ danh sách relations gốc
      const firstRelation = relations[0];
      if (!firstRelation) {
        console.log('[Car Detail] loadCarLocations: No first relation found');
        setCarLocations([]);
        return;
      }

      const firstLocationId = getLocationIdFromRelation(firstRelation);
      if (!firstLocationId) {
        console.log('[Car Detail] loadCarLocations: Could not extract locationId from first relation');
        setCarLocations([]);
        return;
      }

      // Lấy thông tin location từ locationInfoMap hoặc fetch
      let locationName: string | null = null;
      let locationAddress: string | null = null;

      const infoFromMap = locationInfoMap.get(firstLocationId);
      if (infoFromMap) {
        locationName = infoFromMap.name;
        locationAddress = infoFromMap.address;
      } else {
        // Nếu chưa có trong map, lấy từ relation
        const infoSource = firstRelation?.rentalLocation ?? firstRelation?.RentalLocation ?? firstRelation;
        locationName = getNameFromSource(infoSource);
        locationAddress = getAddressFromSource(infoSource);
      }

      // Nếu vẫn chưa có, fetch từ API
      if ((!locationName && !locationAddress) && locationInfoMap.size < locationIds.size) {
        try {
          const locationResponse = await rentalLocationApi.getById(firstLocationId);
          if (locationResponse.success && locationResponse.data) {
            const loc = locationResponse.data as any;
            locationName = loc.name ?? loc.Name ?? null;
            locationAddress = loc.address ?? loc.Address ?? null;
          }
        } catch (error) {
          console.warn('[Car Detail] loadCarLocations: Failed to fetch location detail', error);
        }
      }

      // Tạo final details với chỉ location đầu tiên
      const finalDetails: CarLocationDisplay[] = [{
        id: firstLocationId,
        name: locationName,
        address: locationAddress,
        quantity: null, // Không cần quantity cho display
      }];

      console.log('[Car Detail] loadCarLocations: Final details (first location only)', finalDetails);
      setCarLocations(finalDetails);
    } catch (error) {
      console.error('[Car Detail] loadCarLocations error:', error);
      setCarLocations([]);
    } finally {
      setCarLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (car) {
      loadCarLocations(car);
    } else {
      setCarLocations([]);
    }
  }, [car, loadCarLocations]);

  // Khi carLocations được load và chưa có carCoords/carAddress, lấy từ location đầu tiên
  useEffect(() => {
    if (carLocations.length > 0 && !carCoords && !carAddress && !carLocationsLoading) {
      const firstLocation = carLocations[0];
      console.log('[Car Detail] Using first location from carLocations:', firstLocation);
      
      // Format address: name + address hoặc chỉ address/name
      let displayAddress = '';
      if (firstLocation.name && firstLocation.address) {
        displayAddress = `${firstLocation.name}, ${firstLocation.address}`;
      } else if (firstLocation.address) {
        displayAddress = firstLocation.address;
      } else if (firstLocation.name) {
        displayAddress = firstLocation.name;
      }
      
      if (displayAddress) {
        setCarAddress(displayAddress);
        console.log('[Car Detail] ✅ Set carAddress from carLocations:', displayAddress);
      }
      
      // Nếu có address, thử geocode để lấy coordinates
      const addressToGeocode = firstLocation.address || firstLocation.name;
      if (addressToGeocode && !carCoords) {
        console.log('[Car Detail] Geocoding address from carLocations:', addressToGeocode);
        geocodeAddress(addressToGeocode).then((coords) => {
          if (coords) {
            setCarCoords(coords);
            console.log('[Car Detail] ✅ Set carCoords from geocoding:', coords);
          }
        }).catch((error) => {
          console.error('[Car Detail] Geocoding error:', error);
        });
      }
    }
  }, [carLocations, carCoords, carAddress, carLocationsLoading]);

  // Helper: Parse coordinates từ string "lat,lng" hoặc "{lat},{lng}"
  const parseCoordinates = (coordsString: string | null | undefined): { lat: number; lng: number } | null => {
    if (!coordsString || typeof coordsString !== 'string') return null;
    
    try {
      // Thử parse dạng "lat,lng" hoặc "lat, lng"
      const parts = coordsString.trim().split(/[,\s]+/);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.error('Parse coordinates error:', error);
    }
    return null;
  };

  // Helper: Lấy địa chỉ và tọa độ từ car
  const getCarLocation = async (carData: any): Promise<{ address: string | null; name: string | null; coords: { lat: number; lng: number } | null }> => {
    try {
      console.log('[getCarLocation] Car data:', carData);
      console.log('[getCarLocation] carRentalLocations:', carData?.carRentalLocations);
      
      // Lấy carRentalLocations
      const rl = carData?.carRentalLocations;
      if (!rl) {
        console.warn('[getCarLocation] No carRentalLocations found in car data');
        
        // Fallback: Thử lấy rentalLocationId từ carRentalLocations hoặc từ nơi khác
        // Nếu có rentalLocationId, gọi API để lấy location
        const rentalLocationId = carData?.rentalLocationId ?? carData?.RentalLocationId;
        if (rentalLocationId) {
          console.log('[getCarLocation] Found rentalLocationId, fetching from API:', rentalLocationId);
          try {
            const locationResponse = await rentalLocationApi.getById(rentalLocationId);
            if (locationResponse.success && locationResponse.data) {
              const loc = locationResponse.data;
              const nameStr = loc.name || null;
              const addrStr = loc.address || null;
              const coords = parseCoordinates(loc.coordinates);
              
              // Format: "Name - Address"
              let locationDisplay: string | null = null;
              if (nameStr && addrStr) {
                locationDisplay = `${nameStr} - ${addrStr}`;
              } else if (addrStr) {
                locationDisplay = addrStr;
              } else if (nameStr) {
                locationDisplay = nameStr;
              }
              
              // Geocode nếu chưa có coords
              let finalCoords = coords;
              if (!finalCoords && addrStr) {
                finalCoords = await geocodeAddress(addrStr);
              }
              
              return { address: locationDisplay || addrStr, name: nameStr, coords: finalCoords };
            }
          } catch (apiError) {
            console.error('[getCarLocation] Error fetching location from API:', apiError);
          }
        }
        
        return { address: null, name: null, coords: null };
      }

      // Xử lý dạng .NET { $values: [...] }
      const list = Array.isArray(rl) ? rl : rl.$values || [];
      console.log('[getCarLocation] Processed list:', list);
      if (!Array.isArray(list) || list.length === 0) {
        console.warn('[getCarLocation] List is empty or not an array');
        
        // Fallback: Thử lấy rentalLocationId từ car data và gọi API
        const rentalLocationId = carData?.rentalLocationId ?? carData?.RentalLocationId;
        if (rentalLocationId) {
          console.log('[getCarLocation] Fallback: Found rentalLocationId, fetching from API:', rentalLocationId);
          try {
            const locationResponse = await rentalLocationApi.getById(rentalLocationId);
            if (locationResponse.success && locationResponse.data) {
              const loc = locationResponse.data;
              const nameStr = loc.name || null;
              const addrStr = loc.address || null;
              const coords = parseCoordinates(loc.coordinates);
              
              let locationDisplay: string | null = null;
              if (nameStr && addrStr) {
                locationDisplay = `${nameStr} - ${addrStr}`;
              } else if (addrStr) {
                locationDisplay = addrStr;
              } else if (nameStr) {
                locationDisplay = nameStr;
              }
              
              let finalCoords = coords;
              if (!finalCoords && addrStr) {
                finalCoords = await geocodeAddress(addrStr);
              }
              
              return { address: locationDisplay || addrStr, name: nameStr, coords: finalCoords };
            }
          } catch (apiError) {
            console.error('[getCarLocation] Error fetching location from API:', apiError);
          }
        }
        
        return { address: null, name: null, coords: null };
      }

      // Ưu tiên location đang active, nếu không có thì lấy phần tử đầu tiên
      const active = list.find((l: any) => (l?.isActive ?? l?.IsActive) && !(l?.isDeleted ?? l?.IsDeleted)) || list[0];
      console.log('[getCarLocation] Active location:', active);
      
      // Lấy rentalLocationId từ active location để fallback nếu cần
      const rentalLocationId = active?.rentalLocationId ?? active?.RentalLocationId ?? 
                               active?.rentalLocation?.id ?? active?.rentalLocation?.Id ??
                               active?.id ?? active?.Id;
      console.log('[getCarLocation] RentalLocationId from active:', rentalLocationId);
      
      // Lấy name và address - thử nhiều cách
      let nameStr: string | null = null;
      let addressStr: string | null = null;
      
      const name = active?.name ?? active?.Name ?? active?.rentalLocation?.name ?? active?.rentalLocation?.Name;
      nameStr = typeof name === 'string' && name.trim() ? name.trim() : null;
      
      const address = active?.address ?? active?.Address ?? active?.rentalLocation?.address ?? active?.rentalLocation?.Address;
      addressStr = typeof address === 'string' && address.trim() ? address.trim() : null;
      console.log('[getCarLocation] Name found:', nameStr);
      console.log('[getCarLocation] Address found:', addressStr);
      
      // Nếu không có name hoặc address, thử gọi API bằng rentalLocationId
      if ((!nameStr || !addressStr) && rentalLocationId) {
        console.log('[getCarLocation] Missing name or address, fetching from API with rentalLocationId:', rentalLocationId);
        try {
          const locationResponse = await rentalLocationApi.getById(rentalLocationId);
          if (locationResponse.success && locationResponse.data) {
            const loc = locationResponse.data;
            if (!nameStr) nameStr = loc.name || null;
            if (!addressStr) addressStr = loc.address || null;
            console.log('[getCarLocation] Updated from API - name:', nameStr, 'address:', addressStr);
          }
        } catch (apiError) {
          console.error('[getCarLocation] Error fetching location from API:', apiError);
        }
      }

      // Lấy coordinates - thử nhiều cách
      let coords: { lat: number; lng: number } | null = null;
      
      // Thử lấy từ coordinates string trước
      const coordsString = active?.coordinates ?? active?.Coordinates ?? active?.rentalLocation?.coordinates ?? active?.rentalLocation?.Coordinates;
      console.log('[getCarLocation] Coordinates string:', coordsString);
      if (coordsString) {
        coords = parseCoordinates(coordsString);
        console.log('[getCarLocation] Parsed coordinates:', coords);
      }

      // Nếu không có coordinates từ string, thử geocode từ address
      if (!coords && addressStr) {
        console.log('[getCarLocation] Geocoding address:', addressStr);
        coords = await geocodeAddress(addressStr);
        console.log('[getCarLocation] Geocoded coordinates:', coords);
      }

      // Format: "Name - Address" hoặc chỉ Address nếu không có Name
      let locationDisplay: string | null = null;
      if (nameStr && addressStr) {
        locationDisplay = `${nameStr} - ${addressStr}`;
      } else if (addressStr) {
        locationDisplay = addressStr;
      } else if (nameStr) {
        locationDisplay = nameStr;
      }

      const result = { 
        address: locationDisplay || addressStr, 
        name: nameStr,
        coords 
      };
      console.log('[getCarLocation] Final result:', result);
      return result;
    } catch (error) {
      console.error('[getCarLocation] Error:', error);
      return { address: null, name: null, coords: null };
    }
  };

  //3
  //  → Gọi API /api/Car để lấy tất cả xe
  // → Lọc ra những xe còn hoạt động (isActive && !isDeleted)
  // → Tìm xe có ID đúng với URL
  // → Nếu có → hiển thị
  // → Nếu không → notFound() (404)
  useEffect(() => {
    const loadCar = async () => {
      try {
        const carId = parseInt(resolvedParams.id);
        if (isNaN(carId)) {
          notFound();
          return;
        }

        // Lấy tất cả xe để tìm xe hiện tại và xe khác
        const response = await carsApi.getAll();
        
        console.log('[Car Detail] API Response:', response);
        console.log('[Car Detail] Response.data:', response.data);

        if (response.success && response.data) {
          // Xử lý nhiều định dạng response từ backend
          const raw = response.data as any;
          const data = raw?.data ?? raw; // supports { isSuccess, data } or direct array
          const values = data?.$values ?? data?.data?.$values; // supports .data.$values
          const carsData = Array.isArray(data)
            ? data
            : Array.isArray(values)
            ? values
            : Array.isArray(raw)
            ? raw
            : [];
          
          console.log('[Car Detail] carsData after processing:', carsData);
          console.log('[Car Detail] carsData is array:', Array.isArray(carsData));
          
          // Lọc xe active và chưa xóa
          const activeCars = Array.isArray(carsData)
            ? carsData.filter((c: Car) => c && c.isActive && !c.isDeleted)
            : [];
          
          console.log('[Car Detail] activeCars:', activeCars);
          console.log('[Car Detail] activeCars length:', activeCars.length);

          // Tìm xe hiện tại
          const currentCar = activeCars.find((c: Car) => c.id === carId);

          if (!currentCar) {
            console.error('[Car Detail] Car not found with id:', carId);
            notFound();
            return;
          }

          console.log('[Car Detail] Current car found:', currentCar);
          console.log('[Car Detail] Current car carRentalLocations:', currentCar.carRentalLocations);
          setCar(currentCar);
          
          // Lấy tọa độ và địa chỉ từ xe
          // Nếu không có carRentalLocations trong getAll, gọi getById để lấy đầy đủ
          let carWithLocation = currentCar;
          const hasCarRentalLocations = currentCar.carRentalLocations && 
            ((Array.isArray(currentCar.carRentalLocations) && currentCar.carRentalLocations.length > 0) ||
             (currentCar.carRentalLocations.$values && currentCar.carRentalLocations.$values.length > 0));
          
          console.log('[Car Detail] Has carRentalLocations:', hasCarRentalLocations);
          
          if (!hasCarRentalLocations) {
            // Gọi getById để lấy đầy đủ relationships
            console.log('[Car Detail] Fetching car details by ID...');
            try {
              const detailResponse = await carsApi.getById(String(carId));
              console.log('[Car Detail] getById response:', detailResponse);
              if (detailResponse.success && detailResponse.data) {
                carWithLocation = detailResponse.data;
                console.log('[Car Detail] Updated carWithLocation:', carWithLocation);
                setCar(carWithLocation);
              }
            } catch (error) {
              console.error('[Car Detail] Error fetching car details:', error);
            }
          }

          // Lấy location từ car
          console.log('[Car Detail] Getting location from carWithLocation...');
          const location = await getCarLocation(carWithLocation);
          console.log('[Car Detail] Location data received:', location);
          
          if (location.address) {
            setCarAddress(location.address);
            console.log('[Car Detail] ✅ Set carAddress:', location.address);
          } else {
            console.warn('[Car Detail] ⚠️ No address found');
          }
          
          if (location.coords) {
            setCarCoords(location.coords);
            console.log('[Car Detail] ✅ Set carCoords:', location.coords);
          } else {
            console.warn('[Car Detail] ⚠️ No coordinates found for car');
          }
          
          // Lọc các xe khác (không phải xe hiện tại) theo cùng sizeType và lấy 3 xe đầu tiên
          const currentCarSizeType = currentCar.sizeType;
          console.log('[Car Detail] Current car sizeType:', currentCarSizeType);
          
          const otherCarsList = activeCars
            .filter((c: Car) => 
              c && 
              c.id !== carId && 
              c.sizeType === currentCarSizeType
            )
            .slice(0, 3);
          
          console.log('[Car Detail] otherCarsList (filtered by sizeType):', otherCarsList);
          console.log('[Car Detail] otherCarsList length:', otherCarsList.length);
          
          setOtherCars(otherCarsList);
        } else {
          console.error('[Car Detail] API failed or no data:', response);
          setOtherCars([]);
        }
      } catch (error) {
        console.error('Load car error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCar();
  }, [resolvedParams.id]);

  // Load user profile để kiểm tra status
  useEffect(() => {
    const loadUserProfile = async () => {
      // Nếu đã có user trong localStorage, sử dụng luôn
      const localUser = authUtils.getCurrentUser();
      if (localUser) {
        setUser(localUser);
        // Vẫn gọi API để lấy thông tin mới nhất (bao gồm status)
        // Nếu API fail (ví dụ 405), vẫn giữ user từ localStorage
        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
            // Cập nhật lại localStorage
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error: any) {
          // 405 hoặc các lỗi khác - chỉ log warning, không throw
          // Vì đã có user từ localStorage rồi
          if (error?.error?.includes('405') || error?.includes('405')) {
            console.warn('[Car Detail] getProfile returned 405 - endpoint may not exist, using localStorage user');
          } else {
            console.warn('[Car Detail] Load user profile error (non-critical):', error);
          }
        }
      } else if (authUtils.isAuthenticated()) {
        // Có token nhưng chưa có user trong localStorage, gọi API
        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('Load user profile error:', error);
        }
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    if (!user?.id || !car?.id) {
      setUserOrderIdForCar(null);
      return;
    }

    const checkUserOrders = async () => {
      setCheckingReviewEligibility(true);
      try {
        const response = await rentalOrderApi.getByUserId(Number(user.id));
        if (response.success && response.data) {
          const raw = response.data as any;
          const orders = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.$values)
            ? raw.$values
            : [];

          const matchedOrder = orders.find((order: any) => {
            const orderCarId = Number(order?.carId ?? order?.CarId);
            if (Number.isNaN(orderCarId)) return false;
            if (orderCarId !== Number(car.id)) return false;
            const status = (order?.status ?? order?.Status ?? "").toString().toLowerCase();
            return status !== "cancelled" && status !== "rejected";
          });

          if (matchedOrder) {
            const orderId =
              Number(matchedOrder?.id ?? matchedOrder?.Id ?? matchedOrder?.orderId ?? matchedOrder?.OrderId) || null;
            setUserOrderIdForCar(orderId);
          } else {
            setUserOrderIdForCar(null);
          }
        } else {
          setUserOrderIdForCar(null);
        }
      } catch (error) {
        console.error("Check user rental orders error:", error);
        setUserOrderIdForCar(null);
      } finally {
        setCheckingReviewEligibility(false);
      }
    };

    checkUserOrders();
  }, [user?.id, car?.id]);

  //4 
  //Hiện thị khi đang load 
  //Dùng spinner từ thư viện Ant Design
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-4">
            <Spin size="large" />
            <p className="text-gray-600">Đang tải thông tin xe...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!car) {
    notFound();
    return null;
  }
  
  // → Định dạng tiền VND:
  // 1500000 → 1.500.000 ₫
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Điều hướng đến trang booking
  const handleBookingClick = () => {
    if (!dateRangeValue || !dateRangeValue[0] || !dateRangeValue[1]) {
      message.warning('Vui lòng chọn thời gian thuê xe');
      return;
    }
    
    const locationId = searchParams?.get('locationId');
    const params = new URLSearchParams();
    if (locationId) {
      params.set('locationId', locationId);
    }
    // Thêm thời gian thuê vào URL params
    if (dateRangeValue[0] && dateRangeValue[1]) {
      params.set('startDate', dateRangeValue[0].format('YYYY-MM-DDTHH:mm'));
      params.set('endDate', dateRangeValue[1].format('YYYY-MM-DDTHH:mm'));
    }
    const queryString = params.toString();
    router.push(`/booking/${car.id}${queryString ? `?${queryString}` : ''}`);
  };

  //5
  // Ảnh
  // Tên, Model
  // Thông số (loại, số chỗ, dung tích cốp, pin, v.v.)
  // Giá thuê (ngày, giờ, có tài xế)
  // Nút "Thuê xe ngay"
  // Nút Gọi tư vấn / Chat hỗ trợ
  // Phần "Xe khác" (hiển thị 3 xe ngẫu nhiên khác)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Add top padding to prevent content being hidden behind fixed header */}
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
        {/* Breadcrumb - Đường dẫn điều hướng */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm mb-4">
            <li>
              <Link 
                href="/" 
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-1"
              >
                <span>🏠</span>
                <span>Trang chủ</span>
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link 
                href="/#cars" 
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-1"
              >
                <span>🚗</span>
                <span>Xe điện</span>
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-blue-600 font-semibold flex items-center gap-1">
              <span>📋</span>
              <span>{car.name}</span>
            </li>
          </ol>
        </nav>

        {/* Hình ảnh xe - Gallery với 3 ảnh */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ảnh chính - chiếm 2 cột */}
            <div 
              className="md:col-span-2 cursor-pointer group relative overflow-hidden rounded-lg"
              onClick={() => {
                setSelectedImageIndex(0);
                setIsImageModalOpen(true);
              }}
            >
              <img
                src={car.imageUrl || '/logo_ev.png'}
                alt={car.name}
                className="w-full h-full md:h-96 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_ev.png';
                }}
              />
            </div>
            
            {/* Ảnh phụ 1 và 2 - chia đều chiều cao */}
            <div className="grid grid-cols-1 gap-4 h-full md:h-96">
              {car.imageUrl2 ? (
                <div 
                  className="flex-1 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedImageIndex(1);
                    setIsImageModalOpen(true);
                  }}
                >
                  <img
                    src={car.imageUrl2}
                    alt={`${car.name} - Ảnh 2`}
                    className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Chưa có ảnh 2</span>
                </div>
              )}
              {car.imageUrl3 ? (
                <div 
                  className="flex-1 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedImageIndex(2);
                    setIsImageModalOpen(true);
                  }}
                >
                  <img
                    src={car.imageUrl3}
                    alt={`${car.name} - Ảnh 3`}
                    className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Chưa có ảnh 3</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal xem ảnh chi tiết */}
        <Modal
          open={isImageModalOpen}
          onCancel={() => setIsImageModalOpen(false)}
          footer={null}
          width="90vw"
          style={{ top: 20 }}
          centered
          className="image-viewer-modal"
        >
          {car && (
            <div className="flex flex-col items-center">
              {/* Ảnh lớn */}
              <div className="w-full flex justify-center mb-4">
                <img
                  src={
                    selectedImageIndex === 0 ? (car.imageUrl || '/logo_ev.png') :
                    selectedImageIndex === 1 ? (car.imageUrl2 || '/logo_ev.png') :
                    (car.imageUrl3 || '/logo_ev.png')
                  }
                  alt={car.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_ev.png';
                  }}
                />
              </div>
              
              {/* Thumbnail navigation */}
              <div className="flex gap-3 mt-4 justify-center">
                {car.imageUrl && (
                  <img
                    src={car.imageUrl}
                    alt={`${car.name} - Ảnh 1`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                      selectedImageIndex === 0 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImageIndex(0)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                )}
                {car.imageUrl2 && (
                  <img
                    src={car.imageUrl2}
                    alt={`${car.name} - Ảnh 2`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                      selectedImageIndex === 1 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImageIndex(1)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                )}
                {car.imageUrl3 && (
                  <img
                    src={car.imageUrl3}
                    alt={`${car.name} - Ảnh 3`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                      selectedImageIndex === 2 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedImageIndex(2)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Phần thông tin xe chính - Chiếm 2/3 cột */}
          <div className="lg:col-span-2 space-y-4">
            {/* Vehicle Header */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {car.name} {car.model && car.model}
                  </h1>

                  {/* Rating và số chuyến */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-400 text-lg" />
                      <span className="font-semibold text-gray-900">5.0</span>
                    </div>
                    <span className="text-sm text-gray-500">100+ chuyến</span>
                  </div>

                  {/* Location */}
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedLocationFromUrl ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        <span>
                          {selectedLocationFromUrl.name && `${selectedLocationFromUrl.name} - `}
                          {selectedLocationFromUrl.address}
                        </span>
                      </span>
                    ) : carAddress ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        <span>{carAddress}</span>
                      </span>
                    ) : (
                      <>
                        {(() => {
                          // Thử lấy từ carRentalLocations trực tiếp
                          const rl = car.carRentalLocations;
                          if (rl) {
                            const list = Array.isArray(rl) ? rl : rl.$values || [];
                            if (list.length > 0) {
                              const active = list.find((l: any) => (l?.isActive ?? l?.IsActive) && !(l?.isDeleted ?? l?.IsDeleted)) || list[0];
                              
                              // Lấy name và address
                              const name = active?.name ?? active?.Name ?? active?.rentalLocation?.name ?? active?.rentalLocation?.Name;
                              const addr = active?.address ?? active?.Address ?? active?.rentalLocation?.address ?? active?.rentalLocation?.Address;
                              
                              const nameStr = name && typeof name === 'string' && name.trim() ? name.trim() : null;
                              const addrStr = addr && typeof addr === 'string' && addr.trim() ? addr.trim() : null;
                              
                              // Format: "Name - Address" hoặc chỉ Address
                              if (nameStr && addrStr) {
                                return (
                                  <span className="flex items-center gap-2">
                                    <MapPin className="text-blue-600" />
                                    <span>{nameStr} - {addrStr}</span>
                                  </span>
                                );
                              } else if (addrStr) {
                                return (
                                  <span className="flex items-center gap-2">
                                    <MapPin className="text-blue-600" />
                                    <span>{addrStr}</span>
                                  </span>
                                );
                              } else if (nameStr) {
                                return (
                                  <span className="flex items-center gap-2">
                                    <MapPin className="text-blue-600" />
                                    <span>{nameStr}</span>
                                  </span>
                                );
                              }
                            }
                          }
               
                        })()}
                      </>
                    )}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm">
                      <Shield className="text-white" />
                      <span>Miễn thế chấp</span>
                    </div>
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Share2 className="text-gray-600 text-lg" />
                  </button>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Heart className={`text-lg ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

      
            <div className="bg-white rounded-lg shadow-lg p-4">
             
            {/* <h2 className="text-xl font-bold text-gray-900 mb-4">
                <MapPin className="inline-block mr-2 text-blue-600" /> Vị trí xe
              </h2>

              {loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <MapPin className="inline-block text-blue-600" />
                  <p className="text-gray-600">Đang tải vị trí xe...</p>
                </div>
              )}

              {!loading && carCoords && (
                <>
                  {carAddress && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <MapPin className="inline-block mr-2 text-blue-600" />
                        <strong>Địa chỉ:</strong> {carAddress}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <CarMap
                      cars={[
                        {
                          ...car,
                          coords: carCoords,
                          primaryAddress: carAddress || undefined,
                        },
                      ]}
                      center={[carCoords.lat, carCoords.lng]}
                      zoom={15}
                      height={400}
                    />
                  </div>
                </>
              )} */}

              {/* {!loading && !carCoords && carAddress && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <MapPin className="inline-block mr-2 text-yellow-600" />
                    <strong>Địa chỉ:</strong> {carAddress}
                  </p>
                  <p className="text-xs text-gray-500">
                    Đang xử lý tọa độ để hiển thị bản đồ...
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    (Kiểm tra console để xem chi tiết debug)
                  </p>
                </div>
              )}
               */}

              {!loading && !carCoords && !carAddress && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {carLocationsLoading ? (
                    <>
                      <p className="text-sm text-gray-500 mb-2">
                        <MapPin className="inline-block mr-2 text-gray-500" />
                        Đang tải thông tin vị trí xe...
                      </p>
                      <p className="text-xs text-gray-400">
                        Vui lòng đợi trong giây lát...
                      </p>
                    </>
                  ) : carLocations.length > 0 ? (
                    <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 max-w-[250px]">
                      <MapPin size={12} className="flex-shrink-0 text-blue-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {carLocations[0].name && (
                          <div className="text-xs font-medium text-gray-800 leading-tight">
                            {carLocations[0].name}
                          </div>
                        )}
                        {carLocations[0].address && (
                          <div className="text-xs text-gray-600 leading-tight mt-0.5">
                            {carLocations[0].address}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-2">
                        <MapPin className="inline-block mr-2 text-gray-500" />
                        Chưa có thông tin vị trí xe
                      </p>
                      <p className="text-xs text-gray-400">
                        Xe này chưa được gán vào địa điểm thuê xe nào
                      </p>
                    </>
                  )}
                </div>
              )}

              {!loading && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Xe hiện có tại địa điểm
                  </h3>

                  {carLocationsLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Spin size="small" />
                      <span>Đang tải danh sách địa điểm...</span>
                    </div>
                  )}

                  {!carLocationsLoading && carLocations.length > 0 && (
                    <div className="space-y-3">
                      {carLocations.map((location) => (
                        <div
                          key={`${location.id}-${location.name ?? ''}-${location.address ?? ''}`}
                          className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 max-w-[250px]"
                        >
                          <MapPin size={12} className="flex-shrink-0 text-blue-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {location.name && (
                              <div className="text-xs font-medium text-gray-800 leading-tight">
                                {location.name}
                              </div>
                            )}
                            {location.address && (
                              <div className="text-xs text-gray-600 leading-tight mt-0.5">
                                {location.address}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!carLocationsLoading && carLocations.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Chưa có thông tin địa điểm cho xe này. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Đặc điểm (Features) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Đặc điểm</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* Truyền động */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Truyền động</p>
                  <p className="font-bold text-gray-900">Số tự động</p>
                </div>

                {/* Số ghế */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Số ghế</p>
                  <p className="font-bold text-gray-900">{car.seats} chỗ</p>
                </div>

                {/* Nhiên liệu */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Nhiên liệu</p>
                  <p className="font-bold text-gray-900">Điện</p>
                </div>

                {/* Tiêu hao */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Tiêu hao</p>
                  <p className="font-bold text-gray-900">{car.batteryDuration}km/100%</p>
                </div>
              </div>
            </div>

            {/* Mô tả (Description) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mô tả</h2>

              {/* Rental Policies */}
              <ul className="space-y-2 mb-4 text-gray-900">
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Miễn phí vượt dưới 1h.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Miễn phí vượt dưới 10Km.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Sử dụng miễn phí: Nước, Đồ ăn vặt, Khăn giấy có trong gói EV CARKIT khi thuê xe</span>
                </li>
              </ul>

              {/* Car Description */}
              <div className="mb-3">
                <p className="text-gray-900 leading-relaxed">
                  {showFullDescription ? (
                    <>
                      Xe {car.sizeType} {car.seats} chỗ với thiết kế mạnh mẽ và tính năng linh hoạt,
                      phù hợp cho gia đình. Xe điện thân thiện với môi trường, tiết kiệm điện và
                      vận hành êm ái. Quãng đường lên tới {car.batteryDuration}km, đáp ứng nhu cầu di chuyển
                      hàng ngày của bạn. Dung tích cốp {car.trunkCapacity}L rộng rãi, đủ không gian cho hành lý.
                    </>
                  ) : (
                    <>
                      Xe {car.sizeType} {car.seats} chỗ với thiết kế mạnh mẽ và tính năng linh hoạt,
                      phù hợp cho gia đình...
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
              </button>
            </div>

            {/* Các tiện nghi khác (Other Amenities) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Các tiện nghi khác</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[
                  { name: "Bản đồ", icon: <MapPin size={20} /> },
                  { name: "Bluetooth", icon: <Bluetooth size={20} /> },
                  { name: "Camera 360", icon: <Camera size={20} /> },
                  { name: "Camera hành trình", icon: <Video size={20} /> },
                  { name: "Định vị GPS", icon: <Navigation size={20} /> },
                  { name: "Lốp dự phòng", icon: <Cog size={20} /> },
                  { name: "Túi khí an toàn", icon: <Wind size={20} /> },
                  { name: "Kết nối USB", icon: <Usb size={20} /> },
                  { name: "Màn hình cảm ứng", icon: <Monitor size={20} /> },
                  { name: "Điều hòa", icon: <Snowflake size={20} /> },
                  { name: "Cửa sổ trời", icon: <Sun size={20} /> },
                  { name: "Hệ thống âm thanh", icon: <Speaker size={20} /> },
                  { name: "Đèn LED", icon: <Lightbulb size={20} /> },
                  { name: "Ghế da", icon: <Armchair size={20} /> },
                  { name: "Cảnh báo va chạm", icon: <AlertTriangle size={20} /> },
                ].map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-900">
                    <span className="text-lg">{amenity.icon}</span>
                    <span className="text-sm">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Giấy tờ thuê xe (Rental Documents) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">Giấy tờ thuê xe</h2>
                <HelpCircle className="text-gray-400 cursor-help" />
              </div>
              <p className="text-sm text-gray-500 mb-4">Chọn 1 trong 2 hình thức</p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">GPLX (đối chiếu) & CCCD (đối chiếu VNeID)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">GPLX (đối chiếu) & Passport (giữ lại)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Tài sản thế chấp (Collateral) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Tài sản thế chấp</h2>
                <HelpCircle className="text-gray-400 cursor-help" />
              </div>

              <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-900 text-sm">
                  Khi thuê xe, bạn phải cọc 20% giá trị đơn thuê xe trước khi nhận xe.
                </p>
              </div>
            </div>

            {/* Phụ phí có thể phát sinh (Additional Fees) Section */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-bold text-blue-600 mb-4">Phụ phí có thể phát sinh</h2>
              <div className="space-y-4">
                {/* Phí vượt giới hạn */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <Info className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí vượt giới hạn</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh nếu lộ trình di chuyển vượt quá 350km khi thuê xe 1 ngày
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">3.000₫/km</span>
                    </div>
                  </div>
                </div>

                {/* Phí quá giờ */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <Info className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí quá giờ</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh nếu hoàn trả xe trễ giờ. Trường hợp trễ quá 5 giờ, phụ phí thêm 1 ngày thuê
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">70.000₫/giờ</span>
                    </div>
                  </div>
                </div>

                {/* Phí vệ sinh */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <Info className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí vệ sinh</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh khi xe hoàn trả không đảm bảo vệ sinh (nhiều vết bẩn, bùn cát, sình lầy...)
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">100.000₫ - 200.000₫</span>
                    </div>
                  </div>
                </div>

                {/* Phí khử mùi */}
                <div className="flex items-start gap-3 p-3">
                  <Info className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí khử mùi</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh khi xe hoàn trả bị ám mùi khó chịu (mùi thuốc lá, thực phẩm nặng mùi...)
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">300.000₫ - 500.000₫</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phần booking panel - Chiếm 1/3 cột */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              {/* Giá thuê theo các gói */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Bảng giá thuê</h3>
                
               {/* Box chung hiển thị toàn bộ giá thuê */}
<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
  {/* Theo giờ - Tự lái */}
  <div className="flex justify-between items-center mb-3">
    <div>
      {/* <p className="text-xs text-gray-600">Theo giờ (Tự lái)</p> */}

    </div>
    {/* <p className="text-lg font-bold text-gray-900 text-right">
      {formatCurrency(car.rentPricePerHour)}/giờ
    </p> */}
  </div>

  {/* Theo ngày - Tự lái */}
  <div className="flex justify-between items-center mb-3">
    <div>
      <p className="text-xs text-gray-600">Thuê theo ngày (Tự lái)</p>
      <div className="flex items-center gap-2">
        {/* <span className="text-sm text-gray-500 line-through">
          {formatCurrency(Math.round(car.rentPricePerDay * 1.1))}
        </span> */}
        {/* <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-10%</span> */}
      </div>
    </div>
    <p className="text-lg font-bold text-gray-900 text-right">
      {formatCurrency(car.rentPricePerDay)}/ngày
    </p>
  </div>

  {/* Theo giờ - Có tài xế */}
  <div className="flex justify-between items-center mb-3">
    <div>
      {/* <p className="text-xs text-gray-600">Theo giờ (Có tài xế)</p> */}
      <div className="flex items-center gap-2">
        {/* <span className="text-sm text-gray-500 line-through">
          {formatCurrency(Math.round(car.rentPricePerHourWithDriver * 1.1))}
        </span> */}
        {/* <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-10%</span> */}
      </div>
    </div>
    {/* <p className="text-lg font-bold text-gray-900 text-right">
      {formatCurrency(car.rentPricePerHourWithDriver)}/giờ
    </p> */}
  </div>

  {/* Theo ngày - Có tài xế */}
  <div className="flex justify-between items-center">
    <div>
      <p className="text-xs text-gray-600">Thuê theo ngày (Có tài xế)</p>
      <div className="flex items-center gap-2">
        {/* <span className="text-sm text-gray-500 line-through">
          {formatCurrency(Math.round(car.rentPricePerDayWithDriver * 1.1))}
        </span> */}
        {/* <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-10%</span> */}
      </div>
    </div>
    <p className="text-lg font-bold text-gray-900 text-right">
      {formatCurrency(car.rentPricePerDayWithDriver)}/ngày
    </p>
  </div>
</div>
              </div>

              {/* Status */}
              <div className={`text-center p-3 rounded-lg mb-4 ${car.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className="font-semibold">
                  {car.status === 1 ? ' Xe đang có sẵn' : '✗ Hết xe'}
                </span>
              </div>

              {/* Thời gian thuê */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-900">Thời gian thuê</span>
                </div>
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  size="large"
                  className="w-full"
                  placeholder={["Thời gian nhận xe", "Thời gian trả xe"]}
                  value={dateRangeValue}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRangeValue([dates[0], dates[1]]);
                    } else {
                      setDateRangeValue(null);
                    }
                  }}
                  disabledDate={(current) => {
                    // Chặn các ngày trong quá khứ
                    return current && current < dayjs().startOf('day');
                  }}
                  disabledTime={(value, type) => {
                    const now = dayjs();
                    
                    // Nếu chọn ngày hôm nay, chặn các giờ và phút trong quá khứ
                    if (value && value.isSame(now, 'day')) {
                      const currentHour = now.hour();
                      const currentMinute = now.minute();
                      
                      return {
                        disabledHours: () => {
                          const hours = [];
                          // Chặn giờ từ 0-4 (00:00 - 04:59)
                          for (let i = 0; i < 5; i++) {
                            hours.push(i);
                          }
                          // Chặn các giờ đã qua trong ngày hôm nay (từ 5 trở đi)
                          if (currentHour >= 5) {
                            for (let i = 5; i < currentHour; i++) {
                              hours.push(i);
                            }
                          }
                          return hours;
                        },
                        disabledMinutes: (selectedHour: number) => {
                          // Nếu chọn giờ hiện tại, chặn các phút đã qua
                          if (selectedHour === currentHour) {
                            const minutes = [];
                            for (let i = 0; i <= currentMinute; i++) {
                              minutes.push(i);
                            }
                            return minutes;
                          }
                          return [];
                        },
                      };
                    }
                    
                    // Nếu không phải ngày hôm nay, chỉ chặn giờ ngoài khoảng 05:00 - 23:00
                    return {
                      disabledHours: () => {
                        // Chặn giờ từ 0-4 (00:00 - 04:59)
                        const hours = [];
                        for (let i = 0; i < 5; i++) {
                          hours.push(i);
                        }
                        return hours;
                      },
                      disabledMinutes: () => [],
                    };
                  }}
                />
              </div>

              {/* Booking Button */}
              <button
                onClick={handleBookingClick}
                disabled={car.status !== 1 || !dateRangeValue}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-colors mb-5 flex items-center justify-center gap-2 ${
                  car.status === 1 && dateRangeValue
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span></span>
                {car.status === 1 ? 'CHỌN THUÊ' : 'Xe đã hết'}
              </button>

              {/* Quick Info */}
              <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loại xe</span>
                  <span className="font-semibold text-gray-900">{car.sizeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số chỗ</span>
                  <span className="font-semibold text-gray-900">{car.seats} chỗ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quãng đường</span>
                  <span className="font-semibold text-gray-900">{car.batteryDuration} km</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <a href="tel:1900000" className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 py-2 px-5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  <Phone size={16} />
                  Gọi tư vấn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Thông số kỹ thuật */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Thông số kỹ thuật
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Model</span>
                <span className="font-semibold text-gray-900">{car.model}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại xe</span>
                <span className="font-semibold text-gray-900">{car.sizeType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Số chỗ ngồi</span>
                <span className="font-semibold text-gray-900">{car.seats} chỗ</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Dung tích cốp</span>
                <span className="font-semibold text-gray-900">{car.trunkCapacity} lít</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại pin</span>
                <span className="font-semibold text-gray-900">{car.batteryType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Quãng đường</span>
                <span className="font-semibold text-gray-900">{car.batteryDuration} km</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Động cơ</span>
                <span className="font-semibold text-gray-900">Điện 100%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Năng lượng</span>
                <span className="font-semibold text-gray-900">Xe điện</span>
              </div>
            </div>
          </div>
        </div>



        {/* Xe khác */}
        {otherCars.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Xe điện khác</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherCars.map((otherCar) => (
                <Link key={otherCar.id} href={`/cars/${otherCar.id}`}>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                    <img
                      src={otherCar.imageUrl || '/logo_ev.png'}
                      alt={otherCar.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_ev.png';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">
                        {otherCar.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {otherCar.sizeType} • {otherCar.batteryDuration} km
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-semibold">
                          {formatCurrency(otherCar.rentPricePerDay)}/ngày
                        </span>
                        <span className="text-blue-600 hover:text-blue-700">
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Xe điện khác</h2>
            <p className="text-gray-500 text-center py-4">
              Hiện chưa có xe khác để hiển thị
            </p>
          </div>
        )}
      </main>

      <Footer />
      {/* 6 */}
      {/* → Khi bấm “Thuê xe ngay” sẽ mở BookingModal
→ BookingModal sẽ thực hiện việc gửi request thuê xe đến backend (thường là /api/RentalOrder/Create hoặc tương tự). */}

      <BookingModal
        car={car}
        carAddress={carAddress}
        carCoords={carCoords}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      {/* Modal cảnh báo thiếu giấy tờ */}
      <Modal
        title={documentWarningModal.title}
        open={documentWarningModal.visible}
        onCancel={() => setDocumentWarningModal({ ...documentWarningModal, visible: false })}
        footer={[
          <Button
            key="cancel"
            onClick={() => setDocumentWarningModal({ ...documentWarningModal, visible: false })}
          >
            Đóng
          </Button>,
          <Button
            key="update"
            type="primary"
            onClick={() => {
              setDocumentWarningModal({ ...documentWarningModal, visible: false });
              router.push('/profile');
            }}
            className="bg-blue-800 hover:bg-blue-700"
          >
            Cập nhật
          </Button>,
        ]}
        centered
      >
        <div className="py-4">
          <p className="text-gray-700 mb-4">{documentWarningModal.content}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-orange-800">
              <strong>Lưu ý:</strong> Bạn cần cập nhật và xác thực giấy tờ trong trang cá nhân trước khi có thể thuê xe.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

