"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Form, Input, DatePicker, Button, message, Checkbox, Radio, notification, Alert, Modal } from "antd";
import { Calendar, MapPin, Phone, User as UserIcon, Search, Car as CarIcon, FileText, Download, Percent, Info, UserCheck } from "lucide-react";
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
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pendingVnpayUrl, setPendingVnpayUrl] = useState<string | null>(null);
  const [creatingMomoPayment, setCreatingMomoPayment] = useState(false);

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
                        console.log("✅ Đã lấy PhoneNumber từ API GetById:", fullPhoneNumber);
                      }
                    }
                  } catch (getByIdError) {
                    console.warn("⚠️ Không thể lấy user từ GetById (có thể do quyền truy cập):", getByIdError);
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

            // Lọc các đơn hàng có status không phải Cancelled hoặc Completed
            const activeOrders = carOrders.filter((order: any) => {
              const status = order.status || order.Status || '';
              const statusStr = status.toString().toLowerCase();
              // Chỉ lấy các đơn hàng đang active (không phải cancelled hoặc completed)
              return !statusStr.includes('cancelled') && !statusStr.includes('completed') && statusStr !== '7' && statusStr !== '8';
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

  const handleSelectVnpay = () => {
    if (pendingVnpayUrl) {
      // Thông báo và redirect đến VNPay
      api.success({
        message: "Đang chuyển đến trang thanh toán VNPay...",
        placement: "topRight",
        duration: 2,
      });
      
      setPaymentMethodModalOpen(false);
      setTimeout(() => {
        window.location.href = pendingVnpayUrl;
      }, 500);
    } else {
      api.error({
        message: "Không tìm thấy link thanh toán VNPay",
        description: "Vui lòng thử lại hoặc liên hệ hỗ trợ.",
        placement: "topRight",
        duration: 4,
      });
    }
  };

  const handleSelectMomo = async () => {
    if (!pendingOrderId || !user) {
      api.error({
        message: "Thông tin không đầy đủ",
        description: "Vui lòng thử lại.",
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    try {
      setCreatingMomoPayment(true);
      
      // Lấy userId và amount (phí giữ chỗ)
      // Kiểm tra nhiều trường hợp để lấy userId
      const userIdValue = (user as any).id || 
                         (user as any).Id || 
                         (user as any).userId || 
                         (user as any).UserId ||
                         user.id;
      const userId = Number(userIdValue);
      const amount = calculateDepositOrder();
      
      console.log('[Booking] User data for MoMo payment:', {
        user,
        userIdValue,
        userId,
        isValid: !isNaN(userId) && userId > 0,
        amount
      });
      
      if (!userId || isNaN(userId) || userId <= 0) {
        console.error('[Booking] Invalid userId:', { userId, user });
        throw new Error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");
      }
      
      if (amount <= 0) {
        throw new Error("Số tiền thanh toán không hợp lệ");
      }

      // Gọi API tạo MoMo payment
      console.log('[Booking] Creating MoMo payment:', {
        orderId: pendingOrderId,
        userId,
        amount
      });

      const momoResponse = await paymentApi.createMomoPayment(
        pendingOrderId,
        userId,
        amount
      );

      console.log('[Booking] MoMo payment response:', {
        success: momoResponse.success,
        hasData: !!momoResponse.data,
        data: momoResponse.data,
        error: momoResponse.error,
        fullResponse: JSON.stringify(momoResponse, null, 2)
      });

      // Kiểm tra các loại lỗi đặc biệt
      const errorMessage = momoResponse.error || '';
      const isDuplicateOrderError = errorMessage.includes('trùng orderId') || 
                                   errorMessage.includes('duplicate') ||
                                   errorMessage.includes('trùng') ||
                                   errorMessage.toLowerCase().includes('orderid');
      
      const isUserIdError = errorMessage.includes('userId') || 
                           errorMessage.includes('User') ||
                           errorMessage.includes('undefined');

      if (isDuplicateOrderError) {
        // Lỗi trùng orderId - có thể đơn hàng đã có payment MoMo rồi
        // Không hiển thị lỗi, chỉ log và redirect đến my-bookings
        console.log('[Booking] MoMo payment already exists for this order, redirecting to my-bookings');
        setPaymentMethodModalOpen(false);
        setTimeout(() => {
          router.push('/my-bookings');
        }, 500);
        return;
      }
      
      if (isUserIdError) {
        // Lỗi về userId - có thể token không hợp lệ hoặc user chưa đăng nhập đúng cách
        console.error('[Booking] UserId error in MoMo payment:', errorMessage);
        api.error({
          message: "Lỗi xác thực người dùng",
          description: "Vui lòng đăng xuất và đăng nhập lại để tiếp tục thanh toán.",
          placement: "topRight",
          duration: 5,
        });
        return;
      }

      if (momoResponse.success) {
        // Lấy paymentUrl từ response (có thể ở nhiều vị trí)
        let paymentUrl: string | null = null;
        
        // Kiểm tra trong response.data
        if (momoResponse.data) {
          const data = momoResponse.data as any;
          paymentUrl = data.paymentUrl || 
                      data.momoPayUrl || 
                      data.payUrl ||
                      data.PaymentUrl ||
                      data.MomoPayUrl ||
                      data.PayUrl ||
                      null;
        }
        
        // Nếu không có trong data, kiểm tra trong response trực tiếp
        if (!paymentUrl) {
          const responseAny = momoResponse as any;
          paymentUrl = responseAny.paymentUrl || 
                      responseAny.momoPayUrl || 
                      responseAny.payUrl ||
                      null;
        }
        
        console.log('[Booking] Extracted paymentUrl:', paymentUrl);
        
        if (paymentUrl) {
          api.success({
            message: "Đang chuyển đến trang thanh toán MoMo...",
            placement: "topRight",
            duration: 2,
          });
          
          setPaymentMethodModalOpen(false);
          setTimeout(() => {
            window.location.href = paymentUrl!;
          }, 500);
        } else {
          console.error('[Booking] No paymentUrl found in MoMo response:', momoResponse);
          throw new Error("Không nhận được payment URL từ MoMo. Vui lòng thử lại.");
        }
      } else {
        console.error('[Booking] MoMo payment failed:', momoResponse.error);
        throw new Error(momoResponse.error || "Không thể tạo payment request. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Create MoMo payment error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Có lỗi xảy ra khi tạo payment";
      
      // Kiểm tra nếu lỗi là về trùng orderId - không hiển thị lỗi cho user
      const isDuplicateOrderError = errorMessage.includes('trùng orderId') || 
                                   errorMessage.includes('duplicate') ||
                                   errorMessage.includes('trùng') ||
                                   errorMessage.toLowerCase().includes('orderid');
      
      if (isDuplicateOrderError) {
        // Lỗi trùng orderId - có thể đơn hàng đã có payment MoMo rồi
        // Không hiển thị lỗi, chỉ log và redirect đến my-bookings
        console.log('[Booking] MoMo payment already exists for this order, redirecting to my-bookings');
        setPaymentMethodModalOpen(false);
        setTimeout(() => {
          router.push('/my-bookings');
        }, 500);
      } else {
        // Các lỗi khác - hiển thị cho user
        api.error({
          message: "Lỗi thanh toán MoMo",
          description: errorMessage,
          placement: "topRight",
          duration: 5,
        });
      }
    } finally {
      setCreatingMomoPayment(false);
    }
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
      const userId = Number(user.id || user.userId);
      if (!userId || isNaN(userId)) {
        message.error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }
      
      // Đảm bảo carId là number
      const carIdNum = Number(car.id);
      if (!carIdNum || isNaN(carIdNum)) {
        message.error("Thông tin xe không hợp lệ.");
        setLoading(false);
        return;
      }
      
      const orderData: CreateRentalOrderData = {
        phoneNumber: phoneNumber,
        pickupTime: pickupTime.toISOString(),
        expectedReturnTime: expectedReturnTime.toISOString(),
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
        user: { id: user.id, userId: user.userId, email: user.email }
      });

      const response = await rentalOrderApi.create(orderData);

      console.log('[Booking] Full API response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data as any) : [],
        fullResponse: JSON.stringify(response, null, 2)
      });

      if (response.success) {
        // Xử lý nhiều trường hợp response structure
        let responseData: any = response.data;
        
        // Nếu response.data là array, lấy phần tử đầu tiên
        if (Array.isArray(responseData) && responseData.length > 0) {
          responseData = responseData[0];
        }
        
        // Nếu có $values, lấy từ $values
        if (responseData?.$values && Array.isArray(responseData.$values) && responseData.$values.length > 0) {
          responseData = responseData.$values[0];
        }
        
        // Kiểm tra nhiều trường hợp để lấy orderId
        const orderId = responseData?.id || 
                       responseData?.Id || 
                       responseData?.orderId || 
                       responseData?.OrderId ||
                       responseData?.rentalOrderId ||
                       responseData?.RentalOrderId ||
                       (responseData as any)?.$id ? Number((responseData as any).$id) : null;
        
        // Lấy vnpayPaymentUrl từ response (có thể ở nhiều level)
        const vnpayPaymentUrl = responseData?.vnpayPaymentUrl || 
                               responseData?.VnpayPaymentUrl || 
                               responseData?.vnPayPaymentUrl ||
                               responseData?.VnPayPaymentUrl ||
                               responseData?.paymentUrl ||
                               responseData?.PaymentUrl ||
                               (response as any)?.vnpayPaymentUrl ||
                               (response as any)?.VnpayPaymentUrl ||
                               null;
        
        console.log('[Booking] Parsed order data:', {
          orderId,
          orderIdType: typeof orderId,
          isValidOrderId: orderId && !isNaN(Number(orderId)),
          vnpayPaymentUrl,
          responseDataKeys: responseData ? Object.keys(responseData) : [],
          responseDataType: typeof responseData,
          responseData: responseData
        });

        // Lưu thông tin đơn hàng và hiển thị modal chọn phương thức thanh toán
        const validOrderId = orderId && !isNaN(Number(orderId)) ? Number(orderId) : null;
        
        if (validOrderId) {
          setPendingOrderId(validOrderId);
          setPendingVnpayUrl(vnpayPaymentUrl);
          
          console.log('[Booking] ✅ Order created successfully, showing payment modal:', {
            orderId: validOrderId,
            hasVnpayUrl: !!vnpayPaymentUrl
          });
          
          // Thông báo đặt xe thành công
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
                  Vui lòng chọn phương thức thanh toán.
                </p>
              </div>
            ),
            placement: "topRight",
            duration: 3,
          });
          
          // Hiển thị modal chọn phương thức thanh toán
          setPaymentMethodModalOpen(true);
          setSubmitting(false);
          return;
        } else {
          // Không có orderId trong response hoặc orderId không hợp lệ
          console.error('[Booking] ❌ Order created but no valid orderId found:', {
            orderId,
            validOrderId,
            responseData,
            responseDataKeys: responseData ? Object.keys(responseData) : [],
            fullResponse: response,
            responseString: JSON.stringify(response, null, 2)
          });
          
          api.warning({
            message: "Cảnh báo: Không tìm thấy thông tin đơn hàng",
            description: "Đơn hàng đã được tạo nhưng không có thông tin đơn hàng. Vui lòng kiểm tra đơn hàng của bạn trong trang 'Đơn hàng của tôi'.",
            placement: "topRight",
            duration: 5,
          });
          
          setTimeout(() => {
            router.push('/my-bookings');
          }, 2000);
        }
      } else {
        // Response không thành công
        console.error('[Booking] ❌ Order creation failed:', response);
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
                        cellRender={(current, info) => {
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
                        disabledTime={(value, type) => {
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

    {/* Modal chọn phương thức thanh toán */}
    <Modal
      open={paymentMethodModalOpen}
      onCancel={() => {
        setPaymentMethodModalOpen(false);
        // Redirect đến trang my-bookings nếu user đóng modal
        router.push('/my-bookings');
      }}
      footer={null}
      closable={true}
      width={600}
      title={
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chọn phương thức thanh toán</h2>
          <p className="text-sm text-gray-600">Vui lòng chọn phương thức thanh toán để tiếp tục</p>
        </div>
      }
    >
      <div className="space-y-4 mt-6">
        {/* VNPay Option */}
        <button
          onClick={handleSelectVnpay}
          disabled={!pendingVnpayUrl}
          className={`w-full p-6 border-2 rounded-lg transition-all ${
            pendingVnpayUrl
              ? 'border-blue-500 hover:border-blue-600 hover:bg-blue-50 cursor-pointer'
              : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">VNPay</span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900">Thanh toán qua VNPay</h3>
                <p className="text-sm text-gray-600 mt-1">Thanh toán an toàn qua cổng VNPay</p>
              </div>
            </div>
            {pendingVnpayUrl && (
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </button>

        {/* MoMo Option */}
        <button
          onClick={handleSelectMomo}
          disabled={creatingMomoPayment || !pendingOrderId}
          className={`w-full p-6 border-2 rounded-lg transition-all ${
            !creatingMomoPayment && pendingOrderId
              ? 'border-pink-500 hover:border-pink-600 hover:bg-pink-50 cursor-pointer'
              : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">MoMo</span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900">Thanh toán qua MoMo</h3>
                <p className="text-sm text-gray-600 mt-1">Thanh toán nhanh chóng qua ví MoMo</p>
              </div>
            </div>
            {creatingMomoPayment ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
            ) : pendingOrderId ? (
              <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : null}
          </div>
        </button>

        {/* Thông tin số tiền */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-semibold">Số tiền cần thanh toán:</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(calculateDepositOrder())}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Đây là phí giữ chỗ khi đặt hàng</p>
        </div>
      </div>
    </Modal>
    </>
  );
}

