"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Card, Input, Button, notification as antdNotification, Steps } from "antd";
import { authApi } from "@/services/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bước 1: Gửi OTP qua email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      api.error({
        message: 'Lỗi',
        description: 'Vui lòng nhập email!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email });
      
      if (response.success) {
        api.success({
          message: 'Thành công!',
          description: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!',
          placement: 'topRight',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 5,
        });
        setCurrentStep(1);
      } else {
        api.error({
          message: 'Gửi OTP thất bại',
          description: response.error || 'Không thể gửi OTP. Vui lòng kiểm tra email!',
          placement: 'topRight',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể kết nối đến máy chủ. Vui lòng thử lại!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || !newPassword || !confirmPassword) {
      api.warning({
        message: 'Thông tin chưa đầy đủ',
        description: 'Vui lòng điền đầy đủ thông tin!',
        placement: 'topRight',
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      api.error({
        message: 'Mật khẩu không khớp',
        description: 'Mật khẩu xác nhận không khớp với mật khẩu mới!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
      return;
    }

    if (newPassword.length < 6) {
      api.warning({
        message: 'Mật khẩu yếu',
        description: 'Mật khẩu phải có ít nhất 6 ký tự!',
        placement: 'topRight',
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        email,
        otp,
        newPassword,
      });

      if (response.success) {
        api.success({
          message: 'Đặt lại mật khẩu thành công!',
          description: 'Mật khẩu của bạn đã được cập nhật. Đang chuyển đến trang đăng nhập...',
          placement: 'topRight',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 3,
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        api.error({
          message: 'Xác nhận thất bại',
          description: response.error || 'Mã OTP không đúng hoặc đã hết hạn!',
          placement: 'topRight',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể đặt lại mật khẩu. Vui lòng thử lại!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Nhập Email",
      icon: <MailOutlined />,
    },
    {
      title: "Xác Nhận OTP",
      icon: <SafetyOutlined />,
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8 text-center text-white">
        <h1 className="text-4xl font-bold tracking-wide">EV RENTAL</h1>
        <p className="text-gray-200 mt-2 text-sm">Đặt lại mật khẩu</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md">
        <Card
          className="shadow-2xl rounded-2xl"
          styles={{ body: { padding: "2rem" } }}
        >
          {/* Steps */}
          <div className="mb-6">
            <Steps current={currentStep} items={steps} />
          </div>

          {/* Bước 1: Nhập Email */}
          {currentStep === 0 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Quên mật khẩu?
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Nhập email của bạn để nhận mã OTP xác thực
                </p>
              </div>

              <Input
                type="email"
                size="large"
                prefix={<MailOutlined />}
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Gửi mã OTP
              </Button>

              <div className="text-center text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}

          {/* Bước 2: Nhập OTP và Mật khẩu mới */}
          {currentStep === 1 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Xác nhận OTP
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Mã OTP đã được gửi đến email: <strong>{email}</strong>
                </p>
              </div>

              <Input
                size="large"
                prefix={<SafetyOutlined />}
                placeholder="Nhập mã OTP (6 chữ số)"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />

              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="flex gap-3">
                <Button
                  size="large"
                  block
                  onClick={() => setCurrentStep(0)}
                  disabled={loading}
                >
                  Quay lại
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold"
                >
                  Đặt lại mật khẩu
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                Chưa nhận được mã?{" "}
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                  disabled={loading}
                >
                  Gửi lại OTP
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-gray-300 text-sm">
        EV Rent (GROUP 5 SWP391)
      </footer>
      </div>
    </>
  );
}

