// CarsSection component - tách từ page.tsx
"use client";
import Link from 'next/link';
import CarsGrid from './CarsGrid';
import Loading from '@/components/common/Loading';
import { useCars } from '@/hooks/useCars';
import { motion } from 'framer-motion';

export default function CarsSection() {
  const { cars, loading, error, isDemo, refetch } = useCars();

  const handleRetry = () => {
    refetch();
  };

  return (
    <motion.section 
      className="w-full mb-16 relative overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient xanh dương */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-blue-50/50 to-sky-50/30"></div>
      
      {/* Mesh gradient overlay - chỉ xanh dương */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.06) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(59, 130, 246, 0.06) 0px, transparent 50%)
          `
        }}
      ></div>
      
      {/* Subtle pattern - chỉ xanh dương */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.03) 50%, transparent 60%),
                           linear-gradient(-45deg, transparent 40%, rgba(37, 99, 235, 0.03) 50%, transparent 60%)`,
          backgroundSize: '60px 60px'
        }}
      ></div>
      
      {/* Floating decorative elements - chỉ xanh dương */}
      <motion.div
        className="absolute top-10 right-20 w-64 h-64 bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-10 left-20 w-72 h-72 bg-gradient-to-br from-sky-200/8 to-blue-200/8 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -30, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-100/5 to-sky-100/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
            >
              <div className="w-2 h-16 bg-gradient-to-b from-blue-500 via-blue-600 to-sky-500 rounded-full shadow-lg"></div>
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
            <div>
              <motion.h2 
                className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                ⚡ Xe Nổi Bật
              </motion.h2>
              <motion.p 
                className="text-sm text-gray-700 mt-2 font-medium"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                ✨ Khám phá những mẫu xe điện hàng đầu
              </motion.p>
            </div>
          </div>
          <motion.div
            whileHover={{ x: 5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link 
              href="/cars/all"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 text-white font-bold rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-sky-700 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "linear"
                }}
              />
              <span className="relative z-10">Xem tất cả</span>
              <motion.span
                className="relative z-10"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                →
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
      
      <div id="cars" className="px-4 sm:px-6 lg:px-8 relative z-10">
        {loading ? (
          <Loading size="md" text="Đang tải danh sách xe..." className="py-12" />
        ) : error ? (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 font-medium">{error}</p>
              {!isDemo && (
                <button
                  onClick={handleRetry}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Thử lại
                </button>
              )}
            </div>
            <CarsGrid cars={cars.slice(0, 6)} />
          </div>
        ) : (
          <CarsGrid cars={cars.slice(0, 6)} />
        )}
      </div>
    </motion.section>
  );
}
