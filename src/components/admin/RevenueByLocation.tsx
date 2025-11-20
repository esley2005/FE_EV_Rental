'use client';
import React, { useEffect, useState } from "react";
import { Table, Spin, message, Button, Modal, Tag, Space } from "antd";
import { EyeOutlined, CarOutlined } from "@ant-design/icons";
import { paymentApi, rentalOrderApi, carsApi, authApi } from "@/services/api";
import type { RevenueByLocationData, RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";

interface RevenueByLocation extends RevenueByLocationData {
  rentalLocationName: string;
  totalRevenue: number;
}

interface OrderWithDetails extends RentalOrderData {
  car?: Car;
  userName?: string;
}

const RevenueByLocationComponent: React.FC = () => {
  const [data, setData] = useState<RevenueByLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<RevenueByLocation | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getRevenueByLocation();
      if (response.success && response.data) {
        // unwrap $values nếu backend trả về .NET style
        const revenueData = Array.isArray(response.data)
          ? response.data
          : response.data.$values ?? [];

        setData(revenueData);
      } else {
        message.error(response.error || "Không lấy được dữ liệu doanh thu");
      }
    } catch (error) {
      console.error(error);
      message.error("Có lỗi xảy ra khi lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersByLocation = async (locationId: number) => {
    setOrdersLoading(true);
    try {
      const [ordersResponse, carsResponse, usersResponse] = await Promise.all([
        rentalOrderApi.getAll(),
        carsApi.getAll(),
        authApi.getAllUsers()
      ]);

      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể tải danh sách đơn hàng");
        setOrders([]);
        return;
      }

      const ordersData = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
        : [];

      const users = usersResponse.success && usersResponse.data
        ? (Array.isArray(usersResponse.data) ? usersResponse.data : [])
        : [];

      // Lọc đơn hàng theo locationId
      const filteredOrders = ordersData
        .filter((order: RentalOrderData) => order.rentalLocationId === locationId)
        .map((order: RentalOrderData) => {
          const car = cars.find((c) => c.id === order.carId);
          const user = users.find((u) => u.id === order.userId);
          return {
            ...order,
            car,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'N/A'
          };
        });

      // Sắp xếp theo ngày tạo (mới nhất trước)
      filteredOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime();
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setOrders(filteredOrders);
    } catch (error) {
      console.error("Load orders error:", error);
      message.error("Không thể tải danh sách đơn hàng");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleViewDetails = (record: RevenueByLocation) => {
    setSelectedLocation(record);
    setDetailModalVisible(true);
    fetchOrdersByLocation(record.rentalLocationId);
  };

  const getStatusTag = (status: string | number) => {
    const statusMap: Record<string | number, { text: string; color: string }> = {
      0: { text: 'Chờ xác nhận', color: 'gold' },
      1: { text: 'Đã nộp giấy tờ', color: 'blue' },
      2: { text: 'Chờ tiền cọc', color: 'orange' },
      3: { text: 'Đã xác nhận', color: 'cyan' },
      4: { text: 'Đang thuê', color: 'green' },
      5: { text: 'Đã trả xe', color: 'purple' },
      6: { text: 'Chờ thanh toán', color: 'orange' },
      7: { text: 'Đã hủy', color: 'red' },
      8: { text: 'Hoàn thành', color: 'green' },
      'Pending': { text: 'Chờ xác nhận', color: 'gold' },
      'DocumentsSubmitted': { text: 'Đã nộp giấy tờ', color: 'blue' },
      'DepositPending': { text: 'Chờ tiền cọc', color: 'orange' },
      'Confirmed': { text: 'Đã xác nhận', color: 'cyan' },
      'Renting': { text: 'Đang thuê', color: 'green' },
      'Returned': { text: 'Đã trả xe', color: 'purple' },
      'PaymentPending': { text: 'Chờ thanh toán', color: 'orange' },
      'Cancelled': { text: 'Đã hủy', color: 'red' },
      'Completed': { text: 'Hoàn thành', color: 'green' },
    };

    const statusKey = typeof status === 'number' ? status : status;
    const statusInfo = statusMap[statusKey] || { text: String(status), color: 'default' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
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
    {
      title: "Số đơn hàng",
      dataIndex: "totalOrders",
      key: "totalOrders",
      render: (value: number) => value || 0,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: RevenueByLocation) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const orderColumns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Xe thuê",
      key: "car",
      render: (record: OrderWithDetails) => record.car ? `${record.car.brand} ${record.car.model}` : 'N/A',
    },
    {
      title: "Khách hàng",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "SĐT",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
    },
    {
      title: "Ngày thuê",
      dataIndex: "pickupTime",
      key: "pickupTime",
      render: (value: string) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : 'N/A',
    },
    {
      title: "Ngày trả dự kiến",
      dataIndex: "expectedReturnTime",
      key: "expectedReturnTime",
      render: (value: string) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : 'N/A',
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      render: (value: number) => value ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value) : 'N/A',
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string | number) => getStatusTag(status),
    },
  ];

  return (
    <>
      <Spin spinning={loading}>
        <Table
          rowKey="rentalLocationId"
          dataSource={data}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Spin>

      <Modal
        title={
          <Space>
            <CarOutlined />
            <span>Chi tiết đơn hàng tại {selectedLocation?.rentalLocationName}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedLocation(null);
          setOrders([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedLocation(null);
            setOrders([]);
          }}>
            Đóng
          </Button>
        ]}
        width={1200}
      >
        <Spin spinning={ordersLoading}>
          {orders.length === 0 && !ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              Không có đơn hàng nào tại địa điểm này
            </div>
          ) : (
            <Table
              dataSource={orders}
              columns={orderColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default RevenueByLocationComponent;
