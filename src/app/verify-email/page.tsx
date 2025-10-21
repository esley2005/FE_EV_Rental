"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { Input, Button, message } from "antd";
import { authApi } from "@/services/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Lấy email từ URL params
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.trim().length === 0) {
      message.error("Vui lòng nhập mã OTP!");
      return;
    }

    if (otp.length !== 6) {
      message.error("Mã OTP phải có đúng 6 chữ số!");
      return;
    }

    setLoading(true);
    try {
      console.log("Verifying OTP:", otp);

      const response = await authApi.confirmEmail(otp.trim());

      console.log("Verification response:", response);

      if (response.error) {
        message.error(response.error);
        return;
      }

      if (response.success || response.data) {
        message.success("Xác nhận email thành công! Vui lòng đăng nhập.");
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      } else {
        message.error("Xác nhận thất bại!");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi xác nhận email!");
      console.error("Verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 flex flex-col items-center justify-center px-2">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-4 text-center text-white"
      >
        <Link href="/" aria-label="Về trang chủ" className="inline-block">
          <div className="mx-auto w-16 h-16 relative cursor-pointer">
            <Image src="/logo_ev.png" alt="EV RENTAL" fill sizes="64px" style={{ objectFit: 'contain' }} />
          </div>
          <p className="text-gray-200 mt-1 text-sm">Hệ thống quản trị thuê xe thông minh</p>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8" style={{ borderRadius: 12 }}>
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MailOutlined className="text-3xl text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Xác nhận Email</h2>
            <p className="text-gray-600 mt-2 text-sm">
              {email ? (
                <>
                  Chúng tôi đã gửi mã OTP đến email <br />
                  <span className="font-semibold text-blue-600">{email}</span>
                </>
              ) : (
                "Vui lòng nhập mã OTP đã được gửi đến email của bạn"
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Nhập mã OTP (6 chữ số)
              </label>
              <Input
                name="otp"
                size="large"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 6) {
                    setOtp(value);
                  }
                }}
                required
                style={{ 
                  height: 56, 
                  fontSize: '24px', 
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: '600'
                }}
                className="rounded-md"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Kiểm tra hộp thư hoặc thư mục spam của bạn
              </p>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ height: 48 }}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Xác nhận
            </Button>
          </form>

          <div className="text-center mt-6 space-y-2">
            <div className="text-gray-600 text-sm">
              Không nhận được mã?{' '}
              <button 
                type="button"
                className="text-blue-600 hover:text-blue-700 font-semibold"
                onClick={() => message.info("Chức năng gửi lại đang được phát triển")}
              >
                Gửi lại
              </button>
            </div>
            <div className="text-gray-600 text-sm">
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-gray-300 text-sm"
      >
        EV Rent (GROUP 5 SWP391)
      </motion.footer>
    </div>
  );
}

