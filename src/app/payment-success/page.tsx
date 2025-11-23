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
  EnvironmentOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
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
  const [countdown, setCountdown] = useState(5); // Countdown cho redirect
  const [redirecting, setRedirecting] = useState(false);
  
  // Extract query params - MoMo có thể trả về nhiều format
  const amount = searchParams.get("amount");
  const transactionId = searchParams.get("transactionId") || searchParams.get("transId");
  const paymentId = searchParams.get("paymentId");
  const momoOrderId = searchParams.get("momoOrderId") || searchParams.get("requestId") || searchParams.get("orderId");
  const resultCode = searchParams.get("resultCode"); // MoMo callback: 0 = success
  const resultMessage = searchParams.get("message"); // MoMo callback message
  const partnerCode = searchParams.get("partnerCode");
  const extraData = searchParams.get("extraData"); // extraData chứa rentalOrderId và userId
  
  // ✅ Parse extraData để lấy rentalOrderId thực (không phải MoMo orderId)
  // Format từ MoMo: extraData=rentalOrderId%3D34%26userId%3D18 
  // Decode: rentalOrderId=34&userId=18
  let rentalOrderId: number | null = null;
  if (extraData) {
    try {
      // Decode URL encoded string: rentalOrderId%3D34%26userId%3D18 -> rentalOrderId=34&userId=18
      const decoded = decodeURIComponent(extraData);
      console.log('[Payment Success] Parsed extraData:', decoded);
      const params = new URLSearchParams(decoded);
      const rentalOrderIdStr = params.get("rentalOrderId");
      if (rentalOrderIdStr) {
        rentalOrderId = parseInt(rentalOrderIdStr, 10);
        console.log('[Payment Success] Extracted rentalOrderId from extraData:', rentalOrderId);
      }
    } catch (error) {
      console.warn('[Payment Success] Failed to parse extraData:', error, 'extraData:', extraData);
    }
  }
  
  // Fallback: thử lấy từ orderId query param nếu không có extraData
  const orderId = rentalOrderId 
    ? rentalOrderId.toString() 
    : searchParams.get("orderId") || searchParams.get("partnerRefId");

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
            // Redirect sẽ được xử lý ở phần dưới sau khi load xong payment data
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
        } else if (!loadedPayment && resultCode === null && paymentStatus === 'loading') {
          // Chỉ set unknown nếu chưa có status nào được set
          setPaymentStatus('unknown');
        }
        
        // Determine which orderId to use - ưu tiên rentalOrderId từ extraData, sau đó từ payment, cuối cùng từ query params
        const finalOrderId = rentalOrderId 
          ? rentalOrderId 
          : (orderId ? Number(orderId) : null) 
          || loadedPayment?.rentalOrderId 
          || null;
        
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
          
          // Set redirecting flag để trigger countdown timer trong useEffect riêng
          if (finalOrderId && !redirecting) {
            setRedirecting(true);
          }
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
  }, [orderId, paymentId, momoOrderId, resultCode, resultMessage, rentalOrderId]);

  // ✅ Tách countdown timer ra useEffect riêng để tránh lỗi cleanup và Next.js internal helpers
  useEffect(() => {
    if (!redirecting || paymentStatus !== 'success') return;
    
    // Determine which orderId to use
    const finalOrderId = rentalOrderId 
      ? rentalOrderId 
      : (orderId ? Number(orderId) : null) 
      || payment?.rentalOrderId 
      || null;
    
    if (!finalOrderId) return;
    
    // Countdown timer
    let remaining = 5;
    setCountdown(remaining);
    
    const countdownInterval = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        router.push(`/my-bookings?orderId=${finalOrderId}&paymentSuccess=true`);
      }
    }, 1000);
    
    // Cleanup function - chỉ return từ useEffect, không phải từ async function
    return () => {
      clearInterval(countdownInterval);
    };
  }, [redirecting, paymentStatus, rentalOrderId, orderId, payment?.rentalOrderId, router]);


  const loadOrderDetailsById = async (orderIdParam: number) => {
    try {
      // Get order details
      const orderResponse = await rentalOrderApi.getById(orderIdParam);
      
      if (orderResponse.success && orderResponse.data) {
        const orderData = orderResponse.data;
        
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


  // Luôn hiển thị Header và Footer, không block UI
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pt-24 pb-16">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Spin size="large" />
              <p className="mt-4 text-gray-600">Đang tải thông tin thanh toán...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Status Icon & Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
            {paymentStatus === 'success' ? (
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
            ) : paymentStatus === 'failed' ? (
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
            ) : paymentStatus === 'loading' ? (
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
            ) : (
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
              {/* ✅ Success Message với thông báo rõ ràng về bước tiếp theo */}
              {paymentStatus === 'success' && order && (
                <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-l-4 border-green-500 p-6 mb-6 rounded-lg shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-500 rounded-full p-2">
                      <CheckCircleOutlined className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-800 mb-3">
                        ✅ Thanh toán cọc thành công!
                      </h3>
                      <div className="bg-white rounded-lg p-4 mb-3 border border-green-200">
                        <p className="text-base font-semibold text-gray-800 mb-2">
                          Xe của bạn đã được cọc. Vui lòng di chuyển đến <strong className="text-blue-600">{order.location?.name || order.location?.address || 'trụ sở đã đặt'}</strong> để nhận xe.
                        </p>
                        {order.location?.address && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <EnvironmentOutlined />
                            {order.location.address}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-green-700">
                        Chúng tôi đã nhận được thanh toán của bạn. Đơn hàng đang được xử lý và bạn sẽ nhận được email xác nhận trong vài phút.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message cho các trường hợp khác */}
              {paymentStatus === 'success' && !order && (
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
              )}

              {/* ✅ Timeline: Các bước tiếp theo */}
              {paymentStatus === 'success' && order && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ClockCircleOutlined className="text-blue-600" />
                    Các bước tiếp theo
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircleOutlined className="text-white text-sm" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">Bước 1: Thanh toán cọc hoàn tất</p>
                        <p className="text-sm text-gray-600">Bạn đã thanh toán cọc thành công</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">Bước 2: Đến trụ sở nhận xe</p>
                        <p className="text-sm text-gray-600">
                          Đến địa điểm: <strong className="text-blue-600">{order.location?.name || order.location?.address || 'Trụ sở đã đặt'}</strong>
                        </p>
                        {order.pickupTime && (
                          <p className="text-sm text-gray-600 mt-1">
                            Thời gian nhận xe: <strong>{formatDateTime(order.pickupTime, "DD/MM/YYYY HH:mm")}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-bold">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-600">Bước 3: Thanh toán số tiền còn lại</p>
                        <p className="text-sm text-gray-600">Thanh toán khi nhận xe tại trụ sở</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-bold">4</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-600">Bước 4: Nhận xe và bắt đầu chuyến đi</p>
                        <p className="text-sm text-gray-600">Kiểm tra xe và ký hợp đồng</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Thông tin hỗ trợ */}
              {paymentStatus === 'success' && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <InfoCircleOutlined className="text-yellow-600 text-xl mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        <strong>Lưu ý:</strong> Vui lòng mang theo giấy tờ tùy thân (CMND/CCCD) và giấy phép lái xe (nếu tự lái) khi đến nhận xe.
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline hỗ trợ hoặc email để được hỗ trợ.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

              {/* ✅ Countdown và Action Buttons */}
              {paymentStatus === 'success' && redirecting && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <p className="text-sm text-blue-800">
                    Đang tự động chuyển đến trang đơn hàng trong <strong className="text-blue-600 text-lg">{countdown}</strong> giây...
                  </p>
                  <Button
                    type="link"
                    onClick={() => {
                      setRedirecting(false);
                      setCountdown(0);
                    }}
                    className="mt-2"
                  >
                    Hủy tự động chuyển
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-4">
                {orderId && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={() => router.push(`/my-bookings?orderId=${orderId}&paymentSuccess=true`)}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                  >
                    Xem đơn hàng ngay
                  </Button>
                )}
                <Button
                  type="default"
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={() => router.push("/")}
                  className="flex-1 h-12"
                >
                  Về trang chủ
                </Button>
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
        )}
      </div>
      <Footer />
    </>
  );
}

