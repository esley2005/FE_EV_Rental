import Image from "next/image";
import Link from "next/link";
import { Car } from "@/types/car";

interface CarCardProps {
  car: Car;
}

export default function CarCard({ car }: CarCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
      <Image 
        src={car.image} 
        alt={car.name} 
        width={350} 
        height={100} 
        className="mb-3" 
      />
      <h2 className="font-bold text-black text-lg mb-1">{car.name}</h2>
      
      {/* Thông tin xe chia 2 hàng 2 cột với icon */}
      <div className="w-full grid grid-cols-2 gap-2 text-sm mb-2">
        <div className="flex items-center gap-2">
          {/* Loại xe */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-gray-800">
            <rect x="3" y="10" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" />
          </svg>
          <span className="text-gray-500">{car.type}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quãng đường */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-gray-800">
            <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
            <rect x="9" y="6" width="6" height="8" rx="1" fill="currentColor" />
          </svg>
          <span className="text-gray-500">{car.range}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Số chỗ */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-gray-800">
            <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="17" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
            <rect x="4" y="12" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-gray-500">{car.seats}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Dung tích cốp */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-gray-800">
            <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 7V5a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-gray-500">{car.storage}</span>
        </div>
      </div>
      
      <span className="text-blue-600 font-semibold">{car.price}</span>
      <div className="flex gap-2">
        <Link
          href={car.href}
          className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-700 transition inline-block text-center"
        >
          Thuê xe
        </Link>
      </div>
    </div>
  );
}
