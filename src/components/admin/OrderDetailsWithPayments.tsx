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
  Alert,
  Divider,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  FileTextOutlined,
  PictureOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, rentalLocationApi, authApi, carDeliveryHistoryApi, carReturnHistoryApi } from "@/services/api";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Detail modal state
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailLocation, setDetailLocation] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // History modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<OrderWithDetails | null>(null);
  const [orderHistory, setOrderHistory] = useState<{
    deliveryHistory?: any;
    returnHistory?: any;
    payments?: any[];
  } | null>(null);

  useEffect(() => {
    loadCars();
    loadUsers();
  }, []);

  useEffect(() => {
    if (cars.length > 0 && users.length > 0) {
      loadOrders();
    }
  }, [cars.length, users.length]);

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

      // Lấy tất cả locations từ cars (dựa vào RentalLocationId của mỗi car)
      const uniqueLocationIds = new Set<number>();
      ordersData.forEach((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        if (car) {
          const rentalLocationId = (car as any).rentalLocationId ?? (car as any).RentalLocationId;
          if (rentalLocationId) {
            uniqueLocationIds.add(rentalLocationId);
          }
        }
      });

      // Fetch tất cả locations cùng lúc
      const locationPromises = Array.from(uniqueLocationIds).map(id => 
        rentalLocationApi.getById(id).then(res => res.success && res.data ? { id, location: res.data } : null)
      );
      const locationResults = await Promise.all(locationPromises);
      const locationMap = new Map<number, RentalLocationData>();
      locationResults.forEach(result => {
        if (result && result.location) {
          locationMap.set(result.id, result.location as RentalLocationData);
        }
      });

      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        const rentalLocationId = car ? ((car as any).rentalLocationId ?? (car as any).RentalLocationId) : undefined;
        const location = rentalLocationId ? locationMap.get(rentalLocationId) : undefined;

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
      const [carResponse, userResponse] = await Promise.all([
        carsApi.getById(data.carId.toString()),
        authApi.getProfileById(data.userId),
      ]);

      if (carResponse.success && carResponse.data) {
        const car = carResponse.data;
        setDetailCar(car);
        
        // Lấy location từ car.RentalLocationId qua API RentalLocation
        const rentalLocationId = (car as any).rentalLocationId ?? (car as any).RentalLocationId;
        if (rentalLocationId) {
          try {
            const locationResponse = await rentalLocationApi.getById(rentalLocationId);
            if (locationResponse.success && locationResponse.data) {
              const loc = locationResponse.data as any;
              setDetailLocation({
                id: loc.id ?? loc.Id,
                name: loc.name ?? loc.Name,
                address: loc.address ?? loc.Address
              });
            }
          } catch (error) {
            console.error("Error fetching location:", error);
          }
        }
      }
      if (userResponse.success && userResponse.data) {
        setDetailUser(userResponse.data);
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
      return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ Cọc Giữ Xe</Tag>;
    } else if (statusLower.includes('cancelled')) {
      return <Tag color="red">Đã hủy</Tag>;
    } else if (statusLower.includes('renting')) {
      return <Tag color="blue" icon={<CarOutlined />}>Đang thuê</Tag>;
    } else if (statusLower.includes('returned')) {
      return <Tag color="purple">Đã trả xe</Tag>;
    } else if (statusLower.includes('paymentpending')) {
      return <Tag color="orange">Chờ thanh toán</Tag>;
    } else if (statusLower.includes('depositconfirmed') || statusLower.includes('orderdepositconfirmed')) {
      return <Tag color="cyan">Đã Cọc Giữ Xe</Tag>;
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

  const getOrderStatusTag = (order: OrderWithDetails) => {
    const statusLower = (order.status || '').toLowerCase();
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
    } else if (statusLower.includes('depositconfirmed') || statusLower.includes('orderdepositconfirmed')) {
      return <Tag color="cyan">Đã Cọc Giữ Xe</Tag>;
    }
    return <Tag>{order.status}</Tag>;
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
      width: 200,
      render: (_: any, record: OrderWithDetails) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
          >
            Chi tiết
          </Button>
          {record.status?.toLowerCase().includes('completed') && (
            <Button
              type="default"
              icon={<FileTextOutlined />}
              onClick={async () => {
                setSelectedOrderForHistory(record);
                setHistoryModalVisible(true);
                // Load lịch sử payments, delivery và return history
                try {
                  setLoading(true);
                  const [paymentsResponse, deliveryResponse, returnResponse] = await Promise.all([
                    rentalOrderApi.getByOrderWithPayments(record.id),
                    carDeliveryHistoryApi.getByOrderId(record.id),
                    carReturnHistoryApi.getByOrderId(record.id)
                  ]);
                  
                  setOrderHistory({
                    deliveryHistory: deliveryResponse.success ? deliveryResponse.data : null,
                    returnHistory: returnResponse.success ? returnResponse.data : null,
                    payments: paymentsResponse.success && paymentsResponse.data?.payments?.$values 
                      ? paymentsResponse.data.payments.$values 
                      : []
                  });
                } catch (error) {
                  console.error('Error loading order history:', error);
                  message.error('Không thể tải lịch sử đơn hàng');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Xem lịch sử
            </Button>
          )}
        </Space>
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
                            <Tag color="blue">
                              {(() => {
                                const methodMap: Record<string, string> = {
                                  'Direct': 'Chuyển khoản',
                                  'VNPAY': 'VNPAY',
                                  'bank_transfer': 'Chuyển khoản',
                                  'cash': 'Tiền mặt',
                                };
                                return methodMap[payment.paymentMethod || ''] || payment.paymentMethod || '-';
                              })()}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Ngày thanh toán">
                            {payment.paymentDate && payment.paymentDate !== '0001-01-01T00:00:00' 
                              ? formatVietnamTime(payment.paymentDate) 
                              : <Tag color="default">Chưa cập nhật</Tag>}
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

      {/* History Modal - Xem lịch sử đơn hàng */}
      {selectedOrderForHistory && (
        <Modal
          title={
            <Space>
              <FileTextOutlined /> Lịch sử đơn hàng #{selectedOrderForHistory.id}
            </Space>
          }
          open={historyModalVisible}
          onCancel={() => {
            setHistoryModalVisible(false);
            setOrderHistory(null);
            setSelectedOrderForHistory(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setHistoryModalVisible(false);
              setOrderHistory(null);
              setSelectedOrderForHistory(null);
            }}>
              Đóng
            </Button>
          ]}
          width={1000}
        >
          <div className="space-y-4">
            {/* Thông tin đơn hàng */}
            <Card title="Thông tin đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrderForHistory.id}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{getOrderStatusTag(selectedOrderForHistory)}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{formatVietnamTime(selectedOrderForHistory.orderDate || selectedOrderForHistory.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatVietnamTime(selectedOrderForHistory.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatVietnamTime(selectedOrderForHistory.expectedReturnTime)}</Descriptions.Item>
                {selectedOrderForHistory.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatVietnamTime(selectedOrderForHistory.actualReturnTime)}</Descriptions.Item>
                )}
                {selectedOrderForHistory.car && (
                  <>
                    <Descriptions.Item label="Xe">{selectedOrderForHistory.car.name} - {selectedOrderForHistory.car.model}</Descriptions.Item>
                    <Descriptions.Item label="Giá/ngày">{selectedOrderForHistory.car.rentPricePerDay?.toLocaleString('vi-VN')} VNĐ</Descriptions.Item>
                  </>
                )}
                {selectedOrderForHistory.user && (
                  <>
                    <Descriptions.Item label="Khách hàng">{selectedOrderForHistory.user.fullName || selectedOrderForHistory.user.email}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selectedOrderForHistory.user.email}</Descriptions.Item>
                  </>
                )}
                {selectedOrderForHistory.rentalLocation && (
                  <Descriptions.Item label="Địa điểm nhận xe">
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {selectedOrderForHistory.rentalLocation.name}
                      </div>
                      {selectedOrderForHistory.rentalLocation.address && (
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {selectedOrderForHistory.rentalLocation.address}
                        </div>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {selectedOrderForHistory.deposit && (
                  <Descriptions.Item label="Tiền cọc">
                    {selectedOrderForHistory.deposit.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Chi phí - Tách riêng để rõ ràng */}
            <Card title="Chi phí" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={2} size="small">
                {selectedOrderForHistory.extraFee && (
                  <Descriptions.Item label="Phí phát sinh">
                    <span style={{ color: '#fa8c16', fontWeight: 600 }}>
                      {selectedOrderForHistory.extraFee.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrderForHistory.damageFee && (
                  <Descriptions.Item label="Phí hư hỏng">
                    <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                      {selectedOrderForHistory.damageFee.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrderForHistory.damageNotes && (
                  <Descriptions.Item label="Ghi chú hư hỏng">
                    <div style={{ 
                      color: '#fa8c16',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {selectedOrderForHistory.damageNotes}
                    </div>
                  </Descriptions.Item>
                )}
                {selectedOrderForHistory.subTotal && (
                  <Descriptions.Item label="Tổng phụ phí">
                    <span style={{ fontWeight: 600 }}>
                      {selectedOrderForHistory.subTotal.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrderForHistory.total && (
                  <Descriptions.Item label="Tổng tiền" span={2}>
                    <span style={{ 
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#52c41a'
                    }}>
                      {selectedOrderForHistory.total.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Lịch sử thanh toán */}
            {orderHistory?.payments && orderHistory.payments.length > 0 && (
              <Card title="Lịch sử thanh toán" size="small">
                <Table
                  dataSource={orderHistory.payments}
                  rowKey="paymentId"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Loại thanh toán',
                      dataIndex: 'paymentType',
                      key: 'paymentType',
                      render: (text: string) => {
                        const typeMap: Record<string, string> = {
                          'OrderDeposit': 'Tiền giữ chỗ',
                          'CarDeposit': 'Cọc xe',
                          'RentalFee': 'Tiền thuê',
                          'RefundDepositCar': 'Hoàn cọc xe',
                          'RefundDepositOrder': 'Hoàn cọc đơn',
                        };
                        return typeMap[text] || text;
                      }
                    },
                    {
                      title: 'Số tiền',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount: number) => (
                        <span className="font-semibold">
                          {amount?.toLocaleString('vi-VN')} VNĐ
                        </span>
                      )
                    },
                    {
                      title: 'Phương thức',
                      dataIndex: 'paymentMethod',
                      key: 'paymentMethod',
                      render: (method: string) => {
                        const methodMap: Record<string, string> = {
                          'Direct': 'Chuyển khoản',
                          'VNPAY': 'VNPAY',
                          'bank_transfer': 'Chuyển khoản',
                          'cash': 'Tiền mặt',
                        };
                        return methodMap[method] || method;
                      }
                    },
                    {
                      title: 'Ngày thanh toán',
                      dataIndex: 'paymentDate',
                      key: 'paymentDate',
                      render: (date: string) => formatVietnamTime(date)
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => {
                        const statusMap: Record<string, { text: string; color: string }> = {
                          'Pending': { text: 'Chờ xử lý', color: 'orange' },
                          'Completed': { text: 'Hoàn thành', color: 'green' },
                          'Failed': { text: 'Thất bại', color: 'red' },
                          'Refunded': { text: 'Đã hoàn', color: 'blue' },
                        };
                        const config = statusMap[status] || { text: status, color: 'default' };
                        return <Tag color={config.color}>{config.text}</Tag>;
                      }
                    },
                    {
                      title: 'Hình ảnh',
                      key: 'image',
                      width: 120,
                      render: (_: unknown, record: { billingImageUrl?: string; imageUrl?: string; receiptImageUrl?: string; image?: string }) => {
                        // Kiểm tra các trường có thể chứa hình ảnh
                        const imageUrl = record.billingImageUrl || record.imageUrl || record.receiptImageUrl || record.image;
                        
                        if (imageUrl) {
                          return (
                            <Image
                              src={imageUrl}
                              alt="Chứng từ thanh toán"
                              width={80}
                              height={60}
                              style={{ 
                                objectFit: 'cover', 
                                borderRadius: 4,
                                cursor: 'pointer'
                              }}
                              fallback="/logo_ev.png"
                              preview={{
                                mask: 'Xem ảnh'
                              }}
                            />
                          );
                        }
                        
                        return <span style={{ color: '#999' }}>-</span>;
                      }
                    },
                  ]}
                />
              </Card>
            )}

            {/* Hình ảnh từ delivery và return history */}
            <Card title={<span><PictureOutlined style={{ marginRight: 8 }} />Thông tin giao nhận xe</span>} size="small">
              <div className="space-y-6">
                {/* Hình ảnh giao xe */}
                <div>
                  <h4 className="font-semibold mb-3 text-base" style={{ color: '#1890ff' }}>
                    <CarOutlined style={{ marginRight: 8 }} />Thông tin khi giao xe
                  </h4>
                  {orderHistory?.deliveryHistory ? (() => {
                    const delivery = orderHistory.deliveryHistory;
                    // Xử lý cả camelCase và PascalCase
                    const odometerStart = delivery.odometerStart ?? delivery.OdometerStart;
                    const batteryLevelStart = delivery.batteryLevelStart ?? delivery.BatteryLevelStart;
                    const vehicleConditionStart = delivery.vehicleConditionStart || delivery.VehicleConditionStart || 'Chưa có';
                    const images = [
                      delivery.imageUrl || delivery.ImageUrl,
                      delivery.imageUrl2 || delivery.ImageUrl2,
                      delivery.imageUrl3 || delivery.ImageUrl3,
                      delivery.imageUrl4 || delivery.ImageUrl4,
                      delivery.imageUrl5 || delivery.ImageUrl5,
                      delivery.imageUrl6 || delivery.ImageUrl6,
                    ].filter(Boolean);
                    
                    return (
                      <div>
                        <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
                          <Descriptions 
                            column={1} 
                            size="small"
                            labelStyle={{ fontWeight: 600, width: '120px' }}
                            contentStyle={{ fontWeight: 500 }}
                          >
                            <Descriptions.Item 
                              label={
                                <span>
                                  <DashboardOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                                  Số km
                                </span>
                              }
                            >
                              {odometerStart !== null && odometerStart !== undefined 
                                ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{odometerStart} km</span>
                                : <span style={{ color: '#999' }}>Chưa có</span>
                              }
                            </Descriptions.Item>
                            <Descriptions.Item 
                              label={
                                <span>
                                  <ThunderboltOutlined style={{ marginRight: 4, color: '#faad14' }} />
                                  % Pin
                                </span>
                              }
                            >
                              {batteryLevelStart !== null && batteryLevelStart !== undefined 
                                ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{batteryLevelStart}%</span>
                                : <span style={{ color: '#999' }}>Chưa có</span>
                              }
                            </Descriptions.Item>
                            <Descriptions.Item 
                              label={
                                <span>
                                  <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                                  Tình trạng
                                </span>
                              }
                            >
                              <Tag color={vehicleConditionStart === 'ok' || vehicleConditionStart === 'OK' ? 'green' : 'orange'}>
                                {vehicleConditionStart}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                        {images.length > 0 ? (
                          <div>
                            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                              <PictureOutlined style={{ marginRight: 4 }} />
                              {images.length} hình ảnh
                            </div>
                            <Space wrap size="small">
                              {images.map((img, index) => (
                                <Image
                                  key={index}
                                  src={img}
                                  alt={`Giao xe ${index + 1}`}
                                  width={180}
                                  height={120}
                                  style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                                  preview={{
                                    mask: 'Xem ảnh',
                                    maskClassName: 'custom-preview-mask'
                                  }}
                                />
                              ))}
                            </Space>
                          </div>
                        ) : (
                          <Alert
                            message="Không có hình ảnh"
                            type="info"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )}
                      </div>
                    );
                  })() : (
                    <Alert
                      message="Chưa có lịch sử giao xe"
                      type="warning"
                      showIcon
                    />
                  )}
                </div>
                
                <Divider />
                
                {/* Hình ảnh trả xe */}
                <div>
                  <h4 className="font-semibold mb-3 text-base" style={{ color: '#ff4d4f' }}>
                    <CarOutlined style={{ marginRight: 8 }} />Thông tin khi trả xe
                  </h4>
                  {orderHistory?.returnHistory ? (() => {
                    const returnHistory = orderHistory.returnHistory;
                    // Xử lý cả camelCase và PascalCase
                    const odometerEnd = returnHistory.odometerEnd ?? returnHistory.OdometerEnd;
                    const batteryLevelEnd = returnHistory.batteryLevelEnd ?? returnHistory.BatteryLevelEnd;
                    const vehicleConditionEnd = returnHistory.vehicleConditionEnd || returnHistory.VehicleConditionEnd || 'Chưa có';
                    const images = [
                      returnHistory.imageUrl || returnHistory.ImageUrl,
                      returnHistory.imageUrl2 || returnHistory.ImageUrl2,
                      returnHistory.imageUrl3 || returnHistory.ImageUrl3,
                      returnHistory.imageUrl4 || returnHistory.ImageUrl4,
                      returnHistory.imageUrl5 || returnHistory.ImageUrl5,
                      returnHistory.imageUrl6 || returnHistory.ImageUrl6,
                    ].filter(Boolean);
                    
                    return (
                      <div>
                        <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
                          <Descriptions 
                            column={1} 
                            size="small"
                            labelStyle={{ fontWeight: 600, width: '120px' }}
                            contentStyle={{ fontWeight: 500 }}
                          >
                            <Descriptions.Item 
                              label={
                                <span>
                                  <DashboardOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                                  Số km
                                </span>
                              }
                            >
                              {odometerEnd !== null && odometerEnd !== undefined 
                                ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{odometerEnd} km</span>
                                : <span style={{ color: '#999' }}>Chưa có</span>
                              }
                            </Descriptions.Item>
                            <Descriptions.Item 
                              label={
                                <span>
                                  <ThunderboltOutlined style={{ marginRight: 4, color: '#faad14' }} />
                                  % Pin
                                </span>
                              }
                            >
                              {batteryLevelEnd !== null && batteryLevelEnd !== undefined 
                                ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{batteryLevelEnd}%</span>
                                : <span style={{ color: '#999' }}>Chưa có</span>
                              }
                            </Descriptions.Item>
                            <Descriptions.Item 
                              label={
                                <span>
                                  <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                                  Tình trạng
                                </span>
                              }
                            >
                              <Tag color={vehicleConditionEnd === 'ok' || vehicleConditionEnd === 'OK' ? 'green' : 'orange'}>
                                {vehicleConditionEnd}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                        {images.length > 0 ? (
                          <div>
                            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                              <PictureOutlined style={{ marginRight: 4 }} />
                              {images.length} hình ảnh
                            </div>
                            <Space wrap size="small">
                              {images.map((img, index) => (
                                <Image
                                  key={index}
                                  src={img}
                                  alt={`Trả xe ${index + 1}`}
                                  width={180}
                                  height={120}
                                  style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                                  preview={{
                                    mask: 'Xem ảnh',
                                    maskClassName: 'custom-preview-mask'
                                  }}
                                />
                              ))}
                            </Space>
                          </div>
                        ) : (
                          <Alert
                            message="Không có hình ảnh"
                            type="info"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )}
                      </div>
                    );
                  })() : (
                    <Alert
                      message="Chưa có lịch sử trả xe"
                      type="warning"
                      showIcon
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </Modal>
      )}
    </>
  );
}
