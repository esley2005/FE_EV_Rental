"use client";

import React, { useState } from "react";
import { Input, Button, Space } from "antd";
import { SearchOutlined, EnvironmentOutlined } from "@ant-design/icons";
import CarCard from "@/components/CarCard";
import { cars } from "@/data/cars";

export default function MenuPage() {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(cars);

  const onSearch = (value: string) => {
    setQuery(value);
    const q = value.trim().toLowerCase();
    if (!q) return setFiltered(cars);
    setFiltered(cars.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)));
  };

  const quickFilter = (type: string) => {
    if (!type) return setFiltered(cars);
    setFiltered(cars.filter((c) => c.type.toLowerCase() === type.toLowerCase()));
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <Input.Search
              placeholder="Tìm kiếm theo tên hoặc loại xe (ô tô điện)"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={onSearch}
            />
          </div>

          <Space>
            <Button icon={<EnvironmentOutlined />} onClick={() => alert('Tìm kiếm bằng bản đồ (chưa triển khai)')}>
              Tìm theo bản đồ
            </Button>
            <Button onClick={() => quickFilter("")}>Tất cả</Button>
            <Button onClick={() => quickFilter("Minicar")}>Minicar</Button>
            <Button onClick={() => quickFilter("SUV")}>SUV</Button>
            <Button onClick={() => quickFilter("Sedan")}>Sedan</Button>
          </Space>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filtered.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </div>
  );
}
