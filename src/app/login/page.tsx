"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LockOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Card, Input, Button, Checkbox, notification as antdNotification } from "antd";
import { authApi } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [api, contextHolder] = antdNotification.useNotification();
  const [formData, setFormData] = useState({ email: "", password: "" });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      
      console.log("Login response:", response);

      if (response.error) {
        api.error({
          message: 'Đăng nhập thất bại',
          description: response.error,
          placement: 'topRight',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        });
        return;
      }
      
      if (response.success && response.data) {
        // Backend có thể trả về PascalCase hoặc camelCase
        const data = response.data as any;
        const token = data.Token || data.token;
        const userId = data.UserId || data.userId;
        const role = data.Role || data.role;
        const fullName = data.FullName || data.fullName;
        
        console.log('[Login] Parsed data:', { token, userId, role, fullName });
        
        // Lưu token và user info vào localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          id: userId,
          role: role,
          fullName: fullName,
          email: formData.email
        }));
        
        api.success({
          message: 'Đăng nhập thành công!',
          description: `Xin chào ${fullName}. Chào mừng bạn quay trở lại!`,
          placement: 'topRight',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 3,
        });
        
        // Redirect dựa trên role
        const roleLC = role?.toLowerCase();
        setTimeout(() => {
          if (roleLC === "admin") {
            router.push("/");
          } else if (roleLC === "staff") {
            router.push("/");
          } else {
            router.push("/");
          }
        }, 1000);
      } else {
        api.error({
          message: 'Đăng nhập thất bại',
          description: 'Vui lòng kiểm tra lại email và mật khẩu!',
          placement: 'topRight',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
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

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 flex flex-col items-center justify-center px-4">
        {/* Logo (animated like register) */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 text-center text-white"
        >
          <Link href="/" aria-label="Về trang chủ" className="inline-block">
            <Image
              src="/logo_ev.png"
              alt="EV Rental"
              width={70}
              height={70}
              priority
              className="mx-auto hover:opacity-90 transition-opacity"
            />
          </Link>
          <p className="text-gray-200 mt-2 text-sm">Hệ thống quản trị thuê xe thông minh</p>
        </motion.div>

        {/* Form Card (animated) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card
            className="w-full shadow-2xl rounded-2xl"
            styles={{ body: { padding: "2rem" } }}
          >
          <h2 className="text-center text-2xl font-semibold mb-6 text-gray-800">
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              name="email"
              type="email"
              size="large"
              prefix={<MailOutlined />}
              placeholder="Nhập email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input.Password
              name="password"
              size="large"
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <div className="flex items-center justify-between text-sm">
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              <Link href="/forgot-password" className="text-blue-600 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Đăng nhập
            </Button>
          </form>

          <div className="text-center mt-6 text-gray-600 text-sm">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Đăng ký ngay
            </Link>
          </div>
          </Card>
        </motion.div>

        {/* Footer (fade-in) */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-10 text-gray-300 text-sm"
        >
          EV Rent (GROUP 5 SWP391)
        </motion.footer>
      </div>
    </>
  );
}
