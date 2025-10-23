"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Car } from "@/types/car";
import CarCard from "./CarCard";

export default function CarList() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("https://localhost:7200/api/Car") // 🔗 thay URL nếu backend khác
      .then((res) => {
        // Một số ASP.NET API trả về { "$id": "...", "$values": [...] }
        const data = res.data.$values || res.data;
        setCars(data);
      })
      .catch((err) => {
        console.error("❌ Lỗi tải danh sách xe:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-10">Đang tải dữ liệu...</p>;

  if (cars.length === 0)
    return <p className="text-center mt-10 text-gray-500">Không có xe nào.</p>;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
