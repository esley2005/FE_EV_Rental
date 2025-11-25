"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { rentalOrderApi, authApi, driverLicenseApi } from "@/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentCallbackVnpayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Lấy TxnRef và ResponseCode từ query params
        // VNPay trả về vnp_TxnRef và vnp_ResponseCode
        const txnRef = searchParams?.get("vnp_TxnRef") || 
                      searchParams?.get("TxnRef") || 
                      searchParams?.get("txnRef") ||
                      "";
        
        const responseCode = searchParams?.get("vnp_ResponseCode") || 
                            searchParams?.get("ResponseCode") || 
                            searchParams?.get("responseCode") ||
                            "";

        console.log("[Payment Callback VNPay] Received params:", {
          txnRef,
          responseCode,
          allParams: Object.fromEntries(searchParams?.entries() || [])
        });

        // Kiểm tra nếu có đủ dữ liệu
        if (!txnRef || !responseCode) {
          setStatus("error");
          setMessage("Thiếu thông tin thanh toán. Vui lòng kiểm tra lại.");
          console.error("[Payment Callback VNPay] Missing required params:", { txnRef, responseCode });
          return;
        }

        // Kiểm tra ResponseCode == "00" (thành công)
        if (responseCode === "00") {
          // Gọi API để xác nhận thanh toán
          console.log("[Payment Callback VNPay] Calling confirmOrderDepositManual with:", { txnRef, responseCode });
          const response = await rentalOrderApi.confirmOrderDepositManual(txnRef, responseCode);
          
          console.log("[Payment Callback VNPay] API Response:", {
            success: response.success,
            data: response.data,
            error: response.error,
            fullResponse: response
          });
          
          if (response.success) {
            // Backend trả về Ok(new { success = true, message = "...", orderId = ... })
            // apiCall sẽ parse và trả về { success: true, data: { success: true, message: "...", orderId: ... } }
            const responseData = response.data as any;
            
            console.log("[Payment Callback VNPay] Response data:", responseData);
            
            // Kiểm tra responseData.success (từ backend)
            if (responseData && responseData.success === true) {
              const confirmedOrderId = responseData.orderId || responseData.OrderId;
              if (confirmedOrderId) {
                setOrderId(confirmedOrderId);
                
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
                        const status = licenseData.status;
                        // Status = 1 hoặc "Approved" nghĩa là đã xác thực
                        if (status === 1 || status === "Approved" || status === "1") {
                          isLicenseVerified = true;
                        }
                      }
                    } catch (licenseError) {
                      console.log("[Payment Callback VNPay] No GPLX found or error:", licenseError);
                    }
                  }
                  
                  // Nếu GPLX đã xác thực, tự động chuyển sang CheckedIn (status = 2)
                  if (isLicenseVerified) {
                    console.log("[Payment Callback VNPay] GPLX verified, updating order status to CheckedIn (2)");
                    const updateStatusResponse = await rentalOrderApi.updateStatus(confirmedOrderId, 2);
                    if (updateStatusResponse.success) {
                      console.log("[Payment Callback VNPay] ✅ Order status updated to CheckedIn successfully");
                    } else {
                      console.warn("[Payment Callback VNPay] ⚠️ Failed to update order status to CheckedIn:", updateStatusResponse.error);
                    }
                  } else {
                    console.log("[Payment Callback VNPay] GPLX not verified yet, order remains in current status");
                  }
                } catch (autoUpdateError) {
                  console.error("[Payment Callback VNPay] Error checking/updating GPLX status:", autoUpdateError);
                  // Không block flow, chỉ log error
                }
              }
              
              setStatus("success");
              setMessage(responseData.message || "Thanh toán thành công! Đơn hàng đã được cập nhật.");
              console.log("[Payment Callback VNPay] ✅ Payment confirmed successfully, orderId:", confirmedOrderId);
            } else {
              // Backend trả về success = false
              setStatus("error");
              const errorMsg = responseData?.message || "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ để được xử lý.";
              setMessage(errorMsg);
              console.error("[Payment Callback VNPay] ❌ Backend returned success = false:", responseData);
            }
          } else {
            // API call failed
            setStatus("error");
            setMessage(response.error || "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ.");
            console.error("[Payment Callback VNPay] ❌ API call failed:", response.error);
          }
        } else {
          // ResponseCode khác "00" - thanh toán thất bại
          setStatus("error");
          setMessage(`Thanh toán thất bại. Mã lỗi: ${responseCode}`);
          console.warn("[Payment Callback VNPay] ⚠️ ResponseCode != 00:", responseCode);
        }
      } catch (error: any) {
        console.error("[Payment Callback VNPay] Error:", error);
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
          <Result
            icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            title="Thanh toán thành công!"
            subTitle={message}
            extra={[
              <Button
                type="primary"
                key="bookings"
                onClick={() => router.push("/my-bookings")}
              >
                Xem đơn hàng của tôi
              </Button>,
              <Button key="home" onClick={() => router.push("/")}>
                Về trang chủ
              </Button>,
            ]}
          />
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
                Xem đơn hàng của tôi
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

