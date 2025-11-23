"use client";

import { useState } from "react";
import { Button, message } from "antd";
import { WalletOutlined, LoadingOutlined } from "@ant-design/icons";
import { paymentApi } from "@/services/api";
import { authUtils } from "@/utils/auth";

interface MomoPaymentButtonProps {
  rentalOrderId: number;
  userId: number;
  amount: number;
  onSuccess?: (momoOrderId: string) => void;
  onError?: (error: string) => void;
  redirectUrl?: string; // Optional custom redirect URL
}

export default function MomoPaymentButton({
  rentalOrderId,
  userId,
  amount,
  onSuccess,
  onError,
  redirectUrl,
}: MomoPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // Check authentication
    if (!authUtils.isAuthenticated()) {
      message.error("Vui lòng đăng nhập để thanh toán");
      return;
    }

    // Validate amount
    if (!amount || amount <= 0) {
      message.error("Số tiền thanh toán không hợp lệ");
      return;
    }

    try {
      setLoading(true);

      // Tạo payment request với MoMo
      const response = await paymentApi.createMomoPayment(
        rentalOrderId,
        userId,
        amount
      );

      if (response.success && response.data) {
        // Backend có thể trả về momoPayUrl hoặc payUrl
        const paymentUrl = response.data.momoPayUrl || response.data.payUrl;
        const orderId = response.data.momoOrderId || response.data.requestId;

        if (paymentUrl) {
          // Call success callback if provided
          if (onSuccess && orderId) {
            onSuccess(orderId);
          }

          // Redirect user đến MoMo payment page
          // URL sẽ có format: https://payment.momo.vn/v2/gateway/pay?t=...&s=...
          window.location.href = paymentUrl;
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
      
      if (onError) {
        onError(errorMessage);
      }
      
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      size="large"
      icon={loading ? <LoadingOutlined /> : <WalletOutlined />}
      onClick={handlePayment}
      loading={loading}
      disabled={loading || !rentalOrderId || !userId || !amount}
      className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 border-0 text-white font-semibold h-12"
      block
    >
      {loading ? "Đang xử lý..." : "Thanh toán bằng MoMo"}
    </Button>
  );
}

