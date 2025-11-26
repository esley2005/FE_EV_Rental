"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { rentalOrderApi, authApi, driverLicenseApi } from "@/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentCallbackMomoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // MoMo trả về các params sau khi thanh toán
        const partnerCode = searchParams?.get("partnerCode") || "";
        const momoOrderId = searchParams?.get("orderId") || ""; // MoMo orderId
        const requestId = searchParams?.get("requestId") || "";
        const amount = searchParams?.get("amount") || "";
        const orderInfo = searchParams?.get("orderInfo") || "";
        const orderType = searchParams?.get("orderType") || "";
        const transId = searchParams?.get("transId") || "";
        const resultCode = searchParams?.get("resultCode") || "";
        const momoMessage = searchParams?.get("message") || "";
        const payType = searchParams?.get("payType") || "";
        const responseTime = searchParams?.get("responseTime") || "";
        const extraData = searchParams?.get("extraData") || "";
        const signature = searchParams?.get("signature") || "";

        console.log("[Payment Callback MoMo] Received params:", {
          partnerCode,
          momoOrderId,
          requestId,
          amount,
          orderInfo,
          orderType,
          transId,
          resultCode,
          momoMessage,
          payType,
          responseTime,
          extraData,
          signature,
          allParams: Object.fromEntries(searchParams?.entries() || [])
        });

        // Kiểm tra nếu có đủ dữ liệu
        if (!momoOrderId || !resultCode) {
          setStatus("error");
          setMessage("Thiếu thông tin thanh toán. Vui lòng kiểm tra lại.");
          console.error("[Payment Callback MoMo] Missing required params:", { momoOrderId, resultCode });
          return;
        }

        // Kiểm tra resultCode == "0" (thành công trong MoMo)
        if (resultCode === "0") {
          // Extract rentalOrderId từ nhiều nguồn khác nhau
          let rentalOrderId: number | null = null;
          
          // 1. Thử extract từ orderInfo (format: "Thanh toan coc don thue xe #6" hoặc "Thanh+toan+coc+don+thue+xe+%236")
          try {
            // Decode URL encoded orderInfo
            const decodedOrderInfo = decodeURIComponent(orderInfo);
            const orderInfoMatch = decodedOrderInfo.match(/#(\d+)/) || orderInfo.match(/#(\d+)/);
            if (orderInfoMatch && orderInfoMatch[1]) {
              rentalOrderId = parseInt(orderInfoMatch[1], 10);
              console.log("[Payment Callback MoMo] Extracted rentalOrderId from orderInfo:", rentalOrderId);
            }
          } catch (e) {
            console.warn("[Payment Callback MoMo] Could not extract orderId from orderInfo:", e);
          }

          // 2. Thử extract từ extraData nếu có
          if (!rentalOrderId && extraData) {
            try {
              const decodedExtraData = decodeURIComponent(extraData);
              // Thử parse JSON nếu extraData là JSON
              try {
                const extraDataObj = JSON.parse(decodedExtraData);
                rentalOrderId = extraDataObj.orderId || extraDataObj.order_id || extraDataObj.rentalOrderId || null;
                if (rentalOrderId) {
                  console.log("[Payment Callback MoMo] Extracted rentalOrderId from extraData JSON:", rentalOrderId);
                }
              } catch {
                // Nếu không phải JSON, thử extract số từ string
                const extraDataMatch = decodedExtraData.match(/(\d+)/);
                if (extraDataMatch && extraDataMatch[1]) {
                  rentalOrderId = parseInt(extraDataMatch[1], 10);
                  console.log("[Payment Callback MoMo] Extracted rentalOrderId from extraData:", rentalOrderId);
                }
              }
            } catch (e) {
              console.warn("[Payment Callback MoMo] Could not extract orderId from extraData:", e);
            }
          }

          // 3. Thử extract từ requestId nếu có format orderId
          if (!rentalOrderId && requestId) {
            try {
              // requestId có thể chứa orderId ở cuối hoặc là UUID, thử extract số
              const requestIdMatch = requestId.match(/(\d+)$/);
              if (requestIdMatch && requestIdMatch[1]) {
                const possibleOrderId = parseInt(requestIdMatch[1], 10);
                // Kiểm tra xem có phải orderId hợp lệ không (thường > 0 và < 1000000)
                if (possibleOrderId > 0 && possibleOrderId < 1000000) {
                  rentalOrderId = possibleOrderId;
                  console.log("[Payment Callback MoMo] Extracted rentalOrderId from requestId:", rentalOrderId);
                }
              }
            } catch (e) {
              console.warn("[Payment Callback MoMo] Could not extract orderId from requestId:", e);
            }
          }

          // Nếu vẫn không tìm thấy, vẫn thử gọi API với momoOrderId
          // Backend có thể tự tìm được orderId từ momoOrderId
          if (!rentalOrderId) {
            console.warn("[Payment Callback MoMo] Could not determine rentalOrderId, will try API with momoOrderId");
          }

          // Gọi API để xác nhận thanh toán MoMo
          // Sử dụng API riêng cho MoMo với requestId và ResultCode
          console.log("[Payment Callback MoMo] Calling confirmOrderDepositMomoManual with:", { 
            requestId: requestId, 
            ResultCode: resultCode,
            rentalOrderId 
          });
          
          const response = await rentalOrderApi.confirmOrderDepositMomoManual(requestId, resultCode);
          
          console.log("[Payment Callback MoMo] API Response:", {
            success: response.success,
            data: response.data,
            error: response.error,
            fullResponse: response
          });
          
          // Kiểm tra nếu API trả về lỗi "không tìm thấy giao dịch"
          const errorMessage = response.error || "";
          const isNotFoundError = errorMessage.toLowerCase().includes("không tìm thấy") || 
                                 errorMessage.toLowerCase().includes("not found") ||
                                 errorMessage.toLowerCase().includes("không tìm thấy giao dịch");
          
          if (isNotFoundError && rentalOrderId) {
            // Nếu có rentalOrderId nhưng API không tìm thấy giao dịch, vẫn coi như thành công
            // vì MoMo đã xác nhận thanh toán (resultCode = "0")
            console.warn("[Payment Callback MoMo] ⚠️ Payment not found in backend but MoMo confirmed payment, using rentalOrderId:", rentalOrderId);
            setOrderId(rentalOrderId);
            setStatus("success");
            setMessage("Thanh toán đã được MoMo xác nhận thành công. Đơn hàng đang được xử lý.");
            return;
          }
          
          if (response.success) {
            const responseData = response.data as any;
            
            console.log("[Payment Callback MoMo] Response data:", responseData);
            
            // Kiểm tra responseData.success (từ backend)
            const backendSuccess = responseData?.success === true || responseData?.Success === true;
            const hasErrorMessage = responseData?.message && 
                                   (responseData.message.toLowerCase().includes("thất bại") || 
                                    responseData.message.toLowerCase().includes("lỗi") ||
                                    responseData.message.toLowerCase().includes("error") ||
                                    responseData.message.toLowerCase().includes("không tìm thấy"));
            
            // Nếu resultCode == "0" và API call thành công, coi như thanh toán thành công
            if (backendSuccess || (!responseData?.success && !hasErrorMessage)) {
              const confirmedOrderId = responseData?.orderId || responseData?.OrderId || rentalOrderId;
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
                      console.log("[Payment Callback MoMo] No GPLX found or error:", licenseError);
                    }
                  }
                  
                  // Nếu GPLX đã xác thực, tự động chuyển sang CheckedIn (status = 2)
                  if (isLicenseVerified) {
                    console.log("[Payment Callback MoMo] GPLX verified, updating order status to CheckedIn (2)");
                    const updateStatusResponse = await rentalOrderApi.updateStatus(confirmedOrderId, 2);
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
              }
              
              setStatus("success");
              setMessage(
                responseData?.message || 
                responseData?.Message || 
                momoMessage ||
                "Thanh toán thành công! Đơn hàng đã được cập nhật."
              );
              console.log("[Payment Callback MoMo] ✅ Payment confirmed successfully, orderId:", confirmedOrderId);
            } else {
              // Backend rõ ràng trả về success = false hoặc có message lỗi
              setStatus("error");
              const errorMsg = responseData?.message || 
                              responseData?.Message || 
                              "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ để được xử lý.";
              setMessage(errorMsg);
              console.error("[Payment Callback MoMo] ❌ Backend returned success = false:", responseData);
            }
          } else {
            // API call failed - nhưng vì resultCode == "0", vẫn hiển thị thành công với cảnh báo
            if (isNotFoundError) {
              // Nếu không tìm thấy giao dịch nhưng MoMo đã xác nhận, vẫn hiển thị thành công
              console.warn("[Payment Callback MoMo] ⚠️ Payment not found but MoMo confirmed (resultCode=0)");
              if (rentalOrderId) {
                setOrderId(rentalOrderId);
              }
              setStatus("success");
              setMessage(momoMessage || "Thanh toán đã được MoMo xác nhận thành công. Đơn hàng đang được xử lý.");
            } else {
              // Lỗi khác
              console.warn("[Payment Callback MoMo] ⚠️ API call failed but resultCode is 0, showing success with warning");
              setStatus("success");
              setMessage(momoMessage || "Thanh toán đã được MoMo xác nhận thành công. Đơn hàng đang được xử lý.");
            }
          }
        } else {
          // resultCode khác "0" - thanh toán thất bại
          setStatus("error");
          setMessage(`Thanh toán thất bại. ${momoMessage || `Mã lỗi: ${resultCode}`}`);
          console.warn("[Payment Callback MoMo] ⚠️ resultCode != 0:", resultCode, "Message:", momoMessage);
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
                Xem Đơn thuê
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

