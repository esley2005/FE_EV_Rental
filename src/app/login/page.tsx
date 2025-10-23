"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Card, Input, Button, Checkbox, message } from "antd";
import { authApi } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
        message.error(response.error);
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
        
        message.success(`Đăng nhập thành công! Xin chào ${fullName}`);
        
        // Redirect dựa trên role
        const roleLC = role?.toLowerCase();
        if (roleLC === "admin") {
          router.push("/");
        } else if (roleLC === "staff") {
          router.push("/staff");
        } else {
          router.push("/");
        }
      } else {
        message.error("Đăng nhập thất bại!");
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error("Có lỗi xảy ra khi đăng nhập!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center text-white">
        <h1 className="text-4xl font-bold tracking-wide">EV RENTAL</h1>
        <p className="text-gray-200 mt-2 text-sm">Hệ thống quản trị thuê xe thông minh</p>
      </div>

      {/* Form Card */}
      <div>
        <Card
          className="w-full max-w-md shadow-2xl rounded-2xl"
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
      </div>

      {/* Footer */}
      <footer className="mt-10 text-gray-300 text-sm">
        EV Rent (GROUP 5 SWP391)
      </footer>
    </div>
  );
}
