"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";
import { Zap, Users, MapPin, Star, Car as CarIcon, Edit, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
interface CarCardProps {
  car: Car;
  showFullInfo?: boolean; // Chỉ hiển thị đầy đủ thông tin ở trang /cars/all
}

export default function CarCard({ car, showFullInfo = false }: CarCardProps) {
  const router = useRouter();

 // lấy giá db
  const pricePerDay = car.rentPricePerDay || 0;
  const pricePerHour = car.rentPricePerHour || 0;

 
  const formatPrice = (price: number, useShortFormat: boolean = true) => {
    if (price === 0) return "0";
    if (useShortFormat && price >= 1000) {
      const priceInK = price / 1000;
      // Luôn format với dấu chấm phân cách hàng nghìn (ví dụ: 1.000K, 1.061K, 941K)
      return priceInK.toLocaleString('vi-VN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) + "K";
    }
    return price.toLocaleString('vi-VN');
  };

  // Tính toán giảm giá (có thể lấy từ backend sau)
  const discountPercent = 13; // Tạm thời hardcode, có thể lấy từ API
  const originalPrice = pricePerDay * (1 + discountPercent / 100);
  const hasDiscount = discountPercent > 0;

  // Xác định loại nhiên liệu từ batteryType hoặc sizeType
  const getFuelType = () => {
    // Nếu là xe điện
    if (car.batteryType?.toLowerCase().includes("lithium") ||
      car.batteryType?.toLowerCase().includes("ev") ||
      car.name?.toLowerCase().includes("ev") ||
      car.name?.toLowerCase().includes("electric")) {
      return "Điện";
    }
    return "Xăng"; // Mặc định là xăng nếu không phải điện
  };

  // Xác định loại hộp số (giả định)
  const getTransmissionType = () => {
    // Có thể thêm field transmission vào Car type sau
    return "Số tự động";
  };

  // Trích xuất năm từ tên xe (nếu có)
  const extractYear = () => {
    const yearMatch = (car.name || car.model || "").match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
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

// chỉ lấy locaiton khi tìm
    const firstLocation = locationsList[0];
    const rentalLocation = firstLocation?.rentalLocation ?? firstLocation?.RentalLocation;
    
    if (rentalLocation) {
      const name = rentalLocation?.name ?? rentalLocation?.Name ?? null;
      const address = rentalLocation?.address ?? rentalLocation?.Address ?? null;
      return { name, address };
    }

    return null;
  }, [car.carRentalLocations]);

  const carYear = extractYear();
  const displayName = car.name || car.model || "";

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 cursor-pointer group relative"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Badge "Miễn thế chấp" - chỉ hiển thị khi showFullInfo = true */}
      {showFullInfo && (
        <div className="absolute top-2 left-2 z-10">
          <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1 shadow-sm">
            <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
              <DollarSign className="text-white" size={10} />
            </div>
            <span className="text-green-700 font-medium text-xs">Miễn thế chấp</span>
          </div>
        </div>
      )}

      
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

          {/* Icon chỉnh sửa (góc trên phải của ảnh) - chỉ hiển thị khi showFullInfo = true */}
          {showFullInfo && (
            <div className="absolute top-2 right-2">
              <div className="bg-gray-800 bg-opacity-70 rounded-full p-1.5 hover:bg-opacity-90 transition-all">
                <Edit className="text-white" size={16} />
              </div>
            </div>
          )}

          {/* Badge giảm giá (góc dưới phải của ảnh) - chỉ hiển thị khi showFullInfo = true */}
          {showFullInfo && hasDiscount && (
            <div className="absolute bottom-2 right-2">
              <div className="bg-orange-500 rounded-lg px-2 py-1 shadow-md">
                <span className="text-white font-semibold text-xs">Giảm {discountPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="p-4" onClick={() => router.push(`/cars/${car.id}`)}>

       
        {/* Tên xe với năm */}
        <motion.h2 
          className="text-lg font-bold text-gray-900 mb-2 uppercase line-clamp-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {displayName} {carYear ? carYear : ""}
        </motion.h2>

        {/* Thông số kỹ thuật chính */}
        <div className="flex items-center gap-3 mb-2 text-gray-600">
          {/* Icon hộp số - gear shift */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">{getTransmissionType()}</span>
          </div>
          
          {/* Icon ghế ngồi */}
          <div className="flex items-center gap-1">
            <Users className="text-gray-500" size={14} />
            <span className="text-xs">{car.seats} chỗ</span>
          </div>
          
          {/* Icon nhiên liệu - bơm xăng */}
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
              <span className="text-xs text-gray-600">
                {locationData.address || locationData.name || "Địa điểm đang cập nhật"}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Địa điểm đang cập nhật</span>
            )}
          </div>
        </div>

        {/* Đánh giá & Số chuyến */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Star className="text-yellow-400 fill-yellow-400" size={14} />
            <span className="font-semibold text-gray-900 text-sm">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Icon tiền/chuyến - documents/money */}
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
          <div className="flex items-baseline gap-2">
       
            
            <motion.span 
              className={`font-bold text-xl ${showFullInfo && hasDiscount ? 'text-green-600' : 'text-blue-600'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: 0.7 
              }}
            >
              {formatPrice(pricePerDay)}/ngày
            </motion.span>
          </div>
          {pricePerHour > 0 && (
            <motion.p 
              className="text-gray-500 text-[10px] mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {/* {formatPrice(pricePerHour, false)}₫/giờ */}
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
