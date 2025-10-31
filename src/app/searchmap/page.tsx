"use client";
import { useCars } from "@/hooks/useCars";
import CarMap from "@/components/CarMap";

export default function MapPage() {
  const { cars, loading, error } = useCars();

  if (loading) return <p>Đang tải dữ liệu xe...</p>;
  if (error) return <p>Lỗi: {error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Bản đồ xe điện</h1>
      <CarMap cars={cars} />
    </div>
  );
}
