"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cars } from "@/data/cars";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";

interface CarDetailPageProps {
  params: {
    id: string;
  };
}

export default function CarDetailPage({ params }: CarDetailPageProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const car = cars.find(c => c.id === params.id);
  
  if (!car) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-blue-600">Trang chủ</Link></li>
            <li>/</li>
            <li><Link href="/#cars" className="hover:text-blue-600">Xe điện</Link></li>
            <li>/</li>
            <li className="text-gray-900">{car.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hình ảnh xe */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <Image
                src={car.image}
                alt={car.name}
                width={600}
                height={400}
                className="w-full h-80 object-cover rounded-lg"
              />
            </div>
            
            {/* Gallery nhỏ */}
            <div className="grid grid-cols-3 gap-2">
              {car.images.map((img, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-2">
                  <Image
                    src={img}
                    alt={`${car.name} ${index + 1}`}
                    width={200}
                    height={150}
                    className="w-full h-20 object-cover rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Thông tin xe */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{car.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{car.description}</p>
              
              {/* Thông số cơ bản */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚗</span>
                  <div>
                    <p className="text-sm text-gray-500">Loại xe</p>
                    <p className="font-semibold">{car.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔋</span>
                  <div>
                    <p className="text-sm text-gray-500">Quãng đường</p>
                    <p className="font-semibold">{car.range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-sm text-gray-500">Số chỗ ngồi</p>
                    <p className="font-semibold">{car.seats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧳</span>
                  <div>
                    <p className="text-sm text-gray-500">Dung tích cốp</p>
                    <p className="font-semibold">{car.storage}</p>
                  </div>
                </div>
              </div>

              {/* Giá và nút thuê */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Giá thuê</p>
                    <p className="text-3xl font-bold text-blue-600">{car.price}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsBookingModalOpen(true)}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Thuê xe ngay
                </button>
                
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                    📞 Gọi tư vấn
                  </button>
                  <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                    💬 Chat hỗ trợ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thông số kỹ thuật */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tính năng nổi bật */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tính năng nổi bật</h2>
            <ul className="space-y-3">
              {car.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Thông số kỹ thuật */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thông số kỹ thuật</h2>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Động cơ</span>
                <span className="font-semibold">{car.specifications.engine}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Pin</span>
                <span className="font-semibold">{car.specifications.battery}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Thời gian sạc</span>
                <span className="font-semibold">{car.specifications.chargingTime}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Tốc độ tối đa</span>
                <span className="font-semibold">{car.specifications.topSpeed}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tăng tốc 0-100km/h</span>
                <span className="font-semibold">{car.specifications.acceleration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Xe khác */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Xe điện khác</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.filter(c => c.id !== car.id).map((otherCar) => (
              <Link key={otherCar.id} href={`/cars/${otherCar.id}`}>
                <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <Image
                    src={otherCar.image}
                    alt={otherCar.name}
                    width={400}
                    height={250}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{otherCar.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{otherCar.type} • {otherCar.range}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-semibold">{otherCar.price}</span>
                      <span className="text-blue-600 hover:text-blue-700">Xem chi tiết →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Booking Modal */}
      <BookingModal 
        car={car}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
}
