"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tag, message, Image, Descriptions, Card, Modal } from "antd";
import { 
  CarOutlined, 
  UserOutlined, 
  IdcardOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, driverLicenseApi, citizenIdApi } from "@/services/api";
import type { RentalOrderData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";

type CarStatusListProps = {
  onDeliver?: (car: { carId: string; carName: string; orderId: number }) => void;
  onReturn?: (car: { carId: string; carName: string; orderId: number }) => void;
};

interface OrderWithDetails extends Omit<RentalOrderData, 'citizenId'> {
  car?: Car;
  user?: User;
  driverLicense?: DriverLicenseData;
  citizenIdDoc?: CitizenIdData; // Renamed to avoid conflict with RentalOrderData.citizenId (which is number)
}

export default function CarStatusList({ onDeliver, onReturn }: CarStatusListProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Load all orders
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể tải danh sách đơn hàng");
        setLoading(false);
        return;
      }

      const ordersData = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      // Load all related data
      const [carsResponse, usersResponse, licensesResponse, citizenIdsResponse] = await Promise.all([
        carsApi.getAll(),
        authApi.getAllUsers(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll()
      ]);

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
        : [];

      const users: User[] = usersResponse.success && usersResponse.data
        ? (Array.isArray(usersResponse.data) ? usersResponse.data : [])
        : [];

      const licenses: DriverLicenseData[] = licensesResponse.success && licensesResponse.data
        ? (Array.isArray(licensesResponse.data) ? licensesResponse.data : (licensesResponse.data as any)?.$values || [])
        : [];

      const citizenIds: CitizenIdData[] = citizenIdsResponse.success && citizenIdsResponse.data
        ? (Array.isArray(citizenIdsResponse.data) ? citizenIdsResponse.data : (citizenIdsResponse.data as any)?.$values || [])
        : [];

      // Map orders with related data
      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        const license = licenses.find((l) => l.rentalOrderId === order.id);
        const citizenIdDoc = citizenIds.find((c) => c.rentalOrderId === order.id);

        return {
          ...order,
          car,
          user,
          driverLicense: license,
          citizenIdDoc,
        };
      });

      // Sort by orderDate descending
      ordersWithDetails.sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime();
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Load orders error:", error);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatus = (order: OrderWithDetails): string => {
    const status = order.status?.toLowerCase() || '';
    if (status.includes('completed') || status.includes('hoàn thành') || order.actualReturnTime) {
      return 'completed';
    }
    if (status.includes('confirmed') || status.includes('xác nhận')) {
      return 'confirmed';
    }
    if (status.includes('cancelled') || status.includes('hủy')) {
      return 'cancelled';
    }
    return 'pending';
  };

  const getOrderStatusTag = (order: OrderWithDetails) => {
    const status = getOrderStatus(order);
    const config: Record<string, { color: string; text: string; icon: any }> = {
      pending: { color: 'gold', text: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
      confirmed: { color: 'blue', text: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
      completed: { color: 'green', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
    };
    const c = config[status] || config.pending;
    return <Tag color={c.color} icon={c.icon}>{c.text}</Tag>;
  };

  const getDocumentStatusTag = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'approved' || statusLower === '1') {
      return <Tag color="success">Đã xác thực</Tag>;
    }
    if (statusLower === 'rejected' || statusLower === '2') {
      return <Tag color="error">Đã từ chối</Tag>;
    }
    return <Tag color="warning">Chờ xác thực</Tag>;
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchText = search
        ? `${order.id} ${order.car?.name || ''} ${order.car?.model || ''} ${order.user?.fullName || ''} ${order.user?.email || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      
      const matchStatus = filterStatus === "all" ? true : getOrderStatus(order) === filterStatus;
      return matchText && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Xe đã order",
      key: "car",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.car) return '-';
        return (
          <div className="flex items-center gap-2">
            <Image
              src={record.car.imageUrl}
              alt={record.car.name}
              width={40}
              height={30}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="/logo_ev.png"
              preview={false}
            />
            <div>
              <div className="font-medium text-sm">{record.car.name}</div>
              <div className="text-xs text-gray-500">{record.car.model}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Người dùng",
      key: "user",
      width: 180,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.user) return '-';
        return (
          <div>
            <div className="font-medium text-sm">{record.user.fullName || record.user.email}</div>
            <div className="text-xs text-gray-500">{record.user.email}</div>
            {record.user.phone && (
              <div className="text-xs text-gray-500">{record.user.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Giấy tờ",
      key: "documents",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        return (
          <Space direction="vertical" size="small">
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">GPLX:</span> {getDocumentStatusTag(record.driverLicense?.status)}
            </div>
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">CCCD:</span> {getDocumentStatusTag(record.citizenIdDoc?.status)}
            </div>
          </Space>
        );
      },
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatus",
      width: 150,
      render: (_: any, record: OrderWithDetails) => getOrderStatusTag(record),
    },
    {
      title: "Ngày nhận",
      key: "pickupTime",
      width: 150,
      render: (_: any, record: OrderWithDetails) =>
        record.pickupTime ? dayjs(record.pickupTime).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        const status = getOrderStatus(record);
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedOrder(record);
                setDetailModalVisible(true);
              }}
            >
              Chi tiết
            </Button>
            <Button
              type="primary"
              disabled={status !== 'confirmed'}
              onClick={() => onDeliver?.({
                carId: String(record.carId),
                carName: record.car?.name || 'Xe',
                orderId: record.id
              })}
            >
              Bàn giao
            </Button>
            <Button
              disabled={status !== 'confirmed' || !record.actualReturnTime}
              onClick={() => onReturn?.({
                carId: String(record.carId),
                carName: record.car?.name || 'Xe',
                orderId: record.id
              })}
            >
              Nhận xe
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Tìm theo mã đơn, tên xe, người dùng..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          value={filterStatus}
          style={{ width: 200 }}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "pending", label: "Chờ xác nhận" },
            { value: "confirmed", label: "Đã xác nhận" },
            { value: "completed", label: "Hoàn thành" },
            { value: "cancelled", label: "Đã hủy" },
          ]}
        />
      </Space>

      <Table<OrderWithDetails>
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      {/* Detail Modal */}
      {selectedOrder && (
        <Modal
          title={
            <Space>
              <CarOutlined /> Chi tiết đơn hàng #{selectedOrder.id}
            </Space>
          }
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={900}
        >
          <div className="space-y-4">
            {/* Order Status */}
            <Card size="small" className="bg-blue-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Trạng thái đơn hàng:</span>
                {getOrderStatusTag(selectedOrder)}
              </div>
            </Card>

            {/* Car Information */}
            <Card title={<><CarOutlined /> Thông tin xe</>} size="small">
              {selectedOrder.car ? (
                <div>
                  <div className="flex gap-4 mb-3">
                    <Image
                      src={selectedOrder.car.imageUrl}
                      alt={selectedOrder.car.name}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback="/logo_ev.png"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedOrder.car.name}</h3>
                      <p className="text-gray-600">{selectedOrder.car.model}</p>
                      <Descriptions column={2} size="small" className="mt-2">
                        <Descriptions.Item label="Số chỗ">{selectedOrder.car.seats}</Descriptions.Item>
                        <Descriptions.Item label="Loại pin">{selectedOrder.car.batteryType}</Descriptions.Item>
                        <Descriptions.Item label="Giá/ngày">{selectedOrder.car.rentPricePerDay?.toLocaleString('vi-VN')} VNĐ</Descriptions.Item>
                        <Descriptions.Item label="Giá/giờ">{selectedOrder.car.rentPricePerHour?.toLocaleString('vi-VN')} VNĐ</Descriptions.Item>
                      </Descriptions>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Không có thông tin xe</div>
              )}
            </Card>

            {/* User Information */}
            <Card title={<><UserOutlined /> Thông tin người dùng</>} size="small">
              {selectedOrder.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedOrder.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>{selectedOrder.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{selectedOrder.user.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">{selectedOrder.user.address || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            {/* Document Status */}
            <Card title={<><IdcardOutlined /> Trạng thái giấy tờ</>} size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Giấy phép lái xe (GPLX)">
                  {selectedOrder.driverLicense ? (
                    <Space>
                      {getDocumentStatusTag(selectedOrder.driverLicense.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedOrder.driverLicense.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Căn cước công dân (CCCD)">
                  {selectedOrder.citizenIdDoc ? (
                    <Space>
                      {getDocumentStatusTag(selectedOrder.citizenIdDoc.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedOrder.citizenIdDoc.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Order Details */}
            <Card title="Chi tiết đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedOrder.phoneNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{dayjs(selectedOrder.orderDate || selectedOrder.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedOrder.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{dayjs(selectedOrder.pickupTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{dayjs(selectedOrder.expectedReturnTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{dayjs(selectedOrder.actualReturnTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                )}
                {selectedOrder.total && (
                  <Descriptions.Item label="Tổng tiền">
                    <span className="font-semibold text-green-600">
                      {selectedOrder.total.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        </Modal>
      )}
    </div>
  );
}
