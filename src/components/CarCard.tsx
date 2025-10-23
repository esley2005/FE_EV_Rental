"use client";
import React from "react";
import { Car } from "@/types/car";

interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Ảnh xe */}
      <div className="relative">
        <img
          src={car.imageUrl }
          alt={car.name}
          className="w-full h-52 object-cover"
         onError={(e) => {
  (e.target as HTMLImageElement).src = "https://tse1.mm.bing.net/th/id/OIP.eAPUnxcugCXa-4LGgA6eoAHaFj?cb=12ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3";
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
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">
          {car.name}
        </h2>
        <p className="text-gray-500 text-sm mb-3">{car.model}</p>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-gray-600">
          <p>Loại xe: {car.sizeType}</p>
          <p>Số ghế: {car.seats}</p>
          <p>Pin: {car.batteryType}</p>
          <p>Cốp: {car.trunkCapacity} L</p>
        </div>

        {/* Giá thuê */}
        <div className="mt-4">
          <p className="text-green-600 font-semibold text-lg">
            {car.rentPricePerDay.toLocaleString()} VND / ngày
          </p>
          <p className="text-gray-500 text-sm">
            {car.rentPricePerHour.toLocaleString()} VND / giờ
          </p>
        </div>

        {/* Nút hành động */}
        <button
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          onClick={() => alert(`Thuê xe ${car.name}`)}
        >
          Thuê ngay
        </button>
      </div>
    </div>
  );
}
