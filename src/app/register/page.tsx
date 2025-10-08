"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra đơn giản
    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (!formData.agreeToTerms) {
      alert("Vui lòng đồng ý với điều khoản sử dụng!");
      return;
    }
    
    // Đơn giản - chỉ thông báo và chuyển về trang đăng nhập
    alert("Đăng ký thành công! (Demo)");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-blue-600">Trang chủ</Link></li>
    
      
          
          </ol>
        </nav>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">👤</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký</h1>
              <p className="text-gray-600">Tạo tài khoản để thuê xe điện</p>
            </div>


            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập email của bạn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label className="ml-2 text-sm text-gray-600">
                  Tôi đồng ý với{" "}
                  <Link href="/terms" className="text-green-600 hover:text-green-700">
                    Điều khoản sử dụng
                  </Link>{" "}
                  và{" "}
                  <Link href="/privacy" className="text-green-600 hover:text-green-700">
                    Chính sách bảo mật
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Đăng ký
              </button>
            </form>

            {/* Divider */}
            {/* <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Hoặc đăng ký với</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="mr-2">📱</span>
                    <span className="text-sm">Google</span>
                  </button>
                  <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="mr-2">📘</span>
                    <span className="text-sm">Facebook</span>
                  </button>
                </div>
              </div>
            </div> */}

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits */}
          {/* <div className="mt-6 bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">🎉 Lợi ích khi đăng ký:</h3>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Thuê xe nhanh chóng, tiện lợi</li>
              <li>• Theo dõi lịch sử thuê xe</li>
              <li>• Nhận ưu đãi và khuyến mãi đặc biệt</li>
              <li>• Hỗ trợ khách hàng 24/7</li>
            </ul>
          </div> */}
        </div>
      </main>

      <Footer />
    </div>
  );
}
