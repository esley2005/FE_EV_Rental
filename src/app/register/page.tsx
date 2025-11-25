"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, CheckCircle, XCircle, AlertTriangle, User, Phone } from "lucide-react";
import { Input, Button, Checkbox, Modal, notification as antdNotification } from "antd";
import { authApi } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [api, contextHolder] = antdNotification.useNotification();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
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
    
    // Kiểm tra độ dài mật khẩu
    if (formData.password.length <= 6) {
      api.error({
        message: "Mật khẩu không hợp lệ",
        description: "Mật khẩu phải có trên 6 ký tự!",
        placement: "topRight",
        icon: <XCircle color="#ff4d4f" />,
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      api.error({
        message: "Mật khẩu không khớp",
        description: "Mật khẩu xác nhận không trùng khớp!",
        placement: "topRight",
        icon: <XCircle color="#ff4d4f" />,
      });
      return;
    }
    if (!formData.agreeToTerms) {
      api.warning({
        message: "Chưa đồng ý điều khoản",
        description: "Vui lòng đồng ý điều khoản để tiếp tục!",
        placement: "topRight",
        icon: <AlertTriangle color="#faad14" />,
      });
      return;
    }

    // Kiểm tra số điện thoại
    if (!formData.phoneNumber || formData.phoneNumber.trim() === "") {
      api.error({
        message: "Số điện thoại không hợp lệ",
        description: "Vui lòng nhập số điện thoại!",
        placement: "topRight",
        icon: <XCircle color="#ff4d4f" />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
      });

      if (response.error) {
        api.error({
          message: "Đăng ký thất bại",
          description: response.error,
          placement: "topRight",
          icon: <XCircle color="#ff4d4f" />,
        });
        return;
      }

      api.success({
        message: "Đăng ký thành công!",
        description: "Vui lòng kiểm tra email để nhận mã OTP xác thực.",
        placement: "topRight",
        icon: <CheckCircle color="#52c41a" />,
        duration: 4,
      });

      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, 1500);
    } catch (error) {
      api.error({
        message: "Lỗi kết nối",
        description: "Không thể kết nối đến máy chủ. Vui lòng thử lại!",
        placement: "topRight",
        icon: <XCircle color="#ff4d4f" />,
      });
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
          <Link href="/" aria-label="Về trang chủ">
            <div className="mx-auto relative cursor-pointer" style={{ width: 70, height: 70 }}>
              <Image src="/logo_ev.png" alt="EV RENTAL" fill sizes="70px" style={{ objectFit: "contain" }} />
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
                size="large"
                prefix={<User />}
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
                prefix={<Mail />}
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <Input
                name="phoneNumber"
                type="tel"
                size="large"
                prefix={<Phone />}
                placeholder="Số điện thoại"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <Input.Password
                name="password"
                size="large"
                prefix={<Lock />}
                placeholder="Mật khẩu (trên 6 ký tự)"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={7}
                style={{ height: 40 }}
              />

              <Input.Password
                name="confirmPassword"
                size="large"
                prefix={<Lock />}
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ height: 40 }}
              />

              <div className="flex items-center text-sm">
                <Checkbox
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                >
                  Tôi đồng ý với{" "}
                  <span
                    onClick={() => setIsModalVisible(true)}
                    className="text-blue-600 hover:text-blue-700 cursor-pointer font-semibold underline"
                  >
                    các điều khoản
                  </span>{" "}
                
                </Checkbox>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Đăng ký
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Về trang Login
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

      {/* Modal Ant Design hiển thị điều khoản */}
      <Modal
        title="Điều khoản sử dụng EV Rental"
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        okText="Đã hiểu"
        cancelText="Đóng"
      >
        <p>
          <strong>1. Giới thiệu:</strong> EV Rental cung cấp nền tảng thuê xe điện tiện lợi, an toàn và minh bạch.
        </p>
        <p>
          <strong>2. Nghĩa vụ người dùng:</strong> Người dùng cam kết sử dụng dịch vụ đúng mục đích, cung cấp thông tin
          chính xác và chịu trách nhiệm về hoạt động thuê xe của mình.
        </p>
        <p>
          <strong>3. Bảo mật dữ liệu:</strong> Thông tin cá nhân của bạn được EV Rental bảo mật tuyệt đối, không chia sẻ
          cho bên thứ ba nếu không có sự đồng ý.
        </p>
        <p>
          <strong>4. Thanh toán & Hoàn tiền:</strong> Các giao dịch được xử lý qua cổng thanh toán an toàn. Chính sách
          hoàn tiền áp dụng theo quy định của hệ thống.
        </p>
        <p>
          <strong>5. Cập nhật điều khoản:</strong> EV Rental có thể thay đổi điều khoản mà không cần báo trước. Người dùng
          cần kiểm tra thường xuyên để cập nhật.
        </p>
      </Modal>
    </>
  );
}
