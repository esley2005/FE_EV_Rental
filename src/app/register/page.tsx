"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MailOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Input, Button, Checkbox, Modal, notification as antdNotification } from "antd";
import { authApi } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [api, contextHolder] = antdNotification.useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      api.error({
        message: "Mật khẩu không khớp",
        description: "Mật khẩu xác nhận không khớp với mật khẩu đã nhập!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      return;
    }

    if (!formData.agreeToTerms) {
      api.warning({
        message: "Chưa đồng ý điều khoản",
        description: "Vui lòng đồng ý với điều khoản sử dụng để tiếp tục!",
        placement: "topRight",
        icon: <WarningOutlined style={{ color: "#faad14" }} />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      if (response.error) {
        api.error({
          message: "Đăng ký thất bại",
          description: response.error,
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        return;
      }

      if (response.success || response.data) {
        api.success({
          message: "Đăng ký thành công!",
          description: "Vui lòng kiểm tra email để nhận mã OTP xác thực tài khoản.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          duration: 4,
        });

        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
      } else {
        api.error({
          message: "Đăng ký thất bại",
          description: "Vui lòng kiểm tra lại thông tin và thử lại!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể kết nối đến máy chủ. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 flex flex-col items-center justify-center px-2">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 text-center text-white"
        >
          <Link href="/" aria-label="Về trang chủ" className="inline-block">
            <div className="mx-auto w-16 h-16 relative cursor-pointer">
              <Image
                src="/logo_ev.png"
                alt="EV RENTAL"
                fill
                sizes="64px"
                style={{ objectFit: "contain" }}
              />
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
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-center text-xl font-semibold mb-3 text-gray-800">Đăng ký</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                name="fullName"
                prefix={<UserOutlined />}
                placeholder="Họ và tên"
                value={formData.fullName}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <Input
                name="email"
                type="email"
                size="large"
                prefix={<MailOutlined />}
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <Input.Password
                name="password"
                size="large"
                prefix={<LockOutlined />}
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <Input.Password
                name="confirmPassword"
                size="large"
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              {/* Đồng ý điều khoản */}
              <div className="flex items-center">
                <Checkbox
                  checked={formData.agreeToTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeToTerms: e.target.checked })
                  }
                >
                  Tôi đồng ý với{" "}
                  <span
                    onClick={() => setIsModalOpen(true)}
                    style={{
                      color: "#1677ff",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Điều khoản sử dụng
                  </span>
                </Checkbox>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{ height: 40 }}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Đăng ký
              </Button>
            </form>

            <div className="text-center mt-6 text-gray-600 text-sm">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Đăng nhập
              </Link>
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

      {/* Modal Điều khoản */}
      <Modal
        title="ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ EV RENTAL"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={700}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 8 }}>
          <p>
            Khi đăng ký và sử dụng dịch vụ EV Rental, bạn đồng ý tuân thủ các điều khoản dưới đây.
            Vui lòng đọc kỹ trước khi tiếp tục.
          </p>  <br></br>
          <h3><i>1. Đăng ký tài khoản</i></h3>
          <p>
            Cung cấp thông tin chính xác, đầy đủ và hợp lệ. EV Rental có quyền tạm ngưng hoặc hủy
            tài khoản nếu phát hiện thông tin sai lệch.
          </p>  <br></br>
          <h3><i>2. Sử dụng dịch vụ</i></h3>
          <p>
            Người dùng phải tuân thủ quy định giao thông và không sử dụng xe vào mục đích trái
            pháp luật.
          </p>  <br></br>
          <h3><i>3. Bảo mật và quyền riêng tư</i></h3>
          <p>
            EV Rental cam kết bảo mật thông tin cá nhân theo chính sách bảo mật của chúng tôi.
          </p>  <br></br>
          <h3><i>4. Thanh toán & hoàn tiền</i></h3>
          <p>
            Các khoản thanh toán, đặt cọc và hoàn tiền được thực hiện theo chính sách của EV
            Rental.
          </p>
          <br></br>
          <h3><i>5. Trách nhiệm</i></h3>
          <p>
            EV Rental không chịu trách nhiệm cho các thiệt hại phát sinh do việc sử dụng sai mục
            đích hoặc vi phạm điều khoản.
          </p>
        </div>
      </Modal>
    </>
  );
}
