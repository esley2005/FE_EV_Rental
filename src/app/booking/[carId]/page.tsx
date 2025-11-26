"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Form, Input, DatePicker, Button, message, Checkbox, Radio, notification, Alert, Modal } from "antd";
import { Calendar, MapPin, Phone, User as UserIcon, Search, Car as CarIcon, FileText, Download, Percent, Info, UserCheck, ExternalLink } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { carsApi, rentalOrderApi, rentalLocationApi, carRentalLocationApi, authApi, paymentApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { User, CreateRentalOrderData, RentalLocationData } from "@/services/api";
import { authUtils } from "@/utils/auth";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const { RangePicker } = DatePicker;

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification({
    placement: 'topRight',
    top: 24,
    duration: 4,
  });
  const [car, setCar] = useState<Car | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<RentalLocationData | null>(null);
  const [availableLocations, setAvailableLocations] = useState<RentalLocationData[]>([]);
  const [withDriver, setWithDriver] = useState<boolean>(false);
  const [dateRangeValue, setDateRangeValue] = useState<[Dayjs, Dayjs] | null>(null);
  const [bookedDates, setBookedDates] = useState<Array<{ start: Dayjs; end: Dayjs }>>([]);

  // Helper functions tương tự trang chi tiết xe
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

  const resolveCarLocation = useCallback(async (carData: Car) => {
    if (!carData) {
      return;
    }

    const carId = Number(carData.id);
    if (Number.isNaN(carId)) {
      setSelectedLocation(null);
      form.setFieldsValue({ rentalLocationId: undefined });
      return;
    }

    // ✅ Logic mới: Tìm location của car bằng Car/GetByLocationId
    try {
      // 1. Kiểm tra xem carData đã có carRentalLocations đầy đủ chưa
      const relations = extractCarRentalLocationList(carData);
      if (relations.length > 0) {
        const primaryRelation = relations[0];
        const locationId = getLocationIdFromRelation(primaryRelation);
        
        if (locationId) {
          const infoSource = primaryRelation?.rentalLocation ?? primaryRelation?.RentalLocation ?? primaryRelation;
          const name = getNameFromSource(infoSource);
          const address = getAddressFromSource(infoSource);
          
          // Nếu đã có đủ thông tin từ relation
          if (name || address) {
            const location: RentalLocationData = {
              id: locationId,
              name: name ?? "",
              address: address ?? "",
              coordinates: infoSource?.coordinates ?? infoSource?.Coordinates ?? "",
              isActive: infoSource?.isActive ?? infoSource?.IsActive ?? true,
            };
            setSelectedLocation(location);
            form.setFieldsValue({ rentalLocationId: location.id });
            return;
          }
        }
      }

      // 2. Nếu chưa có đủ thông tin, fetch tất cả locations và tìm location có car này
      const allLocationsResponse = await rentalLocationApi.getAll();
      if (allLocationsResponse.success && allLocationsResponse.data) {
        const locationsData = allLocationsResponse.data as any;
        const locationsList = Array.isArray(locationsData)
          ? locationsData
          : (locationsData?.$values && Array.isArray(locationsData.$values) ? locationsData.$values : []);

        // Tìm location có car này
        for (const loc of locationsList) {
          const locationId = Number(loc?.id ?? loc?.Id);
          if (Number.isNaN(locationId)) continue;

          try {
            const carsResponse = await carsApi.getByLocationId(locationId);
            if (carsResponse.success && carsResponse.data) {
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

              const hasCar = carsList.some((c: any) => {
                const cId = Number(c?.id ?? c?.Id ?? c?.carId ?? c?.CarId);
                return !Number.isNaN(cId) && cId === carId;
              });

              if (hasCar) {
                const locationData: RentalLocationData = {
                  id: locationId,
                  name: loc.name ?? loc.Name ?? "",
                  address: loc.address ?? loc.Address ?? "",
                  coordinates: loc.coordinates ?? loc.Coordinates ?? "",
                  isActive: loc.isActive ?? loc.IsActive ?? true,
                };
                setSelectedLocation(locationData);
                form.setFieldsValue({ rentalLocationId: locationData.id });
                return;
              }
            }
          } catch (error) {
            // Continue with next location
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    // Không tìm thấy location
    setSelectedLocation(null);
    form.setFieldsValue({ rentalLocationId: undefined });
  }, [form]);

  const carId = params?.carId as string;
  const locationIdFromUrl = searchParams?.get('locationId');
  // Hỗ trợ cả pickupTime/returnTime và startDate/endDate
  const pickupTimeFromUrl = searchParams?.get('pickupTime') || searchParams?.get('startDate');
  const returnTimeFromUrl = searchParams?.get('returnTime') || searchParams?.get('endDate');
  // Đọc lựa chọn có tài xế từ URL
  const withDriverFromUrl = searchParams?.get('withDriver');
  const [isDriverOptionLocked, setIsDriverOptionLocked] = useState<boolean>(false);

  useEffect(() => {
    if (!carId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load car
        const carResponse = await carsApi.getById(carId);
        if (carResponse.success && carResponse.data) {
          setCar(carResponse.data);
        } else {
          message.error("Không tìm thấy xe!");
          router.push('/');
          return;
        }

        // Load user
        if (authUtils.isAuthenticated()) {
          // Thử lấy user từ localStorage trước
          const userStr = localStorage.getItem("user");
          let userData: any = null;
          
          if (userStr) {
            try {
              userData = JSON.parse(userStr);
              console.log("📱 User data từ localStorage:", {
                hasPhoneNumber: !!(userData as any).PhoneNumber,
                hasphoneNumber: !!(userData as any).phoneNumber,
                hasphone: !!userData.phone,
                phoneNumber: (userData as any).PhoneNumber || (userData as any).phoneNumber || userData.phone
              });
            } catch (e) {
              console.error("Error parsing user from localStorage:", e);
            }
          }
          
          // Nếu không có user data hoặc thiếu PhoneNumber, fetch từ API
          // Backend trả về PhoneNumber (PascalCase)
          const hasPhoneNumber = userData && ((userData as any).PhoneNumber || (userData as any).phoneNumber || userData.phone);
          console.log("🔍 Kiểm tra PhoneNumber:", { hasPhoneNumber, userData: userData ? "exists" : "null" });
          
          if (!userData || !hasPhoneNumber) {
            try {
              // Thử lấy từ getProfile trước (từ localStorage)
              const profileResponse = await authApi.getProfile();
              if (profileResponse.success && 'data' in profileResponse && profileResponse.data) {
                const profileData = profileResponse.data;
                // Nếu profile có PhoneNumber, dùng nó (ưu tiên PhoneNumber từ backend)
                const profilePhone = (profileData as any).PhoneNumber || (profileData as any).phoneNumber || profileData.phone;
                if (profilePhone) {
                  userData = { ...userData, ...profileData, phone: profilePhone, phoneNumber: profilePhone, PhoneNumber: profilePhone };
                  setUser(userData);
                  localStorage.setItem("user", JSON.stringify(userData));
                } else if (userData.id) {
                  // Nếu không có PhoneNumber trong profile, thử gọi GetById
                  try {
                    const userByIdResponse = await authApi.getProfileById(userData.id);
                    if (userByIdResponse.success && 'data' in userByIdResponse && userByIdResponse.data) {
                      const fullUserData = userByIdResponse.data;
                      // Backend trả về PhoneNumber (PascalCase)
                      const fullPhoneNumber = (fullUserData as any).PhoneNumber || (fullUserData as any).phoneNumber || fullUserData.phone;
                      if (fullPhoneNumber) {
                        userData = { ...userData, ...fullUserData, phone: fullPhoneNumber, phoneNumber: fullPhoneNumber, PhoneNumber: fullPhoneNumber };
                        setUser(userData);
                        localStorage.setItem("user", JSON.stringify(userData));
                        console.log(" Đã lấy PhoneNumber từ API GetById:", fullPhoneNumber);
                      }
                    }
                  } catch (getByIdError) {
                    console.warn(" Không thể lấy user từ GetById (có thể do quyền truy cập):", getByIdError);
                  }
                }
              }
              
              // Nếu vẫn không có PhoneNumber sau khi fetch, vẫn set user data
              if (!(userData as any).PhoneNumber && !(userData as any).phoneNumber && !userData.phone && userData) {
                setUser(userData);
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
              if (userData) {
                setUser(userData);
              }
            }
          } else {
            setUser(userData);
          }
          
          // Tự động điền thông tin khách hàng từ tài khoản đã đăng nhập
          if (userData) {
            // Backend trả về PhoneNumber (PascalCase), ưu tiên PhoneNumber
            const phoneNumber = (userData as any).PhoneNumber || (userData as any).phoneNumber || userData.phone || "";
            form.setFieldsValue({
              name: userData.fullName || userData.name || "",
              phoneNumber: phoneNumber,
              PhoneNumber: phoneNumber, // Set cả PascalCase để đảm bảo form nhận được
            });
            console.log("✅ Đã điền phoneNumber vào form:", {
              phoneNumber,
              userDataPhoneNumber: (userData as any).PhoneNumber,
              userDataphoneNumber: (userData as any).phoneNumber,
              userDataphone: userData.phone
            });
          }
        }

        // Load all available locations
        const locationsResponse = await rentalLocationApi.getAll();
        if (locationsResponse.success && locationsResponse.data) {
          const locationsData = locationsResponse.data as any;
          const locationsList = Array.isArray(locationsData)
            ? locationsData
            : (locationsData?.$values && Array.isArray(locationsData.$values) ? locationsData.$values : []);
          
          const formattedLocations: RentalLocationData[] = locationsList
            .filter((loc: any) => loc?.isActive !== false && !loc?.isDeleted)
            .map((loc: any) => ({
              id: loc.id ?? loc.Id ?? loc.locationId ?? loc.LocationId,
              name: loc.name ?? loc.Name ?? "",
              address: loc.address ?? loc.Address ?? "",
              coordinates: loc.coordinates ?? loc.Coordinates ?? "",
              isActive: loc.isActive ?? loc.IsActive ?? true,
            }));
          
          setAvailableLocations(formattedLocations);

          // Nếu có locationId từ URL, tự động chọn địa điểm đó
          if (locationIdFromUrl) {
            const locationId = parseInt(locationIdFromUrl);
            const locationFromUrl = formattedLocations.find(loc => loc.id === locationId);
            if (locationFromUrl) {
              setSelectedLocation(locationFromUrl);
              form.setFieldsValue({ rentalLocationId: locationFromUrl.id });
            }
          }
        }

        // Load booked dates cho xe này
        try {
          const ordersResponse = await rentalOrderApi.getAll();
          if (ordersResponse.success && ordersResponse.data) {
            const ordersData = Array.isArray(ordersResponse.data)
              ? ordersResponse.data
              : (ordersResponse.data as any)?.$values || [];
            
            const carIdNum = parseInt(carId);
            const carOrders = ordersData.filter((order: any) => {
              const orderCarId = order.carId || order.CarId;
              return orderCarId === carIdNum;
            });

            // Chỉ lấy các đơn hàng có status OrderDepositConfirmed (1), CheckedIn (2), hoặc Renting (3) để disable ngày
            // Không disable các đơn Pending (0), Cancelled (7), Completed (9)
            const activeOrders = carOrders.filter((order: any) => {
              const status = order.status || order.Status;
              let statusNum: number | null = null;
              
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
              return statusNum === 1 || statusNum === 2 || statusNum === 3;
            });

            // Parse các khoảng thời gian đã được thuê
            const bookedRanges: Array<{ start: Dayjs; end: Dayjs }> = [];
            activeOrders.forEach((order: any) => {
              const pickupTime = order.pickupTime || order.PickupTime;
              const expectedReturnTime = order.expectedReturnTime || order.ExpectedReturnTime;
              const actualReturnTime = order.actualReturnTime || order.ActualReturnTime;
              
              if (pickupTime) {
                const start = dayjs(pickupTime);
                const end = dayjs(actualReturnTime || expectedReturnTime);
                
                if (start.isValid() && end.isValid()) {
                  bookedRanges.push({ start, end });
                }
              }
            });

            setBookedDates(bookedRanges);
            console.log(`[Booking] Loaded ${bookedRanges.length} booked date ranges for car ${carId}`);
          }
        } catch (error) {
          console.error("Error loading booked dates:", error);
          // Không hiển thị lỗi cho user vì đây không phải tính năng critical
        }

        // Nếu có lựa chọn có tài xế từ URL, tự động set vào form và lock option
        if (withDriverFromUrl !== null) {
          const withDriverValue = withDriverFromUrl === 'true';
          setWithDriver(withDriverValue);
          setIsDriverOptionLocked(true);
          form.setFieldsValue({ withDriver: withDriverValue });
        }

        // Nếu có ngày giờ từ URL, tự động set vào form
        if (pickupTimeFromUrl && returnTimeFromUrl) {
          try {
            // Parse date từ URL (có thể là ISO string hoặc format khác)
            const pickupTime = dayjs(pickupTimeFromUrl);
            const returnTime = dayjs(returnTimeFromUrl);
            
            if (pickupTime.isValid() && returnTime.isValid() && returnTime.isAfter(pickupTime)) {
              // Set vào form và state
              const dateRange: [Dayjs, Dayjs] = [pickupTime, returnTime];
              form.setFieldsValue({ dateRange });
              setDateRangeValue(dateRange);
              
              console.log("✅ Đã set dateRange từ URL:", {
                pickupTime: pickupTime.format('DD/MM/YYYY HH:mm'),
                returnTime: returnTime.format('DD/MM/YYYY HH:mm')
              });
            } else {
              console.warn("⚠️ Invalid date range from URL:", {
                pickupTime: pickupTimeFromUrl,
                returnTime: returnTimeFromUrl,
                pickupValid: pickupTime.isValid(),
                returnValid: returnTime.isValid(),
                isAfter: returnTime.isAfter(pickupTime)
              });
            }
          } catch (error) {
            console.error("❌ Error parsing dates from URL:", error);
          }
        } else {
          console.log("ℹ️ No date range in URL params:", {
            pickupTimeFromUrl,
            returnTimeFromUrl
          });
        }

        // Resolve car location từ data của xe (chỉ khi không có locationId từ URL)
        if (!locationIdFromUrl) {
          await resolveCarLocation(carResponse.data);
        }
      } catch (error) {
        console.error("Load data error:", error);
        message.error("Có lỗi xảy ra khi tải dữ liệu!");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [carId, form, router, resolveCarLocation, locationIdFromUrl, pickupTimeFromUrl, returnTimeFromUrl]);

  // Cập nhật form khi user data thay đổi (đặc biệt khi PhoneNumber được fetch từ API)
  useEffect(() => {
    if (user) {
      const phoneNumber = (user as any).PhoneNumber || (user as any).phoneNumber || user.phone || "";
      const currentPhoneNumber = form.getFieldValue('phoneNumber');
      
      // Chỉ cập nhật nếu phoneNumber thay đổi hoặc chưa có giá trị
      if (phoneNumber && phoneNumber !== currentPhoneNumber) {
        form.setFieldsValue({
          name: user.fullName || form.getFieldValue('name'),
          phoneNumber: phoneNumber,
        });
        console.log("🔄 Đã cập nhật form với phoneNumber mới:", phoneNumber);
      }
    }
  }, [user, form]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculateRentalFee = () => {
    if (!car || !form.getFieldValue('dateRange')) return 0;
    
    const [pickupTime, returnTime] = form.getFieldValue('dateRange');
    if (!pickupTime || !returnTime) return 0;
    
    const withDriver = form.getFieldValue('withDriver') || false;
    
    // Tính tổng số giờ (chính xác, không làm tròn)
    const totalHours = returnTime.diff(pickupTime, 'hour', true);
    
    if (totalHours <= 0) return 0;
    
    // Lấy giá theo loại (có tài xế hay không) và theo khoảng thời gian
    // Logic: Format 24h
    // - returnDate - pickupTime <= 4 giờ: giá 4 giờ (withDriver hoặc false)
    // - <= 8 giờ: giá 8 giờ (withDriver hoặc false)
    // - > 8 giờ: giá per day (làm tròn lên)
    let rentalFee = 0;
    
     if (totalHours <= 4) {
       // <= 4 giờ: lấy giá 4 giờ
       rentalFee = withDriver ? car.rentPricePer4HourWithDriver : car.rentPricePer4Hour;
     } else if (totalHours <= 8) {
       // > 4 giờ và <= 8 giờ: lấy giá 8 giờ
       rentalFee = withDriver ? car.rentPricePer8HourWithDriver : car.rentPricePer8Hour;
     } else {
       // > 8 giờ: tính theo giờ = (giá per day / 24) * số giờ
       const pricePerDay = withDriver ? car.rentPricePerDayWithDriver : car.rentPricePerDay;
       const pricePerHour = pricePerDay / 24;
       rentalFee = pricePerHour * totalHours;
     }
    
    // Debug: log để kiểm tra giá
    if (process.env.NODE_ENV === 'development') {
      console.log('[calculateRentalFee]', {
        withDriver,
        totalHours,
        rentalFee,
        rentPricePer4Hour: car.rentPricePer4Hour,
        rentPricePer4HourWithDriver: car.rentPricePer4HourWithDriver,
        rentPricePer8Hour: car.rentPricePer8Hour,
        rentPricePer8HourWithDriver: car.rentPricePer8HourWithDriver,
        rentPricePerDay: car.rentPricePerDay,
        rentPricePerDayWithDriver: car.rentPricePerDayWithDriver,
      });
    }
    
    return rentalFee;
  };

  const calculateTotal = () => {
    const rentalFee = calculateRentalFee();
    return rentalFee;
  };

  // Phí giữ chỗ khi đặt hàng = DepositOrderAmount
  const calculateDepositOrder = () => {
    if (!car) return 0;
    return (car as any).depositOrderAmount || (car as any).DepositOrderAmount || 0;
  };

  // Phí thế chấp khi thuê xe = DepositCarAmount
  const calculateDepositCar = () => {
    if (!car) return 0;
    return (car as any).depositCarAmount || (car as any).DepositCarAmount || 0;
  };

  const calculateRemaining = () => {
    return calculateTotal() - calculateDepositOrder();
  };

  const handleSubmit = async (values: any) => {
    if (!user) {
      api.error({
        message: "Vui lòng đăng nhập để đặt xe",
        description: "Bạn cần đăng nhập để tiếp tục đặt xe.",
        placement: "topRight",
        duration: 4,
      });
      router.push('/login');
      return;
    }

    if (!car) {
      api.error({
        message: "Không tìm thấy thông tin xe",
        description: "Vui lòng thử lại sau.",
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    const withDriverValue = values.withDriver || false;

    // Lấy dateRange từ form values hoặc từ state (nếu field bị disabled)
    const dateRange = values.dateRange || dateRangeValue;
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      api.error({
        message: "Vui lòng chọn thời gian thuê",
        description: "Bạn cần chọn thời gian nhận xe và trả xe để tiếp tục.",
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    // Kiểm tra xem khoảng thời gian đã chọn có trùng với ngày đã được thuê không
    const [pickupTime, expectedReturnTime] = dateRange;
    const hasConflict = bookedDates.some((range) => {
      const selectedStart = pickupTime.startOf('day');
      const selectedEnd = expectedReturnTime.startOf('day');
      const bookedStart = range.start.startOf('day');
      const bookedEnd = range.end.startOf('day');
      
      // Kiểm tra xem có overlap không
      // Overlap nếu: selectedStart <= bookedEnd && selectedEnd >= bookedStart
      return (selectedStart.isSameOrBefore(bookedEnd) && selectedEnd.isSameOrAfter(bookedStart));
    });

    if (hasConflict) {
      api.error({
        message: "Không thể đặt xe",
        description: "Khoảng thời gian bạn chọn đã được thuê. Vui lòng chọn khoảng thời gian khác.",
        placement: "topRight",
        duration: 5,
      });
      setSubmitting(false);
      return;
    }

    // Validate các trường bắt buộc
    if (!values.phoneNumber && !values.PhoneNumber) {
      api.error({
        message: "Vui lòng nhập số điện thoại",
        description: "Số điện thoại là thông tin bắt buộc để đặt xe.",
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    if (!values.rentalLocationId) {
      api.error({
        message: "Không xác định được địa điểm nhận xe",
        description: "Vui lòng liên hệ hỗ trợ để được hỗ trợ.",
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    setSubmitting(true);
    try {
      const [pickupTime, expectedReturnTime] = dateRange;
      
      // Lấy thời gian hiện tại khi ấn "Xác nhận" - đây là thời gian đặt đơn hàng
      // Tạo date string theo format local time (không có Z) để backend lưu đúng local time
      const now = new Date();
      // Format: YYYY-MM-DDTHH:mm:ss (local time, không có Z)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const orderDateISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      
      console.log('[Booking] User clicked confirm at:', {
        now: now.toString(),
        iso: orderDateISO,
        local: now.toLocaleString('vi-VN')
      });
      
      // Lấy phoneNumber từ form (có thể là phoneNumber hoặc PhoneNumber)
      const phoneNumber = values.phoneNumber || values.PhoneNumber || (user as any)?.phoneNumber || (user as any)?.PhoneNumber || "";
      
      // Đảm bảo userId là number
      const userId = Number(user.id || (user as any).userId);
      if (!userId || isNaN(userId)) {
        message.error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");
        setSubmitting(false);
        return;
      }
      
      // Đảm bảo carId là number
      const carIdNum = Number(car.id);
      if (!carIdNum || isNaN(carIdNum)) {
        message.error("Thông tin xe không hợp lệ.");
        setSubmitting(false);
        return;
      }
      
      // Format thời gian theo local time (không convert sang UTC)
      // Format: YYYY-MM-DDTHH:mm:ss (local time, không có Z)
      const formatLocalTime = (date: Dayjs) => {
        const year = date.year();
        const month = String(date.month() + 1).padStart(2, '0');
        const day = String(date.date()).padStart(2, '0');
        const hours = String(date.hour()).padStart(2, '0');
        const minutes = String(date.minute()).padStart(2, '0');
        const seconds = String(date.second()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const orderData: CreateRentalOrderData = {
        phoneNumber: phoneNumber,
        pickupTime: formatLocalTime(pickupTime),
        expectedReturnTime: formatLocalTime(expectedReturnTime),
        withDriver: withDriverValue,
        userId: userId,
        carId: carIdNum,
        rentalLocationId: values.rentalLocationId,
        orderDate: orderDateISO, // Thời gian khi ấn "Xác nhận"
      };
      
      console.log('[Booking] Creating order with data:', {
        ...orderData,
        userId: userId,
        carId: carIdNum,
        user: { id: user.id, userId: (user as any).userId, email: user.email }
      });

      const response = await rentalOrderApi.createWithMomo(orderData);

      if (response.success && response.data) {
        const responseData = response.data as any;
        const orderId = responseData.id || responseData.Id;
        
        // Lấy vnpayPaymentUrl từ response
        const vnpayPaymentUrl = responseData.vnpayPaymentUrl || 
                               responseData.VnpayPaymentUrl || 
                               responseData.vnPayPaymentUrl ||
                               responseData.VnPayPaymentUrl ||
                               null;
        
        console.log('[Booking] Order created successfully:', {
          orderId,
          vnpayPaymentUrl,
          responseData
        });

        if (vnpayPaymentUrl) {
          // Thông báo đặt xe thành công và chuyển đến thanh toán VNPay
          api.success({
            message: (
              <span className="font-bold text-lg">
                ĐẶT XE THÀNH CÔNG!
              </span>
            ),
            description: (
              <div>
                <p className="mb-2 font-semibold text-base">
                  Đơn hàng của bạn đã được tạo thành công!
                </p>
                <p className="mt-2 text-sm font-semibold text-blue-600">
                  Đang chuyển đến trang thanh toán Momo...
                </p>
              </div>
            ),
            placement: "topRight",
            duration: 3,
          });
          
          // Redirect đến VNPay payment URL ở trang mới
          setTimeout(() => {
            window.location.href = vnpayPaymentUrl;
          }, 1000);
          setSubmitting(false);
          return; // Dừng ở đây, không chạy code phía dưới
        } else {
          // Không có payment URL trong response
          console.warn('[Booking] Order created but no vnpayPaymentUrl in response');
          api.warning({
            message: "Cảnh báo: Không tìm thấy link thanh toán",
            description: "Đơn hàng đã được tạo nhưng không có link thanh toán. Vui lòng kiểm tra đơn hàng của bạn.",
            placement: "topRight",
            duration: 5,
          });
          
          setTimeout(() => {
            router.push('/my-bookings');
          }, 2000);
        }
      } else {
        api.error({
          message: "Đặt xe thất bại",
          description: response.error || "Không thể tạo đơn hàng. Vui lòng thử lại.",
          placement: "topRight",
          duration: 5,
        });
      }
    } catch (error) {
      console.error("Create order error:", error);
      api.error({
        message: "Có lỗi xảy ra khi đặt xe",
        description: "Vui lòng kiểm tra lại thông tin và thử lại.",
        placement: "topRight",
        duration: 5,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Tính giá dựa trên dateRangeValue hoặc form value
  const getDateRange = () => {
    return dateRangeValue || form.getFieldValue('dateRange');
  };

  const calculateRentalFeeWithDates = (dates: [Dayjs, Dayjs] | null) => {
    if (!car || !dates) return 0;
    
    const [pickupTime, returnTime] = dates;
    if (!pickupTime || !returnTime) return 0;
    
    const withDriverValue = withDriver;
    
    // Tính tổng số giờ (chính xác, không làm tròn)
    const totalHours = returnTime.diff(pickupTime, 'hour', true);
    
    if (totalHours <= 0) return 0;
    
    // Lấy giá theo loại (có tài xế hay không) và theo khoảng thời gian
    // Logic: Format 24h
    // - returnDate - pickupTime <= 4 giờ: giá 4 giờ (withDriver hoặc false)
    // - <= 8 giờ: giá 8 giờ (withDriver hoặc false)
    // - > 8 giờ: giá per day (làm tròn lên)
    let rentalFee = 0;
    
     if (totalHours <= 4) {
       // <= 4 giờ: lấy giá 4 giờ
       rentalFee = withDriverValue ? car.rentPricePer4HourWithDriver : car.rentPricePer4Hour;
     } else if (totalHours <= 8) {
       // > 4 giờ và <= 8 giờ: lấy giá 8 giờ
       rentalFee = withDriverValue ? car.rentPricePer8HourWithDriver : car.rentPricePer8Hour;
     } else {
       // > 8 giờ: tính theo giờ = (giá per day / 24) * số giờ
       const pricePerDay = withDriverValue ? car.rentPricePerDayWithDriver : car.rentPricePerDay;
       const pricePerHour = pricePerDay / 24;
       rentalFee = pricePerHour * totalHours;
     }
    
    // Debug: log để kiểm tra giá
    if (process.env.NODE_ENV === 'development') {
      console.log('[calculateRentalFeeWithDates]', {
        withDriver: withDriverValue,
        totalHours,
        rentalFee,
        rentPricePer4Hour: car.rentPricePer4Hour,
        rentPricePer4HourWithDriver: car.rentPricePer4HourWithDriver,
        rentPricePer8Hour: car.rentPricePer8Hour,
        rentPricePer8HourWithDriver: car.rentPricePer8HourWithDriver,
        rentPricePerDay: car.rentPricePerDay,
        rentPricePerDayWithDriver: car.rentPricePerDayWithDriver,
      });
    }
    
    return rentalFee;
  };

  const rentalFee = calculateRentalFeeWithDates(getDateRange());
  const depositOrder = calculateDepositOrder(); // Phí giữ chỗ khi đặt hàng
  const depositCar = calculateDepositCar(); // Phí thế chấp khi thuê xe
  const total = rentalFee; // Tổng cộng tiền thuê (Tạm tính) = phí thuê xe
  const remaining = total - depositOrder;


  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Tìm và chọn xe</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-500 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <CarIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Xác nhận thông tin</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-500 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Thông tin thanh toán</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Đến điểm nhận</span>
            </div>
          </div>
        </div>

        {/* Login Banner */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Đăng nhập ngay để nhận ưu đãi</p>
                <p className="text-sm text-gray-600">
                  Tiết kiệm 10% hoặc hơn nếu đăng nhập tài khoản và giữ chỗ chiếc xe phù hợp với lịch trình của bạn.
                </p>
              </div>
            </div>
            <Link href="/login">
              <Button type="primary" className="bg-blue-500 hover:bg-blue-600 border-0">
                Đăng nhập
              </Button>
            </Link>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-6">
          {/* Thông tin xe */}
          {car && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex gap-4">
                <div className="w-32 h-24 flex-shrink-0">
                  <img
                    src={car.imageUrl || "/logo_ev.png"}
                    alt={car.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{car.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{car.model}</p>
                  {selectedLocation && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>
                        {selectedLocation.name && `${selectedLocation.name} - `}
                        {selectedLocation.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Thông tin đặt xe */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Thông tin đặt xe</h2>
            <p className="text-sm text-gray-600 mb-4">
              Vui lòng để lại thông tin liên lạc. Chúng tôi sẽ liên hệ bạn sớm nhất.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Họ Và Tên"
                name="name"
                rules={[{ required: true, message: "Vui lòng nhập tên" }]}
              >
                <Input
                  size="large"
                  placeholder="Nhập tên"
                  prefix={<UserIcon className="w-4 h-4 text-gray-400" />}
                  disabled={true}
                  className="bg-gray-50"
                />
              </Form.Item>
              <Form.Item
                label="Số điện thoại"
                name="phoneNumber"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
              >
                <Input
                  size="large"
                  placeholder="Nhập số điện thoại"
                  prefix={<Phone className="w-4 h-4 text-gray-400" />}
                  disabled={true}
                  className="bg-gray-50"
                />
              </Form.Item>
            </div>
          </div>

          {/* Thông tin đơn hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-blue-800 mb-6">Thông tin đơn hàng</h2>

            {/* Thời gian thuê */}
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Thời gian thuê</p>
                  {dateRangeValue && dateRangeValue[0] && dateRangeValue[1] ? (
                    <p className="text-base font-semibold text-gray-900">
                      {dateRangeValue[0].format('HH:mm, DD/MM/YYYY')} đến {dateRangeValue[1].format('HH:mm, DD/MM/YYYY')}
                    </p>
                  ) : (
                    <Form.Item
                      name="dateRange"
                      rules={[{ required: true, message: "Vui lòng chọn thời gian thuê" }]}
                      className="mb-0"
                    >
                      <RangePicker
                        showTime={{ format: 'HH:mm' }}
                        format="DD/MM/YYYY HH:mm"
                        size="large"
                        className="w-full"
                        placeholder={["Thời gian nhận xe", "Thời gian trả xe"]}
                        disabled={!!(pickupTimeFromUrl && returnTimeFromUrl)}
                        onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
                          if (dates && dates[0] && dates[1]) {
                            setDateRangeValue([dates[0], dates[1]]);
                          } else {
                            setDateRangeValue(null);
                          }
                        }}
                        disabledDate={(current: Dayjs | null) => {
                          if (!current) return false;
                          
                          // Chặn các ngày trong quá khứ
                          if (current < dayjs().startOf('day')) {
                            return true;
                          }

                          // Kiểm tra xem ngày có nằm trong khoảng thời gian đã được thuê không
                          const isBooked = bookedDates.some((range) => {
                            const date = current.startOf('day');
                            const rangeStart = range.start.startOf('day');
                            const rangeEnd = range.end.startOf('day');
                            
                            // Ngày nằm trong khoảng đã được thuê
                            return (date.isSameOrAfter(rangeStart) && date.isSameOrBefore(rangeEnd));
                          });

                          return isBooked;
                        }}
                        cellRender={(current: any, info: any) => {
                          if (info.type !== 'date') {
                            return info.originNode;
                          }

                          if (!current || typeof current === 'string' || typeof current === 'number') {
                            return info.originNode;
                          }

                          const currentDayjs = dayjs(current);

                          // Kiểm tra xem ngày có bị thuê không
                          const isBooked = bookedDates.some((range) => {
                            const date = currentDayjs.startOf('day');
                            const rangeStart = range.start.startOf('day');
                            const rangeEnd = range.end.startOf('day');
                            return (date.isSameOrAfter(rangeStart) && date.isSameOrBefore(rangeEnd));
                          });

                          if (isBooked) {
                            return (
                              <div className="ant-picker-cell-inner" style={{ 
                                backgroundColor: '#ff4d4f', 
                                color: '#fff',
                                borderRadius: '2px'
                              }}>
                                {currentDayjs.date()}
                              </div>
                            );
                          }

                          return info.originNode;
                        }}
                        disabledTime={(value: Dayjs | null, type: 'start' | 'end') => {
                          const now = dayjs();
                          const isToday = value && value.isSame(now, 'day');
                          
                          // Chặn các giờ ngoài khoảng 6h-22h (chỉ cho phép 6h đến 22h)
                          const disabledHours = () => {
                            const hours = [];
                            // Chặn 0h-5h
                            for (let i = 0; i < 6; i++) {
                              hours.push(i);
                            }
                            // Chặn 23h
                            hours.push(23);
                            
                            // Nếu là ngày hôm nay và là thời gian nhận xe (start), chặn thêm các giờ trong quá khứ
                            if (isToday && type === 'start') {
                              for (let i = 0; i < now.hour(); i++) {
                                if (!hours.includes(i)) {
                                  hours.push(i);
                                }
                              }
                            }
                            
                            return hours;
                          };
                          
                          const disabledMinutes = (selectedHour: number) => {
                            const minutes = [];
                            
                            // Nếu là ngày hôm nay, là thời gian nhận xe (start), và chọn giờ hiện tại, chặn các phút trong quá khứ
                            if (isToday && type === 'start' && selectedHour === now.hour()) {
                              for (let i = 0; i <= now.minute(); i++) {
                                minutes.push(i);
                              }
                            }
                            
                            return minutes;
                          };
                          
                          return {
                            disabledHours,
                            disabledMinutes,
                          };
                        }}
                      />
                    </Form.Item>
                  )}
                </div>
              </div>
            </div>

            {/* Địa điểm nhận xe */}
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Nhận xe tại vị trí xe hiện tại</p>
                  {selectedLocation ? (
                    <p className="text-base font-semibold text-gray-900">
                      {selectedLocation.name && `${selectedLocation.name} - `}
                      {selectedLocation.address}
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-red-600">
                      Chưa xác định được vị trí xe
                    </p>
                  )}
                  <Form.Item
                    name="rentalLocationId"
                    initialValue={selectedLocation?.id}
                    rules={[{ required: true, message: "Không xác định được địa điểm nhận xe. Vui lòng liên hệ hỗ trợ." }]}
                    hidden
                  >
                    <Input type="hidden" />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Chọn tài xế */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-gray-900">Lựa chọn tài xế</span>
              </div>
              <Form.Item
                name="withDriver"
                initialValue={withDriverFromUrl === 'true' ? true : withDriverFromUrl === 'false' ? false : false}
                rules={[{ required: true, message: "Vui lòng chọn loại thuê xe" }]}
              >
                <Radio.Group 
                  disabled={isDriverOptionLocked}
                  onChange={(e) => {
                    if (!isDriverOptionLocked) {
                      setWithDriver(e.target.value);
                    }
                    // Force re-render để cập nhật giá
                  }}
                  className="w-full"
                >
                  <div className="flex gap-4">
                    <Radio.Button value={true} className="flex-1 text-center py-3">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-5 h-5" />
                        <span>Có tài xế</span>
                      </div>
                    </Radio.Button>
                    <Radio.Button value={false} className="flex-1 text-center py-3">
                      <div className="flex flex-col items-center gap-2">
                        <CarIcon className="w-5 h-5" />
                        <span>Tự lái</span>
                      </div>
                    </Radio.Button>
                  </div>
                </Radio.Group>
              </Form.Item>
            </div>

            {/* Cost Breakdown */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-gray-700">Phí giữ chỗ khi đặt hàng</span>
                <span className="font-semibold text-gray-900">{formatCurrency(depositOrder)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Phí thuê xe (Tạm tính)</span>
                <span className="font-semibold text-gray-900">{formatCurrency(rentalFee)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Phí thế chấp khi thuê xe</span>
                <span className="font-semibold text-gray-900">{formatCurrency(depositCar)}</span>
              </div>
            
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-900">Tổng cộng tiền thuê (Tạm tính)</span>
                <span className="font-bold text-gray-900 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Các bước thanh toán */}
          {/* <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Các bước thanh toán</h2>
            
            <div className="space-y-4">
    
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Thanh toán giữ chỗ qua EV RENTAL</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Tiền này để xác nhận đơn thuê và giữ xe
                  </p>
                  <p className="text-xs text-gray-500">
                    (Một phần giá trị tiền thuê xe được thanh toán trước qua nền tảng EV RENTAL).
                  </p>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(depositOrder)}</span>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-3">Thanh toán khi nhận xe</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tiền thuê</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(remaining)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tiền thế chấp</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(3000000)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Sẽ hoàn lại khi trả xe</p>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

        


          {/* Thành tiền và nút xác nhận */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-gray-900">Thành tiền</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div> */}

            {/* Nút xem hợp đồng online */}
            <a
              href="https://docs.google.com/document/d/1YgC67aVKLUn54VWse8npdxsfwiipW-tnDsu-IHaIx2Y/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-4"
            >
              <Button
                type="default"
                size="large"
                className="w-full h-12 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 text-lg font-semibold flex items-center justify-center gap-2"
                icon={<FileText className="w-5 h-5" />}
              >
                Xem hợp đồng online
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>

            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 border-0 text-lg font-semibold"
            >
              Xác nhận
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Bằng việc chuyển giữ chỗ và thuê xe, bạn đồng ý với{' '}
              <Link href="/policies/terms" className="text-blue-600 underline">
                Điều khoản sử dụng
              </Link>
              {' '}và{' '}
              <Link href="/policies/privacy" className="text-blue-600 underline">
                Chính sách bảo mật
              </Link>
            </p>
          </div>
        </Form>
      </main>

      <Footer />
    </div>
    </>
  );
}

