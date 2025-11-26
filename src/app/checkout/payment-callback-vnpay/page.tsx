"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, CheckCircleTwoTone } from "@ant-design/icons";
import { rentalOrderApi, authApi, driverLicenseApi, rentalLocationApi } from "@/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dayjs from "dayjs";

export default function PaymentCallbackVnpayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [pickupDate, setPickupDate] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [locationAddress, setLocationAddress] = useState<string>("");

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
            console.log("[Payment Callback VNPay] Response data type:", typeof responseData);
            console.log("[Payment Callback VNPay] Response data keys:", responseData ? Object.keys(responseData) : "null");
            
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
              console.log("[Payment Callback VNPay] Confirmed orderId:", confirmedOrderId);
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
              
              // Luôn set status thành success khi ResponseCode == "00" và không có lỗi
              setStatus("success");
              setMessage(
                responseData?.message || 
                responseData?.Message || 
                "Thanh toán thành công! Đơn hàng đã được cập nhật."
              );
              console.log("[Payment Callback VNPay] ✅ Payment confirmed successfully, orderId:", confirmedOrderId);
              console.log("[Payment Callback VNPay] Status set to SUCCESS");
            } else {
              // Backend rõ ràng trả về success = false hoặc có message lỗi
              setStatus("error");
              const errorMsg = responseData?.message || 
                              responseData?.Message || 
                              "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ để được xử lý.";
              setMessage(errorMsg);
              console.error("[Payment Callback VNPay] ❌ Backend returned error:", responseData);
            }
          } else {
            // API call failed - nhưng vì ResponseCode == "00", vẫn hiển thị thành công với cảnh báo
            console.warn("[Payment Callback VNPay] ⚠️ API call failed but ResponseCode is 00, showing success with warning");
            setStatus("success");
            setMessage("Thanh toán đã được VNPay xác nhận thành công. Đơn hàng đang được xử lý.");
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

  // Debug: Log status changes
  useEffect(() => {
    console.log("[Payment Callback VNPay] Status changed to:", status);
    console.log("[Payment Callback VNPay] OrderId:", orderId);
  }, [status, orderId]);

  // Load order details when orderId is available and status is success
  useEffect(() => {
    const loadOrderDetails = async () => {
      if (status !== "success" || !orderId || loadingOrderDetails) {
        return;
      }

      setLoadingOrderDetails(true);
      try {
        // Fetch order details
        const orderResponse = await rentalOrderApi.getById(orderId);
        
        if (orderResponse.success && orderResponse.data) {
          const order = orderResponse.data;
          
          // Format pickup time
          if (order.pickupTime) {
            const pickupDateTime = dayjs(order.pickupTime);
            setPickupDate(pickupDateTime.format("DD/MM/YYYY"));
            setPickupTime(pickupDateTime.format("HH:mm"));
          }

          // Fetch location details
          if (order.rentalLocationId) {
            try {
              const locationResponse = await rentalLocationApi.getById(order.rentalLocationId);
              if (locationResponse.success && locationResponse.data) {
                const location = locationResponse.data;
                setLocationName(location.name || "");
                setLocationAddress(location.address || "");
              }
            } catch (error) {
              console.error("Error loading location:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading order details:", error);
      } finally {
        setLoadingOrderDetails(false);
      }
    };

    loadOrderDetails();
  }, [orderId, status]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div
        className="flex-1 w-full min-h-[calc(100vh-200px)] bg-cover bg-center flex items-center justify-center px-4 py-12 pt-100"
        style={{ backgroundImage: "url('/driving.jpg')" }}
      >
        {status === "loading" && (
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-white text-lg font-semibold drop-shadow-lg">Đang xử lý thanh toán...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center max-w-2xl mx-auto pt-10">
            {loadingOrderDetails ? (
              <div className="py-8 pt-10">
                <Spin size="large" />
                <p className="mt-4 text-white text-lg font-semibold drop-shadow-lg">Đang tải thông tin...</p>
              </div>
            ) : (
              <>
                <div className="transform -translate-y-[140px]">
                  <CheckCircleTwoTone twoToneColor="#22c55e" className="text-6xl mx-auto mb-4 drop-shadow-lg" />

                  <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                    Thanh toán thành công!
                  </h1>

                  <p className="text-white text-lg mb-2 drop-shadow-lg">
                    Cảm ơn bạn đã tin tưởng và đồng hành cùng <span className="font-semibold">EV Rental</span>.
                  </p>
                </div>

                <div className="mt-8 flex gap-3 justify-center transform -translate-y-[140px]">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transition font-medium"
                    onClick={() => router.push("/my-bookings")}
                  >
                    Xem Đơn thuê
                  </button>
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg transition font-medium"
                    onClick={() => router.push("/")}
                  >
                    Về trang chủ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="text-center max-w-lg mx-auto">
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
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

