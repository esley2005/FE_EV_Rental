"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { demoAccounts } from "@/data/demoAccounts";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const user = demoAccounts[formData.email as keyof typeof demoAccounts];

  if (user && user.password === formData.password) {
    alert(`Đăng nhập thành công với vai trò: ${user.role}`);

    // Chuyển hướng theo role
    if (user.role === "admin") {
      router.push("/admin");
    } else if (user.role === "staff") {
      router.push("/staff");
    } else {
      router.push("/");
    }
  } else {
    alert("Sai email hoặc mật khẩu!");
  }
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
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🔐</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập</h1>
              <p className="text-gray-600">Chào mừng bạn quay trở lại!</p>
            </div>


            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập email của bạn"
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
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Đăng nhập
              </button>
            </form>

            {/* Divider */}
            {/* <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Hoặc đăng nhập với</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="mr-2"></span>
                    <span className="text-black text-sm">Google</span>
                  </button>
                  <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="mr-2">📘</span>
                    <span className="text-black text-sm">Facebook</span>
                  </button>
                </div>
              </div>
            </div> */}

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>

          {/* Demo Accounts */}
          {/* <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🧪 Tài khoản demo:</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Admin:</strong> admin@ecoride.vn / admin123</p>
              <p><strong>User:</strong> user@ecoride.vn / user123</p>
            </div>
          </div> */}
        </div>
      </main>

      <Footer />
    </div>
  );
}
