// CarsSection component - tách từ page.tsx
"use client";
import Link from 'next/link';
import CarsGrid from './CarsGrid';
import Loading from '@/components/common/Loading';
import Notice from '@/components/common/Notice';
import { useCars } from '@/hooks/useCars';

export default function CarsSection() {
  const { cars, loading, error, isDemo, refetch } = useCars();

  const handleRetry = () => {
    refetch();
  };

  return (
    <section className="w-full max-w-6xl mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Xe điện cho thuê
        </h2>
        <Link 
          href="/cars/all"
          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
        >
          Xem tất cả →
        </Link>
      </div>
      
      <div id="cars">
        {loading ? (
          <Loading size="md" text="Đang tải danh sách xe..." className="py-12" />
        ) : error ? (
          <div className="space-y-4">
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
    </section>
  );
}
