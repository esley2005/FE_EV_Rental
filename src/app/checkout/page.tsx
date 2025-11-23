"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  WalletOutlined,
  CarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  DollarOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { Button, Card, Spin, message, Alert, Descriptions, Tag, Space } from "antd";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MomoPaymentButton from "@/components/payment/MomoPaymentButton";
import { rentalOrderApi, carsApi, rentalLocationApi, authApi, paymentApi } from "@/services/api";
import type { RentalOrderData, User } from "@/services/api";
import type { Car } from "@/types/car";
import { formatDateTime } from "@/utils/dateFormat";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";

interface OrderWithDetails extends RentalOrderData {
  car?: Car;
  location?: {
    id?: number;
    name?: string;
    address?: string;
  };
  user?: User;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const orderId = searchParams.get("orderId");
  const autoPay = searchParams.get("autoPay") === "true"; // Tự động thanh toán sau khi load xong

  useEffect(() => {
    if (orderId) {
      loadOrderAndUser();
    } else {
      message.error("Không tìm thấy đơn hàng");
      router.push("/");
    }
  }, [orderId]);

  // Tự động thanh toán nếu autoPay=true và đã load xong order + user
  useEffect(() => {
    if (autoPay && order && user && !loading) {
      // Đợi 1 giây để UI render xong rồi mới tự động thanh toán
      const timer = setTimeout(() => {
        handleAutoPayment(order, user);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPay, order, user, loading]);

  const loadOrderAndUser = async () => {
    if (!orderId) return;

    try {
      setLoading(true);

      // Load user first
      const userResponse = await authApi.getProfile();
      if (!userResponse.success || !userResponse.data) {
        message.error("Vui lòng đăng nhập để xem đơn hàng");
        router.push("/login");
        return;
      }
      
      const currentUser = userResponse.data;
      setUser(currentUser);

      // Load order details - thử getById trước
      const orderResponse = await rentalOrderApi.getById(Number(orderId));

      let orderData: RentalOrderData | null = null;

      if (orderResponse.success && orderResponse.data) {
        orderData = orderResponse.data;
      } else {
        // Nếu getById fail, thử load từ getByUserId và tìm order
        console.warn("getById failed, trying to load from user orders:", orderResponse.error);
        try {
          const userOrdersResponse = await rentalOrderApi.getByUserId(currentUser.id);
          if (userOrdersResponse.success && userOrdersResponse.data) {
            const orders = Array.isArray(userOrdersResponse.data)
              ? userOrdersResponse.data
              : (userOrdersResponse.data as any)?.$values || [];
            
            const foundOrder = orders.find((o: RentalOrderData) => o.id === Number(orderId));
            if (foundOrder) {
              orderData = foundOrder;
            }
          }
        } catch (fallbackError) {
          console.error("Fallback load error:", fallbackError);
        }
      }

      if (!orderData) {
        message.error(orderResponse.error || "Không tìm thấy đơn hàng. Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.");
        router.push("/my-bookings");
        return;
      }

      // Kiểm tra quyền truy cập: user chỉ có thể thanh toán đơn hàng của chính họ
      if (orderData.userId !== currentUser.id) {
        message.error("Bạn không có quyền truy cập đơn hàng này");
        router.push("/my-bookings");
        return;
      }

      // Load car and location details
      const [carsResponse, locationsResponse] = await Promise.all([
        carsApi.getAll(),
        rentalLocationApi.getAll()
      ]);

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data)
            ? carsResponse.data
            : (carsResponse.data && typeof carsResponse.data === 'object' && '$values' in carsResponse.data && Array.isArray((carsResponse.data as { $values: unknown[] }).$values))
              ? (carsResponse.data as { $values: Car[] }).$values
              : [])
        : [];

      let locations: Array<{ id?: number; name?: string; address?: string }> = [];
      if (locationsResponse.success && locationsResponse.data) {
        const raw = locationsResponse.data as unknown;
        if (Array.isArray(raw)) {
          locations = raw;
        } else if (raw && typeof raw === 'object' && '$values' in raw && Array.isArray((raw as { $values: unknown[] }).$values)) {
          locations = (raw as { $values: Array<{ id?: number; name?: string; address?: string }> }).$values;
        } else if (raw && typeof raw === 'object' && 'data' in raw) {
          const data = (raw as { data: unknown }).data;
          if (data && typeof data === 'object' && '$values' in data && Array.isArray((data as { $values: unknown[] }).$values)) {
            locations = (data as { $values: Array<{ id?: number; name?: string; address?: string }> }).$values;
          } else if (Array.isArray(data)) {
            locations = data as Array<{ id?: number; name?: string; address?: string }>;
          }
        }
      }

      const car = cars.find((c) => c.id === orderData.carId);
      const location = locations.find((l) => l.id === orderData.rentalLocationId);

      const orderWithDetails: OrderWithDetails = {
        ...orderData,
        car,
        location,
        user: currentUser,
      };
      
      setOrder(orderWithDetails);
      
      // Nếu autoPay = true, tự động gọi API thanh toán sau khi load xong
      // Sẽ gọi trong useEffect sau khi order và user đã được set
    } catch (error) {
      console.error("Load order error:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể tải thông tin đơn hàng";
      message.error(errorMessage);
      
      // Redirect sau 2 giây
      setTimeout(() => {
        router.push("/my-bookings");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const calculateDays = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return end.diff(start, 'day') || 1;
  };

  // Tính tổng tiền cần thanh toán (deposit hoặc total)
  const getPaymentAmount = () => {
    if (!order) return 0;
    
    // Ưu tiên: deposit > total > subTotal
    // Nếu chưa có deposit, tính 30% của total làm deposit
    if (order.deposit && order.deposit > 0) {
      return order.deposit;
    }
    
    // Nếu chưa có deposit, tính deposit = 30% của total (hoặc subTotal)
    const totalAmount = order.total || order.subTotal || 0;
    if (totalAmount > 0) {
      // Tính deposit = 30% của total (làm tròn)
      return Math.round(totalAmount * 0.3);
    }
    
    return 0;
  };

  // Kiểm tra xem có thể thanh toán không (có deposit hoặc total > 0)
  const canMakePayment = () => {
    if (!order) return false;
    return getPaymentAmount() > 0;
  };

  // Tự động thanh toán khi load trang với autoPay=true
  useEffect(() => {
    if (autoPay && order && user && !loading) {
      const handleAutoPayment = async () => {
        // Tính amount dựa trên order data
        const amount = (order.deposit && order.deposit > 0) 
          ? order.deposit 
          : Math.round((order.total || order.subTotal || 0) * 0.3);
        
        if (amount <= 0) {
          message.warning("Không có số tiền cần thanh toán");
          return;
        }

        try {
          message.loading("Đang tạo yêu cầu thanh toán...", 1);
          
          const response = await paymentApi.createMomoPayment(
            order.id,
            user.id,
            amount
          );

          if (response.success && response.data) {
            const paymentUrl = response.data.momoPayUrl || response.data.payUrl;

            if (paymentUrl) {
              message.success("Đang chuyển đến trang thanh toán MoMo...", 2);
              
              // Redirect đến MoMo payment page sau 1 giây
              setTimeout(() => {
                window.location.href = paymentUrl;
              }, 1000);
            } else {
              throw new Error("Không nhận được payment URL từ MoMo");
            }
          } else {
            throw new Error(response.error || "Không thể tạo payment request");
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Có lỗi xảy ra khi tạo payment";
          
          message.error(errorMessage);
        }
      };

      // Đợi 1.5 giây để UI render xong rồi mới tự động thanh toán
      const timer = setTimeout(() => {
        handleAutoPayment();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPay, order, user, loading]);

  const paymentAmount = getPaymentAmount();

  // Tự động thanh toán khi autoPay=true và đã load xong order + user
  useEffect(() => {
    if (autoPay && order && user && !loading) {
      // Tính amount
      const amount = (order.deposit && order.deposit > 0) 
        ? order.deposit 
        : Math.round((order.total || order.subTotal || 0) * 0.3);
      
      if (amount <= 0) return;

      // Đợi 1.5 giây để UI render xong rồi mới tự động thanh toán
      const timer = setTimeout(async () => {
        try {
          message.loading("Đang tạo yêu cầu thanh toán...", 1);
          
          const response = await paymentApi.createMomoPayment(
            order.id,
            user.id,
            amount
          );

          if (response.success && response.data) {
            const paymentUrl = response.data.momoPayUrl || response.data.payUrl;

            if (paymentUrl) {
              message.success("Đang chuyển đến trang thanh toán MoMo...", 2);
              
              // Redirect đến MoMo payment page sau 1 giây
              setTimeout(() => {
                window.location.href = paymentUrl;
              }, 1000);
            } else {
              message.error("Không nhận được payment URL từ MoMo");
            }
          } else {
            message.error(response.error || "Không thể tạo payment request");
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Có lỗi xảy ra khi tạo payment";
          message.error(errorMessage);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPay, order, user, loading]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pt-24">
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">Đang tải thông tin đơn hàng...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!loading && (!order || !user)) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <Alert
                message="Không tìm thấy đơn hàng"
                description={
                  <div>
                    <p className="mb-2">Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.</p>
                    {orderId && (
                      <p className="text-sm text-gray-600">Mã đơn hàng: #{orderId}</p>
                    )}
                  </div>
                }
                type="error"
                showIcon
                action={
                  <Space>
                    <Button onClick={() => router.push("/my-bookings")}>
                      Xem đơn hàng của tôi
                    </Button>
                    <Button type="primary" onClick={() => router.push("/")}>
                      Về trang chủ
                    </Button>
                  </Space>
                }
              />
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-4"
            >
              Quay lại
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Thanh toán đơn hàng</h1>
            <p className="text-gray-600 mt-2">Mã đơn hàng: #{order.id}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info Card */}
              <Card title={
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-blue-600" />
                  <span>Thông tin đơn hàng</span>
                </div>
              }>
                {order.car && (
                  <div className="flex gap-4 mb-6">
                    <div className="w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={order.car.imageUrl || "/logo_ev.png"}
                        alt={order.car.name || "Xe"}
                        width={128}
                        height={96}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {order.car.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{order.car.model}</p>
                      <div className="flex flex-wrap gap-2">
                        <Tag color="blue">{order.car.seats} chỗ</Tag>
                        <Tag color="green">{order.car.batteryType || "Điện"}</Tag>
                        {order.withDriver && <Tag color="purple">Có tài xế</Tag>}
                      </div>
                    </div>
                  </div>
                )}

                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label={
                    <span className="flex items-center gap-2">
                      <CalendarOutlined />
                      Ngày nhận xe
                    </span>
                  }>
                    {formatDateTime(order.pickupTime, "DD/MM/YYYY HH:mm")}
                  </Descriptions.Item>
                  <Descriptions.Item label={
                    <span className="flex items-center gap-2">
                      <CalendarOutlined />
                      Ngày trả xe
                    </span>
                  }>
                    {formatDateTime(order.expectedReturnTime, "DD/MM/YYYY HH:mm")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số ngày thuê">
                    {calculateDays(order.pickupTime, order.expectedReturnTime)} ngày
                  </Descriptions.Item>
                  {order.location && (
                    <Descriptions.Item label={
                      <span className="flex items-center gap-2">
                        <EnvironmentOutlined />
                        Địa điểm nhận xe
                      </span>
                    }>
                      {order.location.name || order.location.address || "Không xác định"}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Payment Summary */}
              <Card title={
                <div className="flex items-center gap-2">
                  <DollarOutlined className="text-green-600" />
                  <span>Tổng kết thanh toán</span>
                </div>
              }>
                <div className="space-y-3">
                  {order.subTotal && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiền thuê xe:</span>
                      <span className="font-semibold">{formatCurrency(order.subTotal)}</span>
                    </div>
                  )}
                  {(order.deposit || paymentAmount > 0) && (
                    <div className="flex justify-between text-blue-600">
                      <span>Tiền đặt cọc:</span>
                      <span className="font-semibold">
                        {formatCurrency(order.deposit || paymentAmount)}
                        {!order.deposit && <Tag color="orange" className="ml-2">Tạm tính (30%)</Tag>}
                      </span>
                    </div>
                  )}
                  {order.discount && order.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Giảm giá:</span>
                      <span className="font-semibold">- {formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-300">
                    <span className="text-lg font-semibold text-gray-800">Tổng cần thanh toán:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(paymentAmount)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Payment */}
            <div className="lg:col-span-1">
              <Card 
                title={
                  <div className="flex items-center gap-2">
                    <WalletOutlined className="text-pink-600" />
                    <span>Thanh toán</span>
                  </div>
                }
                className="sticky top-24"
              >
                <div className="space-y-4">
                  {autoPay ? (
                    <Alert
                      message="Đang chuyển đến trang thanh toán..."
                      description="Đơn hàng của bạn đã được tạo. Vui lòng thanh toán cọc để hoàn tất đặt xe. Đang tự động chuyển đến trang thanh toán MoMo..."
                      type="info"
                      showIcon
                      className="mb-4"
                    />
                  ) : canMakePayment() ? (
                    <>
                      <Alert
                        message={
                          order.deposit && order.deposit > 0
                            ? "Thanh toán đặt cọc"
                            : "Thanh toán đặt cọc (tạm tính)"
                        }
                        description={
                          order.deposit && order.deposit > 0
                            ? `Bạn sẽ thanh toán ${formatCurrency(order.deposit)} để đặt cọc. Số tiền còn lại sẽ thanh toán khi nhận xe.`
                            : `Số tiền đặt cọc được tính là 30% tổng giá trị đơn hàng: ${formatCurrency(paymentAmount)}. Bạn có thể thanh toán ngay, không cần chờ xác nhận.`
                        }
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                      <MomoPaymentButton
                        rentalOrderId={order.id}
                        userId={user.id}
                        amount={paymentAmount}
                        onSuccess={(momoOrderId) => {
                          console.log("Payment initiated:", momoOrderId);
                        }}
                        onError={(error) => {
                          message.error(error);
                        }}
                      />
                    </>
                  ) : (
                    <Alert
                      message="Không có số tiền cần thanh toán"
                      description="Đơn hàng chưa có thông tin giá. Vui lòng liên hệ nhân viên để được hỗ trợ."
                      type="warning"
                      showIcon
                    />
                  )}

                  <div className="text-xs text-gray-500 mt-4 space-y-2">
                    <p>
                      <CheckCircleOutlined className="mr-1" />
                      Thanh toán an toàn qua MoMo
                    </p>
                    <p>
                      <CheckCircleOutlined className="mr-1" />
                      Hỗ trợ thẻ tín dụng/ghi nợ và ví MoMo
                    </p>
                  </div>

                  <Link href="/my-bookings" className="block">
                    <Button type="link" block>
                      Xem lại đơn hàng
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

