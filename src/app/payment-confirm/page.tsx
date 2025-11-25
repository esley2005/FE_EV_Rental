"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Descriptions, Button, Spin, Result, Tag, Image, Alert } from "antd";
import { 
  CheckCircleOutlined, 
  CarOutlined, 
  CalendarOutlined, 
  EnvironmentOutlined,
  DollarOutlined,
  UserOutlined,
  PhoneOutlined,
  CreditCardOutlined
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, rentalLocationApi } from "@/services/api";
import type { RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";
import { formatDateTime } from "@/utils/dateFormat";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dayjs from "dayjs";

export default function PaymentConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<RentalOrderData | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [vnpayPaymentUrl, setVnpayPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams?.get("orderId");
  const paymentUrl = searchParams?.get("paymentUrl");

  useEffect(() => {
    const loadData = async () => {
      if (!orderId) {
        setError("Không tìm thấy thông tin đơn hàng");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load order details
        const orderResponse = await rentalOrderApi.getById(Number(orderId));
        if (orderResponse.success && orderResponse.data) {
          const orderData = orderResponse.data as any;
          setOrder(orderData);

          // Lấy vnpayPaymentUrl từ URL params hoặc từ order data
          const url = paymentUrl || orderData.vnpayPaymentUrl || orderData.VnpayPaymentUrl || null;
          setVnpayPaymentUrl(url);

          // Load car details
          if (orderData.carId || orderData.CarId) {
            const carId = orderData.carId || orderData.CarId;
            const carResponse = await carsApi.getById(String(carId));
            if (carResponse.success && carResponse.data) {
              setCar(carResponse.data);
            }
          }

          // Load location details
          if (orderData.rentalLocationId || orderData.RentalLocationId) {
            const locationId = orderData.rentalLocationId || orderData.RentalLocationId;
            const locationResponse = await rentalLocationApi.getById(locationId);
            if (locationResponse.success && locationResponse.data) {
              setLocation(locationResponse.data);
            }
          }
        } else {
          setError("Không thể tải thông tin đơn hàng");
        }
      } catch (err: any) {
        console.error("[Payment Confirm] Error loading data:", err);
        setError(err?.message || "Có lỗi xảy ra khi tải thông tin");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId, paymentUrl]);

  const handleConfirmPayment = () => {
    if (vnpayPaymentUrl) {
      window.location.href = vnpayPaymentUrl;
    } else {
      setError("Không tìm thấy link thanh toán. Vui lòng thử lại.");
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return formatDateTime(dateStr);
  };

  const calculateDays = (pickupTime: string, returnTime: string) => {
    const pickup = dayjs(pickupTime);
    const returnDate = dayjs(returnTime);
    return returnDate.diff(pickup, 'day', true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <Result
            status="error"
            title="Không thể tải thông tin đơn hàng"
            subTitle={error || "Vui lòng thử lại sau"}
            extra={[
              <Button key="home" onClick={() => router.push("/")}>
                Về trang chủ
              </Button>,
              <Button key="bookings" type="primary" onClick={() => router.push("/my-bookings")}>
                Xem Đơn thuê
              </Button>,
            ]}
          />
        </div>
        <Footer />
      </div>
    );
  }

  const orderData = order as any;
  const totalDays = calculateDays(orderData.pickupTime, orderData.expectedReturnTime);
  const depositAmount = orderData.deposit || orderData.Deposit || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Xác nhận thanh toán
            </h1>
            <p className="text-gray-600">
              Vui lòng kiểm tra thông tin đơn hàng trước khi thanh toán
            </p>
          </div>

          {/* Alert */}
          <Alert
            message="Thông tin đơn hàng"
            description="Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi xác nhận thanh toán. Sau khi thanh toán thành công, đơn hàng sẽ được xác nhận."
            type="info"
            showIcon
            className="mb-6"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Car Information */}
              {car && (
                <Card title={<><CarOutlined /> Thông tin xe</>} className="shadow-md">
                  <div className="flex gap-4">
                    <Image
                      src={car.imageUrl || "/logo_ev.png"}
                      alt={car.name}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback="/logo_ev.png"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{car.name}</h3>
                      <p className="text-gray-600 mb-2">{car.model}</p>
                      <div className="flex flex-wrap gap-2">
                        {car.seats && <Tag>{car.seats} chỗ</Tag>}
                        {car.batteryType && <Tag>{car.batteryType}</Tag>}
                        {car.sizeType && <Tag>{car.sizeType}</Tag>}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Rental Information */}
              <Card title={<><CalendarOutlined /> Thông tin thuê xe</>} className="shadow-md">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Mã đơn hàng">
                    <span className="font-semibold">#{orderData.id || orderData.Id}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian nhận xe">
                    {formatDate(orderData.pickupTime)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian trả xe">
                    {formatDate(orderData.expectedReturnTime)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số ngày thuê">
                    <span className="font-semibold">{totalDays.toFixed(1)} ngày</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Có tài xế">
                    {orderData.withDriver ? (
                      <Tag color="blue">Có</Tag>
                    ) : (
                      <Tag color="default">Không</Tag>
                    )}
                  </Descriptions.Item>
                  {location && (
                    <Descriptions.Item label="Địa điểm nhận xe">
                      <div className="flex items-start gap-2">
                        <EnvironmentOutlined className="text-blue-500 mt-1" />
                        <div>
                          {location.name && <p className="font-semibold">{location.name}</p>}
                          <p className="text-gray-600">{location.address}</p>
                        </div>
                      </div>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Customer Information */}
              <Card title={<><UserOutlined /> Thông tin khách hàng</>} className="shadow-md">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Số điện thoại">
                    {orderData.phoneNumber || orderData.PhoneNumber || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="lg:col-span-1">
              <Card 
                title={<><DollarOutlined /> Tóm tắt thanh toán</>}
                className="shadow-md sticky top-4"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    {orderData.subTotal && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng phụ:</span>
                        <span className="font-semibold">{formatCurrency(orderData.subTotal)}</span>
                      </div>
                    )}
                    {orderData.discount && orderData.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Giảm giá:</span>
                        <span>- {formatCurrency(orderData.discount)}</span>
                      </div>
                    )}
                    {orderData.extraFee && orderData.extraFee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Phí phát sinh:</span>
                        <span>+ {formatCurrency(orderData.extraFee)}</span>
                      </div>
                    )}
                    {orderData.damageFee && orderData.damageFee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Phí hư hỏng:</span>
                        <span>+ {formatCurrency(orderData.damageFee)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Tổng tiền:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(orderData.total || orderData.Total || 0)}
                      </span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">Tiền đặt cọc:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(depositAmount)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Số tiền còn lại sẽ thanh toán khi nhận xe
                      </p>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<CreditCardOutlined />}
                    onClick={handleConfirmPayment}
                    disabled={!vnpayPaymentUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-semibold"
                  >
                    Xác nhận thanh toán
                  </Button>

                  {!vnpayPaymentUrl && (
                    <Alert
                      message="Không tìm thấy link thanh toán"
                      description="Vui lòng liên hệ hỗ trợ để được hỗ trợ."
                      type="warning"
                      showIcon
                      className="mt-4"
                    />
                  )}

                  <Button
                    onClick={() => router.push("/my-bookings")}
                    className="w-full mt-2"
                  >
                    Hủy
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

