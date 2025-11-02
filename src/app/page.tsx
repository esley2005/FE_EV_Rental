"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
<<<<<<< Updated upstream
import CarCard from "@/components/CarCard";
import Footer from "@/components/Footer";
import { Car } from "@/types/car";
import { carsApi } from "@/services/api";
=======
import CarCardComp from "@/components/CarCard";
import Footer from "@/components/Footer";
import { carsApi } from "@/services/api";
import { useEffect, useState } from "react";
import { Car } from "@/types/car";
>>>>>>> Stashed changes

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCars = async () => {
      try {
        const response = await carsApi.getAll();
        
        if (response.success && response.data) {
          // Backend C# có thể trả về { "$values": [...] } hoặc array trực tiếp
          const carsData = (response.data as any)?.$values || response.data;
          
          // Lọc xe active và chưa xóa
          const activeCars = Array.isArray(carsData) 
            ? carsData.filter((car: Car) => car.isActive && !car.isDeleted)
            : [];
          
          setCars(activeCars);
        }
      } catch (err) {
        console.error("❌ Lỗi tải danh sách xe:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCars();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pt-20">
        <HeroSection />

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
              cars.slice(0, 6).map((car) => <CarCard key={car.id} car={car} />)
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
