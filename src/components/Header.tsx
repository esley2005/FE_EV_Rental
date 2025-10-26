"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { authUtils } from "@/utils/auth";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Check login status khi component mount
    const currentUser = authUtils.getCurrentUser();
    setUser(currentUser);

    // Đóng dropdown khi click bên ngoài
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-menu-container')) {
          setUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* === Left: Logo + Menu Mobile === */}
        <div className="flex items-center gap-4">
          {/* Nút mở menu mobile */}
          <button
            aria-label="Mở menu"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90">
            <Image src="/logo_ev.png" alt="EV Rental" width={56} height={56} priority />
            <span className="hidden md:inline-block text-lg font-semibold text-gray-800">
              EV Rental
            </span>
          </Link>
        </div>

        {/* === Desktop Navigation === */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <Link href="/" className="hover:text-[#FF4D00] transition-colors">Trang chủ</Link>
          <Link href="/cars/all" className="hover:text-[#FF4D00] transition-colors">Danh sách xe</Link>
          <Link href="/about" className="hover:text-[#FF4D00] transition-colors">Giới thiệu</Link>
          <Link href="/contact" className="hover:text-[#FF4D00] transition-colors">Liên hệ</Link>
        </nav>

        {/* === Nút hành động bên phải === */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            // User đã đăng nhập
            <div className="relative user-menu-container">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {user.fullName?.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-700">{user.fullName}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-3 border border-gray-200">

                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {user.role && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        {user.role}
                      </p>
                    )}
                  </div>



                  {/* Nút Admin - */}
                  {(user.role === 'Admin') && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md mx-2 my-1 text-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Trang Admin
                    </Link>
                  )}



                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Tài khoản của tôi
                  </Link>
                  <Link
                    href="/my-bookings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Đơn hàng của tôi
                  </Link>
                  <button
                    onClick={() => {
                      authUtils.logout();
                      setUser(null);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            // User chưa đăng nhập
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50 transition"
              >
                Đăng nhập
              </Link>

              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      {/* === Mobile Navigation (Dropdown) === */}
      <div className={`md:hidden transition-max-height duration-200 overflow-hidden ${open ? "max-h-96" : "max-h-0"}`}>
        <div className="px-4 pb-4 space-y-2">
          <Link href="/" className="block px-3 py-2 rounded hover:bg-gray-100">Trang chủ</Link>
          <Link href="/cars/all" className="block px-3 py-2 rounded hover:bg-gray-100">Danh sách xe</Link>
          <Link href="/about" className="block px-3 py-2 rounded hover:bg-gray-100">Giới thiệu</Link>
          <Link href="/contact" className="block px-3 py-2 rounded hover:bg-gray-100">Liên hệ</Link>

          {user ? (
            // User đã đăng nhập (Mobile)
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
              <Link href="/profile" className="block px-3 py-2 rounded hover:bg-gray-100">Tài khoản của tôi</Link>
              <Link href="/my-bookings" className="block px-3 py-2 rounded hover:bg-gray-100">Đơn hàng của tôi</Link>
              <button
                onClick={() => {
                  authUtils.logout();
                  setUser(null);
                }}
                className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-gray-100"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            // User chưa đăng nhập (Mobile)
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link href="/login" className="flex-1 text-center px-3 py-2 rounded border border-blue-600 text-blue-700">Đăng nhập</Link>
              <Link href="/register" className="flex-1 text-center px-3 py-2 rounded bg-blue-600 text-white">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
