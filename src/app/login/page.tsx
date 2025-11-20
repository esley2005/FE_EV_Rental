"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Lock, Mail, CheckCircle, XCircle } from "lucide-react";
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
      // Đảm bảo email và password được trim để nhất quán với change password
      const loginData = {
        email: formData.email.trim(),
        password: formData.password // Không trim password vì có thể có khoảng trắng hợp lệ
      };
      
      console.log('[Login] Sending login data:', { email: loginData.email, passwordLength: loginData.password.length });
      
      const response = await authApi.login(loginData);
      
      console.log("Login response:", response);

      if (response.error) {
        api.error({
          message: 'Đăng nhập thất bại',
          description: response.error,
          placement: 'topRight',
          icon: <XCircle color="#ff4d4f" />,
        });
        return;
      }
      
      if (response.success && response.data) {
        // Backend có thể trả về PascalCase hoặc camelCase
        const data = response.data as any;
        const token = data.Token || data.token;
        const user = data.user || data.User || data;
        const userId = user?.userId || user?.UserId || user?.id || user?.Id || data.UserId || data.userId;
        const role = user?.role || user?.Role || data.Role || data.role;
        const fullName = user?.fullName || user?.FullName || data.FullName || data.fullName;
        
        // Lưu token trước để có thể gọi API getProfile
        localStorage.setItem('token', token);
        
        // Gọi API getProfile để lấy thông tin isActive mới nhất từ backend
        try {
          const profileResponse = await authApi.getProfile();
          if (profileResponse.success && profileResponse.data) {
            const profileData = profileResponse.data as any;
            const isActive = profileData.isActive ?? profileData.IsActive;
            
            console.log('[Login] Profile data:', { isActive, profileData });
            
            // Kiểm tra isActive: nếu false thì không cho đăng nhập
            if (isActive === false || isActive === "false" || isActive === 0) {
              // Xóa token vì không cho đăng nhập
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              
              api.error({
                message: 'Tài khoản bị khóa',
                description: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                placement: 'topRight',
                icon: <XCircle color="#ff4d4f" />,
                duration: 5,
              });
              return;
            }
            
            // Lưu user info với isActive từ profile
            localStorage.setItem('user', JSON.stringify({
              ...profileData,
              id: profileData.id || userId,
              role: profileData.role || role,
              fullName: profileData.fullName || fullName,
              email: profileData.email || formData.email,
              isActive: isActive !== false
            }));
          } else {
            // Nếu không lấy được profile, sử dụng data từ login response
            const isActive = user?.isActive ?? user?.IsActive ?? data.isActive ?? data.IsActive;
            
            // Kiểm tra isActive từ login response
            if (isActive === false || isActive === "false" || isActive === 0) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              
              api.error({
                message: 'Tài khoản bị khóa',
                description: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                placement: 'topRight',
                icon: <XCircle color="#ff4d4f" />,
                duration: 5,
              });
              return;
            }
            
            // Lưu user info từ login response
            localStorage.setItem('user', JSON.stringify({
              id: userId,
              role: role,
              fullName: fullName,
              email: formData.email,
              isActive: isActive !== false
            }));
          }
        } catch (profileError) {
          // Nếu getProfile thất bại, vẫn kiểm tra isActive từ login response
          console.warn('[Login] Failed to get profile, using login response data:', profileError);
          const isActive = user?.isActive ?? user?.IsActive ?? data.isActive ?? data.IsActive;
          
          if (isActive === false || isActive === "false" || isActive === 0) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            api.error({
              message: 'Tài khoản bị khóa',
              description: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
              placement: 'topRight',
              icon: <XCircle color="#ff4d4f" />,
              duration: 5,
            });
            return;
          }
          
          // Lưu user info từ login response
          localStorage.setItem('user', JSON.stringify({
            id: userId,
            role: role,
            fullName: fullName,
            email: formData.email,
            isActive: isActive !== false
          }));
        }
        
        // Lấy lại user từ localStorage để có thông tin đầy đủ
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const displayName = savedUser.fullName || fullName;
        
        api.success({
          message: 'Đăng nhập thành công!',
          description: `Xin chào ${displayName}. Chào mừng bạn quay trở lại!`,
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
          duration: 3,
        });
        
        // Redirect dựa trên role
        const roleLC = (savedUser.role || role)?.toLowerCase();
        setTimeout(() => {
          if (roleLC === "admin") {
            router.push("/admin");
          } else if (roleLC === "staff") {
            router.push("/staff");
          } else {
            router.push("/");
          }
        }, 1000);
      } else {
        api.error({
          message: 'Đăng nhập thất bại',
          description: 'Vui lòng kiểm tra lại email và mật khẩu!',
          placement: 'topRight',
          icon: <XCircle color="#ff4d4f" />,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể kết nối đến máy chủ. Vui lòng thử lại!',
        placement: 'topRight',
        icon: <XCircle color="#ff4d4f" />,
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
              prefix={<Mail />}
              placeholder="Nhập email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input.Password
              name="password"
              size="large"
              prefix={<Lock />}
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

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              href="/"
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Về trang chính
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
