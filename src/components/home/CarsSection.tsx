// CarsSection component - tách từ page.tsx
"use client";
import Link from 'next/link';
import CarsGrid from './CarsGrid';
import Loading from '@/components/common/Loading';
import Notice from '@/components/common/Notice';
import { useCars } from '@/hooks/useCars';
import { motion } from 'framer-motion';

export default function CarsSection() {
  const { cars, loading, error, isDemo, refetch } = useCars();

  const handleRetry = () => {
    refetch();
  };

  return (
    <motion.section 
      className="w-full mb-16"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            Xe điện cho thuê
            <span className="text-blue-600">→</span>
          </h2>
          <motion.div
            whileHover={{ x: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link 
              href="/cars/all"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              Xem tất cả →
            </Link>
          </motion.div>
        </motion.div>
      </div>
      
      <div id="cars" className="px-4 sm:px-6 lg:px-8 ">
        {loading ? (
          <Loading size="md" text="Đang tải danh sách xe..." className="py-12" />
        ) : error ? (
          <div className="space-y-4 max-w-7xl mx-auto">
            <Notice 
              type={isDemo ? 'warning' : 'error'} 
              message={error}
              onRetry={!isDemo ? handleRetry : undefined}
            />
            <CarsGrid cars={cars.slice(0, 6)} />
          </div>
        ) : (
          <CarsGrid cars={cars.slice(0, 6)} />
        )}
      </div>
    </motion.section>
  );
}
