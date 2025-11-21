"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Input,
  Button,
  Space,
  Descriptions,
  Tag,
  message,
  Spin,
  Empty,
  Table,
  Modal,
  Image,
  Select,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, rentalLocationApi } from "@/services/api";
import type { RentalOrderData, User, RentalLocationData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatVietnamTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  try {
    const parsedDate = dayjs(date);
    if (parsedDate.isUTC() || typeof date === 'string' && (date.includes('Z') || date.includes('+') || date.includes('-', 10))) {
      return parsedDate.tz("Asia/Ho_Chi_Minh").format('DD/MM/YYYY HH:mm');
    }
    return parsedDate.format('DD/MM/YYYY HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '-';
  }
};

interface OrderWithDetails extends RentalOrderData {
  car?: Car;
  user?: User;
  rentalLocation?: RentalLocationData;
}

export default function OrderDetailsWithPayments() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Detail modal state
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailLocation, setDetailLocation] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadCars();
    loadUsers();
    loadLocations();
  }, []);

  useEffect(() => {
    if (cars.length > 0 && users.length > 0) {
      loadOrders();
    }
  }, [cars.length, users.length, locations.length]);

  const loadOrders = async () => {
    if (cars.length === 0 || users.length === 0) return; // Wait for cars and users to load
    
    setLoading(true);
    try {
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể tải danh sách đơn hàng");
        setLoading(false);
        return;
      }

      const ordersData = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        const location = locations.find((l) => l.id === order.rentalLocationId);

        return {
          ...order,
          car,
          user,
          rentalLocation: location,
        };
      });

      ordersWithDetails.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || '').getTime();
        const dateB = new Date(b.createdAt || b.orderDate || '').getTime();
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

  const loadCars = async () => {
    try {
      const response = await carsApi.getAll();
      if (response.success && response.data) {
        const carsList = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.$values || [];
        setCars(carsList.filter((car: Car) => !car.isDeleted));
      }
    } catch (error) {
      console.error("Load cars error:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await authApi.getAllUsers();
      if (response.success && response.data) {
        const usersList = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.$values || [];
        setUsers(usersList);
      }
    } catch (error) {
      console.error("Load users error:", error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await rentalLocationApi.getAll();
      if (response.success && response.data) {
        const locationsList = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.$values || [];
        setLocations(locationsList);
      }
    } catch (error) {
      console.error("Load locations error:", error);
    }
  };

  const handleViewDetails = async (orderId: number) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    setOrderData(null);
    setDetailCar(null);
    setDetailUser(null);
    setDetailLocation(null);
    
    try {
      const response = await rentalOrderApi.getByOrderWithPayments(orderId);
      
      if (!response.success || !response.data) {
        message.error(response.error || response.message || "Không tìm thấy đơn hàng");
        return;
      }

      const data = response.data;
      setOrderData(data);

      // Fetch additional details
      const [carResponse, userResponse, locationResponse] = await Promise.all([
        carsApi.getById(data.carId.toString()),
        authApi.getProfileById(data.userId),
        rentalLocationApi.getById(data.rentalLocationId),
      ]);

      if (carResponse.success && carResponse.data) {
        setDetailCar(carResponse.data);
      }
      if (userResponse.success && userResponse.data) {
        setDetailUser(userResponse.data);
      }
      if (locationResponse.success && locationResponse.data) {
        setDetailLocation(locationResponse.data);
      }
    } catch (error) {
      console.error("Load order details error:", error);
      message.error("Không thể tải thông tin đơn hàng");
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) {
      return <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
    } else if (statusLower.includes('pending')) {
      return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ xử lý</Tag>;
    } else if (statusLower.includes('cancelled')) {
      return <Tag color="red">Đã hủy</Tag>;
    } else if (statusLower.includes('renting')) {
      return <Tag color="blue" icon={<CarOutlined />}>Đang thuê</Tag>;
    } else if (statusLower.includes('returned')) {
      return <Tag color="purple">Đã trả xe</Tag>;
    } else if (statusLower.includes('paymentpending')) {
      return <Tag color="orange">Chờ thanh toán</Tag>;
    }
    return <Tag>{status}</Tag>;
  };

  const getPaymentStatusTag = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) {
      return <Tag color="green">Đã thanh toán</Tag>;
    } else if (statusLower.includes('pending')) {
      return <Tag color="orange">Chờ thanh toán</Tag>;
    }
    return <Tag>{status}</Tag>;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchText = search
        ? `${order.id} ${order.car?.name || ''} ${order.car?.model || ''} ${order.user?.fullName || ''} ${order.user?.email || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      
      const matchStatus = statusFilter === "all" 
        ? true 
        : order.status?.toLowerCase().includes(statusFilter.toLowerCase());
      return matchText && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Xe",
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
      title: "Khách hàng",
      key: "user",
      width: 180,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.user) return '-';
        return (
          <div>
            <div className="font-medium text-sm">{record.user.fullName || record.user.email}</div>
            <div className="text-xs text-gray-500">{record.user.email}</div>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_: any, record: OrderWithDetails) => getStatusTag(record.status),
    },
    {
      title: "Ngày nhận",
      key: "pickupTime",
      width: 150,
      render: (_: any, record: OrderWithDetails) => formatVietnamTime(record.pickupTime),
    },
    {
      title: "Tổng tiền",
      key: "total",
      width: 150,
      render: (_: any, record: OrderWithDetails) => (
        <span className="font-semibold text-green-600">
          {record.total?.toLocaleString('vi-VN') || 0} VNĐ
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: any, record: OrderWithDetails) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const payments = orderData?.payments?.$values || [];

  return (
    <>
      <Card title={<Space><CarOutlined /> Danh sách đơn hàng với thanh toán</Space>}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Tìm theo mã đơn, tên xe, khách hàng..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => setSearch(value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            style={{ width: 200 }}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "completed", label: "Hoàn thành" },
              { value: "pending", label: "Chờ xử lý" },
              { value: "renting", label: "Đang thuê" },
              { value: "returned", label: "Đã trả xe" },
              { value: "paymentpending", label: "Chờ thanh toán" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
          <Button onClick={loadOrders}>Làm mới</Button>
        </Space>

        <Spin spinning={loading}>
          {filteredOrders.length === 0 ? (
            <Empty description="Không có đơn hàng nào" />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredOrders}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng cộng: ${total} đơn hàng`,
              }}
              scroll={{ x: 1200 }}
              onRow={(record) => ({
                onClick: () => handleViewDetails(record.id),
                style: { cursor: 'pointer' },
              })}
            />
          )}
        </Spin>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <CarOutlined /> Chi tiết đơn hàng {orderData ? `#${orderData.id}` : ''}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setOrderData(null);
          setDetailCar(null);
          setDetailUser(null);
          setDetailLocation(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={900}
      >
        <Spin spinning={detailLoading}>
          {!orderData ? (
            <Empty description="Đang tải thông tin..." />
          ) : (
            <div className="space-y-4">
              {/* Thông tin cơ bản */}
              <Card title={<><CarOutlined /> Thông tin đơn hàng</>} size="small">
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Mã đơn hàng">
                    <strong>#{orderData.id}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {getStatusTag(orderData.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    {orderData.phoneNumber || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Có tài xế">
                    {orderData.withDriver ? <Tag color="blue">Có</Tag> : <Tag>Không</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày đặt">
                    {formatVietnamTime(orderData.orderDate || orderData.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày nhận xe">
                    {formatVietnamTime(orderData.pickupTime)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày trả (dự kiến)">
                    {formatVietnamTime(orderData.expectedReturnTime)}
                  </Descriptions.Item>
                  {orderData.actualReturnTime && (
                    <Descriptions.Item label="Ngày trả (thực tế)">
                      {formatVietnamTime(orderData.actualReturnTime)}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Ngày tạo">
                    {formatVietnamTime(orderData.createdAt)}
                  </Descriptions.Item>
                  {orderData.updatedAt && (
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatVietnamTime(orderData.updatedAt)}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Thông tin xe */}
              {detailCar && (
                <Card title={<><CarOutlined /> Thông tin xe</>} size="small">
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Tên xe">{detailCar.name}</Descriptions.Item>
                    <Descriptions.Item label="Model">{detailCar.model}</Descriptions.Item>
                    <Descriptions.Item label="Số chỗ">{detailCar.seats}</Descriptions.Item>
                    <Descriptions.Item label="Loại pin">{detailCar.batteryType}</Descriptions.Item>
                    <Descriptions.Item label="Giá/ngày">
                      {detailCar.rentPricePerDay?.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {/* Thông tin khách hàng */}
              {detailUser && (
                <Card title={<><UserOutlined /> Thông tin khách hàng</>} size="small">
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Họ tên">{detailUser.fullName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{detailUser.email || '-'}</Descriptions.Item>
                    {detailUser.phone && (
                      <Descriptions.Item label="Số điện thoại">{detailUser.phone}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              )}

              {/* Thông tin địa điểm */}
              {detailLocation && (
                <Card title={<><CalendarOutlined /> Địa điểm thuê</>} size="small">
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Tên địa điểm">{detailLocation.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">{detailLocation.address || '-'}</Descriptions.Item>
                    {detailLocation.phone && (
                      <Descriptions.Item label="Số điện thoại">{detailLocation.phone}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              )}

              {/* Thông tin tài chính */}
              <Card title={<><DollarOutlined /> Thông tin tài chính</>} size="small">
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Tổng phụ">
                    <strong>{orderData.subTotal?.toLocaleString('vi-VN') || 0} VNĐ</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tiền cọc">
                    <strong>{orderData.deposit?.toLocaleString('vi-VN') || 0} VNĐ</strong>
                  </Descriptions.Item>
                  {orderData.discount && (
                    <Descriptions.Item label="Giảm giá">
                      {orderData.discount.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                  )}
                  {orderData.extraFee > 0 && (
                    <Descriptions.Item label="Phí phát sinh">
                      {orderData.extraFee.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                  )}
                  {orderData.damageFee > 0 && (
                    <Descriptions.Item label="Phí hư hỏng">
                      {orderData.damageFee.toLocaleString('vi-VN')} VNĐ
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Tổng tiền" span={2}>
                    <strong className="text-green-600 text-lg">
                      {orderData.total?.toLocaleString('vi-VN') || 0} VNĐ
                    </strong>
                  </Descriptions.Item>
                  {orderData.damageNotes && (
                    <Descriptions.Item label="Ghi chú hư hỏng" span={2}>
                      {orderData.damageNotes}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Thông tin thanh toán */}
              {payments.length > 0 && (
                <Card title={<><DollarOutlined /> Thông tin thanh toán ({payments.length})</>} size="small">
                  <div className="space-y-3">
                    {payments.map((payment: any, index: number) => (
                      <Card
                        key={payment.paymentId || index}
                        size="small"
                        className={payment.paymentType === "Deposit" ? "bg-yellow-50" : "bg-green-50"}
                      >
                        <Descriptions column={2} size="small" bordered>
                          <Descriptions.Item label="Loại thanh toán">
                            <Tag color={payment.paymentType === "Deposit" ? "orange" : "green"}>
                              {payment.paymentType === "Deposit" ? "Tiền cọc" : "Thanh toán đơn hàng"}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Trạng thái">
                            {getPaymentStatusTag(payment.status)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Số tiền">
                            <strong className="text-lg">
                              {payment.amount?.toLocaleString('vi-VN') || 0} VNĐ
                            </strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="Phương thức">
                            <Tag color="blue">{payment.paymentMethod || '-'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Ngày thanh toán">
                            {formatVietnamTime(payment.paymentDate)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Mã thanh toán">
                            #{payment.paymentId}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </>
  );
}
