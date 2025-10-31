"use client";

import React, { useEffect, useState } from "react";
import { Input, Button, Space } from "antd";
import { SearchOutlined, EnvironmentOutlined } from "@ant-design/icons";
import CarCard from "@/components/CarCard";
import { Car } from "@/types/car";
import { carsApi } from "@/services/api";

export default function MenuPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filtered, setFiltered] = useState<Car[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === Gọi API xe ===
  // SỬA NHƯ THẾ NÀY:
useEffect(() => {
  const fetchCars = async () => {
    try {
      const response = await carsApi.getAll();
      
      if (response.success && response.data) {
        // Lọc xe active và chưa xóa
        const carsData = response.data;
        const activeCars = Array.isArray(carsData) 
          ? carsData.filter((car: Car) => car.isActive && !car.isDeleted)
          : [];
        
        setCars(activeCars);
        setFiltered(activeCars);
      } else {
        setError("Không thể tải danh sách xe.");
      }
    } catch (err) {
      console.error("❌ Lỗi tải danh sách xe:", err);
      setError("Không thể tải danh sách xe.");
    } finally {
      setLoading(false);
    }
  };
  fetchCars();
}, []);

  // === Tìm kiếm theo tên / loại xe ===
  const onSearch = (value: string) => {
    setQuery(value);
    const q = value.trim().toLowerCase();
    if (!q) return setFiltered(cars);
    setFiltered(
      cars.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.sizeType.toLowerCase().includes(q)
      )
    );
  };

  // === Lọc nhanh theo loại xe ===
  const quickFilter = (type: string) => {
    if (!type) return setFiltered(cars);
    setFiltered(cars.filter((c) => c.sizeType.toLowerCase() === type.toLowerCase()));
  };

  // === Giao diện hiển thị ===
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <Input.Search
              placeholder="Tìm kiếm theo tên hoặc loại xe (Sedan, SUV,...)"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={onSearch}
            />
<<<<<<< Updated upstream
          </div>

          <Space wrap>
            <Button
              icon={<EnvironmentOutlined />}
              onClick={() => alert("Tìm kiếm bằng bản đồ (chưa triển khai)")}
            >
              Tìm theo bản đồ
            </Button>
            <Button onClick={() => quickFilter("")}>Tất cả</Button>
            <Button onClick={() => quickFilter("Minicar")}>Minicar</Button>
            <Button onClick={() => quickFilter("SUV")}>SUV</Button>
            <Button onClick={() => quickFilter("Sedan")}>Sedan</Button>
          </Space>
        </div>
      </div>

      {loading ? (
        <p className="text-center mt-10 text-gray-600">Đang tải dữ liệu...</p>
      ) : error ? (
        <p className="text-center mt-10 text-red-500">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center mt-10 text-gray-500">Không có xe nào phù hợp.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
=======

            <Space wrap>
              <Button
                icon={<EnvironmentOutlined />}
                onClick={() =>
                  (window.location.href = "/searchmap")
                }
              >
                Tìm theo bản đồ
              </Button>
              <Button onClick={() => quickFilter("")}>Tất cả</Button>
              <Button onClick={() => quickFilter("Minicar")}>Minicar</Button>
              <Button onClick={() => quickFilter("SUV")}>SUV</Button>
              <Button onClick={() => quickFilter("Sedan")}>Sedan</Button>
            </Space>
          </div>

          {loading ? (
            <p className="text-center text-gray-500 mt-10">
              Đang tải danh sách xe...
            </p>
          ) : error ? (
            <p className="text-center text-red-500 mt-10">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">
              Không có xe nào phù hợp.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {filtered.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </section>
    </>
>>>>>>> Stashed changes
  );
}
