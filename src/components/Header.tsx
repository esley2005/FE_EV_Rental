"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: mobile menu button and logo */}
        <div className="flex items-center gap-4">
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

          <Link href="/" className="flex items-center gap-3 hover:opacity-90">
            <Image src="/logo_ev.png" alt="EV Rental" width={56} height={56} priority />
            <span className="hidden md:inline-block text-lg font-semibold text-gray-800">EV Rental</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <Link href="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
          <Link href="/about" className="hover:text-blue-600 transition-colors">Giới thiệu</Link>

          <div className="relative group">
            <button className="hover:text-blue-600 transition-colors">Dịch vụ ▾</button>
            <div className="absolute left-0 hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg py-2 min-w-[160px]">
              <Link href="/services/rental" className="block px-4 py-2 hover:bg-gray-100">Thuê xe</Link>
              <Link href="/services/maintenance" className="block px-4 py-2 hover:bg-gray-100">Bảo dưỡng</Link>
            </div>
          </div>

          <Link href="/contact" className="hover:text-blue-600 transition-colors">Liên hệ</Link>
        </nav>

        {/* Right: actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
          >
            Đăng nhập
          </Link>

          <Link
            href="/register"
            className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Đăng ký
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`md:hidden transition-max-height duration-200 overflow-hidden ${open ? "max-h-64" : "max-h-0"}`}>
        <div className="px-4 pb-4 space-y-2">
          <Link href="/" className="block px-3 py-2 rounded hover:bg-gray-100">Trang chủ</Link>
          <Link href="/about" className="block px-3 py-2 rounded hover:bg-gray-100">Giới thiệu</Link>
          <details className="group">
            <summary className="px-3 py-2 rounded hover:bg-gray-100 cursor-pointer">Dịch vụ</summary>
            <div className="pl-4 mt-1 space-y-1">
              <Link href="/services/rental" className="block px-3 py-2 rounded hover:bg-gray-100">Thuê xe</Link>
              <Link href="/services/maintenance" className="block px-3 py-2 rounded hover:bg-gray-100">Bảo dưỡng</Link>
            </div>
          </details>
          <Link href="/contact" className="block px-3 py-2 rounded hover:bg-gray-100">Liên hệ</Link>

          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Link href="/login" className="flex-1 text-center px-3 py-2 rounded border border-blue-600 text-blue-600">Đăng nhập</Link>
            <Link href="/register" className="flex-1 text-center px-3 py-2 rounded bg-blue-600 text-white">Đăng ký</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
