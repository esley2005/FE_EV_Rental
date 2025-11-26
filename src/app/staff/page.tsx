"use client";

import RentalOrderManagement from "@/components/staff/RentalOrderManagement";

export default function StaffPage() {
  return (
    <div className="p-6" style={{ width: '100%', overflow: 'hidden' }}>
      <h1 className="text-2xl font-bold text-green-700 mb-6">Quản lý đơn hàng thuê xe</h1>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <RentalOrderManagement />
      </div>
    </div>
  );
}
