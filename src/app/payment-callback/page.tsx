"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { rentalOrderApi, authApi, driverLicenseApi } from "@/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try { 
        // Lấy TxnRef và ResponseCode từ query params
        // VNPay có thể trả về vnp_TxnRef hoặc TxnRef
        const txnRef = searchParams?.get("vnp_TxnRef") || 
                      searchParams?.get("TxnRef") || 
                      searchParams?.get("txnRef") ||
                      "";
        
        // VNPay có thể trả về vnp_ResponseCode hoặc ResponseCode
        const responseCode = searchParams?.get("vnp_ResponseCode") || 
                            searchParams?.get("ResponseCode") || 
                            searchParams?.get("responseCode") ||
                            "";

        console.log("[Payment Callback] Received params:", {
          txnRef,
          responseCode,
          allParams: Object.fromEntries(searchParams?.entries() || [])
        });

        // Kiểm tra nếu có đủ dữ liệu
        if (!txnRef || !responseCode) {
          setStatus("error");
          setMessage("Thiếu thông tin thanh toán. Vui lòng kiểm tra lại.");
          return;
        }

        // Kiểm tra ResponseCode == "00" (thành công)
        if (responseCode === "00") {
          // Gọi API để xác nhận thanh toán
          console.log("[Payment Callback] Calling confirmOrderDepositManual with:", { txnRef, responseCode });
          const response = await rentalOrderApi.confirmOrderDepositManual(txnRef, responseCode);
          
          console.log("[Payment Callback] API Response:", {
            success: response.success,
            data: response.data,
            error: response.error,
            fullResponse: response
          });
          
          if (response.success) {
            // Backend trả về Ok(new { success = true, message = "...", orderId = ... })
            // apiCall sẽ parse và trả về { success: true, data: { success: true, message: "...", orderId: ... } }
            const responseData = response.data as any;
            
            console.log("[Payment Callback] Response data:", responseData);
            console.log("[Payment Callback] Response data type:", typeof responseData);
            console.log("[Payment Callback] Response data keys:", responseData ? Object.keys(responseData) : "null");
            
            // Kiểm tra responseData.success (từ backend)
            // Có thể responseData là object trực tiếp hoặc nested
            const backendSuccess = responseData?.success === true || responseData?.Success === true;
            const hasErrorMessage = responseData?.message && 
                                   (responseData.message.toLowerCase().includes("thất bại") || 
                                    responseData.message.toLowerCase().includes("lỗi") ||
                                    responseData.message.toLowerCase().includes("error"));
            
            // Nếu ResponseCode == "00" và API call thành công, coi như thanh toán thành công
            // Trừ khi backend rõ ràng trả về success = false hoặc có message lỗi
            if (backendSuccess || (!responseData?.success && !hasErrorMessage)) {
              const confirmedOrderId = responseData?.orderId || responseData?.OrderId;
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
                      console.log("[Payment Callback] No GPLX found or error:", licenseError);
                    }
                  }
                  
                  // Nếu GPLX đã xác thực, tự động chuyển sang CheckedIn (status = 2)
                  if (isLicenseVerified) {
                    console.log("[Payment Callback] GPLX verified, updating order status to CheckedIn (2)");
                    const updateStatusResponse = await rentalOrderApi.updateStatus(confirmedOrderId, 2);
                    if (updateStatusResponse.success) {
                      console.log("[Payment Callback] ✅ Order status updated to CheckedIn successfully");
                    } else {
                      console.warn("[Payment Callback] ⚠️ Failed to update order status to CheckedIn:", updateStatusResponse.error);
                    }
                  } else {
                    console.log("[Payment Callback] GPLX not verified yet, order remains in current status");
                  }
                } catch (autoUpdateError) {
                  console.error("[Payment Callback] Error checking/updating GPLX status:", autoUpdateError);
                  // Không block flow, chỉ log error
                }
              }
              
              setStatus("success");
              setMessage(
                responseData?.message || 
                responseData?.Message || 
                "Thanh toán thành công! Đơn hàng đã được cập nhật."
              );
              console.log("[Payment Callback] ✅ Payment confirmed successfully, orderId:", confirmedOrderId);
            } else {
              // Backend rõ ràng trả về success = false hoặc có message lỗi
              setStatus("error");
              const errorMsg = responseData?.message || 
                              responseData?.Message || 
                              "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ để được xử lý.";
              setMessage(errorMsg);
              console.error("[Payment Callback] ❌ Backend returned success = false:", responseData);
            }
          } else {
            // API call failed - nhưng vì ResponseCode == "00", vẫn hiển thị thành công với cảnh báo
            console.warn("[Payment Callback] ⚠️ API call failed but ResponseCode is 00, showing success with warning");
            setStatus("success");
            setMessage("Thanh toán đã được VNPay xác nhận thành công. Đơn hàng đang được xử lý.");
          }
        } else {
          // ResponseCode khác "00" - thanh toán thất bại
          setStatus("error");
          setMessage(`Thanh toán thất bại. Mã lỗi: ${responseCode}`);
          console.warn("[Payment Callback] ⚠️ ResponseCode != 00:", responseCode);
        }
      } catch (error: any) {
        console.error("[Payment Callback] Error:", error);
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

