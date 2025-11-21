"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Form, Input, DatePicker, Button, message, Checkbox, Radio, notification, Alert, Modal } from "antd";
import { Calendar, MapPin, Phone, User as UserIcon, Search, Car as CarIcon, FileText, Download, Percent, Info, UserCheck } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import { carsApi, rentalOrderApi, rentalLocationApi, carRentalLocationApi, authApi, driverLicenseApi, citizenIdApi } from "@/services/api";
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
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(null);
  const [dateRangeValue, setDateRangeValue] = useState<[Dayjs, Dayjs] | null>(null);

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
      console.warn("resolveCarLocation: carData is null");
      return;
    }

    console.log("resolveCarLocation: carData", carData);

    // Extract carRentalLocations list
    let relations = extractCarRentalLocationList(carData);
    console.log("resolveCarLocation: relations from carData", relations);

    // Nếu không có trong carData, thử fetch từ API
    if (!relations.length) {
      try {
        const relationResponse = await carRentalLocationApi.getByCarId(Number(carData.id));
        if (relationResponse.success && relationResponse.data) {
          relations = extractCarRentalLocationList({ carRentalLocations: relationResponse.data });
          console.log("resolveCarLocation: relations from API", relations);
        }
      } catch (error) {
        console.warn("resolveCarLocation: Failed to load carRentalLocations via API", error);
      }
    }

    if (!relations.length) {
      console.warn("resolveCarLocation: No relations found");
      setSelectedLocation(null);
      form.setFieldsValue({ rentalLocationId: undefined });
      return;
    }

    // Lấy relation đầu tiên (active nếu có)
    const primaryRelation =
      relations.find(
        (rel: any) =>
          (rel?.isActive ?? rel?.IsActive ?? true) &&
          !(rel?.isDeleted ?? rel?.IsDeleted)
      ) || relations[0];

    console.log("resolveCarLocation: primaryRelation", primaryRelation);

    // Lấy locationId từ relation
    const locationId = getLocationIdFromRelation(primaryRelation);
    console.log("resolveCarLocation: locationId", locationId);

    if (!locationId) {
      console.warn("resolveCarLocation: Could not extract locationId");
      setSelectedLocation(null);
      form.setFieldsValue({ rentalLocationId: undefined });
      return;
    }

    // Thử lấy name và address từ relation trước
    const infoSource = primaryRelation?.rentalLocation ?? primaryRelation?.RentalLocation ?? primaryRelation;
    const name = getNameFromSource(infoSource);
    const address = getAddressFromSource(infoSource);

    console.log("resolveCarLocation: name from relation", name);
    console.log("resolveCarLocation: address from relation", address);

    // Nếu đã có đủ thông tin từ relation (có name hoặc address)
    if (name || address) {
      const location: RentalLocationData = {
        id: locationId,
        name: name ?? "",
        address: address ?? "",
        coordinates: infoSource?.coordinates ?? infoSource?.Coordinates ?? "",
        isActive: infoSource?.isActive ?? infoSource?.IsActive ?? true,
      };
      console.log("resolveCarLocation: Found location from relation", location);
      setSelectedLocation(location);
      form.setFieldsValue({ rentalLocationId: location.id });
      return;
    }

    // Nếu chưa đủ thông tin, thử fetch từ getAll() trước (public endpoint)
    try {
      console.log("resolveCarLocation: Fetching all locations from API to find id:", locationId);
      const allLocationsResponse = await rentalLocationApi.getAll();
      console.log("resolveCarLocation: getAll API response", allLocationsResponse);

      if (allLocationsResponse.success && allLocationsResponse.data) {
        const locationsData = allLocationsResponse.data as any;
        const locationsList = Array.isArray(locationsData)
          ? locationsData
          : (locationsData?.$values && Array.isArray(locationsData.$values) ? locationsData.$values : []);

        const foundLocation = locationsList.find((loc: any) => {
          const locId = loc?.id ?? loc?.Id ?? loc?.locationId ?? loc?.LocationId;
          return Number(locId) === Number(locationId);
        });

        if (foundLocation) {
          const locationData: RentalLocationData = {
            id: foundLocation.id ?? foundLocation.Id ?? locationId,
            name: foundLocation.name ?? foundLocation.Name ?? "",
            address: foundLocation.address ?? foundLocation.Address ?? "",
            coordinates: foundLocation.coordinates ?? foundLocation.Coordinates ?? "",
            isActive: foundLocation.isActive ?? foundLocation.IsActive ?? true,
          };
          console.log("resolveCarLocation: Found location from getAll", locationData);
          setSelectedLocation(locationData);
          form.setFieldsValue({ rentalLocationId: locationData.id });
          return;
        }
      }
    } catch (error) {
      console.warn("resolveCarLocation: getAll API error", error);
    }

    // Fallback: Nếu vẫn không tìm thấy, tạo location object với id (ít nhất có id để submit form)
    if (locationId) {
      const location: RentalLocationData = {
        id: locationId,
        name: `Địa điểm #${locationId}`,
        address: "",
        coordinates: "",
        isActive: true,
      };
      console.log("resolveCarLocation: Created fallback location with id only", location);
      setSelectedLocation(location);
      form.setFieldsValue({ rentalLocationId: location.id });
      return;
    }

    // Không tìm thấy location
    console.warn("resolveCarLocation: Could not find location for car", carData.id);
    setSelectedLocation(null);
    form.setFieldsValue({ rentalLocationId: undefined });
  }, [form]);

  const carId = params?.carId as string;
  const locationIdFromUrl = searchParams?.get('locationId');

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
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            form.setFieldsValue({
              name: userData.name || "",
              phoneNumber: userData.phone || "",
            });
            
            // Check if user has uploaded documents
            try {
              const [licenseRes, citizenIdRes] = await Promise.all([
                driverLicenseApi.getAll(),
                citizenIdApi.getAll()
              ]);
              
              const licenseData = licenseRes.data as any;
              const hasLicense = licenseRes.success && licenseData && 
                (Array.isArray(licenseData) ? licenseData.length > 0 : 
                 (licenseData?.$values && Array.isArray(licenseData.$values) ? licenseData.$values.length > 0 : false));
              
              const citizenIdData = citizenIdRes.data as any;
              const hasCitizenId = citizenIdRes.success && citizenIdData && 
                (Array.isArray(citizenIdData) ? citizenIdData.length > 0 : 
                 (citizenIdData?.$values && Array.isArray(citizenIdData.$values) ? citizenIdData.$values.length > 0 : false));
              
              setHasDocuments(hasLicense && hasCitizenId);
            } catch (error) {
              console.error("Check documents error:", error);
              setHasDocuments(false);
            }
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
              return; // Không cần resolve car location nữa vì đã chọn từ URL
            }
          }
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
  }, [carId, form, router, resolveCarLocation]);

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
    
    // Lấy giá theo loại (có tài xế hay không)
    const pricePerDay = withDriver ? car.rentPricePerDayWithDriver : car.rentPricePerDay;
    // Sử dụng giá/giờ trực tiếp từ database
    const pricePerHour = withDriver ? car.rentPricePerHourWithDriver : car.rentPricePerHour;
    
    // Tính số ngày đầy đủ và số giờ còn lại
    const fullDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    
    // Debug: log để kiểm tra giá
    if (process.env.NODE_ENV === 'development') {
      console.log('[calculateRentalFee]', {
        withDriver,
        totalHours,
        fullDays,
        remainingHours,
        pricePerDay,
        pricePerHour,
        rentPricePerHour: car.rentPricePerHour,
        rentPricePerHourWithDriver: car.rentPricePerHourWithDriver,
      });
    }
    
    // Tính tổng: (số ngày * giá/ngày) + (số giờ lẻ / 24 * giá/ngày)
    // Ví dụ: 2.5 ngày = 2 ngày × 450,000 + (12 giờ / 24) × 450,000 = 900,000 + 225,000 = 1,125,000
    const dayFee = fullDays * pricePerDay;
    const partialDayFee = (remainingHours / 24) * pricePerDay;
    
    return dayFee + partialDayFee;
  };

  const calculateTotal = () => {
    const rentalFee = calculateRentalFee();
    return rentalFee;
  };

  const calculateDeposit = () => {
    return 500000; // Fixed deposit amount
  };

  const calculateRemaining = () => {
    return calculateTotal() - calculateDeposit();
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

    setSubmitting(true);
    try {
      const [pickupTime, expectedReturnTime] = values.dateRange;
      
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
      
      const orderData: CreateRentalOrderData = {
        phoneNumber: values.phoneNumber,
        pickupTime: pickupTime.toISOString(),
        expectedReturnTime: expectedReturnTime.toISOString(),
        withDriver: withDriverValue,
        userId: user.id,
        carId: car.id,
        rentalLocationId: values.rentalLocationId,
        orderDate: orderDateISO, // Thời gian khi ấn "Xác nhận"
      };

      const response = await rentalOrderApi.create(orderData);

      if (response.success && response.data) {
        const orderId = (response.data as any).id || (response.data as any).Id;
        
        // LUÔN LUÔN cập nhật OrderDate = thời gian khi ấn "Xác nhận"
        if (orderId && orderId > 0) {
          console.log('[Booking] Order created successfully. Updating OrderDate to confirm time:', orderDateISO);
          try {
            const updateResponse = await rentalOrderApi.updateOrderDate(orderId, orderDateISO);
            if (updateResponse.success) {
              console.log('[Booking] OrderDate updated successfully to confirm time:', updateResponse.data?.orderDate || (updateResponse.data as any)?.OrderDate);
            } else {
              console.warn('[Booking] Failed to update OrderDate:', updateResponse.error);
              // Không block flow, nhưng log warning để biết có vấn đề
            }
          } catch (updateError) {
            console.error('[Booking] Error updating OrderDate:', updateError);
            // Không block flow nếu update OrderDate thất bại
          }
        }
        
        // Nếu không có tài xế, tự động chuyển đến trang upload giấy tờ
        if (!withDriverValue) {
          api.success({
            message: "Đặt xe thành công",
            description: "Đang chuyển đến trang upload giấy tờ...",
            placement: "topRight",
            duration: 2,
          });
          // Tự động chuyển đến trang upload giấy tờ với orderId (chỉ khi có orderId hợp lệ)
          setTimeout(() => {
            if (orderId && orderId > 0) {
              router.push(`/profile/documents?orderId=${orderId}`);
            } else {
              router.push('/profile/documents');
            }
          }, 1000);
        } else {
          // Có tài xế, chỉ thông báo thành công và chuyển đến trang đơn hàng
          api.success({
            message: "Đặt xe thành công",
            description: "Đơn hàng của bạn đã được tạo thành công. Đang chuyển đến trang đơn hàng...",
            placement: "topRight",
            duration: 3,
          });
          setTimeout(() => {
            if (orderId && orderId > 0) {
              router.push(`/my-bookings?orderId=${orderId}`);
            } else {
              router.push('/my-bookings');
            }
          }, 1500);
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
    
    // Lấy giá theo loại (có tài xế hay không)
    const pricePerDay = withDriverValue ? car.rentPricePerDayWithDriver : car.rentPricePerDay;
    // Sử dụng giá/giờ trực tiếp từ database
    const pricePerHour = withDriverValue ? car.rentPricePerHourWithDriver : car.rentPricePerHour;
    
    // Tính số ngày đầy đủ và số giờ còn lại
    const fullDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    
    // Debug: log để kiểm tra giá
    if (process.env.NODE_ENV === 'development') {
      console.log('[calculateRentalFeeWithDates]', {
        withDriver: withDriverValue,
        totalHours,
        fullDays,
        remainingHours,
        pricePerDay,
        pricePerHour,
        rentPricePerHour: car.rentPricePerHour,
        rentPricePerHourWithDriver: car.rentPricePerHourWithDriver,
      });
    }
    
    // Tính tổng: (số ngày * giá/ngày) + (số giờ lẻ / 24 * giá/ngày)
    // Ví dụ: 2.5 ngày = 2 ngày × 450,000 + (12 giờ / 24) × 450,000 = 900,000 + 225,000 = 1,125,000
    const dayFee = fullDays * pricePerDay;
    const partialDayFee = (remainingHours / 24) * pricePerDay;
    
    return dayFee + partialDayFee;
  };

  const rentalFee = calculateRentalFeeWithDates(getDateRange());
  const total = rentalFee;
  const deposit = calculateDeposit();
  const remaining = total - deposit;


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
              <span className="text-sm font-medium text-gray-700">Điền thông tin</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-500 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Chờ Xác Nhận</span>
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
                />
              </Form.Item>
            </div>
          </div>

          {/* Thông tin đơn hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin đơn hàng</h2>

            {/* Thời gian thuê */}
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              <Form.Item
                name="dateRange"
                rules={[{ required: true, message: "Vui lòng chọn thời gian thuê" }]}
                className="mb-0 flex-1"
              >
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  size="large"
                  className="w-full"
                  placeholder={["Thời gian nhận xe", "Thời gian trả xe"]}
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
                    if (type === 'start') {
                      const now = dayjs();
                      
                      // Nếu chọn ngày hôm nay, chặn các giờ và phút trong quá khứ
                      if (value && value.isSame(now, 'day')) {
                        return {
                          disabledHours: () => {
                            const hours = [];
                            for (let i = 0; i < now.hour(); i++) {
                              hours.push(i);
                            }
                            return hours;
                          },
                          disabledMinutes: (selectedHour: number) => {
                            if (selectedHour === now.hour()) {
                              const minutes = [];
                              for (let i = 0; i <= now.minute(); i++) {
                                minutes.push(i);
                              }
                              return minutes;
                            }
                            return [];
                          },
                        };
                      }
                    }
                    return {};
                  }}
                />
              </Form.Item>
            </div>

            {/* Địa điểm nhận xe */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-gray-900">Địa điểm giao nhận xe</span>
              </div>
              
              {selectedLocation ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Nhận xe tại vị trí cố định</p>
                      <p className="text-sm text-gray-700">
                        {selectedLocation.name && `${selectedLocation.name} - `}
                        {selectedLocation.address}
                      </p>
                    </div>
                    <span className="text-blue-600 font-semibold ml-4">Miễn phí</span>
                  </div>
                  <Form.Item
                    name="rentalLocationId"
                    initialValue={selectedLocation.id}
                    rules={[{ required: true, message: "Không xác định được địa điểm nhận xe. Vui lòng liên hệ hỗ trợ." }]}
                    hidden
                  >
                    <Input type="hidden" />
                  </Form.Item>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-800 mb-1">Chưa xác định được vị trí xe</p>
                  <p className="text-sm text-red-600">
                    Vui lòng liên hệ tổng đài hoặc quay lại trang trước để chọn xe khác có vị trí rõ ràng.
                  </p>
                  <Form.Item
                    name="rentalLocationId"
                    rules={[{ required: true, message: "Không xác định được địa điểm nhận xe. Vui lòng liên hệ hỗ trợ." }]}
                    hidden
                  >
                    <Input type="hidden" />
                  </Form.Item>
                </div>
              )}
            </div>

            {/* Chọn tài xế */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-gray-900">Lựa chọn tài xế</span>
              </div>
              <Form.Item
                name="withDriver"
                initialValue={false}
                rules={[{ required: true, message: "Vui lòng chọn loại thuê xe" }]}
              >
                <Radio.Group 
                  onChange={(e) => {
                    setWithDriver(e.target.value);
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
              
              {/* Cảnh báo nếu tự lái và chưa có giấy tờ */}
              {!withDriver && hasDocuments === false && user && (
                <Alert
                  message="CHÚ Ý"
                  description={
                    <div>
                      <p className="mb-2">
                        Khi tự lái, bạn cần upload giấy phép lái xe (GPLX) và căn cước công dân (CCCD) trước khi đặt xe.
                      </p>
                      
                    </div>
                  }
                  type="warning"
                  showIcon
                  className="mt-3"
                />
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Phí thuê xe (Tạm tính)</span>
                <span className="font-semibold text-gray-900">{formatCurrency(rentalFee)}</span>
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
                <span className="font-bold text-gray-900">{formatCurrency(deposit)}</span>
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
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-gray-900">Thành tiền</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>

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

