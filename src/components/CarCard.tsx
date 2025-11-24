"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";
import { Zap, Users, MapPin, Star, Car as CarIcon, Truck } from "lucide-react";
import { motion } from "framer-motion";
interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  const router = useRouter();

  // Normalize status: đảm bảo là number (0 hoặc 1)
  const normalizedStatus = typeof car.status === 'number' 
    ? car.status 
    : (car.status === 1 || car.status === '1' ? 1 : 0);

  // Lấy giá từ data thực tế
  const pricePerDay = car.rentPricePerDay || 0;
  const pricePerHour = car.rentPricePerHour || 0;

  // Tính discount (giả sử có discount 14-17% như trong hình)
  // Có thể lấy từ backend sau, tạm thời random hoặc tính từ giá
  const discountPercent = useMemo(() => {
    // Tạm thời random 14-17% để demo
    return Math.floor(Math.random() * 4) + 14;
  }, []);

  const hasDiscount = discountPercent > 0;
  const originalPricePerDay = hasDiscount 
    ? Math.round(pricePerDay / (1 - discountPercent / 100))
    : pricePerDay;
  const discountedPricePerDay = pricePerDay;

  // Tính giá gói 4 giờ (60% giá ngày)
  const price4Hours = Math.round(pricePerDay * 0.6);

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
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-gray-900 bg-opacity-80 rounded-lg p-1.5 border border-yellow-400/50">
              <Zap className="text-yellow-400 fill-yellow-400" size={16} />
            </div>
          </div>

          {/* Badge giảm giá hoặc trạng thái (góc trên phải) */}
          <div className="absolute top-2 right-2 z-10">
            {hasDiscount ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white border border-white/30">
                Giảm {discountPercent}%
              </span>
            ) : (
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg ${
                  normalizedStatus === 1
                    ? "bg-blue-600 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {normalizedStatus === 1 ? "Sẵn sàng" : "Hết xe"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="p-4" onClick={() => router.push(`/cars/${car.id}`)}>
        {/* Badges "Miễn thế chấp" và "Giao xe tận nơi" */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            <div className="w-3.5 h-3.5 bg-green-600 rounded-full flex items-center justify-center">
              <CarIcon className="text-white" size={9} />
            </div>
            <span className="text-green-700 font-medium text-xs">Miễn thế chấp</span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
            <Truck className="text-orange-600" size={12} />
            <span className="text-orange-700 font-medium text-xs">Giao xe tận nơi</span>
          </div>
        </div>

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
          className="border-t border-gray-200 pt-3 mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="space-y-1">
            {/* Giá ngày */}
            <div className="flex items-baseline gap-2">
              {hasDiscount && (
                <span className="text-gray-400 text-sm line-through">
                  {formatPrice(originalPricePerDay)}₫
                </span>
              )}
              <motion.span 
                className="text-blue-600 font-bold text-lg"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 10,
                  delay: 0.7 
                }}
              >
                {formatPrice(discountedPricePerDay)}₫/ngày
              </motion.span>
            </div>
            
            {/* Gói 4 giờ */}
            {price4Hours > 0 && (
              <motion.p 
                className="text-gray-600 text-sm font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {formatPrice(price4Hours)}₫ gói 4 giờ
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
