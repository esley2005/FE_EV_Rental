"use client";

import { useState } from "react";
import { Car } from "@/types/car";

interface BookingModalProps {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ car, isOpen, onClose }: BookingModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    startDate: "",
    endDate: "",
    pickupLocation: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Xử lý đặt xe ở đây
    console.log("Booking data:", { car: car.id, ...formData });
    alert("Đặt xe thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.");
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Đặt xe {car.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Car info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚗</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">{car.name}</h3>
                <p className="text-gray-600">{car.type} • {car.seats} • {car.range}</p>
                <p className="text-blue-600 font-semibold text-lg">{car.price}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu *
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc *
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa điểm nhận xe *
              </label>
              <select
                name="pickupLocation"
                required
                value={formData.pickupLocation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn địa điểm nhận xe</option>
                <option value="hcm-center">TP.HCM - Trung tâm</option>
                <option value="hcm-airport">TP.HCM - Sân bay Tân Sơn Nhất</option>
                <option value="hanoi-center">Hà Nội - Trung tâm</option>
                <option value="hanoi-airport">Hà Nội - Sân bay Nội Bài</option>
                <option value="danang-center">Đà Nẵng - Trung tâm</option>
                <option value="other">Địa điểm khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ghi chú thêm về yêu cầu của bạn..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Xác nhận đặt xe
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
