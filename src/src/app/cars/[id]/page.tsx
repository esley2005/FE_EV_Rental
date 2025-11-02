"use client";

import React, { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Spin } from "antd";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";

interface CarDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CarDetailPage({ params }: CarDetailPageProps) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [car, setCar] = useState<Car | null>(null);
  const [otherCars, setOtherCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCar = async () => {
      try {
        const carId = parseInt(resolvedParams.id);
        if (isNaN(carId)) {
          notFound();
          return;
        }

        // Lấy tất cả xe để tìm xe hiện tại và xe khác
        const response = await carsApi.getAll();
        
        if (response.success && response.data) {
          const carsData = (response.data as any)?.$values || response.data;
          const activeCars = Array.isArray(carsData) 
            ? carsData.filter((c: Car) => c.isActive && !c.isDeleted)
            : [];
          
          const currentCar = activeCars.find((c: Car) => c.id === carId);
          
          if (!currentCar) {
            notFound();
            return;
          }
          
          setCar(currentCar);
          setOtherCars(activeCars.filter((c: Car) => c.id !== carId).slice(0, 3));
        }
      } catch (error) {
        console.error('Load car error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCar();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" tip="Đang tải thông tin xe..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!car) {
    notFound();
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/#cars" className="hover:text-blue-600">
                Xe điện
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900">{car.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hình ảnh xe */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <img
                src={car.imageUrl || '/logo_ev.png'}
                alt={car.name}
                className="w-full h-80 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_ev.png';
                }}
              />
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className={`text-center p-3 rounded-lg ${car.status === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className="font-semibold">
                  {car.status === 0 ? '🚗 Xe đang có sẵn' : '⛔ Hết xe'}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin xe */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {car.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">{car.model}</p>

              {/* Thông số cơ bản */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Image
                    src="/typecar.png"
                    alt="Loại xe"
                    width={28}
                    height={28}
                  />
                  <div>
                    <p className="text-sm text-gray-500">Loại xe</p>
                    <p className="font-semibold">{car.sizeType}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Image
                    src="/battery.png"
                    alt="Quãng đường"
                    width={28}
                    height={28}
                  />
                  <div>
                    <p className="text-sm text-gray-500">Quãng đường</p>
                    <p className="font-semibold">{car.batteryDuration} km</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Image
                    src="/seat.png"
                    alt="Số chỗ ngồi"
                    width={28}
                    height={28}
                  />
                  <div>
                    <p className="text-sm text-gray-500">Số chỗ ngồi</p>
                    <p className="font-semibold">{car.seats} chỗ</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Image
                    src="/cop.png"
                    alt="Dung tích cốp"
                    width={28}
                    height={28}
                  />
                  <div>
                    <p className="text-sm text-gray-500">Dung tích cốp</p>
                    <p className="font-semibold">{car.trunkCapacity} L</p>
                  </div>
                </div>
              </div>

              {/* Giá và nút thuê */}
              <div className="border-t pt-6">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Giá thuê theo ngày</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(car.rentPricePerDay)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Giá thuê theo giờ</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {formatCurrency(car.rentPricePerHour)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <p className="text-sm text-gray-500">Có tài xế (ngày)</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {formatCurrency(car.rentPricePerDayWithDriver)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  disabled={car.status !== 0}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
                    car.status === 0 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {car.status === 0 ? 'Thuê xe ngay' : 'Xe đã hết'}
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Thông số kỹ thuật
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Model</span>
                <span className="font-semibold">{car.model}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại xe</span>
                <span className="font-semibold">{car.sizeType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Số chỗ ngồi</span>
                <span className="font-semibold">{car.seats} chỗ</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Dung tích cốp</span>
                <span className="font-semibold">{car.trunkCapacity} lít</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại pin</span>
                <span className="font-semibold">{car.batteryType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Quãng đường</span>
                <span className="font-semibold">{car.batteryDuration} km</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Động cơ</span>
                <span className="font-semibold">Điện 100%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Năng lượng</span>
                <span className="font-semibold">Xe điện</span>
              </div>
            </div>
          </div>
        </div>

        {/* Xe khác */}
        {otherCars.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Xe điện khác</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCars.map((otherCar) => (
                <Link key={otherCar.id} href={`/cars/${otherCar.id}`}>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                    <img
                      src={otherCar.imageUrl || '/logo_ev.png'}
                      alt={otherCar.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_ev.png';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">
                        {otherCar.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {otherCar.sizeType} • {otherCar.batteryDuration} km
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-semibold">
                          {formatCurrency(otherCar.rentPricePerDay)}/ngày
                        </span>
                        <span className="text-blue-600 hover:text-blue-700">
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      <BookingModal
        car={car}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
}

