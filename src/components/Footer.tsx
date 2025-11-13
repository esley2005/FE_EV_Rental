"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, MessageCircle, Headphones, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <motion.footer 
      className="bg-white border-t border-gray-200"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Contact Information & Social Media */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Image 
                src="/logo_ev.png" 
                alt="EV Rental" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">EV RENTAL</span>
            </motion.div>

            {/* Phone Number */}
            <div>
              <a 
                href="tel:1900000" 
                className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors"
              >
                1900 0000
              </a>
              <p className="text-sm text-gray-500 mt-1">
                Tổng đài hỗ trợ: 7AM - 10PM
              </p>
            </div>

            {/* Email */}
            <div>
              <a 
                href="mailto:contact@evrental.vn" 
                className="text-gray-900 hover:text-green-600 transition-colors flex items-center gap-2"
              >
                <Mail className="text-green-600" />
                <span>contact@evrental.vn</span>
              </a>
              <p className="text-sm text-gray-500 mt-1">
                Gửi mail cho EV Rental
              </p>
            </div>

            {/* Social Media Icons */}
            <div className="flex items-center gap-4 pt-2">
              {[
                { href: "https://facebook.com", icon: <Facebook className="text-lg" />, label: "Facebook" },
                { href: "https://tiktok.com", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>, label: "TikTok" },
                { href: "https://zalo.me", icon: <MessageCircle className="text-lg font-bold" />, label: "Zalo" },
              ].map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-green-600 hover:text-green-600 transition-colors"
                  aria-label={social.label}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Column 2: Chính Sách */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Chính Sách</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/policies/terms" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Chính sách & quy định
                </Link>
              </li>
              <li>
                <Link 
                  href="/policies/operating" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Quy chế hoạt động
                </Link>
              </li>
              <li>
                <Link 
                  href="/policies/privacy" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link 
                  href="/policies/complaint" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Giải quyết khiếu nại
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Column 3: Tìm Hiểu Thêm */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tìm Hiểu Thêm</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/guides/general" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Hướng dẫn chung
                </Link>
              </li>
              <li>
                <Link 
                  href="/guides/booking" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Hướng dẫn đặt xe
                </Link>
              </li>
              <li>
                <Link 
                  href="/guides/payment" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Hướng dẫn thanh toán
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Hỏi và trả lời
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Column 4: Đối Tác */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Đối Tác</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/partners/register-owner" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Đăng ký chủ xe EV Rental
                </Link>
              </li>
              <li>
                <Link 
                  href="/partners/register-gps" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Đăng ký GPS Tracking
                </Link>
              </li>
              <li>
                <Link 
                  href="/partners/long-term-rental" 
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Đăng ký cho thuê xe dài hạn
                </Link>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Bottom Section: Copyright and Business Info */}
      <motion.div 
        className="border-t border-gray-200"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-gray-700">
            <div>
              <span>© Công ty Cổ phần EV Rental [GROUP 5 SWP391]</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-1">
              <span>Số GCNĐKKD: 111111111</span>
              <span>Ngày cấp: 02/11/2025</span>
              <span>Nơi cấp: Sở Kế hoạch và Đầu tư TPHCM</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.footer>
  );
}
