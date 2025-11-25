'use client';
import React, { useEffect, useState } from "react";
import { Table, Spin, message, Card } from "antd";
import { paymentApi, rentalOrderApi, rentalLocationApi } from "@/services/api";
import type { PaymentData, RentalOrderData, RentalLocationData } from "@/services/api";

interface RevenueByLocation {
  rentalLocationName: string;
  totalRevenue: number;
  rentalLocationId?: number;
}

const RevenueByLocationComponent: React.FC = () => {
  const [data, setData] = useState<RevenueByLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      // Thử gọi API backend trước
      const apiResponse = await paymentApi.getRevenueByLocation();
      if (apiResponse.success && apiResponse.data) {
        // unwrap $values nếu backend trả về .NET style
        const revenueData = Array.isArray(apiResponse.data)
          ? apiResponse.data
          : (apiResponse.data as any)?.$values ?? [];

        if (revenueData.length > 0) {
          setData(revenueData);
          setLoading(false);
          return;
        }
      }

      // Nếu API không trả về data, tự tính toán từ payments và orders
      console.log('[RevenueByLocation] API không có data, tự tính toán từ payments và orders...');
      
      // Lấy tất cả payments
      const paymentsResponse = await paymentApi.getAll();
      if (!paymentsResponse.success || !paymentsResponse.data) {
        message.warning("Không thể lấy dữ liệu payments");
        setLoading(false);
        return;
      }

      // Lấy tất cả orders
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể lấy dữ liệu orders");
        setLoading(false);
        return;
      }

      // Lấy tất cả locations
      const locationsResponse = await rentalLocationApi.getAll();
      if (!locationsResponse.success || !locationsResponse.data) {
        message.warning("Không thể lấy dữ liệu locations");
        setLoading(false);
        return;
      }

      // Normalize data
      const payments = Array.isArray(paymentsResponse.data)
        ? paymentsResponse.data
        : (paymentsResponse.data as any)?.$values ?? [];
      
      const orders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values ?? [];

      const locations = Array.isArray(locationsResponse.data)
        ? locationsResponse.data
        : (locationsResponse.data as any)?.$values ?? [];

      // Tạo map orderId -> order để tìm locationId
      const orderMap = new Map<number, RentalOrderData>();
      orders.forEach((order: RentalOrderData) => {
        const orderId = order.id || order.orderId;
        if (orderId) {
          orderMap.set(orderId, order);
        }
      });

      // Tạo map locationId -> location name
      const locationMap = new Map<number, RentalLocationData>();
      locations.forEach((location: RentalLocationData) => {
        locationMap.set(location.id, location);
      });

      // Tính doanh thu theo location
      const revenueMap = new Map<number, number>();
      
      payments.forEach((payment: PaymentData) => {
        // Chỉ tính các payment đã hoàn thành (status = "Completed" hoặc paymentDate không null)
        const isCompleted = payment.status === "Completed" || 
                           payment.status === "completed" ||
                           payment.paymentDate !== null;

        if (!isCompleted) return;

        const orderId = payment.rentalOrderId;
        if (!orderId) return;

        const order = orderMap.get(orderId);
        if (!order) return;

        const locationId = order.rentalLocationId;
        if (!locationId) return;

        const currentRevenue = revenueMap.get(locationId) || 0;
        revenueMap.set(locationId, currentRevenue + (payment.amount || 0));
      });

      // Chuyển đổi map thành array
      const revenueData: RevenueByLocation[] = Array.from(revenueMap.entries()).map(([locationId, totalRevenue]) => {
        const location = locationMap.get(locationId);
        return {
          rentalLocationId: locationId,
          rentalLocationName: location?.name || `Địa điểm #${locationId}`,
          totalRevenue: totalRevenue,
        };
      });

      // Sắp xếp theo doanh thu giảm dần
      revenueData.sort((a, b) => b.totalRevenue - a.totalRevenue);

      setData(revenueData);

      if (revenueData.length === 0) {
        message.info("Chưa có dữ liệu doanh thu. Có thể chưa có payment nào được hoàn thành.");
      }
    } catch (error) {
      console.error('[RevenueByLocation] Error:', error);
      message.error("Có lỗi xảy ra khi lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const columns = [
    {
      title: "Tên địa điểm",
      dataIndex: "rentalLocationName",
      key: "rentalLocationName",
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value),
    },
  ];

  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);

  return (
    <Spin spinning={loading}>
      <Card>
        {data.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Tổng doanh thu tất cả địa điểm</div>
              <div className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalRevenue)}
              </div>
            </div>
            <Table
              rowKey={(record) => record.rentalLocationId?.toString() || record.rentalLocationName}
              dataSource={data}
              columns={columns}
              pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} địa điểm` }}
            />
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có dữ liệu doanh thu. Có thể chưa có payment nào được hoàn thành.
          </div>
        )}
      </Card>
    </Spin>
  );
};

export default RevenueByLocationComponent;
