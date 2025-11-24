"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  CheckCircle2
} from "lucide-react";
import { 
  Button, 
  Card, 
  Spin, 
  message
} from "antd";
import {
  CheckCircleOutlined, 
  HomeOutlined, 
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CarOutlined,
  EnvironmentOutlined
} from "@ant-design/icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { rentalOrderApi, carsApi, rentalLocationApi, paymentApi } from "@/services/api";
import type { RentalOrderData, PaymentData } from "@/services/api";
import type { Car } from "@/types/car";
import { formatDateTime } from "@/utils/dateFormat";
import Image from "next/image";
import Link from "next/link";

interface OrderWithDetails extends RentalOrderData {
  car?: Car;
  location?: {
    id?: number;
    name?: string;
    address?: string;
  };
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'unknown'>('loading');
  
  // Extract query params - MoMo có thể trả về nhiều format
  const orderId = searchParams.get("orderId") || searchParams.get("partnerRefId") || searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const transactionId = searchParams.get("transactionId") || searchParams.get("transId");
  const paymentId = searchParams.get("paymentId");
  const momoOrderId = searchParams.get("momoOrderId") || searchParams.get("requestId");
  const resultCode = searchParams.get("resultCode"); // MoMo callback: 0 = success
  const resultMessage = searchParams.get("message"); // MoMo callback message
  const partnerCode = searchParams.get("partnerCode");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Kiểm tra nếu có resultCode từ MoMo callback
        if (resultCode !== null) {
          const isSuccess = resultCode === '0';
          setPaymentStatus(isSuccess ? 'success' : 'failed');
          
          if (!isSuccess) {
            // Payment failed from MoMo
            const errorMsg = resultMessage || 'Thanh toán thất bại';
            message.error(errorMsg);
            // Still try to load data if we have orderId
          } else {
            // Payment success
            message.success('Thanh toán thành công!');
            // Auto redirect sau 5 giây nếu có orderId
            if (orderId) {
              setTimeout(() => {
                router.push(`/my-bookings?orderId=${orderId}`);
              }, 5000);
            }
          }
        }
        
        let loadedPayment: PaymentData | null = null;
        
        // Priority: Load payment first if we have paymentId or momoOrderId
        // Try different ways to get payment info
        if (momoOrderId) {
          try {
            const paymentResponse = await paymentApi.getByMomoOrderId(momoOrderId);
            if (paymentResponse.success && paymentResponse.data) {
              loadedPayment = paymentResponse.data;
              setPayment(loadedPayment);
              
              // Update payment status based on payment data
              if (loadedPayment.status === 'Completed' || loadedPayment.status === 1) {
                setPaymentStatus('success');
              } else if (loadedPayment.status === 'Cancelled' || loadedPayment.status === 2) {
                setPaymentStatus('failed');
              }
            }
          } catch (error) {
            console.warn('Failed to load payment by momoOrderId:', error);
            // Continue to use resultCode if available
          }
        }
        
        // If still no payment loaded, try paymentId
        if (!loadedPayment && paymentId) {
          const paymentResponse = await paymentApi.getById(Number(paymentId));
          if (paymentResponse.success && paymentResponse.data) {
            loadedPayment = paymentResponse.data;
            setPayment(loadedPayment);
            
            // Update payment status based on payment data
            if (loadedPayment.status === 'Completed' || loadedPayment.status === 1) {
              setPaymentStatus('success');
            } else if (loadedPayment.status === 'Cancelled' || loadedPayment.status === 2) {
              setPaymentStatus('failed');
            }
          }
        }
        
        // If no payment loaded yet but we have resultCode = 0, consider it success
        if (!loadedPayment && resultCode === '0') {
          setPaymentStatus('success');
        } else if (!loadedPayment && resultCode !== null && resultCode !== '0') {
          setPaymentStatus('failed');
        } else if (!loadedPayment && resultCode === null) {
          setPaymentStatus('unknown');
        }
        
        // Determine which orderId to use
        const finalOrderId = orderId 
          ? Number(orderId) 
          : loadedPayment?.rentalOrderId || null;
        
        // Load order details
        if (finalOrderId) {
          await loadOrderDetailsById(finalOrderId);
        }
        
        // ✅ Dispatch event để refresh danh sách xe sau khi payment thành công
        // Kiểm tra payment status từ resultCode hoặc loadedPayment
        const isPaymentSuccess = resultCode === '0' || 
                                loadedPayment?.status === 'Completed' || 
                                loadedPayment?.status === 1;
        
        if (isPaymentSuccess && typeof window !== 'undefined') {
          console.log('[Payment Success] Dispatching paymentSuccess event to refresh cars list...');
          window.dispatchEvent(new CustomEvent('paymentSuccess', {
            detail: { rentalOrderId: finalOrderId }
          }));
        }
      } catch (error) {
        console.error("Load data error:", error);
        message.error("Không thể tải thông tin");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentId, momoOrderId, resultCode, resultMessage]);


  const loadOrderDetailsById = async (orderIdParam: number) => {
    try {
      // Get order details
      const orderResponse = await rentalOrderApi.getById(orderIdParam);
      
      if (orderResponse.success && orderResponse.data) {
        const orderData = orderResponse.data;
        
        // Load car details (location sẽ lấy từ car object)
        const carsResponse = await carsApi.getAll();
        
        const cars: Car[] = carsResponse.success && carsResponse.data
          ? (Array.isArray(carsResponse.data) 
              ? carsResponse.data 
              : (carsResponse.data && typeof carsResponse.data === 'object' && '$values' in carsResponse.data && Array.isArray((carsResponse.data as { $values: unknown[] }).$values))
                ? (carsResponse.data as { $values: Car[] }).$values
                : [])
          : [];
        
        const car = cars.find((c) => c.id === orderData.carId);
        
        // Lấy location từ car.RentalLocationId qua API RentalLocation
        let location: { id?: number; name?: string; address?: string } | undefined = undefined;
        if (car) {
          // Lấy RentalLocationId từ car object
          const rentalLocationId = (car as any).rentalLocationId ?? (car as any).RentalLocationId;
          
          if (rentalLocationId) {
            try {
              const locationResponse = await rentalLocationApi.getById(rentalLocationId);
              if (locationResponse.success && locationResponse.data) {
                const loc = locationResponse.data;
                location = {
                  id: loc.id ?? loc.Id,
                  name: loc.name ?? loc.Name,
                  address: loc.address ?? loc.Address
                };
              }
            } catch (error) {
              console.error("Error fetching location:", error);
            }
          }
        }
        
        setOrder({
          ...orderData,
          car,
          location,
        });
      }
    } catch (error) {
      console.error("Load order details error:", error);
      message.error("Không thể tải thông tin đơn hàng");
    }
  };

  const formatCurrency = (amount?: number | string | null) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(numAmount);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Status Icon & Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            {paymentStatus === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 shadow-lg">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  Thanh toán thành công!
                </h1>
                <p className="text-lg text-gray-600">
                  Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi
                </p>
              </>
            )}
            {paymentStatus === 'failed' && (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500 rounded-full mb-6 shadow-lg">
                  <span className="text-white text-6xl">✗</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                  Thanh toán thất bại
                </h1>
                <p className="text-lg text-gray-600">
                  {resultMessage || 'Vui lòng thử lại hoặc liên hệ hỗ trợ'}
                </p>
              </>
            )}
            {paymentStatus === 'loading' && (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-500 rounded-full mb-6 shadow-lg">
                  <Spin size="large" className="text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  Đang kiểm tra thanh toán...
                </h1>
                <p className="text-lg text-gray-600">
                  Vui lòng đợi trong giây lát
                </p>
              </>
            )}
            {paymentStatus === 'unknown' && (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-500 rounded-full mb-6 shadow-lg">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  Thông tin thanh toán
                </h1>
                <p className="text-lg text-gray-600">
                  Kiểm tra thông tin đơn hàng của bạn
                </p>
              </>
            )}
          </motion.div>

          {/* Main Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="shadow-xl rounded-2xl overflow-hidden border-0">
              {/* Success Message */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 mb-6">
                <div className="flex items-start gap-4">
                  <CheckCircleOutlined className="text-green-500 text-2xl mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Giao dịch đã được xử lý thành công
                    </h3>
                    <p className="text-green-700">
                      Chúng tôi đã nhận được thanh toán của bạn. Đơn hàng đang được xử lý và bạn sẽ nhận được email xác nhận trong vài phút.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarOutlined className="text-green-600" />
                    Thông tin thanh toán
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transaction ID - từ payment hoặc query param */}
                    {(payment?.momoTransactionId || payment?.id || transactionId) && (
                      <div>
                        <span className="text-gray-600 block mb-1">Mã giao dịch:</span>
                        <span className="font-semibold text-gray-800">
                          {payment?.momoTransactionId || payment?.id?.toString() || transactionId}
                        </span>
                      </div>
                    )}
                    {/* Partner Code (nếu có từ MoMo) */}
                    {partnerCode && (
                      <div>
                        <span className="text-gray-600 block mb-1">Partner Code:</span>
                        <span className="font-semibold text-gray-800">{partnerCode}</span>
                      </div>
                    )}
                    {/* MoMo Order ID */}
                    {(payment?.momoOrderId || momoOrderId) && (
                      <div>
                        <span className="text-gray-600 block mb-1">Mã đơn hàng MoMo:</span>
                        <span className="font-semibold text-gray-800">
                          {payment?.momoOrderId || momoOrderId}
                        </span>
                      </div>
                    )}
                    {/* Amount - từ payment hoặc query param */}
                    {(payment?.amount || amount) && (
                      <div>
                        <span className="text-gray-600 block mb-1">Số tiền đã thanh toán:</span>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(payment?.amount || amount)}
                        </span>
                      </div>
                    )}
                    {/* Payment Method */}
                    {payment?.paymentMethod && (
                      <div>
                        <span className="text-gray-600 block mb-1">Phương thức thanh toán:</span>
                        <span className="font-semibold text-gray-800">
                          {payment.paymentMethod === 'MoMo' ? 'Ví điện tử MoMo' : payment.paymentMethod}
                        </span>
                      </div>
                    )}
                    {/* Order ID - từ payment, order hoặc query param */}
                    {(payment?.rentalOrderId || order?.id || orderId) && (
                      <div>
                        <span className="text-gray-600 block mb-1">Mã đơn hàng:</span>
                        <span className="font-semibold text-gray-800">
                          #{payment?.rentalOrderId || order?.id || orderId}
                        </span>
                      </div>
                    )}
                    {/* Payment Date */}
                    <div>
                      <span className="text-gray-600 block mb-1">Ngày thanh toán:</span>
                      <span className="font-semibold text-gray-800">
                        {payment?.paymentDate 
                          ? formatDateTime(payment.paymentDate, "DD/MM/YYYY HH:mm")
                          : formatDateTime(new Date().toISOString(), "DD/MM/YYYY HH:mm")
                        }
                      </span>
                    </div>
                    {/* Payment Status */}
                    {payment?.status && (
                      <div>
                        <span className="text-gray-600 block mb-1">Trạng thái:</span>
                        <span className={`font-semibold ${
                          payment.status === 'Completed' || payment.status === 1 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {payment.status === 'Completed' || payment.status === 1 
                            ? 'Hoàn thành' 
                            : payment.status === 'Pending' || payment.status === 0
                            ? 'Đang xử lý'
                            : payment.status
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                {order && (
                  <>
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FileTextOutlined className="text-blue-600" />
                        Chi tiết đơn hàng
                      </h2>
                      
                      {/* Car Info */}
                      {order.car && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex gap-4">
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
                              <div className="flex flex-wrap gap-2 text-sm">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {order.car.seats} chỗ
                                </span>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                  {order.car.batteryType || "Điện"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Time & Location Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <CalendarOutlined className="text-blue-600 text-xl mt-1" />
                          <div>
                            <span className="text-gray-600 block mb-1">Ngày nhận xe:</span>
                            <span className="font-semibold text-gray-800">
                              {formatDateTime(order.pickupTime, "DD/MM/YYYY HH:mm")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CalendarOutlined className="text-red-600 text-xl mt-1" />
                          <div>
                            <span className="text-gray-600 block mb-1">Ngày trả xe:</span>
                            <span className="font-semibold text-gray-800">
                              {formatDateTime(order.expectedReturnTime, "DD/MM/YYYY HH:mm")}
                            </span>
                          </div>
                        </div>
                        {order.location && (
                          <div className="flex items-start gap-3 md:col-span-2">
                            <EnvironmentOutlined className="text-purple-600 text-xl mt-1" />
                            <div>
                              <span className="text-gray-600 block mb-1">Địa điểm nhận xe:</span>
                              <span className="font-semibold text-gray-800">
                                {order.location.name || order.location.address || "Không xác định"}
                              </span>
                              {order.location.address && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {order.location.address}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <DollarOutlined className="text-green-600" />
                        Tổng kết thanh toán
                      </h2>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {order.subTotal && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tiền thuê xe:</span>
                            <span className="font-semibold">{formatCurrency(order.subTotal)}</span>
                          </div>
                        )}
                        {order.deposit && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tiền đặt cọc:</span>
                            <span className="font-semibold">{formatCurrency(order.deposit)}</span>
                          </div>
                        )}
                        {order.discount && order.discount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Giảm giá:</span>
                            <span className="font-semibold">- {formatCurrency(order.discount)}</span>
                          </div>
                        )}
                        {order.extraFee && order.extraFee > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Phí phát sinh:</span>
                            <span className="font-semibold">+ {formatCurrency(order.extraFee)}</span>
                          </div>
                        )}
                        {order.total && (
                          <div className="flex justify-between pt-3 border-t border-gray-300">
                            <span className="text-lg font-semibold text-gray-800">Tổng cộng:</span>
                            <span className="text-xl font-bold text-green-600">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-4">
                <Button
                  type="default"
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={() => router.push("/")}
                  className="flex-1 h-12"
                >
                  Về trang chủ
                </Button>
                {orderId && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={() => router.push(`/my-bookings?orderId=${orderId}`)}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                  >
                    Xem đơn hàng
                  </Button>
                )}
                <Button
                  type="default"
                  size="large"
                  icon={<CarOutlined />}
                  onClick={() => router.push("/cars/all")}
                  className="flex-1 h-12"
                >
                  Thuê thêm xe
                </Button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Lưu ý:</strong> Vui lòng kiểm tra email để xem thông tin chi tiết về đơn hàng của bạn. 
                  Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua trang{" "}
                  <Link href="/contact" className="underline font-semibold">
                    Liên hệ
                  </Link>
                  .
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Link href="/my-bookings">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                <FileTextOutlined className="text-blue-600 text-3xl mb-2" />
                <h3 className="font-semibold text-gray-800">Đơn hàng của tôi</h3>
                <p className="text-sm text-gray-600 mt-1">Xem tất cả đơn hàng</p>
              </Card>
            </Link>
            <Link href="/guides/payment">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                <DollarOutlined className="text-green-600 text-3xl mb-2" />
                <h3 className="font-semibold text-gray-800">Hướng dẫn thanh toán</h3>
                <p className="text-sm text-gray-600 mt-1">Tìm hiểu thêm</p>
              </Card>
            </Link>
            <Link href="/cars/all">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CarOutlined className="text-purple-600 text-3xl mb-2" />
                <h3 className="font-semibold text-gray-800">Xem thêm xe</h3>
                <p className="text-sm text-gray-600 mt-1">Khám phá đội xe</p>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}

