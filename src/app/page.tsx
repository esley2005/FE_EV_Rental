"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CarCard from "@/components/CarCard";
import Footer from "@/components/Footer";
import { Car } from "@/types/car";

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("https://localhost:7200/api/Car") // 🔗 Thay URL nếu backend khác
      .then((res) => {
        // Một số ASP.NET API trả về { "$values": [...] }
        const data = res.data.$values || res.data;
        setCars(data);
      })
      .catch((err) => console.error("❌ Lỗi tải danh sách xe:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pt-20">
        <HeroSection />

        <section
          id="cars"
          className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8 mb-16"
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
