"use client";

import React, { useState, useEffect, useCallback } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spin, message, notification, Modal, Button, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
// Removed @ant-design/icons to standardize on lucide-react icons
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import CarMap from "@/components/CarMap";
import FeedbackSection from "@/components/FeedbackSection";
import { carsApi, authApi, rentalLocationApi, carRentalLocationApi, rentalOrderApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { User } from "@/services/api";
import { authUtils } from "@/utils/auth";
import { geocodeAddress } from "@/utils/geocode";
import { getValidImageUrl } from "@/utils/imageUtils";
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
import { SafetyOutlined, PlusOutlined } from '@ant-design/icons';


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
  const { id: carIdParam } = React.use(params);
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
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set()); // Lưu các ngày đã được đặt (format: YYYY-MM-DD)

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
      // Sử dụng rentalLocationId từ Car object thay vì carRentalLocationApi
      let relations: any[] = [];
      
      // Nếu car có rentalLocationId, fetch location info
      if (carData.rentalLocationId) {
        try {
          const locationResponse = await rentalLocationApi.getById(carData.rentalLocationId);
          if (locationResponse.success && locationResponse.data) {
            const location = locationResponse.data;
            // Tạo relation object tương thích với code cũ
            relations = [{
              rentalLocationId: location.id,
              RentalLocationId: location.id,
              rentalLocation: location,
              RentalLocation: location
            }];
          }
        } catch (error) {
          console.warn('[Car Detail] loadCarLocations: Failed to load location via rentalLocationId', error);
        }
      }
      
      // Fallback: thử extract từ carRentalLocations nếu có (backward compatibility)
      if (!relations.length) {
        relations = extractCarRentalLocationList(carData);
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
            const finalDetails: CarLocationDisplay[] = [];

            for (const location of locationsList) {
              const locId = Number(
                location?.id ??
                location?.Id ??
                location?.locationId ??
                location?.LocationId ??
                location?.rentalLocationId ??
                location?.RentalLocationId
              );

              if (Number.isNaN(locId) || !locationIds.has(locId)) {
                continue;
              }

              try {
                // Gọi API Car/GetByLocationId để lấy danh sách cars tại location này
                const carsResponse = await carsApi.getByLocationId(locId);

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
                  const currentCarId = Number(carData.id);
                  const hasCar = carsList.some((car: any) => {
                    const carIdFromList = Number(car?.id ?? car?.Id ?? car?.carId ?? car?.CarId);
                    return !Number.isNaN(carIdFromList) && carIdFromList === currentCarId;
                  });

                  if (hasCar) {
                    // Location này có car, thêm vào danh sách
                    const locationName = getNameFromSource(location);
                    const locationAddress = getAddressFromSource(location);

                    finalDetails.push({
                      id: locId,
                      name: locationName,
                      address: locationAddress,
                      quantity: null,
                    });
                  }
                }
              } catch (error) {
                console.warn('[Car Detail] loadCarLocations: Failed to fetch location detail', error);
              }
            }

            // Nếu không có location nào từ API, lấy từ locationInfoMap
            if (finalDetails.length === 0 && locationInfoMap.size > 0) {
              const firstLocationId = Array.from(locationIds)[0];
              const locationInfo = locationInfoMap.get(firstLocationId);
              if (locationInfo) {
                finalDetails.push({
                  id: firstLocationId,
                  name: locationInfo.name,
                  address: locationInfo.address,
                  quantity: null,
                });
              }
            }

            console.log('[Car Detail] loadCarLocations: Final details', finalDetails);
            if (finalDetails.length > 0) {
              setCarLocations(finalDetails);
              return; // Đã có location, không cần fallback
            }
          }
        } catch (error) {
          console.warn('[Car Detail] loadCarLocations: Unable to fetch rental locations list', error);
        }
      }

      // Nếu không có location nào từ API, lấy từ locationInfoMap
      if (locationInfoMap.size > 0) {
        const firstLocationId = Array.from(locationIds)[0];
        const locationInfo = locationInfoMap.get(firstLocationId);
        if (locationInfo) {
          setCarLocations([{
            id: firstLocationId,
            name: locationInfo.name,
            address: locationInfo.address,
            quantity: null,
          }]);
          return;
        }
      }

      // Nếu vẫn không có, lấy từ relation đầu tiên
      if (relations.length > 0) {
        const firstRelation = relations[0];
        const firstLocationId = getLocationIdFromRelation(firstRelation);
        if (firstLocationId) {
          const infoSource = firstRelation?.rentalLocation ?? firstRelation?.RentalLocation ?? firstRelation;
          const name = getNameFromSource(infoSource);
          const address = getAddressFromSource(infoSource);

          setCarLocations([{
            id: firstLocationId,
            name: name,
            address: address,
            quantity: null,
          }]);
          return;
        }
      }

      // Nếu không có location nào
      setCarLocations([]);
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

      // Lấy carRentalLocations
      const rl = carData?.carRentalLocations;
      if (!rl) {

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


      const rentalLocationId = active?.rentalLocationId ?? active?.RentalLocationId ??
        active?.rentalLocation?.id ?? active?.rentalLocation?.Id ??
        active?.id ?? active?.Id;


      let nameStr: string | null = null;
      let addressStr: string | null = null;

      const name = active?.name ?? active?.Name ?? active?.rentalLocation?.name ?? active?.rentalLocation?.Name;
      nameStr = typeof name === 'string' && name.trim() ? name.trim() : null;

      const address = active?.address ?? active?.Address ?? active?.rentalLocation?.address ?? active?.rentalLocation?.Address;
      addressStr = typeof address === 'string' && address.trim() ? address.trim() : null;


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
        const carId = parseInt(carIdParam);
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


          // Lọc xe active và chưa xóa
          const activeCars = Array.isArray(carsData)
            ? carsData.filter((c: Car) => c && c.isActive && !c.isDeleted)
            : [];


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


          let carWithLocation = currentCar;
          const hasCarRentalLocations = currentCar.carRentalLocations &&
            ((Array.isArray(currentCar.carRentalLocations) && currentCar.carRentalLocations.length > 0) ||
              (currentCar.carRentalLocations.$values && currentCar.carRentalLocations.$values.length > 0));

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

          // Load các đơn hàng đã xác nhận và đang thuê cho xe này để disable các ngày đã được đặt
          // Chỉ load nếu user đã đăng nhập (vì API yêu cầu authentication)
          try {
            // Kiểm tra xem user đã đăng nhập chưa
            const currentUser = authUtils.getCurrentUser();
            if (!currentUser) {
              console.log('[Car Detail] User not logged in, skipping booked dates check');
              // Không set bookedDates, để user vẫn có thể chọn ngày
              return;
            }
            
            // Gọi API với authentication (user đã đăng nhập)
            const ordersResponse = await rentalOrderApi.getAll();
            
            // Nếu bị 401/403, có thể token hết hạn hoặc không có quyền
            if (!ordersResponse.success) {
              const errorMsg = ordersResponse.error || '';
              if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('Unauthorized') || errorMsg.includes('Forbidden')) {
                console.warn('[Car Detail] API GetAll requires authentication. Booked dates will not be disabled.');
                // Không set bookedDates, để user vẫn có thể chọn ngày
                return;
              }
            }
            
            if (ordersResponse.success && ordersResponse.data) {
              const orders = Array.isArray(ordersResponse.data)
                ? ordersResponse.data
                : (ordersResponse.data as any)?.$values || [];
              
              // Lọc các đơn hàng của xe này và có status đã xác nhận/đang thuê
              // Chỉ lấy các đơn hàng có status OrderDepositConfirmed (1), CheckedIn (2), hoặc Renting (3) để disable ngày
              // Không disable các đơn Pending (0), Cancelled (7), Completed (9)
              const activeOrders = orders.filter((order: any) => {
                const orderCarId = order.carId ?? order.CarId ?? order.car?.id ?? order.Car?.Id;
                const carIdNum = typeof orderCarId === 'number' ? orderCarId : Number(orderCarId);
                const currentCarIdNum = typeof carWithLocation.id === 'number' ? carWithLocation.id : Number(carWithLocation.id);
                
                // Lấy status và convert sang number
                const status = order.status ?? order.Status;
                let statusNum = 0;
                if (typeof status === 'number') {
                  statusNum = status;
                } else if (typeof status === 'string') {
                  const statusLower = status.toLowerCase();
                  if (statusLower === 'orderdepositconfirmed' || status === '1') statusNum = 1;
                  else if (statusLower === 'checkedin' || status === '2') statusNum = 2;
                  else if (statusLower === 'renting' || status === '3') statusNum = 3;
                  else {
                    const parsed = parseInt(status);
                    if (!isNaN(parsed)) statusNum = parsed;
                  }
                }
                
                // Chỉ disable ngày nếu status là OrderDepositConfirmed (1), CheckedIn (2), hoặc Renting (3)
                return carIdNum === currentCarIdNum && (statusNum === 1 || statusNum === 2 || statusNum === 3);
              });

              // Tạo Set các ngày đã được đặt (chỉ tính ngày, không tính giờ)
              // Format từ API: "2025-11-25T16:30:00" hoặc "2025-11-26T22:00:00"
              const datesSet = new Set<string>();
              activeOrders.forEach((order: any) => {
                const pickupTime = order.pickupTime ?? order.PickupTime;
                const expectedReturnTime = order.expectedReturnTime ?? order.ExpectedReturnTime;
                
                if (pickupTime && expectedReturnTime) {
                  try {
                    // Parse từ format ISO: "2025-11-25T16:30:00" hoặc "2025-11-26T22:00:00"
                    // dayjs có thể tự động parse format ISO này
                    const pickupDate = dayjs(pickupTime);
                    const returnDate = dayjs(expectedReturnTime);
                    
                    if (pickupDate.isValid() && returnDate.isValid()) {
                      // Lấy tất cả các ngày trong khoảng thời gian thuê (chỉ tính ngày, không tính giờ)
                      let currentDate = pickupDate.startOf('day');
                      const endDate = returnDate.startOf('day');
                      
                      // Sử dụng isBefore hoặc isSame để so sánh
                      while (currentDate.isBefore(endDate, 'day') || currentDate.isSame(endDate, 'day')) {
                        const dateStr = currentDate.format('YYYY-MM-DD');
                        datesSet.add(dateStr);
                        currentDate = currentDate.add(1, 'day');
                      }
                    } else {
                      console.warn('[Car Detail] Invalid date format:', {
                        pickupTime,
                        expectedReturnTime,
                        pickupValid: pickupDate.isValid(),
                        returnValid: returnDate.isValid()
                      });
                    }
                  } catch (error) {
                    console.error('[Car Detail] Error processing dates:', error, {
                      pickupTime,
                      expectedReturnTime
                    });
                  }
                }
              });
              
              console.log('[Car Detail] Booked dates for car:', Array.from(datesSet));
              
              setBookedDates(datesSet);
            }
          } catch (error) {
            console.error('[Car Detail] Load booked dates error:', error);
          }

          // Lọc các xe khác (không phải xe hiện tại) và lấy 3 xe đầu tiên
          const otherCarsList = activeCars
            .filter((c: Car) =>
              c &&
              c.id !== carId
            )
            .slice(0, 3);

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
  }, [carIdParam]);

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
        const userId = user?.id || user?.userId;
        if (!userId || isNaN(Number(userId))) {
          setCheckingReviewEligibility(false);
          return;
        }
        const response = await rentalOrderApi.getByUserId(Number(userId));
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

  // Tính giá thuê dựa trên thời gian và loại (có tài xế hay không)
  // Logic giống với backend: <= 0.4 ngày (4h) -> giá 4h, > 0.4 và <= 0.8 ngày (8h) -> giá 8h, > 0.8 ngày -> tính theo ngày
  const calculatePrice = (withDriver: boolean): number | null => {
    if (!dateRangeValue || !dateRangeValue[0] || !dateRangeValue[1] || !car) {
      return null;
    }

    const [pickupTime, returnTime] = dateRangeValue;
    if (!pickupTime || !returnTime) return null;

    // Tính tổng số giờ (chính xác, không làm tròn)
    const totalHours = returnTime.diff(pickupTime, 'hour', true);
    if (totalHours <= 0) return null;

    // Chuyển đổi sang số ngày (decimal)
    const subtotalDays = totalHours / 24;

    let subTotal = 0;

    // Logic tính giá theo backend
    if (subtotalDays <= 0.4) {
      // Dưới hoặc bằng 4 tiếng (0.4 ngày)
      subTotal = withDriver 
        ? (car.rentPricePer4HourWithDriver || 0)
        : (car.rentPricePer4Hour || 0);
    } else if (subtotalDays > 0.4 && subtotalDays <= 0.8) {
      // Trên 4 tiếng và dưới hoặc bằng 8 tiếng (0.8 ngày)
      subTotal = withDriver
        ? (car.rentPricePer8HourWithDriver || 0)
        : (car.rentPricePer8Hour || 0);
    } else {
      // Trên 8 tiếng - tính theo ngày
      subTotal = subtotalDays * (withDriver 
        ? (car.rentPricePerDayWithDriver || 0)
        : (car.rentPricePerDay || 0));
    }

    return subTotal;
  };

  // Điều hướng đến trang booking
  const handleBookingClick = () => {
    // Kiểm tra nếu xe đã hết hoặc không hoạt động
    if (!car.isActive || car.isDeleted) {
      message.warning('Vui lòng chọn xe khác hoặc chọn giờ thuê khác');
      return;
    }

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div
        className="
    sticky top-20 z-40
    border-b border-white/10
    bg-[url('/anh-nen.jpg')]
    bg-cover bg-center
    backdrop-blur-md
    py-5
  "
      >
        <Link
          href="/#cars"
          className="flex items-center gap-3 px-4 pl-[110px] text-white transition hover:text-blue-300"
        >
          <span className="text-xl">←</span>
          <span className="text-lg font-semibold font-sans bold">Danh sách xe</span>
        </Link>
      </div>


      {/* Add top padding to prevent content being hidden behind fixed header */}
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
        {/* Breadcrumb */}



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
                src={getValidImageUrl(car.imageUrl)}
                alt={car.name}
                className="w-full h-full md:h-96 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_ev.png';
                }}
              />
            </div>

            {/* Ảnh phụ 1 và 2 - chia đều chiều cao */}
            <div className="grid grid-cols-1 gap-4 h-full md:h-96">
              {getValidImageUrl(car.imageUrl2) !== '/logo_ev.png' ? (
                <div
                  className="flex-1 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedImageIndex(1);
                    setIsImageModalOpen(true);
                  }}
                >
                  <img
                    src={getValidImageUrl(car.imageUrl2)}
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
                    selectedImageIndex === 0 ? getValidImageUrl(car.imageUrl) :
                      selectedImageIndex === 1 ? getValidImageUrl(car.imageUrl2) :
                        getValidImageUrl(car.imageUrl3)
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
                {getValidImageUrl(car.imageUrl) !== '/logo_ev.png' && (
                  <img
                    src={getValidImageUrl(car.imageUrl)}
                    alt={`${car.name} - Ảnh 1`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${selectedImageIndex === 0 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                      }`}
                    onClick={() => setSelectedImageIndex(0)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                )}
                {getValidImageUrl(car.imageUrl2) !== '/logo_ev.png' && (
                  <img
                    src={getValidImageUrl(car.imageUrl2)}
                    alt={`${car.name} - Ảnh 2`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${selectedImageIndex === 1 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                      }`}
                    onClick={() => setSelectedImageIndex(1)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                )}
                {getValidImageUrl(car.imageUrl3) !== '/logo_ev.png' && (
                  <img
                    src={getValidImageUrl(car.imageUrl3)}
                    alt={`${car.name} - Ảnh 3`}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${selectedImageIndex === 2 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
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

        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-12">
          {/* Phần thông tin xe chính - Chiếm 2/3 cột */}
          <div className="space-y-4 lg:col-span-8">
            {/* Vehicle Header */}
            <div className="mb-8">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                        .then(() => {
                          alert('Link đã được sao chép!');
                        })
                        .catch(() => {
                          alert('Không thể sao chép link, vui lòng thử lại.');
                        });
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Share2 className="text-black text-lg" />
                  </button>
                  <span className="text-black font-medium text-sm">Chia sẻ</span>
                </div>


              </div>
            </div>


            <div className="mb-8">

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
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-600 mb-2">Đặc điểm</h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">

                {/* Truyền động */}
                <div className="flex items-center p-4 gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Truyền động</span>
                    <span className="font-bold text-gray-900">Số tự động</span>
                  </div>
                </div>

                {/* Số ghế */}
                <div className="flex items-center p-4 gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Số ghế</span>
                    <span className="font-bold text-gray-900">{car.seats} chỗ</span>
                  </div>
                </div>

                {/* Nhiên liệu */}
                <div className="flex items-center p-4 gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Nhiên liệu</span>
                    <span className="font-bold text-gray-900">Điện</span>
                  </div>
                </div>

                {/* Tiêu hao */}
                <div className="flex items-center p-4 gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm">Tiêu hao</span>
                    <span className="font-bold text-gray-900">{car.batteryDuration}km/100%</span>
                  </div>
                </div>

              </div>
            </div>


            {/* Mô tả (Description) Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-600 mb-2">Mô tả</h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>

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
                className="text-black hover:text-gray-700 font-bold text-sm"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm>>>'}
              </button>
            </div>

            {/* Các tiện nghi khác (Other Amenities) Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-600 mb-2">Các tiện nghi khác</h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
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
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-blue-600">Giấy tờ thuê xe</h2>
                <HelpCircle className="text-gray-400 cursor-help" />
              </div>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
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

            {/* <div className="bg-[#D9EFFF] border border-[#4A90E2] rounded-lg p-4">
  <p className="text-gray-900 text-sm">
                  Khi thuê xe, bạn phải cọc 20% giá trị đơn thuê xe trước khi nhận xe.
                </p>
</div> */}


            {/* Tài sản thế chấp (Collateral) Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-blue-600">Tài sản thế chấp</h2>
                <HelpCircle className="text-gray-400 cursor-help" />
              </div>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
              <div className="bg-[#D9EFFF] border border-[#4A90E2] rounded-lg p-4">
                <p className="text-gray-900 text-sm">
                  Khi thuê xe, bạn phải cọc 20% giá trị đơn thuê xe trước khi nhận xe.
                </p>
              </div>

            </div>

            {/* Thông số kỹ thuật */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">
                Thông số kỹ thuật
              </h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>

          {/* Phần booking panel - Chiếm 1/3 cột */}
          <div className="lg:col-span-4 space-y-6">
            {/* Bảo hiểm thuê xe */}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* TITLE */}
              <div className="bg-green-500 px-5 py-3 flex items-center gap-2">
                <SafetyOutlined className="text-white text-xl shimmer-shield" />
                <h2 className="text-white text-lg font-bold">Bảo hiểm thuê xe</h2>
              </div>

              {/* Nội dung */}
              <div className="bg-green-50 p-5 space-y-3">
                <p className="text-gray-700">
                  Bảo vệ bạn trong suốt quá trình thuê xe, đảm bảo an tâm khi di chuyển.
                </p>
                <ul className="list-disc list-inside text-gray-600">
                  <li>Đền bù thiệt hại vật chất xe</li>
                  <li>Hỗ trợ tai nạn nhẹ</li>
                  <li>Hỗ trợ 24/7 khi sự cố</li>
                </ul>
              </div>

              {/* CSS shimmer */}
              <style dangerouslySetInnerHTML={{
                __html: `
    @keyframes shimmer {
      0% { filter: brightness(1) drop-shadow(0 0 3px rgba(255,255,255,0.6)); transform: scale(1) rotate(0deg); }
      25% { filter: brightness(1.3) drop-shadow(0 0 6px rgba(255,255,255,0.8)) drop-shadow(0 0 10px rgba(255,255,255,0.5)); transform: scale(1.08) rotate(2deg); }
      50% { filter: brightness(1.6) drop-shadow(0 0 10px rgba(255,255,255,1)) drop-shadow(0 0 15px rgba(255,255,255,0.7)); transform: scale(1.1) rotate(0deg); }
      75% { filter: brightness(1.3) drop-shadow(0 0 6px rgba(255,255,255,0.8)) drop-shadow(0 0 10px rgba(255,255,255,0.5)); transform: scale(1.08) rotate(-2deg); }
      100% { filter: brightness(1) drop-shadow(0 0 3px rgba(255,255,255,0.6)); transform: scale(1) rotate(0deg); }
    }
    .shimmer-shield {
      animation: shimmer 2.5s ease-in-out infinite;
    }
  `}} />
            </div>

            <div className="bg-white rounded-xl shadow-lg border-2 border-[#4A90E2] overflow-hidden">
              {/* TITLE */}
              <div className="bg-[#2563EB] px-5 py-3">
                <h2 className="text-white text-lg font-bold">Bảng giá thuê</h2>
              </div>

              {/* CONTENT */}
              <div className="p-5 space-y-5">
                {/* Bảng giá thuê */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Thời gian
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Tự lái
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Có tài xế
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Giá 1 ngày */}
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                          1 ngày
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePerDay || 0)}
                          </p>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePerDayWithDriver || 0)}
                          </p>
                        </td>
                      </tr>
                      {/* Giá dưới 8 tiếng */}
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                          Dưới 8 tiếng
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePer8Hour || 0)}
                          </p>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePer8HourWithDriver || 0)}
                          </p>
                        </td>
                      </tr>
                      {/* Giá dưới 4 tiếng */}
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                          Dưới 4 tiếng
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePer4Hour || 0)}
                          </p>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(car.rentPricePer4HourWithDriver || 0)}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Hiển thị tổng giá nếu đã chọn thời gian */}
                {dateRangeValue && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="space-y-2">
                      {calculatePrice(false) && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tổng (Tự lái):</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(Math.round(calculatePrice(false)!))}
                          </span>
                        </div>
                      )}
                      {calculatePrice(true) && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tổng (Có tài xế):</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(Math.round(calculatePrice(true)!))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className={`text-center p-3 rounded-lg mb-4 ${car.isActive && !car.isDeleted ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  {/* <span className="font-semibold">
                    {car.isActive && !car.isDeleted ? ' Xe đang có sẵn' : 'Hết xe'}
                  </span> */}
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
                      if (!current) return false;
                      
                      // Chặn các ngày trong quá khứ
                      if (current < dayjs().startOf('day')) {
                        return true;
                      }
                      
                      // Disable các ngày đã được đặt (chỉ đơn OrderDepositConfirmed)
                      const dateStr = current.format('YYYY-MM-DD');
                      return bookedDates.has(dateStr);
                    }}
                    cellRender={(current, info) => {
                      if (info.type !== 'date' || !current) {
                        return info.originNode;
                      }
                      
                      // Đảm bảo current là Dayjs
                      const currentDate = dayjs.isDayjs(current) ? current : dayjs(current);
                      if (!currentDate.isValid()) {
                        return info.originNode;
                      }
                      
                      const dateStr = currentDate.format('YYYY-MM-DD');
                      const isBooked = bookedDates.has(dateStr);
                      
                      if (isBooked) {
                        return (
                          <div className="ant-picker-cell-inner-wrapper">
                            <div
                              className="ant-picker-cell-inner"
                              style={{
                                backgroundColor: '#fee2e2',
                                border: '2px solid #ef4444',
                                borderRadius: '4px',
                                color: '#dc2626',
                                fontWeight: 'bold',
                              }}
                            >
                              {currentDate.date()}
                            </div>
                          </div>
                        );
                      }
                      
                      return info.originNode;
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
                  disabled={car.isActive !== true || car.isDeleted === true}
                  className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-colors mb-5 flex items-center justify-center gap-2 ${car.isActive === true && car.isDeleted !== true
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {car.isActive === true && car.isDeleted !== true ? (
                    <>
                      <PlusOutlined />
                      CHỌN THUÊ
                    </>
                  ) : (
                    'Xe đã hết'
                  )}
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
                  <a href="tel:1900000" className="bg-blue-50 inline-flex items-center gap-2 border border-gray-300 text-gray-700 py-2 px-5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    <Phone size={16} />
                    Gọi tư vấn
                  </a>
                </div>
              </div>
            </div>

            {/* Phụ phí có thể phát sinh (Additional Fees) Section */}
            <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
              {/* TITLE */}
              <div className="bg-[#D9EFFF] px-5 py-3">
                <h2 className="text-[#4A90E2] text-lg font-bold">Phụ phí có thể phát sinh</h2>
              </div>

              {/* CONTENT */}
              <div className="p-5 space-y-5">

                {/* Phí vượt giới hạn */}
                <div className="border-b border-blue-200 pb-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 text-lg mt-1 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          Phí vượt giới hạn
                        </h3>

                        <span className="text-blue-700 font-semibold text-base whitespace-nowrap">
                          3.000₫/km
                        </span>
                      </div>

                      <p className="text-[12px] text-gray-500">
                        Phụ phí phát sinh nếu lộ trình di chuyển vượt quá 350km khi thuê xe 1 ngày
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phí quá giờ */}
                <div className="border-b border-blue-200 pb-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 text-lg mt-1 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          Phí quá giờ
                        </h3>

                        <span className="text-blue-700 font-semibold text-base whitespace-nowrap">
                          70.000₫/giờ
                        </span>
                      </div>

                      <p className="text-[12px] text-gray-500">
                        Phụ phí phát sinh nếu hoàn trả xe trễ giờ. Trường hợp trễ quá 5 giờ, phụ phí thêm 1 ngày thuê
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phí vệ sinh */}
                <div className="border-b border-blue-200 pb-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 text-lg mt-1 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          Phí vệ sinh
                        </h3>

                        <span className="text-blue-700 font-semibold text-base whitespace-nowrap">
                          100.000₫ - 200.000₫
                        </span>
                      </div>

                      <p className="text-[12px] text-gray-500">
                        Phụ phí phát sinh khi xe hoàn trả không đảm bảo vệ sinh (nhiều vết bẩn, bùn cát, sình lầy...)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phí khử mùi */}
                <div>
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 text-lg mt-1 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          Phí khử mùi
                        </h3>

                        <span className="text-blue-700 font-semibold text-base whitespace-nowrap">
                          300.000₫ - 500.000₫
                        </span>
                      </div>

                      <p className="text-[12px] text-gray-500">
                        Phụ phí phát sinh khi xe hoàn trả bị ám mùi khó chịu (mùi thuốc lá, thực phẩm nặng mùi...)
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Feedback Section */}
        <div className="mb-8">
          <FeedbackSection carId={car?.id} />
        </div>

        {/* Xe khác */}
        {
          otherCars.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-600 mb-2">Xe điện khác</h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherCars.map((otherCar) => (
                  <Link key={otherCar.id} href={`/cars/${otherCar.id}`}>
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                      <img
                        src={getValidImageUrl(otherCar.imageUrl)}
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
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-600 mb-2">Xe điện khác</h2>
              <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3"></div>
              <p className="text-gray-500 text-center py-4">
                Hiện chưa có xe khác để hiển thị
              </p>
            </div>
          )
        }
      </main >

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
    </div >
  );
}

