"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-blue-800 to-gray-900 text-white px-4">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-8 text-center"
      >
        <Link href="/" aria-label="Về trang chủ" className="inline-block">
          <Image
            src="/logo_ev.png"
            alt="EV Rental"
            width={80}
            height={80}
            priority
            className="mx-auto hover:opacity-90 transition-opacity"
          />
        </Link>
        <p className="text-gray-300 mt-2 text-sm">Hệ thống quản trị thuê xe thông minh</p>
      </motion.div>

      {/* Coming Soon Text */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-5xl md:text-6xl font-bold mb-4 text-center"
      >
        Coming Soon! 
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="text-gray-300 text-center max-w-md"
      >
        Chúng tôi sẽ sớm ra mắt tính năng này. Hãy quay lại sau hoặc liên hệ với chúng tôi để biết thêm chi tiết!
      </motion.p>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10 text-gray-400 text-sm"
      >
        EV Rent (GROUP 5 SWP391) © {new Date().getFullYear()}
      </motion.footer>
    </div>
  );
}