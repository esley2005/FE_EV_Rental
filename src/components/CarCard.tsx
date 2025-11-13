"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";
import { Zap, Users, MapPin, Star, Car as CarIcon } from "lucide-react";
import { motion } from "framer-motion";
interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  const router = useRouter();

  // Lấy giá từ data thực tế
  const pricePerDay = car.rentPricePerDay || 0;
  const pricePerHour = car.rentPricePerHour || 0;

  // Format giá tiền - hiển thị đầy đủ hoặc format với "K"
  const formatPrice = (price: number, useShortFormat: boolean = true) => {
    if (price === 0) return "0";
    if (useShortFormat && price >= 1000) {
      return (price / 1000).toFixed(0) + "K";
    }
    return price.toLocaleString('vi-VN');
  };

  // Xác định loại nhiên liệu từ batteryType hoặc sizeType
  const getFuelType = () => {
    // Nếu là xe điện
    if (car.batteryType?.toLowerCase().includes("lithium") ||
      car.batteryType?.toLowerCase().includes("ev") ||
      car.name?.toLowerCase().includes("ev") ||
      car.name?.toLowerCase().includes("electric")) {
      return "Điện";
    }
    return "Điện";
  };

  // Xác định loại hộp số (giả định)
  const getTransmissionType = () => {
    // Có thể thêm field transmission vào Car type sau
    return "Số tự động";
  };

  // Giả định đánh giá và số chuyến (có thể lấy từ API sau)
  const rating = 5.0;
  const tripCount = Math.floor(Math.random() * 50) + 10; // Tạm thời random

  const locationData = useMemo(() => {
    const carLocations: any = car.carRentalLocations;
    
    if (!carLocations) {
      return null;
    }

    const locationsList: any[] = Array.isArray(carLocations)
      ? carLocations
      : carLocations?.$values || [];

    if (!Array.isArray(locationsList) || locationsList.length === 0) {
      return null;
    }

    // ✅ Chỉ lấy location đầu tiên (theo yêu cầu: 1 xe = 1 location)
    const firstLocation = locationsList[0];
    const rentalLocation = firstLocation?.rentalLocation ?? firstLocation?.RentalLocation;
    
    if (rentalLocation) {
      const name = rentalLocation?.name ?? rentalLocation?.Name ?? null;
      const address = rentalLocation?.address ?? rentalLocation?.Address ?? null;
      return { name, address };
    }

    return null;
  }, [car.carRentalLocations]);

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 cursor-pointer group"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Ảnh xe với badges */}
      <div className="relative" onClick={() => router.push(`/cars/${car.id}`)}>
        <div className="relative h-48 overflow-hidden bg-gray-100">
          <motion.img
            src={car.imageUrl || '/logo_ev.png'}
            alt={car.name}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo_ev.png';
            }}
          />

          {/* Badge icon tia sét (góc trên trái) */}
          <motion.div 
            className="absolute top-2 left-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
          >
            <motion.div 
              className="bg-gray-800 bg-opacity-70 rounded-lg p-1.5"
              whileHover={{ scale: 1.2, rotate: 15 }}
            >
              <Zap className="text-yellow-400 fill-yellow-400" size={16} />
            </motion.div>
          </motion.div>
          {/* Badge giảm giá (góc dưới phải) - chỉ hiển thị nếu có trong data */}
          {/* Có thể thêm logic kiểm tra giảm giá từ backend sau */}

          {/* Badge trạng thái (góc trên phải) */}
          <motion.div 
            className="absolute top-2 right-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.span
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg shadow-md ${car.status === 0
                  ? "bg-blue-600 text-white"
                  : "bg-red-500 text-white"
                }`}
              whileHover={{ scale: 1.1 }}
            >
              {car.status === 0 ? "Sẵn sàng" : "Hết xe"}
            </motion.span>
          </motion.div>
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="p-4" onClick={() => router.push(`/cars/${car.id}`)}>
        {/* Badge "Miễn thế chấp" */}
        <motion.div 
          className="mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div 
            className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div 
              className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <CarIcon className="text-white" size={10} />
            </motion.div>
            <span className="text-green-700 font-medium text-xs">Miễn thế chấp</span>
          </motion.div>
        </motion.div>

        {/* Tên xe */}
        <motion.h2 
          className="text-lg font-bold text-gray-900 mb-2 uppercase line-clamp-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {car.name || car.model}
        </motion.h2>

        {/* Thông số kỹ thuật chính */}
        <div className="flex items-center gap-3 mb-2 text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">{getTransmissionType()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="text-gray-500" size={14} />
            <span className="text-xs">{car.seats} chỗ</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">{getFuelType()}</span>
          </div>
        </div>

        {/* Địa điểm */}
        <div className="flex items-start gap-1.5 mb-2 text-gray-600">
          <MapPin className="text-blue-600 mt-0.5 flex-shrink-0" size={14} />
          <div className="flex-1 min-w-0">
            {locationData ? (
              <div className="space-y-0.5">
                {locationData.name && (
                  <div className="text-xs font-semibold text-gray-900 leading-tight">
                    {locationData.name}
                  </div>
                )}
                {locationData.address && (
                  <div className="text-[10px] text-gray-500 leading-tight line-clamp-1">
                    {locationData.address}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Địa điểm đang cập nhật</span>
            )}
          </div>
        </div>

        {/* Đánh giá & Số chuyến */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Star className="text-yellow-400" size={14} />
            <span className="font-semibold text-gray-900 text-sm">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-blue-600 font-medium">{tripCount} chuyến</span>
          </div>
        </div>

        {/* Giá thuê */}
        <motion.div 
          className="border-t pt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div>
            <motion.span 
              className="text-blue-600 font-bold text-xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: 0.7 
              }}
            >
              {formatPrice(pricePerDay)}₫/ngày
            </motion.span>
          </div>
          {pricePerHour > 0 && (
            <motion.p 
              className="text-gray-500 text-[10px] mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {formatPrice(pricePerHour, false)}₫/giờ
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
