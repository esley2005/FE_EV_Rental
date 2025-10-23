"use client";
import React from "react";
import { Car } from "@/types/car";

interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <img
        src={car.imageUrl}
        alt={car.name}
        className="w-full h-56 object-cover"
      />
      <div className="p-4">
        <h2 className="text-xl font-semibold text-gray-800">{car.name}</h2>
        <p className="text-gray-500 text-sm">{car.model}</p>

        <div className="mt-2 text-sm text-gray-600">
          <p>
            <strong>Loại xe:</strong> {car.sizeType}
          </p>
          <p>
            <strong>Số ghế:</strong> {car.seats}
          </p>
          <p>
            <strong>Pin:</strong> {car.batteryType} – {car.batteryDuration} phút
          </p>
          <p>
            <strong>Cốp:</strong> {car.trunkCapacity} L
          </p>
        </div>

        <div className="mt-3">
          <p className="text-green-600 font-semibold text-lg">
            {car.rentPricePerDay} VND / ngày
          </p>
          <p className="text-gray-500 text-sm">
            {car.rentPricePerHour} VND / giờ
          </p>
        </div>
      </div>
    </div>
  );
}
