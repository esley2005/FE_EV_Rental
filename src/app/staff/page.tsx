"use client";

import RentalOrderManagement from "@/components/staff/RentalOrderManagement";

export default function StaffPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Quản lý đơn hàng thuê xe</h1>
      <RentalOrderManagement />
    </div>
  );
}
