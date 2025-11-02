"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CarCard from "@/components/CarCard";
import Footer from "@/components/Footer";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopRented = async () => {
      try {
        const response = await carsApi.getTopRented(3);

        if (response.success && response.data) {
          const carsData = (response.data as any)?.$values || response.data;
          const topCars = Array.isArray(carsData)
            ? (carsData as Car[]).filter((car) => car.isActive && !car.isDeleted)
            : [];

          if (topCars.length > 0) {
            setCars(topCars);
            return;
          }
        }

        // Fallback: lấy tất cả và hiển thị 3 xe đầu
        const allRes = await carsApi.getAll();
        if (allRes.success && allRes.data) {
          const allData = (allRes.data as any)?.$values || allRes.data;
          const active = Array.isArray(allData)
            ? (allData as Car[]).filter((car) => car.isActive && !car.isDeleted)
            : [];
          setCars(active.slice(0, 3));
        }
      } catch (err) {
        console.error("❌ Lỗi tải top xe thuê nhiều:", err);
        try {
          const allRes = await carsApi.getAll();
          if (allRes.success && allRes.data) {
            const allData = (allRes.data as any)?.$values || allRes.data;
            const active = Array.isArray(allData)
              ? (allData as Car[]).filter((car) => car.isActive && !car.isDeleted)
              : [];
            setCars(active.slice(0, 3));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    loadTopRented();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pt-20">
        <HeroSection />

        <section className="w-full max-w-6xl mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Xe điện được thuê nhiều</h2>
            <Link 
              href="/menu"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              Xem tất cả →
            </Link>
          </div>
          
          <div 
            id="cars"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
          >
            {loading ? (
              <p className="text-center text-gray-500 col-span-full">
                Đang tải danh sách xe...
              </p>
            ) : cars.length === 0 ? (
              <p className="text-center text-gray-500 col-span-full">
                Không có xe nào.
              </p>
            ) : (
              cars.map((car) => <CarCard key={car.id} car={car} />)
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
