"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { Input, Button, Checkbox, message } from "antd";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      message.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (!formData.agreeToTerms) {
      message.error("Vui lòng đồng ý với điều khoản sử dụng!");
      return;
    }

    setLoading(true);
    // Demo delay to mimic API
    setTimeout(() => {
      setLoading(false);
      message.success("Đăng ký thành công! Vui lòng đăng nhập.");
      router.push("/login");
    }, 900);
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
        <div className="bg-white rounded-2xl shadow-2xl p-6" style={{ borderRadius: 12 }}>
          <h2 className="text-center text-xl font-semibold mb-3 text-gray-800">Đăng ký</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="h-10 flex items-center">
              <Input
                name="fullName"
                size="large"
                placeholder="Họ và tên"
                value={formData.fullName}
                onChange={handleChange}
                required
                style={{ height: 40 }}
                className="rounded-md"
              />
            </div>

            <div className="h-10 flex items-center">
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
                className="rounded-md"
              />
            </div>

            <div className="h-10 flex items-center">
              <Input
                name="phone"
                size="large"
                placeholder="Số điện thoại"
                value={formData.phone}
                onChange={handleChange}
                style={{ height: 40 }}
                className="rounded-md"
              />
            </div>

            <div className="h-10 flex items-center">
              <Input.Password
                name="password"
                size="large"
                prefix={<LockOutlined />}
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
                style={{ height: 40 }}
                className="rounded-md"
              />
            </div>

            <div className="h-10 flex items-center">
              <Input.Password
                name="confirmPassword"
                size="large"
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ height: 40 }}
                className="rounded-md"
              />
            </div>

            <div className="h-10 flex items-center">
              <Checkbox
                checked={formData.agreeToTerms}
                onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              >
                Tôi đồng ý với các điều khoản
              </Checkbox>
            </div>

            <div className="h-10 flex items-center">
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
            </div>
          </form>

          <div className="text-center mt-6 text-gray-600 text-sm">
            Đã có tài khoản?{' '}
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
  );
}
