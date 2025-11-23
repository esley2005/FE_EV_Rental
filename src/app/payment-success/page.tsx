"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button, Card, Spin, message } from "antd";
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
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'unknown'>('loading');

  // ✅ FIX: Extract ALL possible query params với nhiều tên khác nhau
  const allParams = Object.fromEntries(searchParams.entries());
  
  const orderId = searchParams.get("orderId") || 
                  searchParams.get("partnerRefId") || 
                  searchParams.get("order_id");
  const amount = searchParams.get("amount");
  const transactionId = searchParams.get("transactionId") || 
                        searchParams.get("transId") || 
                        searchParams.get("transaction_id");
  const paymentId = searchParams.get("paymentId") || 
                    searchParams.get("payment_id");
  const momoOrderId = searchParams.get("momoOrderId") || 
                      searchParams.get("requestId") || 
                      searchParams.get("request_id") ||
                      searchParams.get("momo_order_id");
  const resultCode = searchParams.get("resultCode") || 
                     searchParams.get("result_code") ||
                     searchParams.get("code");
  const resultMessage = searchParams.get("message") || 
                        searchParams.get("resultMessage");
  const partnerCode = searchParams.get("partnerCode") || 
                      searchParams.get("partner_code");
  const extraData = searchParams.get("extraData") || 
                    searchParams.get("extra_data");

  // ✅ FIX: Debug logging chi tiết
  useEffect(() => {
    console.log('[Payment Success] ========== DEBUG START ==========');
    console.log('[Payment Success] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.log('[Payment Success] Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');
    console.log('[Payment Success] All query params:', allParams);
    console.log('[Payment Success] Extracted values:', {
      orderId,
      amount,
      transactionId,
      paymentId,
      momoOrderId,
      resultCode,
      resultMessage,
      partnerCode,
      extraData
    });
    console.log('[Payment Success] Current state:', {
      loading,
      paymentStatus,
      hasOrder: !!order,
      hasPayment: !!payment,
      error
    });
    console.log('[Payment Success] ========== DEBUG END ==========');
  }, [allParams, orderId, amount, transactionId, paymentId, momoOrderId, resultCode, resultMessage, partnerCode, extraData, loading, paymentStatus, order, payment, error]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[Payment Success] Starting loadData...');

        // ✅ FIX: Check resultCode FIRST để set status ngay
        if (resultCode !== null) {
          const isSuccess = resultCode === '0';
          console.log('[Payment Success] ResultCode found:', resultCode, 'isSuccess:', isSuccess);
          setPaymentStatus(isSuccess ? 'success' : 'failed');
          
          if (isSuccess) {
            message.success('Thanh toán thành công!');
          } else {
            message.error(resultMessage || 'Thanh toán thất bại');
          }
        }

        // ✅ FIX: Kiểm tra nếu không có query params nào
        const hasAnyParams = orderId || momoOrderId || paymentId || resultCode || transactionId || extraData;
        if (!hasAnyParams) {
          console.warn('[Payment Success] No query parameters found');
          console.warn('[Payment Success] This might be due to:');
          console.warn('  1. MoMo did not redirect with query params');
          console.warn('  2. SSL error prevented redirect from completing');
          console.warn('  3. Direct access to page without payment flow');
          
          // Kiểm tra nếu đang ở HTTPS nhưng nên là HTTP
          if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
            console.error('[Payment Success] ⚠️ WARNING: Page accessed via HTTPS but Next.js dev server runs on HTTP!');
            console.error('[Payment Success] Solution: Update MoMo RedirectUrl to: http://localhost:3000/payment-success');
            message.error('Lỗi SSL: Trang đang được truy cập qua HTTPS nhưng server chạy HTTP. Vui lòng cấu hình MoMo RedirectUrl thành: http://localhost:3000/payment-success (không dùng https)', 10);
          } else {
            message.warning('Không tìm thấy thông tin thanh toán. Đang chuyển về trang chủ...');
          }
          
          setTimeout(() => {
            router.push('/');
          }, 2000);
          setPaymentStatus('unknown');
          setLoading(false);
          return;
        }

        // ✅ FIX: Parse extraData để lấy rentalOrderId
        let rentalOrderIdFromExtraData: number | null = null;
        if (extraData) {
          try {
            const decoded = decodeURIComponent(extraData);
            console.log('[Payment Success] Decoded extraData:', decoded);
            
            // Try parse as URLSearchParams
            if (decoded.includes('=')) {
              const params = new URLSearchParams(decoded);
              const rentalOrderIdStr = params.get("rentalOrderId") || params.get("rental_order_id");
              if (rentalOrderIdStr) {
                rentalOrderIdFromExtraData = parseInt(rentalOrderIdStr, 10);
                console.log('[Payment Success] Extracted rentalOrderId from extraData:', rentalOrderIdFromExtraData);
              }
            }
          } catch (error) {
            console.warn('[Payment Success] Failed to parse extraData:', error);
          }
        }

        // ✅ FIX: Determine final orderId với priority
        const finalOrderId = rentalOrderIdFromExtraData || 
                           (orderId ? Number(orderId) : null) || 
                           null;
        
        console.log('[Payment Success] Final orderId to use:', finalOrderId);

        // ✅ FIX: Load payment info với better error handling
        let loadedPayment: PaymentData | null = null;

        if (momoOrderId) {
          try {
            console.log('[Payment Success] Loading payment by momoOrderId:', momoOrderId);
            const paymentResponse = await paymentApi.getByMomoOrderId(momoOrderId);
            console.log('[Payment Success] Payment response:', paymentResponse);
            
            // ✅ FIX: Check response structure - handle nhiều format
            if (paymentResponse && paymentResponse.success && paymentResponse.data) {
              loadedPayment = paymentResponse.data;
              setPayment(loadedPayment);
              console.log('[Payment Success] Payment loaded:', loadedPayment);
              
              // Update status based on payment
              if (loadedPayment.status === 'Completed' || loadedPayment.status === 1 || loadedPayment.status === '1') {
                setPaymentStatus('success');
              } else if (loadedPayment.status === 'Cancelled' || loadedPayment.status === 2 || loadedPayment.status === '2') {
                setPaymentStatus('failed');
              }
            }
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('[Payment Success] Error loading payment by momoOrderId:', errorMsg);
            // Don't fail completely, continue
          }
        }

        // ✅ FIX: Load order details với error handling
        if (finalOrderId) {
          try {
            console.log('[Payment Success] Loading order details for ID:', finalOrderId);
            await loadOrderDetailsById(finalOrderId);
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Payment Success] Error loading order:', errorMsg);
            setError(`Không thể tải thông tin đơn hàng: ${errorMsg}`);
          }
        } else {
          console.warn('[Payment Success] No orderId found, cannot load order details');
        }

        // ✅ FIX: Set default status nếu chưa có
        if (paymentStatus === 'loading' && !resultCode) {
          if (loadedPayment) {
            // Already set above
          } else {
            setPaymentStatus('unknown');
          }
        }

        // ✅ FIX: Dispatch event để refresh danh sách xe
        const isPaymentSuccess = resultCode === '0' || 
                                loadedPayment?.status === 'Completed' || 
                                loadedPayment?.status === 1;
        
        if (isPaymentSuccess && typeof window !== 'undefined') {
          console.log('[Payment Success] Dispatching paymentSuccess event to refresh cars list...');
          window.dispatchEvent(new CustomEvent('paymentSuccess', {
            detail: { rentalOrderId: finalOrderId }
          }));
        }

      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error("[Payment Success] Load data error:", errorMsg);
        setError(errorMsg || "Không thể tải thông tin");
        message.error("Có lỗi xảy ra khi tải thông tin");
        setPaymentStatus('unknown');
      } finally {
        setLoading(false);
        console.log('[Payment Success] LoadData completed, loading set to false');
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentId, momoOrderId, resultCode, resultMessage, extraData]);

  const loadOrderDetailsById = async (orderIdParam: number) => {
    try {
      console.log('[Payment Success] loadOrderDetailsById called with:', orderIdParam);
      
      const orderResponse = await rentalOrderApi.getById(orderIdParam);
      console.log('[Payment Success] Order response:', orderResponse);

      if (orderResponse && orderResponse.success && orderResponse.data) {
        const orderData = orderResponse.data;
        console.log('[Payment Success] Order data:', orderData);

        // Load car and location
        const [carsResponse, locationsResponse] = await Promise.all([
          carsApi.getAll(),
          rentalLocationApi.getAll()
        ]);

        console.log('[Payment Success] Cars response:', carsResponse);
        console.log('[Payment Success] Locations response:', locationsResponse);

        // Parse cars
        let cars: Car[] = [];
        if (carsResponse && carsResponse.success && carsResponse.data) {
          const carsData = Array.isArray(carsResponse.data) 
            ? carsResponse.data 
            : (carsResponse.data as { $values?: Car[] })?.$values || [];
          cars = Array.isArray(carsData) ? carsData : [];
        }

        // Parse locations
        let locations: Array<{ id?: number; name?: string; address?: string }> = [];
        if (locationsResponse && locationsResponse.success && locationsResponse.data) {
          const locationsData = Array.isArray(locationsResponse.data)
            ? locationsResponse.data
            : (locationsResponse.data as { $values?: Array<{ id?: number; name?: string; address?: string }> })?.$values || [];
          locations = Array.isArray(locationsData) ? locationsData : [];
        }

        const car = cars.find((c) => c.id === orderData.carId);
        const location = locations.find((l) => l.id === orderData.rentalLocationId);

        console.log('[Payment Success] Found car:', car);
        console.log('[Payment Success] Found location:', location);

        setOrder({
          ...orderData,
          car,
          location,
        });
      } else {
        console.warn('[Payment Success] Order response invalid:', orderResponse);
      }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Payment Success] Load order details error:", errorMsg);
        throw error; // Re-throw để catch ở trên
      }
  };

  const formatCurrency = (amount?: number | string | null) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(numAmount);
  };

  // ✅ FIX: Always show loading state
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pt-24">
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
            {error && (
              <p className="mt-2 text-red-500 text-sm">{error}</p>
            )}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ✅ FIX: Show error state nếu có lỗi nghiêm trọng
  if (error && !order && !payment && paymentStatus === 'unknown') {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <Card className="shadow-xl">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h1>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button type="primary" onClick={() => router.push('/')}>
                  Về trang chủ
                </Button>
              </div>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ✅ FIX: Main render - luôn hiển thị UI, không phụ thuộc vào order/payment
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
                  <XCircle className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                  Thanh toán thất bại
                </h1>
                <p className="text-lg text-gray-600">
                  {resultMessage || 'Vui lòng thử lại hoặc liên hệ hỗ trợ'}
                </p>
              </>
            )}

            {(paymentStatus === 'loading' || paymentStatus === 'unknown') && (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-500 rounded-full mb-6 shadow-lg">
                  <span className="text-white text-4xl">?</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  {paymentStatus === 'loading' ? 'Đang kiểm tra thanh toán...' : 'Không tìm thấy thông tin thanh toán'}
                </h1>
                <p className="text-lg text-gray-600">
                  {paymentStatus === 'loading' ? 'Vui lòng đợi trong giây lát' : 'Vui lòng kiểm tra lại đơn hàng của bạn hoặc liên hệ hỗ trợ'}
                </p>
              </>
            )}
          </motion.div>

          {/* Main Content Card - ALWAYS SHOW */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="shadow-xl rounded-2xl overflow-hidden border-0">
              {/* Success Message - chỉ hiển thị khi success */}
              {paymentStatus === 'success' && (
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

              {/* Failed Message */}
              {paymentStatus === 'failed' && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <XCircle className="text-red-500 text-2xl mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-800 mb-2">
                        Thanh toán thất bại
                      </h3>
                      <p className="text-red-700">
                        {resultMessage || 'Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unknown/Warning Message */}
              {paymentStatus === 'unknown' && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <span className="text-yellow-500 text-2xl mt-1">⚠</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        Không tìm thấy thông tin thanh toán
                      </h3>
                      <p className="text-yellow-700">
                        Vui lòng kiểm tra lại đơn hàng của bạn tại trang &quot;Đơn hàng của tôi&quot; hoặc liên hệ hỗ trợ nếu bạn vừa hoàn tất thanh toán.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Details - ALWAYS SHOW nếu có data */}
              {(payment || amount || transactionId || momoOrderId) && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarOutlined className="text-green-600" />
                      Thông tin thanh toán
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Transaction ID */}
                      {(payment?.momoTransactionId || payment?.id || transactionId) && (
                        <div>
                          <span className="text-gray-600 block mb-1">Mã giao dịch:</span>
                          <span className="font-semibold text-gray-800">
                            {payment?.momoTransactionId || payment?.id?.toString() || transactionId}
                          </span>
                        </div>
                      )}

                      {/* Partner Code */}
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

                      {/* Amount */}
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

                      {/* Order ID */}
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
                </div>
              )}

              {/* Order Details - chỉ hiển thị nếu có order */}
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
                        {order.location.name || order.location.address || 'Không xác định'}
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

              {/* Action Buttons - ALWAYS SHOW */}
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
                {(orderId || order?.id) && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={() => router.push(`/my-bookings?orderId=${orderId || order?.id}`)}
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
                  Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua trang{' '}
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
