"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import CarCard from "./CarCard";
import { Car } from "@/types/car";

interface CarWithCount extends Car {
  countRental: number;
}

export default function CarList() {
  const [cars, setCars] = useState<CarWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopCars = async () => {
      try {
        // 👉 gọi API đã xử lý sẵn top 3 (hoặc toàn bộ rồi tự sort ở FE)
        const res = await axios.get("https://localhost:7200/api/Car/TopRented");

        const data: CarWithCount[] = res.data?.$values ?? res.data ?? [];

        // Nếu API chưa giới hạn top 3 thì tự giới hạn ở FE
        const top3 = [...data]
          .sort((a, b) => (b.countRental ?? 0) - (a.countRental ?? 0))
          .slice(0, 3);

        setCars(top3);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách xe:", err);
        setError("Không thể tải danh sách xe. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopCars();
  }, []);

  if (loading)
    return <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>;

  if (error)
    return <p className="text-center mt-10 text-red-500">{error}</p>;

  if (cars.length === 0)
    return <p className="text-center mt-10 text-gray-500">Không có xe nào.</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        🚗 Top 3 xe được thuê nhiều nhất
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </div>
  );
}
