"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Form, Input, DatePicker, Button, message, Checkbox, Radio, Select, notification } from "antd";
import { Calendar, MapPin, Phone, User as UserIcon, Search, Car as CarIcon, FileText, Download, Percent, Info } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import { carsApi, rentalOrderApi, rentalLocationApi, authApi } from "@/services/api";
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
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<RentalLocationData | null>(null);
  const [pickupOption, setPickupOption] = useState<'self' | 'delivery'>('self');
  const [discountOption, setDiscountOption] = useState<'program' | 'promo'>('program');
  const [promoCode, setPromoCode] = useState('');
  const [vatInvoice, setVatInvoice] = useState(false);
  const [carLocationIds, setCarLocationIds] = useState<number[]>([]); // Danh sách ID các vị trí có xe
  const [locationError, setLocationError] = useState<string | null>(null);

  const carId = params?.carId as string;

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
          }
        }

        // Load rental locations - CHỈ lấy những location có xe
        const locationsResponse = await rentalLocationApi.getAll();
        if (locationsResponse.success && locationsResponse.data) {
          const raw = locationsResponse.data as any;
          let locations: RentalLocationData[] = [];
          
          if (Array.isArray(raw)) {
            locations = raw;
          } else if (Array.isArray(raw.$values)) {
            locations = raw.$values;
          } else if (raw.data && Array.isArray(raw.data.$values)) {
            locations = raw.data.$values;
          } else if (raw.data && Array.isArray(raw.data)) {
            locations = raw.data;
          }
          
          const activeLocations = locations.filter((loc: any) => loc.isActive !== false);
          
          // Tạm thời set tất cả, sẽ filter sau khi có carLocationIds
          setRentalLocations(activeLocations);
          
          // Thu thập tất cả các vị trí có xe
          const carData = carResponse.data;
          const locationIds: number[] = [];
          let foundLocation: RentalLocationData | null = null;
          
          // Thử tìm từ carRentalLocations
          if (carData?.carRentalLocations) {
            const carLocations = carData.carRentalLocations;
            const carLocationList = Array.isArray(carLocations) ? carLocations : carLocations.$values || [];
            if (carLocationList.length > 0) {
              // Thu thập tất cả location IDs
              carLocationList.forEach((cl: any) => {
                const locId = cl?.rentalLocationId || 
                             cl?.RentalLocationId ||
                             cl?.rentalLocation?.id ||
                             cl?.rentalLocation?.Id;
                if (locId && !locationIds.includes(locId)) {
                  locationIds.push(locId);
                }
              });
              
              // Tìm location active đầu tiên để set mặc định
              const activeCarLocation = carLocationList.find((cl: any) => 
                (cl?.isActive ?? cl?.IsActive) !== false && 
                !(cl?.isDeleted ?? cl?.IsDeleted)
              ) || carLocationList[0];
              
              const carLocationId = activeCarLocation?.rentalLocationId || 
                                   activeCarLocation?.RentalLocationId ||
                                   activeCarLocation?.rentalLocation?.id ||
                                   activeCarLocation?.rentalLocation?.Id;
              
              if (carLocationId) {
                foundLocation = activeLocations.find(loc => loc.id === carLocationId) || null;
                
                // Nếu không tìm thấy trong activeLocations, thử fetch từ API
                if (!foundLocation) {
                  try {
                    const locationResponse = await rentalLocationApi.getById(carLocationId);
                    if (locationResponse.success && locationResponse.data) {
                      foundLocation = locationResponse.data as RentalLocationData;
                    }
                  } catch (error) {
                    console.error("Error fetching location:", error);
                  }
                }
              }
            }
          }
          
          // Fallback: Thử lấy từ rentalLocationId trực tiếp trên car
          if (!foundLocation && carData?.rentalLocationId) {
            if (!locationIds.includes(carData.rentalLocationId)) {
              locationIds.push(carData.rentalLocationId);
            }
            foundLocation = activeLocations.find(loc => loc.id === carData.rentalLocationId) || null;
            if (!foundLocation) {
              try {
                const locationResponse = await rentalLocationApi.getById(carData.rentalLocationId);
                if (locationResponse.success && locationResponse.data) {
                  foundLocation = locationResponse.data as RentalLocationData;
                }
              } catch (error) {
                console.error("Error fetching location:", error);
              }
            }
          }
          
          // Lưu danh sách các vị trí có xe
          setCarLocationIds(locationIds);
          
          // Nếu tìm thấy location, tự động set
          if (foundLocation) {
            setSelectedLocation(foundLocation);
            form.setFieldsValue({ rentalLocationId: foundLocation.id });
            setPickupOption('self');
            setLocationError(null);
            console.log("Auto-selected location:", foundLocation);
          }
        }
      } catch (error) {
        console.error("Load data error:", error);
        message.error("Có lỗi xảy ra khi tải dữ liệu!");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [carId, form, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculateRentalFee = () => {
    if (!car || !form.getFieldValue('dateRange')) return 0;
    
    const [pickupTime, returnTime] = form.getFieldValue('dateRange');
    if (!pickupTime || !returnTime) return 0;
    
    const withDriver = form.getFieldValue('withDriver') || false;
    const days = returnTime.diff(pickupTime, 'day', true);
    
    if (days < 1) {
      // Tính theo giờ
      const hours = returnTime.diff(pickupTime, 'hour', true);
      return Math.ceil(hours) * (withDriver ? car.rentPricePerHourWithDriver : car.rentPricePerHour);
    } else {
      // Tính theo ngày
      return Math.ceil(days) * (withDriver ? car.rentPricePerDayWithDriver : car.rentPricePerDay);
    }
  };

  const calculateDiscount = () => {
    const rentalFee = calculateRentalFee();
    if (discountOption === 'program') {
      return Math.round(rentalFee * 0.1); // 10% discount
    }
    // TODO: Apply promo code discount
    return 0;
  };

  const calculateVAT = () => {
    const rentalFee = calculateRentalFee();
    const discount = calculateDiscount();
    return Math.round((rentalFee - discount) * 0.1); // 10% VAT
  };

  const calculateTotal = () => {
    const rentalFee = calculateRentalFee();
    const discount = calculateDiscount();
    const vat = calculateVAT();
    return rentalFee - discount + vat;
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

    setSubmitting(true);
    try {
      const [pickupTime, expectedReturnTime] = values.dateRange;
      
      const orderData: CreateRentalOrderData = {
        phoneNumber: values.phoneNumber,
        pickupTime: pickupTime.toISOString(),
        expectedReturnTime: expectedReturnTime.toISOString(),
        withDriver: values.withDriver || false,
        userId: user.id,
        carId: car.id,
        rentalLocationId: values.rentalLocationId,
      };

      const response = await rentalOrderApi.create(orderData);

      if (response.success && response.data) {
        const orderId = (response.data as any).id || (response.data as any).Id;
        api.success({
          message: "Đặt xe thành công",
          description: "Đơn hàng của bạn đã được tạo thành công. Đang chuyển đến trang đơn hàng...",
          placement: "topRight",
          duration: 3,
        });
        setTimeout(() => {
          router.push(`/my-bookings?orderId=${orderId}`);
        }, 1500);
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

  const rentalFee = calculateRentalFee();
  const discount = calculateDiscount();
  const vat = calculateVAT();
  const total = calculateTotal();
  const deposit = calculateDeposit();
  const remaining = calculateRemaining();

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
              
              {/* Hiển thị vị trí xe nếu đã chọn đúng vị trí có xe */}
              {selectedLocation && carLocationIds.length > 0 && carLocationIds.includes(selectedLocation.id) ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Nhận xe tại vị trí hiện tại</p>
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
                    hidden
                  >
                    <Input type="hidden" />
                  </Form.Item>
                </div>
              ) : null}
              
              {/* Luôn hiển thị Select để cho phép chọn vị trí */}
              <Form.Item
                name="rentalLocationId"
                rules={[
                  { required: true, message: "Vui lòng chọn địa điểm" },
                  {
                    validator: (_, value) => {
                      if (!value) {
                        return Promise.reject(new Error("Vui lòng chọn địa điểm"));
                      }
                      if (carLocationIds.length > 0 && !carLocationIds.includes(value)) {
                        return Promise.reject(new Error("Xe không có sẵn tại vị trí này"));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
                className="mt-4"
                validateStatus={locationError ? 'error' : ''}
                help={locationError}
              >
                <Select
                  size="large"
                  placeholder="Chọn địa điểm"
                  value={selectedLocation && (carLocationIds.length === 0 || carLocationIds.includes(selectedLocation.id)) ? selectedLocation.id : undefined}
                  onChange={(value: number) => {
                    const location = rentalLocations.find(loc => loc.id === value);
                    
                    // Kiểm tra xem vị trí được chọn có xe không
                    if (location) {
                      if (carLocationIds.length > 0 && !carLocationIds.includes(location.id)) {
                        // Hiển thị thông báo lỗi
                        setLocationError(`Xe không có sẵn tại "${location.name || location.address}". Vui lòng chọn vị trí khác có xe.`);
                        setSelectedLocation(null);
                        form.setFieldsValue({ rentalLocationId: undefined });
                        api.warning({
                          message: "Xe không có sẵn tại vị trí này",
                          description: `Vị trí "${location.name || location.address}" không có xe. Vui lòng chọn vị trí khác có xe sẵn sàng.`,
                          placement: "topRight",
                          duration: 5,
                        });
                      } else {
                        setLocationError(null);
                        setSelectedLocation(location);
                        form.setFieldsValue({ rentalLocationId: value });
                        api.success({
                          message: "Đã chọn vị trí nhận xe",
                          description: `${location.name || location.address}`,
                          placement: "topRight",
                          duration: 2,
                        });
                      }
                    }
                  }}
                >
                  {rentalLocations.map((location) => {
                    const hasCar = carLocationIds.length > 0 ? carLocationIds.includes(location.id) : true;
                    return (
                      <Select.Option 
                        key={location.id} 
                        value={location.id}
                        disabled={carLocationIds.length > 0 && !hasCar}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {location.name} - {location.address}
                          </span>
                          {carLocationIds.length > 0 && (
                            <>
                              {hasCar && (
                                <span className="text-green-600 text-xs ml-2 font-medium">✓ Có xe</span>
                              )}
                              {!hasCar && (
                                <span className="text-red-500 text-xs ml-2 font-medium">✗ Không có xe</span>
                              )}
                            </>
                          )}
                        </div>
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
              
              {locationError && (
                <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-red-800 font-bold mb-1">
                        Xe không có sẵn tại vị trí này
                      </p>
                      <p className="text-sm text-red-700 mb-2">
                        {locationError}
                      </p>
                      <p className="text-xs text-red-600">
                        💡 Vui lòng chọn một vị trí khác có xe sẵn sàng (có dấu ✓ Có xe).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Phí thuê xe</span>
                <span className="font-semibold text-gray-900">{formatCurrency(rentalFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700">Giảm giá</span>
                  {discountOption === 'program' && (
                    <p className="text-xs text-gray-500 mt-1">GR5EV</p>
                  )}
                </div>
                <span className="font-semibold text-red-500">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Thuế VAT</span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(vat)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-900">Tổng cộng tiền thuê</span>
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

        

          {/* VAT Invoice */}
          {/* <div className="bg-white rounded-lg shadow-sm p-6">
            <Checkbox checked={vatInvoice} onChange={(e) => setVatInvoice(e.target.checked)}>
              <span className="font-medium text-gray-900">Xuất hóa đơn VAT</span>
            </Checkbox>
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

