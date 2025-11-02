"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";

interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer">
      {/* Ảnh xe */}
      <div className="relative" onClick={() => router.push(`/cars/${car.id}`)}>
        <img
          src={car.imageUrl || '/logo_ev.png'}
          alt={car.name}
          className="w-full h-52 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/logo_ev.png';
          }}
        />
        <div className="absolute top-2 right-2">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
              car.status === 0
                ? "bg-green-100 text-green-700"
                : "bg-red-200 text-red-600"
            }`}
          >
            {car.status === 0 ? "Đang Có Sẵn" : "Hết Xe"}
          </span>
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="p-4" onClick={() => router.push(`/cars/${car.id}`)}>
        <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">
          {car.name}
        </h2>
        <p className="text-gray-500 text-sm mb-3">{car.model}</p>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-gray-600">
          <p>
            <span className="font-medium">Loại:</span> {car.sizeType}
          </p>
          <p>
            <span className="font-medium">Ghế:</span> {car.seats} chỗ
          </p>
          <p>
            <span className="font-medium">Pin:</span> {car.batteryType}
          </p>
          <p>
            <span className="font-medium">Cốp:</span> {car.trunkCapacity}L
          </p>
        </div>

        {/* Giá thuê */}
        <div className="mt-4 border-t pt-3">
          <p className="text-green-600 font-bold text-lg">
            {car.rentPricePerDay.toLocaleString()} ₫
          </p>
          <p className="text-gray-500 text-xs">
            {car.rentPricePerHour.toLocaleString()} ₫/giờ
          </p>
        </div>

        {/* Nút hành động */}
        <button
          className={`mt-4 w-full py-2 rounded-xl text-sm font-medium transition-colors ${
            car.status === 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={(e) => {
            e.stopPropagation(); // Ngăn event bubble lên parent
            if (car.status === 0) {
              router.push(`/cars/${car.id}`);
            }
          }}
          disabled={car.status !== 0}
        >
          {car.status === 0 ? 'Xem chi tiết' : 'Hết xe'}
        </button>
      </div>
    </div>
  );
}
