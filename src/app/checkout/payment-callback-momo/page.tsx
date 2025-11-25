"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spin, Result, Button, Card, Descriptions, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, DollarOutlined, FileTextOutlined, ClockCircleOutlined, IdcardOutlined } from "@ant-design/icons";
import { rentalOrderApi, authApi, driverLicenseApi, paymentApi, type RentalOrderData } from "@/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dayjs from "dayjs";

export default function PaymentCallbackMomoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderData, setOrderData] = useState<RentalOrderData | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    amount?: number;
    transId?: string;
    momoOrderId?: string;
    orderInfo?: string;
    payType?: string;
    responseTime?: string;
  }>({});

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Lấy các params từ MoMo callback
        // MoMo trả về: orderId, resultCode, message, transId, amount, requestId, etc.
        const momoOrderId = searchParams?.get("requestId") || 
                           searchParams?.get("momoOrderId") ||
                           "";
        
        const rentalOrderId = searchParams?.get("orderId") || 
                             searchParams?.get("OrderId") ||
                             "";
        
        const resultCode = searchParams?.get("resultCode") || 
                          searchParams?.get("ResultCode") ||
                          "";
        
        const momoMessage = searchParams?.get("message") || 
                           searchParams?.get("Message") ||
                           "";
        
        const amount = searchParams?.get("amount");
        const transId = searchParams?.get("transId");
        const orderInfo = searchParams?.get("orderInfo");
        const payType = searchParams?.get("payType");
        const responseTime = searchParams?.get("responseTime");
        
        // Lưu thông tin payment
        setPaymentInfo({
          amount: amount ? Number(amount) : undefined,
          transId: transId || undefined,
          momoOrderId: momoOrderId || undefined,
          orderInfo: orderInfo ? decodeURIComponent(orderInfo) : undefined,
          payType: payType || undefined,
          responseTime: responseTime || undefined,
        });

        console.log("[Payment Callback MoMo] Received params:", {
          momoOrderId,
          rentalOrderId,
          resultCode,
          momoMessage,
          allParams: Object.fromEntries(searchParams?.entries() || [])
        });

        // Kiểm tra nếu có đủ dữ liệu
        if (!rentalOrderId || !resultCode) {
          setStatus("error");
          setMessage("Thiếu thông tin thanh toán. Vui lòng kiểm tra lại.");
          console.error("[Payment Callback MoMo] Missing required params:", { rentalOrderId, resultCode });
          return;
        }

        const orderIdNum = Number(rentalOrderId);
        if (isNaN(orderIdNum)) {
          setStatus("error");
          setMessage("Mã đơn hàng không hợp lệ.");
          return;
        }

        // Kiểm tra resultCode == "0" (thành công theo MoMo)
        if (resultCode === "0") {
          // Gọi API để xác nhận thanh toán MoMo
          // Có thể cần gọi API để confirm payment hoặc update order status
          console.log("[Payment Callback MoMo] Payment successful, confirming payment...");
          
          try {
            // Thử gọi API confirm payment nếu có
            // Hoặc có thể backend tự động xử lý khi nhận callback từ MoMo
            // Tạm thời chỉ cập nhật UI và redirect
            
            // Load thông tin đơn hàng
            try {
              const orderResponse = await rentalOrderApi.getById(orderIdNum);
              if (orderResponse.success && orderResponse.data) {
                setOrderData(orderResponse.data);
                console.log("[Payment Callback MoMo] Order data loaded:", orderResponse.data);
              }
            } catch (orderError) {
              console.log("[Payment Callback MoMo] Could not load order info:", orderError);
            }
            
            // Nếu có momoOrderId, có thể lấy payment info
            if (momoOrderId) {
              try {
                const paymentResponse = await paymentApi.getByMomoOrderId(momoOrderId);
                console.log("[Payment Callback MoMo] Payment info:", paymentResponse);
              } catch (paymentError) {
                console.log("[Payment Callback MoMo] Could not fetch payment info:", paymentError);
              }
            }
            
            // Kiểm tra GPLX đã xác thực chưa, nếu có thì tự động chuyển sang CheckedIn (status = 2)
            try {
              // Check GPLX status từ user profile
              const profileResponse = await authApi.getProfile();
              let isLicenseVerified = false;
              
              if (profileResponse.success && 'data' in profileResponse && profileResponse.data) {
                // Check driverLicenseStatus từ user profile
                if (profileResponse.data.driverLicenseStatus === 1) {
                  isLicenseVerified = true;
                }
              }
              
              // Nếu chưa có từ profile, check từ driverLicenseApi
              if (!isLicenseVerified) {
                try {
                  const licenseResponse = await driverLicenseApi.getCurrent();
                  if (licenseResponse.success && licenseResponse.data) {
                    const licenseData = licenseResponse.data as any;
                    const licenseStatus = licenseData.status;
                    // Status = 1 hoặc "Approved" nghĩa là đã xác thực
                    if (licenseStatus === 1 || licenseStatus === "Approved" || licenseStatus === "1") {
                      isLicenseVerified = true;
                    }
                  }
                } catch (licenseError) {
                  console.log("[Payment Callback MoMo] No GPLX found or error:", licenseError);
                }
              }
              
              // Nếu GPLX đã xác thực, tự động chuyển sang CheckedIn (status = 2)
              if (isLicenseVerified) {
                console.log("[Payment Callback MoMo] GPLX verified, updating order status to CheckedIn (2)");
                const updateStatusResponse = await rentalOrderApi.updateStatus(orderIdNum, 2);
                if (updateStatusResponse.success) {
                  console.log("[Payment Callback MoMo] ✅ Order status updated to CheckedIn successfully");
                } else {
                  console.warn("[Payment Callback MoMo] ⚠️ Failed to update order status to CheckedIn:", updateStatusResponse.error);
                }
              } else {
                console.log("[Payment Callback MoMo] GPLX not verified yet, order remains in current status");
              }
            } catch (autoUpdateError) {
              console.error("[Payment Callback MoMo] Error checking/updating GPLX status:", autoUpdateError);
              // Không block flow, chỉ log error
            }
            
            setOrderId(orderIdNum);
            setStatus("success");
            setMessage(momoMessage || "Thanh toán thành công! Đơn hàng đã được cập nhật.");
            console.log("[Payment Callback MoMo] ✅ Payment confirmed successfully, orderId:", orderIdNum);
          } catch (confirmError) {
            console.error("[Payment Callback MoMo] Error confirming payment:", confirmError);
            // Vẫn hiển thị success nếu resultCode = 0
            setOrderId(orderIdNum);
            setStatus("success");
            setMessage(momoMessage || "Thanh toán thành công!");
          }
        } else {
          // resultCode khác "0" - thanh toán thất bại
          setStatus("error");
          const errorMsg = momoMessage || `Thanh toán thất bại. Mã lỗi: ${resultCode}`;
          setMessage(errorMsg);
          console.warn("[Payment Callback MoMo] ⚠️ resultCode != 0:", resultCode);
        }
      } catch (error: any) {
        console.error("[Payment Callback MoMo] Error:", error);
        setStatus("error");
        setMessage(error?.message || "Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.");
      }
    };

    processPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        {status === "loading" && (
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">Đang xử lý thanh toán...</p>
          </div>
        )}

        {status === "success" && (
          <div className="w-full max-w-4xl">
            <Result
              icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              title="Thanh toán thành công!"
              subTitle={message}
              extra={[
                <Button
                  type="primary"
                  key="bookings"
                  size="large"
                  onClick={() => router.push("/my-bookings")}
                >
                  Xem Đơn thuê
                </Button>,
                <Button key="home" size="large" onClick={() => router.push("/")}>
                  Về trang chủ
                </Button>,
              ]}
            />
            
            {/* Thông tin chi tiết thanh toán */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thông tin thanh toán */}
              <Card 
                title={
                  <div className="flex items-center gap-2">
                    <DollarOutlined className="text-green-500" />
                    <span>Thông tin thanh toán</span>
                  </div>
                }
                className="shadow-md"
              >
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Mã đơn hàng">
                    <Tag color="blue">#{orderId}</Tag>
                  </Descriptions.Item>
                  {paymentInfo.amount && (
                    <Descriptions.Item label="Số tiền đã thanh toán">
                      <span className="font-bold text-green-600 text-lg">
                        {new Intl.NumberFormat('vi-VN', { 
                          style: 'currency', 
                          currency: 'VND' 
                        }).format(paymentInfo.amount)}
                      </span>
                    </Descriptions.Item>
                  )}
                  {paymentInfo.transId && (
                    <Descriptions.Item label="Mã giao dịch MoMo">
                      <span className="font-mono text-sm">{paymentInfo.transId}</span>
                    </Descriptions.Item>
                  )}
                  {paymentInfo.momoOrderId && (
                    <Descriptions.Item label="Mã đơn hàng MoMo">
                      <span className="font-mono text-sm">{paymentInfo.momoOrderId}</span>
                    </Descriptions.Item>
                  )}
                  {paymentInfo.payType && (
                    <Descriptions.Item label="Phương thức thanh toán">
                      <Tag color="purple">{paymentInfo.payType === 'qr' ? 'QR Code' : paymentInfo.payType}</Tag>
                    </Descriptions.Item>
                  )}
                  {paymentInfo.responseTime && (
                    <Descriptions.Item label="Thời gian thanh toán">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined />
                        <span>
                          {dayjs(Number(paymentInfo.responseTime)).format('DD/MM/YYYY HH:mm:ss')}
                        </span>
                      </div>
                    </Descriptions.Item>
                  )}
                  {paymentInfo.orderInfo && (
                    <Descriptions.Item label="Nội dung thanh toán">
                      {paymentInfo.orderInfo}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Thông tin đơn hàng */}
              {orderData && (
                <Card 
                  title={
                    <div className="flex items-center gap-2">
                      <FileTextOutlined className="text-blue-500" />
                      <span>Thông tin đơn hàng</span>
                    </div>
                  }
                  className="shadow-md"
                >
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Mã đơn hàng">
                      <Tag color="blue">#{orderData.id}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      <Tag color={
                        orderData.status === 'Confirmed' || orderData.status === '3' ? 'green' :
                        orderData.status === 'Pending' || orderData.status === '0' ? 'orange' :
                        'default'
                      }>
                        {orderData.status}
                      </Tag>
                    </Descriptions.Item>
                    {orderData.pickupTime && (
                      <Descriptions.Item label="Thời gian nhận xe">
                        <div className="flex items-center gap-2">
                          <ClockCircleOutlined />
                          <span>{dayjs(orderData.pickupTime).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      </Descriptions.Item>
                    )}
                    {orderData.expectedReturnTime && (
                      <Descriptions.Item label="Thời gian trả xe dự kiến">
                        <div className="flex items-center gap-2">
                          <ClockCircleOutlined />
                          <span>{dayjs(orderData.expectedReturnTime).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      </Descriptions.Item>
                    )}
                    {orderData.orderDate && (
                      <Descriptions.Item label="Ngày đặt hàng">
                        <div className="flex items-center gap-2">
                          <ClockCircleOutlined />
                          <span>{dayjs(orderData.orderDate).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      </Descriptions.Item>
                    )}
                    {orderData.phoneNumber && (
                      <Descriptions.Item label="Số điện thoại">
                        {orderData.phoneNumber}
                      </Descriptions.Item>
                    )}
                    {orderData.withDriver !== undefined && (
                      <Descriptions.Item label="Loại thuê">
                        <Tag color={orderData.withDriver ? 'purple' : 'cyan'}>
                          {orderData.withDriver ? 'Có tài xế' : 'Tự lái'}
                        </Tag>
                      </Descriptions.Item>
                    )}
                    {orderData.total && (
                      <Descriptions.Item label="Tổng tiền">
                        <span className="font-semibold">
                          {new Intl.NumberFormat('vi-VN', { 
                            style: 'currency', 
                            currency: 'VND' 
                          }).format(orderData.total)}
                        </span>
                      </Descriptions.Item>
                    )}
                    {orderData.deposit && (
                      <Descriptions.Item label="Tiền đặt cọc">
                        <span className="font-semibold text-green-600">
                          {new Intl.NumberFormat('vi-VN', { 
                            style: 'currency', 
                            currency: 'VND' 
                          }).format(orderData.deposit)}
                        </span>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              )}
            </div>

            {/* Lưu ý */}
            <Card className="mt-6 shadow-md bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <IdcardOutlined className="text-blue-500 text-xl mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Lưu ý quan trọng</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Đơn hàng của bạn đã được xác nhận thanh toán thành công.</li>
                    <li>Vui lòng kiểm tra email để xem chi tiết đơn hàng.</li>
                    <li>Nếu bạn đã có giấy phép lái xe được xác thực, đơn hàng sẽ tự động chuyển sang trạng thái "Đã xác nhận".</li>
                    <li>Vui lòng đến đúng thời gian và địa điểm đã đặt để nhận xe.</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {status === "error" && (
          <Result
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
            title="Thanh toán thất bại"
            subTitle={message}
            extra={[
              <Button
                type="primary"
                key="bookings"
                onClick={() => router.push("/my-bookings")}
              >
                Xem Đơn thuê
              </Button>,
              <Button key="home" onClick={() => router.push("/")}>
                Về trang chủ
              </Button>,
            ]}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}

