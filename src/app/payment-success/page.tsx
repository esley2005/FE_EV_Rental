"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button, Card, Spin, message, Modal, Radio, Space, Tag } from "antd";
import {
  CheckCircleOutlined, 
  HomeOutlined, 
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SwapOutlined
} from "@ant-design/icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { rentalOrderApi, carsApi, rentalLocationApi, paymentApi, PaymentGateway, authApi } from "@/services/api";
import type { RentalOrderData, PaymentData, User } from "@/services/api";
import { authUtils } from "@/utils/auth";
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
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showChangeGatewayModal, setShowChangeGatewayModal] = useState(false);
  const [selectedNewGateway, setSelectedNewGateway] = useState<PaymentGateway>(PaymentGateway.MoMo);
  const [changingGateway, setChangingGateway] = useState(false);

  // ✅ FIX: Extract ALL possible query params với nhiều tên khác nhau
  const allParams = Object.fromEntries(searchParams.entries());
  
  // ✅ QUAN TRỌNG: orderId từ query params - KHÔNG lấy orderCode của PayOS
  // PayOS orderCode sẽ được lấy riêng ở dưới
  const orderId = searchParams.get("orderId") || 
                  searchParams.get("partnerRefId") || 
                  searchParams.get("order_id");
  // ⚠️ KHÔNG lấy orderCode từ PayOS làm orderId vì đây là mã PayOS, không phải rentalOrderId
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
  // ✅ PayOS và MoMo đều có thể dùng resultCode/code
  const resultCode = searchParams.get("resultCode") || 
                     searchParams.get("result_code") ||
                     searchParams.get("code"); // PayOS dùng "code"
  const resultMessage = searchParams.get("message") || 
                        searchParams.get("resultMessage") ||
                        searchParams.get("desc"); // PayOS dùng "desc"
  const partnerCode = searchParams.get("partnerCode") || 
                      searchParams.get("partner_code");
  const extraData = searchParams.get("extraData") || 
                    searchParams.get("extra_data");
  // ✅ PayOS specific params
  const payOSOrderCode = searchParams.get("orderCode") || 
                         searchParams.get("order_code");
  const payOSStatus = searchParams.get("status") || 
                      searchParams.get("payOSStatus");
  const cancelParam = searchParams.get("cancel") || 
                      searchParams.get("canceled");

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
      extraData,
      payOSOrderCode,
      payOSStatus,
      cancelParam
    });
    console.log('[Payment Success] Current state:', {
      loading,
      paymentStatus,
      hasOrder: !!order,
      hasPayment: !!payment,
      error
    });
    console.log('[Payment Success] ========== DEBUG END ==========');
  }, [allParams, orderId, amount, transactionId, paymentId, momoOrderId, resultCode, resultMessage, partnerCode, extraData, payOSOrderCode, payOSStatus, cancelParam, loading, paymentStatus, order, payment, error]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[Payment Success] Starting loadData...');

        // ✅ FIX: Parse extraData TRƯỚC để có thể dùng trong logic sau
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
        // ⚠️ QUAN TRỌNG: payOSOrderCode KHÔNG phải là rentalOrderId!
        // payOSOrderCode là mã đơn hàng của PayOS, không phải ID của rental order trong database
        // Chỉ dùng rentalOrderIdFromExtraData, orderId từ query params, hoặc từ sessionStorage
        let finalOrderId: number | null = null;
        
        // Priority 1: rentalOrderIdFromExtraData (từ extraData của MoMo/PayOS)
        if (rentalOrderIdFromExtraData && !isNaN(rentalOrderIdFromExtraData) && rentalOrderIdFromExtraData > 0) {
          finalOrderId = rentalOrderIdFromExtraData;
          console.log('[Payment Success] Using rentalOrderIdFromExtraData:', finalOrderId);
        }
        // Priority 2: orderId từ query params (chỉ nếu là số hợp lệ, không phải UUID hoặc PayOS orderCode)
        else if (orderId) {
          const parsedOrderId = Number(orderId);
          // ✅ QUAN TRỌNG: Kiểm tra kỹ để tránh nhầm với PayOS orderCode
          // PayOS orderCode thường là số lớn (6-7 chữ số), rentalOrderId thường nhỏ hơn
          // Chỉ dùng nếu là số hợp lệ và không phải PayOS orderCode
          const isPayOSOrderCode = payOSOrderCode && parsedOrderId === Number(payOSOrderCode);
          if (!isNaN(parsedOrderId) && parsedOrderId > 0 && parsedOrderId < 1000000 && !isPayOSOrderCode) {
            // Giới hạn < 1 triệu để tránh nhầm với PayOS orderCode (thường 6-7 chữ số)
            finalOrderId = parsedOrderId;
            console.log('[Payment Success] Using parsed orderId from query:', finalOrderId);
          } else {
            console.warn('[Payment Success] orderId from query is not a valid rentalOrderId (might be UUID or PayOS code):', orderId, 'payOSOrderCode:', payOSOrderCode);
          }
        }
        // Priority 3: Lấy từ sessionStorage (đã lưu trước khi redirect đến PayOS/MoMo)
        if (!finalOrderId && typeof window !== 'undefined') {
          const savedOrderId = sessionStorage.getItem('pendingPaymentOrderId');
          if (savedOrderId) {
            const parsedSavedOrderId = Number(savedOrderId);
            if (!isNaN(parsedSavedOrderId) && parsedSavedOrderId > 0 && parsedSavedOrderId < 1000000) {
              finalOrderId = parsedSavedOrderId;
              console.log('[Payment Success] Using orderId from sessionStorage:', finalOrderId);
              // Xóa sau khi dùng để tránh dùng lại
              sessionStorage.removeItem('pendingPaymentOrderId');
            }
          }
        }
        
        // ⚠️ KHÔNG dùng payOSOrderCode như rentalOrderId vì đây là mã của PayOS, không phải rental order ID
        if (payOSOrderCode && !finalOrderId) {
          console.log('[Payment Success] PayOS orderCode found:', payOSOrderCode, '- This is PayOS order code, not rentalOrderId. Will try to find payment/order from user orders.');
        }
        
        console.log('[Payment Success] Final orderId to use:', finalOrderId);

        // ✅ FIX: Check resultCode và cancel/status để set status ngay
        // PayOS: code = 00 là thành công, code khác là thất bại/hủy
        // MoMo: resultCode = '0' là thành công, khác là thất bại
        // ✅ QUAN TRỌNG: Kiểm tra cancel và status TRƯỚC resultCode
        const isCancelled = cancelParam === 'true' || cancelParam === '1' || 
                            payOSStatus?.toUpperCase() === 'CANCELLED' ||
                            payOSStatus?.toUpperCase() === 'CANCELED';
        
        // ✅ Khai báo loadedPayment trước để có thể dùng trong logic sau
        let loadedPayment: PaymentData | null = null;
        
        // ✅ Lưu finalOrderId vào biến để dùng sau này (có thể được cập nhật từ payment record)
        let orderIdForRedirect: number | null = finalOrderId;
        
        // ✅ Load user info TRƯỚC để có thể tìm payment từ PayOS orderCode
        try {
          let currentUser = authUtils.getCurrentUser();
          if (!currentUser) {
            const userResponse = await authApi.getProfile();
            if (userResponse.success && 'data' in userResponse && userResponse.data) {
              currentUser = userResponse.data;
            }
          }
          if (currentUser) {
            setUser(currentUser);
            
            // ✅ Nếu có PayOS orderCode nhưng chưa có finalOrderId, cần tìm từ payment record TRƯỚC khi kiểm tra status
            // Điều này đảm bảo có orderId để redirect khi payment failed/cancelled
            if (payOSOrderCode && !orderIdForRedirect) {
              try {
                const userPaymentsResponse = await paymentApi.getAllByUserId(currentUser.id);
                if (userPaymentsResponse.success && userPaymentsResponse.data) {
                  const payments = Array.isArray(userPaymentsResponse.data)
                    ? userPaymentsResponse.data
                    : (userPaymentsResponse.data as { $values?: PaymentData[] })?.$values || [];
                  
                  const payOSOrderCodeNum = Number(payOSOrderCode);
                  const foundPayment = payments.find((p: PaymentData) => {
                    const paymentAny = p as PaymentData & { payOSOrderCode?: number; orderCode?: number };
                    return paymentAny.payOSOrderCode === payOSOrderCodeNum ||
                           (p.paymentMethod && p.paymentMethod.toLowerCase().includes('payos') && 
                            paymentAny.orderCode === payOSOrderCodeNum);
                  });
                  
                  if (foundPayment && foundPayment.rentalOrderId) {
                    orderIdForRedirect = foundPayment.rentalOrderId;
                    loadedPayment = foundPayment;
                    setPayment(foundPayment);
                    console.log('[Payment Success] Found rentalOrderId from PayOS payment (early):', orderIdForRedirect);
                  }
                }
              } catch (error) {
                console.warn('[Payment Success] Failed to find payment from PayOS orderCode (early):', error);
              }
            }
          }
        } catch (error) {
          console.warn('[Payment Success] Failed to load user:', error);
        }
        
        if (resultCode !== null || isCancelled) {
          // ✅ Nếu có cancel hoặc status CANCELLED, luôn đánh dấu là thất bại
          if (isCancelled) {
            console.log('[Payment Success] Payment cancelled detected:', { cancelParam, payOSStatus });
            
            // ✅ QUAN TRỌNG: Khi hủy thanh toán (MoMo hoặc PayOS), redirect TRỰC TIẾP về checkout
            // Không hiển thị payment-success page, chỉ redirect ngay
            if (orderIdForRedirect && !isNaN(orderIdForRedirect) && orderIdForRedirect > 0) {
              console.log('[Payment Success] Payment cancelled, redirecting immediately to checkout with orderId:', orderIdForRedirect);
              setLoading(false);
              // Redirect ngay lập tức, không delay
              router.push(`/checkout?orderId=${orderIdForRedirect}`);
              return; // Exit early để không load order details
            } else {
              // Nếu không có orderId, vẫn hiển thị thông báo
              setPaymentStatus('failed');
              message.error('Thanh toán đã bị hủy');
            }
          } else {
            // PayOS success code: "00"
            // MoMo success code: "0"
            const isSuccess = resultCode === '0' || resultCode === '00';
            console.log('[Payment Success] ResultCode found:', resultCode, 'isSuccess:', isSuccess);
            
            // ✅ QUAN TRỌNG: Set status dựa trên resultCode, không override sau này
            if (isSuccess) {
              setPaymentStatus('success');
              message.success('Thanh toán thành công!');
            } else {
              // ✅ Hủy/thất bại: luôn set failed
              // ✅ QUAN TRỌNG: Khi thanh toán thất bại (MoMo hoặc PayOS), redirect TRỰC TIẾP về checkout
              if (orderIdForRedirect && !isNaN(orderIdForRedirect) && orderIdForRedirect > 0) {
                console.log('[Payment Success] Payment failed, redirecting immediately to checkout with orderId:', orderIdForRedirect);
                setLoading(false);
                // Redirect ngay lập tức, không delay
                router.push(`/checkout?orderId=${orderIdForRedirect}`);
                return; // Exit early để không load order details
              } else {
                // Nếu không có orderId, vẫn hiển thị thông báo
                setPaymentStatus('failed');
                const errorMsg = resultMessage || 'Thanh toán thất bại hoặc đã hủy';
                message.error(errorMsg);
              }
            }
          }
        }

        // ✅ FIX: Kiểm tra nếu không có query params nào (bao gồm PayOS params)
        const hasAnyParams = orderId || momoOrderId || paymentId || resultCode || transactionId || extraData || payOSOrderCode;
        if (!hasAnyParams) {
          console.warn('[Payment Success] No query parameters found');
          console.warn('[Payment Success] This might be due to:');
          console.warn('  1. MoMo/PayOS did not redirect with query params');
          console.warn('  2. SSL error prevented redirect from completing');
          console.warn('  3. Direct access to page without payment flow');
          
          // Kiểm tra nếu đang ở HTTPS nhưng nên là HTTP
          if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
            console.error('[Payment Success] ⚠️ WARNING: Page accessed via HTTPS but Next.js dev server runs on HTTP!');
            console.error('[Payment Success] Solution: Update Payment Gateway RedirectUrl to: http://localhost:3000/payment-success');
            message.error('Lỗi SSL: Trang đang được truy cập qua HTTPS nhưng server chạy HTTP. Vui lòng cấu hình Payment Gateway RedirectUrl thành: http://localhost:3000/payment-success (không dùng https)', 10);
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

        // ✅ FIX: Load payment info với better error handling
        // loadedPayment đã được khai báo ở trên, không cần khai báo lại

        // Try to load payment by MoMo Order ID
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
              
              // ✅ Update status based on payment - NHƯNG chỉ khi chưa có resultCode
              // Nếu đã có resultCode từ query params, ưu tiên dùng resultCode (đã set ở trên)
              if (resultCode === null) {
                // Chỉ update nếu không có resultCode từ query params
                if (loadedPayment.status === 'Completed' || loadedPayment.status === 1 || loadedPayment.status === '1') {
                  setPaymentStatus('success');
                } else if (loadedPayment.status === 'Cancelled' || loadedPayment.status === 2 || loadedPayment.status === '2' || loadedPayment.status === 'Failed') {
                  setPaymentStatus('failed');
                }
              } else {
                // Nếu đã có resultCode, chỉ log để debug, không override
                console.log('[Payment Success] Payment status from DB:', loadedPayment.status, 'but using resultCode:', resultCode);
              }
            }
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('[Payment Success] Error loading payment by momoOrderId:', errorMsg);
            // Don't fail completely, continue
          }
        }

        // ✅ Try to load payment by PayOS Order Code (nếu có và chưa có payment)
        // PayOS orderCode không phải là rentalOrderId, nên cần tìm payment từ user's payments
        if (payOSOrderCode && !loadedPayment && user) {
          try {
            console.log('[Payment Success] Trying to find payment by PayOS orderCode:', payOSOrderCode);
            // Thử load tất cả payments của user và tìm payment có PayOS orderCode
              const userPaymentsResponse = await paymentApi.getAllByUserId(user.id);
              if (userPaymentsResponse.success && userPaymentsResponse.data) {
                const payments = Array.isArray(userPaymentsResponse.data)
                  ? userPaymentsResponse.data
                  : (userPaymentsResponse.data as { $values?: PaymentData[] })?.$values || [];
              
              // Tìm payment có PayOS orderCode khớp
              const payOSOrderCodeNum = Number(payOSOrderCode);
              const foundPayment = payments.find((p: PaymentData) => {
                // Kiểm tra các trường có thể chứa PayOS orderCode
                const paymentAny = p as PaymentData & { payOSOrderCode?: number; orderCode?: number };
                return paymentAny.payOSOrderCode === payOSOrderCodeNum ||
                       (p.paymentMethod && p.paymentMethod.toLowerCase().includes('payos') && 
                        paymentAny.orderCode === payOSOrderCodeNum);
              });
              
              if (foundPayment) {
                loadedPayment = foundPayment;
                setPayment(foundPayment);
                console.log('[Payment Success] Found payment by PayOS orderCode:', foundPayment);
                
                // Nếu có rentalOrderId từ payment, dùng nó làm finalOrderId
                if (foundPayment.rentalOrderId && !finalOrderId) {
                  finalOrderId = foundPayment.rentalOrderId;
                  console.log('[Payment Success] Using rentalOrderId from payment:', finalOrderId);
                }
              } else {
                console.warn('[Payment Success] Payment not found for PayOS orderCode:', payOSOrderCode);
              }
            }
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('[Payment Success] Error loading payment by payOSOrderCode:', errorMsg);
            // Don't fail completely, continue
          }
        }

        // ✅ User đã được load ở trên, không cần load lại

        // ✅ FIX: Load order details với error handling
        // Chỉ load nếu có finalOrderId hợp lệ (không phải PayOS orderCode)
        if (finalOrderId && !isNaN(finalOrderId) && finalOrderId > 0) {
          try {
            console.log('[Payment Success] Loading order details for rentalOrderId:', finalOrderId);
            await loadOrderDetailsById(finalOrderId);
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Payment Success] Error loading order:', errorMsg);
            setError(`Không thể tải thông tin đơn hàng: ${errorMsg}`);
          }
        } else {
          // Nếu có PayOS orderCode nhưng không có rentalOrderId, thử load từ user orders
          if (payOSOrderCode && user && !finalOrderId) {
            console.warn('[Payment Success] No rentalOrderId found, but have PayOS orderCode. Will try to find order from user orders.');
            try {
              const userOrdersResponse = await rentalOrderApi.getByUserId(user.id);
              if (userOrdersResponse.success && userOrdersResponse.data) {
                const orders = Array.isArray(userOrdersResponse.data)
                  ? userOrdersResponse.data
                  : (userOrdersResponse.data as { $values?: RentalOrderData[] })?.$values || [];
                
                // Tìm order có payment với PayOS orderCode
                // Hoặc lấy order gần nhất nếu không tìm thấy
                const recentOrder = orders.length > 0 ? orders[orders.length - 1] : null;
                if (recentOrder) {
                  console.log('[Payment Success] Using most recent order:', recentOrder.id);
                  await loadOrderDetailsById(recentOrder.id);
                }
              }
            } catch (error) {
              console.warn('[Payment Success] Failed to load order from user orders:', error);
            }
          } else {
            console.warn('[Payment Success] No valid rentalOrderId found, cannot load order details');
          }
        }

        // ✅ FIX: Set default status nếu chưa có
        // Chỉ set unknown nếu không có resultCode VÀ không có payment data
        if (paymentStatus === 'loading' && !resultCode && !loadedPayment) {
          setPaymentStatus('unknown');
        }

        // ✅ FIX: Dispatch event để refresh danh sách xe
        // Chỉ dispatch khi THỰC SỰ thành công (resultCode = '0' hoặc '00')
        const isPaymentSuccess = (resultCode === '0' || resultCode === '00') || 
                                (resultCode === null && (loadedPayment?.status === 'Completed' || loadedPayment?.status === 1));
        
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
<<<<<<< HEAD
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

=======
        
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
        
>>>>>>> tiger_fix_v6
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

  // ✅ Xử lý đổi phương thức thanh toán - gọi API ChangePaymentGateway
  const handleChangePaymentGateway = async () => {
    if (!payment?.id) {
      message.error("Không tìm thấy thông tin thanh toán");
      return;
    }

    setChangingGateway(true);
    
    try {
      message.loading("Đang đổi phương thức thanh toán...", 1);
      
      const response = await paymentApi.changePaymentGateway(
        payment.id,
        selectedNewGateway
      );

      if (response.success && response.data) {
        const paymentData = response.data;

        // Xử lý theo gateway mới
        if (selectedNewGateway === PaymentGateway.MoMo) {
          const paymentUrl = paymentData.momoPayUrl;
          if (paymentUrl) {
            message.success("Đang chuyển đến trang thanh toán MoMo...", 2);
            setShowChangeGatewayModal(false);
            setTimeout(() => {
              window.location.href = paymentUrl;
            }, 1000);
          } else {
            throw new Error("Không nhận được payment URL từ MoMo");
          }
        } else if (selectedNewGateway === PaymentGateway.PayOS) {
          if (paymentData.payOSCheckoutUrl) {
            message.success("Đang chuyển đến trang thanh toán PayOS...", 2);
            setShowChangeGatewayModal(false);
            setTimeout(() => {
              window.location.href = paymentData.payOSCheckoutUrl!;
            }, 1000);
          } else {
            throw new Error("Không nhận được thông tin thanh toán từ PayOS");
          }
        } else if (selectedNewGateway === PaymentGateway.Cash || selectedNewGateway === PaymentGateway.BankTransfer) {
          message.success("Đã đổi phương thức thanh toán. Vui lòng thanh toán trực tiếp khi nhận xe.", 5);
          setShowChangeGatewayModal(false);
          setChangingGateway(false);
          // Reload page để cập nhật thông tin
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        throw new Error(response.error || "Không thể đổi phương thức thanh toán");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi đổi phương thức thanh toán";
      
      message.error(errorMessage);
      setChangingGateway(false);
    }
  };

  // ✅ Xử lý thanh toán lại - gọi API createPaymentWithGateway
  const handleRetryPayment = async () => {
    if (!order || !user) {
      message.error("Không thể tải thông tin đơn hàng hoặc người dùng");
      return;
    }

    setRetryingPayment(true);
    
    try {
      // Tính amount dựa trên order data
      const amount = (order.deposit && order.deposit > 0) 
        ? order.deposit 
        : Math.round((order.total || order.subTotal || 0) * 0.3);
      
      if (amount <= 0) {
        message.warning("Không có số tiền cần thanh toán");
        setRetryingPayment(false);
        return;
      }

      // Xác định gateway đã dùng (từ payment data hoặc mặc định MoMo)
      let gateway = PaymentGateway.MoMo; // Mặc định
      if (payment?.paymentMethod) {
        if (payment.paymentMethod.toLowerCase().includes('momo')) {
          gateway = PaymentGateway.MoMo;
        } else if (payment.paymentMethod.toLowerCase().includes('payos')) {
          gateway = PaymentGateway.PayOS;
        }
      }

      message.loading("Đang tạo yêu cầu thanh toán...", 1);
      
      const response = await paymentApi.createPaymentWithGateway(
        order.id,
        user.id,
        amount,
        gateway
      );

      if (response.success && response.data) {
        const paymentData = response.data;

        // Xử lý theo gateway
        if (gateway === PaymentGateway.MoMo) {
          const paymentUrl = paymentData.momoPayUrl;
          if (paymentUrl) {
            message.success("Đang chuyển đến trang thanh toán MoMo...", 2);
            setTimeout(() => {
              window.location.href = paymentUrl;
            }, 1000);
          } else {
            throw new Error("Không nhận được payment URL từ MoMo");
          }
        } else if (gateway === PaymentGateway.PayOS) {
          if (paymentData.payOSCheckoutUrl) {
            message.success("Đang chuyển đến trang thanh toán PayOS...", 2);
            setTimeout(() => {
              window.location.href = paymentData.payOSCheckoutUrl!;
            }, 1000);
          } else {
            throw new Error("Không nhận được thông tin thanh toán từ PayOS");
          }
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
      setRetryingPayment(false);
    }
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
              <div className="mt-8 pt-6 border-t">
                {/* Payment Retry Buttons - chỉ hiển thị khi thanh toán thất bại hoặc chưa thành công */}
                {(paymentStatus === 'failed' || paymentStatus === 'unknown') && (orderId || order?.id) && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                      <ReloadOutlined className="text-red-600" />
                      Thanh toán lại
                    </h3>
                    <p className="text-red-700 text-sm mb-4">
                      Thanh toán không thành công hoặc đã bị hủy. Bạn có thể thử lại với cùng phương thức hoặc chọn phương thức thanh toán khác.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="primary"
                        size="large"
                        danger
                        icon={<ReloadOutlined />}
                        onClick={handleRetryPayment}
                        loading={retryingPayment}
                        disabled={retryingPayment || !order || !user}
                        className="flex-1 h-12"
                      >
                        {retryingPayment ? "Đang xử lý..." : "Thanh toán lại"}
                      </Button>
                      <Button
                        type="default"
                        size="large"
                        icon={<SwapOutlined />}
                        onClick={() => {
                          // ✅ Tìm orderId từ nhiều nguồn với priority:
                          // 1. order?.id (từ database, đáng tin cậy nhất)
                          // 2. payment?.rentalOrderId (từ payment record)
                          // 3. orderId từ query params (có thể là UUID, cần parse)
                          // 4. payOSOrderCode (PayOS order code)
                          
                          let finalOrderId: number | null = null;
                          
                          // Priority 1: order?.id
                          if (order?.id && typeof order.id === 'number' && order.id > 0) {
                            finalOrderId = order.id;
                            console.log('[Payment Success] Using order.id:', finalOrderId);
                          }
                          // Priority 2: payment?.rentalOrderId
                          else if (payment?.rentalOrderId && typeof payment.rentalOrderId === 'number' && payment.rentalOrderId > 0) {
                            finalOrderId = payment.rentalOrderId;
                            console.log('[Payment Success] Using payment.rentalOrderId:', finalOrderId);
                          }
                          // Priority 3: orderId từ query params (thử parse thành số)
                          else if (orderId) {
                            const parsedOrderId = Number(orderId);
                            if (!isNaN(parsedOrderId) && parsedOrderId > 0) {
                              finalOrderId = parsedOrderId;
                              console.log('[Payment Success] Using parsed orderId from query:', finalOrderId);
                            } else {
                              console.warn('[Payment Success] orderId from query is not a valid number:', orderId);
                            }
                          }
                          // Priority 4: payOSOrderCode
                          else if (payOSOrderCode) {
                            const parsedPayOSCode = Number(payOSOrderCode);
                            if (!isNaN(parsedPayOSCode) && parsedPayOSCode > 0) {
                              finalOrderId = parsedPayOSCode;
                              console.log('[Payment Success] Using payOSOrderCode:', finalOrderId);
                            }
                          }
                          
                          // ✅ Kiểm tra finalOrderId hợp lệ
                          if (!finalOrderId || isNaN(finalOrderId) || finalOrderId <= 0) {
                            console.error('[Payment Success] No valid orderId found:', {
                              'order?.id': order?.id,
                              'payment?.rentalOrderId': payment?.rentalOrderId,
                              'orderId': orderId,
                              'payOSOrderCode': payOSOrderCode
                            });
                            message.error("Không tìm thấy thông tin đơn hàng. Vui lòng thử lại hoặc chọn đơn hàng từ danh sách.");
                            router.push("/my-bookings");
                            return;
                          }
                          
                          // ✅ Khi thanh toán thất bại: luôn redirect về checkout để chọn phương thức mới
                          // ✅ Tương tự như MoMo, không mở modal khi thanh toán thất bại
                          if (paymentStatus === 'failed' || paymentStatus === 'unknown') {
                            console.log('[Payment Success] Redirecting to checkout with orderId:', finalOrderId);
                            router.push(`/checkout?orderId=${finalOrderId}`);
                          } else {
                            // ✅ Khi thanh toán thành công: nếu có payment.id thì mở modal để đổi gateway
                            if (payment?.id) {
                              // Xác định gateway hiện tại từ payment
                              let currentGateway = PaymentGateway.MoMo; // Mặc định
                              if (payment.paymentMethod) {
                                if (payment.paymentMethod.toLowerCase().includes('momo')) {
                                  currentGateway = PaymentGateway.MoMo;
                                } else if (payment.paymentMethod.toLowerCase().includes('payos')) {
                                  currentGateway = PaymentGateway.PayOS;
                                }
                              }
                              
                              // Set gateway mới là gateway khác với gateway hiện tại
                              const newGateway = currentGateway === PaymentGateway.MoMo 
                                ? PaymentGateway.PayOS 
                                : PaymentGateway.MoMo;
                              setSelectedNewGateway(newGateway);
                              setShowChangeGatewayModal(true);
                            } else {
                              // Fallback: về checkout để chọn phương thức mới
                              console.log('[Payment Success] No payment.id, redirecting to checkout with orderId:', finalOrderId);
                              router.push(`/checkout?orderId=${finalOrderId}`);
                            }
                          }
                        }}
                        className="flex-1 h-12 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Đổi phương thức thanh toán
                      </Button>
                    </div>
                  </div>
                )}

                {/* Standard Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
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
      {/* Modal đổi phương thức thanh toán */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SwapOutlined className="text-blue-600" />
            <span>Đổi phương thức thanh toán</span>
          </div>
        }
        open={showChangeGatewayModal}
        onCancel={() => {
          setShowChangeGatewayModal(false);
          // Reset về gateway mặc định khi đóng
          if (payment?.paymentMethod?.toLowerCase().includes('momo')) {
            setSelectedNewGateway(PaymentGateway.PayOS);
          } else {
            setSelectedNewGateway(PaymentGateway.MoMo);
          }
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowChangeGatewayModal(false);
              // Reset về gateway mặc định khi đóng
              if (payment?.paymentMethod?.toLowerCase().includes('momo')) {
                setSelectedNewGateway(PaymentGateway.PayOS);
              } else {
                setSelectedNewGateway(PaymentGateway.MoMo);
              }
            }}
          >
            Hủy
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleChangePaymentGateway}
            loading={changingGateway}
            disabled={!payment?.id || changingGateway}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {changingGateway ? "Đang xử lý..." : "Xác nhận và thanh toán"}
          </Button>,
        ]}
        width={500}
      >
        <div className="space-y-4">
          {/* Hiển thị phương thức hiện tại */}
          {payment?.paymentMethod && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Phương thức hiện tại:</p>
              <p className="font-semibold text-blue-700">
                {payment.paymentMethod.toLowerCase().includes('momo') ? 'MoMo' : 
                 payment.paymentMethod.toLowerCase().includes('payos') ? 'PayOS' : 
                 payment.paymentMethod}
              </p>
            </div>
          )}

          <p className="text-gray-700 font-medium">
            Chọn phương thức thanh toán mới cho đơn hàng #{order?.id || orderId}:
          </p>
          
          {/* ✅ Chỉ hiển thị phương thức khác với phương thức hiện tại */}
          {(() => {
            const currentIsMoMo = payment?.paymentMethod?.toLowerCase().includes('momo');
            const availableGateways = currentIsMoMo 
              ? [PaymentGateway.PayOS] // Nếu đang dùng MoMo, chỉ hiển thị PayOS
              : [PaymentGateway.MoMo]; // Nếu đang dùng PayOS, chỉ hiển thị MoMo

            return (
              <Radio.Group
                value={selectedNewGateway}
                onChange={(e) => setSelectedNewGateway(e.target.value)}
                className="w-full"
              >
                <Space direction="vertical" className="w-full" size="middle">
                  {availableGateways.includes(PaymentGateway.MoMo) && (
                    <Radio value={PaymentGateway.MoMo} className="w-full py-3 px-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">MoMo</span>
                        <Tag color="pink">Ví điện tử</Tag>
                        <span className="text-sm text-gray-500">Thanh toán nhanh chóng</span>
                      </div>
                    </Radio>
                  )}
                  {availableGateways.includes(PaymentGateway.PayOS) && (
                    <Radio value={PaymentGateway.PayOS} className="w-full py-3 px-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">PayOS</span>
                        <Tag color="blue">QR Code</Tag>
                        <Tag color="green">Ngân hàng</Tag>
                        <span className="text-sm text-gray-500">Nhiều phương thức</span>
                      </div>
                    </Radio>
                  )}
                </Space>
              </Radio.Group>
            );
          })()}

          {order && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Số tiền cần thanh toán:</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(order.deposit || Math.round((order.total || order.subTotal || 0) * 0.3))}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Sau khi đổi phương thức, bạn sẽ được chuyển đến trang thanh toán mới ngay lập tức.
            </p>
          </div>
        </div>
      </Modal>

      <Footer />
    </>
  );
}
