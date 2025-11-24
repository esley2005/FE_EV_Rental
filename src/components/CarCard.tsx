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

  // Normalize status: đảm bảo là number (0 hoặc 1)
  const normalizedStatus = typeof car.status === 'number' 
    ? car.status 
    : (car.status === 1 || car.status === '1' ? 1 : 0);

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

    // Xử lý nhiều format khác nhau từ backend
    let locationsList: any[] = [];
    
    if (Array.isArray(carLocations)) {
      locationsList = carLocations;
    } else if (Array.isArray(carLocations?.$values)) {
      locationsList = carLocations.$values;
    } else if (carLocations?.data) {
      if (Array.isArray(carLocations.data)) {
        locationsList = carLocations.data;
      } else if (Array.isArray(carLocations.data?.$values)) {
        locationsList = carLocations.data.$values;
      }
    }

    if (!Array.isArray(locationsList) || locationsList.length === 0) {
      return null;
    }

    // ✅ Chỉ lấy location đầu tiên (theo yêu cầu: 1 xe = 1 location)
    const firstLocation = locationsList[0];
    if (!firstLocation) {
      return null;
    }

    // Thử nhiều cách để lấy rentalLocation
    const rentalLocation = firstLocation?.rentalLocation ?? 
                          firstLocation?.RentalLocation ?? 
                          firstLocation;

    if (!rentalLocation) {
      return null;
    }

    // Lấy name và address từ nhiều nguồn khác nhau
    const name = rentalLocation?.name ?? 
                 rentalLocation?.Name ?? 
                 rentalLocation?.locationName ?? 
                 rentalLocation?.LocationName ?? 
                 null;
    
    const address = rentalLocation?.address ?? 
                   rentalLocation?.Address ?? 
                   rentalLocation?.locationAddress ?? 
                   rentalLocation?.LocationAddress ?? 
                   null;

    // Chỉ trả về nếu có ít nhất name hoặc address
    if (name || address) {
      return { name, address };
    }

    return null;
  }, [car.carRentalLocations]);

  return (
    <motion.div 
      className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-transparent cursor-pointer group relative"
      whileHover={{ scale: 1.05, y: -8, rotateY: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      }}
    >
      {/* Animated gradient border khi hover - chỉ xanh dương */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb, #0ea5e9)',
          padding: '2px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          background: [
            'linear-gradient(135deg, #3b82f6, #2563eb, #0ea5e9)',
            'linear-gradient(225deg, #2563eb, #0ea5e9, #3b82f6)',
            'linear-gradient(315deg, #0ea5e9, #3b82f6, #2563eb)',
            'linear-gradient(135deg, #3b82f6, #2563eb, #0ea5e9)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Gradient overlay khi hover - chỉ xanh dương */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-sky-50/0 to-blue-50/0 group-hover:from-blue-50/60 group-hover:via-sky-50/60 group-hover:to-blue-50/60 transition-all duration-300 pointer-events-none z-0"></div>
      
      {/* Sparkle effects */}
      <motion.div
        className="absolute top-4 right-4 w-2 h-2 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100"
        animate={{
          scale: [0, 1.5, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 0.5
        }}
      />
      
      <div className="relative z-10">
      {/* Ảnh xe với badges */}
      <div className="relative" onClick={() => router.push(`/cars/${car.id}`)}>
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
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

<<<<<<< HEAD
          {/* Badge icon tia sét (góc trên trái) */}
          <motion.div 
            className="absolute top-3 left-3 z-20"
            whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-2 shadow-xl border-2 border-yellow-400/50">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Zap className="text-yellow-400 fill-yellow-400" size={18} />
              </motion.div>
            </div>
          </motion.div>
          {/* Badge giảm giá (góc dưới phải) - chỉ hiển thị nếu có trong data */}
          {/* Có thể thêm logic kiểm tra giảm giá từ backend sau */}

          {/* Badge trạng thái (góc trên phải) */}
          <motion.div 
            className="absolute top-3 right-3 z-20"
            whileHover={{ scale: 1.1 }}
          >
            <motion.span
              className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-lg border-2 ${
                normalizedStatus === 1
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300"
                  : "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-300"
              }`}
              animate={normalizedStatus === 1 ? {
                boxShadow: [
                  '0 4px 14px 0 rgba(59, 130, 246, 0.5)',
                  '0 4px 20px 0 rgba(59, 130, 246, 0.7)',
                  '0 4px 14px 0 rgba(59, 130, 246, 0.5)',
                ],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {normalizedStatus === 1 ? "Sẵn sàng" : "✗ Hết xe"}
            </motion.span>
          </motion.div>
=======
         
          <div className="absolute top-2 left-2">
            <div className="bg-gray-800 bg-opacity-70 rounded-lg p-1.5">
              <Zap className="text-yellow-400 fill-yellow-400" size={16} />
            </div>
          </div>
        
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg shadow-md ${car.isActive === true
                  ? "bg-blue-600 text-white"
                  : "bg-red-500 text-white"
                }`}
            >
              {car.isActive === true ? "Sẵn sàng" : "Hết xe"}
            </span>
          </div>
>>>>>>> tiger_fix_v6
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="p-5" onClick={() => router.push(`/cars/${car.id}`)}>
        {/* Badge "Miễn thế chấp" */}
        {/* <div className="mb-4">
          <motion.div 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-400 rounded-xl px-4 py-2 shadow-lg"
            whileHover={{ scale: 1.08, y: -2 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div 
              className="w-6 h-6 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg"
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <CarIcon className="text-white" size={14} />
            </motion.div>
            <span className="text-green-700 font-bold text-xs">✨ Miễn thế chấp</span>
          </motion.div>
        </div> */}

        {/* Tên xe */}
        <motion.h2 
          className="text-2xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-600 to-sky-600 bg-clip-text text-transparent mb-4 uppercase line-clamp-2 group-hover:from-blue-600 group-hover:via-blue-700 group-hover:to-sky-600 transition-all duration-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
        >
          🚗 {car.name} {car.model && car.model}
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
          className="border-t-2 border-gray-100 pt-4 mt-4 bg-gradient-to-r from-blue-50/50 to-sky-50/50 -mx-4 px-4 pb-4 -mb-4 rounded-b-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-baseline gap-2">
            <motion.span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600 font-bold text-2xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: 0.7 
              }}
            >
              {formatPrice(pricePerDay)}₫
            </motion.span>
            <span className="text-gray-500 text-sm font-medium">/ngày</span>
          </div>
          {pricePerHour > 0 && (
            <motion.p 
              className="text-gray-600 text-xs mt-1 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {/* {formatPrice(pricePerHour, false)}₫/giờ */}
            </motion.p>
          )}
        </motion.div>
      </div>
      </div>
    </motion.div>
  );
}
