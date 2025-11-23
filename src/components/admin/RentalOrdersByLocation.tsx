"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Image,
  Input,
  Select,
  Button,
  message,
  Spin,
  Empty,
  Descriptions,
  Modal,
} from "antd";
import {
  CarOutlined,
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
  DollarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { paymentApi, rentalOrderApi, rentalLocationApi, carsApi, authApi } from "@/services/api";
import type { PaymentData, RentalOrderData, RentalLocationData, User } from "@/services/api";
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
  paymentId?: number; // Add paymentId for unique key
}

const RentalOrderStatus = {
  Pending: 0,
  DocumentsSubmitted: 1,
  DepositPending: 2,
  Confirmed: 3,
  Renting: 4,
  Returned: 5,
  PaymentPending: 6,
  Cancelled: 7,
  Completed: 8,
} as const;

const statusLabels: Record<number, { text: string; color: string; icon: any }> = {
  0: { text: 'Chờ xác nhận', color: 'gold', icon: <ClockCircleOutlined /> },
  1: { text: 'Đã nộp giấy tờ', color: 'blue', icon: <IdcardOutlined /> },
  2: { text: 'Chờ tiền cọc', color: 'orange', icon: <DollarOutlined /> },
  3: { text: 'Đã xác nhận', color: 'cyan', icon: <CheckCircleOutlined /> },
  4: { text: 'Đang thuê', color: 'green', icon: <CarOutlined /> },
  5: { text: 'Đã trả xe', color: 'purple', icon: <CarOutlined /> },
  6: { text: 'Chờ thanh toán', color: 'orange', icon: <DollarOutlined /> },
  7: { text: 'Đã hủy', color: 'red', icon: <CloseCircleOutlined /> },
  8: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
};

const getStatusNumber = (status: string | undefined): number => {
  if (!status) return RentalOrderStatus.Pending;
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pending') && !statusLower.includes('deposit') && !statusLower.includes('payment')) return RentalOrderStatus.Pending;
  if (statusLower.includes('documentssubmitted') || statusLower.includes('đã nộp giấy tờ')) return RentalOrderStatus.DocumentsSubmitted;
  if (statusLower.includes('depositpending') || statusLower.includes('chờ tiền cọc')) return RentalOrderStatus.DepositPending;
  if (statusLower.includes('confirmed') || statusLower.includes('đã xác nhận')) return RentalOrderStatus.Confirmed;
  if (statusLower.includes('renting') || statusLower.includes('đang thuê')) return RentalOrderStatus.Renting;
  if (statusLower.includes('returned') || statusLower.includes('đã trả xe')) return RentalOrderStatus.Returned;
  if (statusLower.includes('paymentpending') || statusLower.includes('chờ thanh toán')) return RentalOrderStatus.PaymentPending;
  if (statusLower.includes('cancelled') || statusLower.includes('hủy')) return RentalOrderStatus.Cancelled;
  if (statusLower.includes('completed') || statusLower.includes('hoàn thành')) return RentalOrderStatus.Completed;
  return RentalOrderStatus.Pending;
};

export default function RentalOrdersByLocation() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadLocations();
    loadCars();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      loadOrdersByLocation(selectedLocationId);
    } else {
      setOrders([]);
    }
  }, [selectedLocationId]);

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
      message.error("Không thể tải danh sách địa điểm");
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

  const loadOrdersByLocation = async (locationId: number) => {
    setLoading(true);
    try {
      // Fetch payments by location
      const paymentsResponse = await paymentApi.getByLocation(locationId);
      if (!paymentsResponse.success || !paymentsResponse.data) {
        setOrders([]);
        message.warning("Không có thanh toán nào tại địa điểm này");
        return;
      }

      const responseData = paymentsResponse.data;
      const payments = responseData.payments?.$values || [];

      // Get all rental order IDs from payments
      const rentalOrderIds = payments
        .map((p: PaymentData) => p.rentalOrderId)
        .filter((id): id is number => id !== undefined && id !== null);

      // Fetch full order details for all orders
      const ordersMap = new Map<number, RentalOrderData>();
      if (rentalOrderIds.length > 0) {
        const allOrdersResponse = await rentalOrderApi.getAll();
        if (allOrdersResponse.success && allOrdersResponse.data) {
          const allOrders = Array.isArray(allOrdersResponse.data)
            ? allOrdersResponse.data
            : (allOrdersResponse.data as any)?.$values || [];
          
          allOrders.forEach((order: RentalOrderData) => {
            if (rentalOrderIds.includes(order.id)) {
              ordersMap.set(order.id, order);
            }
          });
        }
      }

      // Map payments to orders with details
      // Each payment already contains order summary and user data
      const ordersWithDetails: OrderWithDetails[] = payments
        .map((payment: PaymentData) => {
          if (!payment.rentalOrderId || !payment.user) return null;

          // Get full order details from map
          const fullOrder = ordersMap.get(payment.rentalOrderId);
          if (!fullOrder) return null;

          // Merge payment order summary with full order data
          const orderData: RentalOrderData = {
            ...fullOrder,
            // Override with payment.order data if available (more recent)
            orderDate: payment.order?.orderDate || fullOrder.orderDate,
            pickupTime: payment.order?.pickupTime || fullOrder.pickupTime,
            expectedReturnTime: payment.order?.expectedReturnTime || fullOrder.expectedReturnTime,
            actualReturnTime: payment.order?.actualReturnTime || fullOrder.actualReturnTime,
            total: payment.order?.total || fullOrder.total,
            orderId: payment.order?.orderId || fullOrder.id,
          };

          // Find car by carId
          const car = orderData.carId ? cars.find((c) => c.id === orderData.carId) : undefined;
          const location = locations.find((l) => l.id === locationId) || responseData.location;

          return {
            ...orderData,
            car,
            user: payment.user,
            rentalLocation: location,
            paymentId: payment.paymentId || payment.id, // Add paymentId for unique key
          };
        })
        .filter((order): order is OrderWithDetails => order !== null);

      ordersWithDetails.sort((a, b) => {
        const dateA = new Date(a.pickupTime || a.orderDate || a.createdAt || '').getTime();
        const dateB = new Date(b.pickupTime || b.orderDate || b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Load orders by location error:", error);
      message.error("Không thể tải danh sách đơn hàng");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusTag = (order: OrderWithDetails) => {
    const statusNum = getStatusNumber(order.status);
    const config = statusLabels[statusNum] || statusLabels[RentalOrderStatus.Pending];
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
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
        : getStatusNumber(order.status).toString() === statusFilter;
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
      render: (_: any, record: OrderWithDetails) => getOrderStatusTag(record),
    },
    {
      title: "Ngày nhận",
      key: "pickupTime",
      width: 150,
      render: (_: any, record: OrderWithDetails) => formatVietnamTime(record.pickupTime),
    },
    {
      title: "Ngày trả (dự kiến)",
      key: "expectedReturnTime",
      width: 150,
      render: (_: any, record: OrderWithDetails) => formatVietnamTime(record.expectedReturnTime),
    },
    {
      title: "Tổng tiền",
      key: "total",
      width: 120,
      render: (_: any, record: OrderWithDetails) =>
        record.total ? (
          <span className="font-semibold text-green-600">
            {record.total.toLocaleString('vi-VN')} VNĐ
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: any, record: OrderWithDetails) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOrder(record);
            setDetailModalVisible(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: "bold" }}>
            Đơn hàng theo địa điểm thuê
          </h2>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              style={{ width: 300 }}
              placeholder="Chọn địa điểm thuê"
              value={selectedLocationId}
              onChange={setSelectedLocationId}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={locations.map((loc) => ({
                label: `${loc.name} - ${loc.address || ''}`,
                value: loc.id,
              }))}
            />
            {selectedLocationId && (
              <>
                <Input.Search
                  placeholder="Tìm theo mã đơn, tên xe, khách hàng..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 300 }}
                />
                <Select
                  value={statusFilter}
                  style={{ width: 200 }}
                  onChange={(v) => setStatusFilter(v)}
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "0", label: "Chờ xác nhận" },
                    { value: "1", label: "Đã nộp giấy tờ" },
                    { value: "2", label: "Chờ tiền cọc" },
                    { value: "3", label: "Đã xác nhận" },
                    { value: "4", label: "Đang thuê" },
                    { value: "5", label: "Đã trả xe" },
                    { value: "6", label: "Chờ thanh toán" },
                    { value: "7", label: "Đã hủy" },
                    { value: "8", label: "Hoàn thành" },
                  ]}
                />
                <Button onClick={() => selectedLocationId && loadOrdersByLocation(selectedLocationId)}>
                  Làm mới
                </Button>
              </>
            )}
          </Space>
        </div>

        <Spin spinning={loading}>
          {!selectedLocationId ? (
            <Empty description="Vui lòng chọn địa điểm thuê để xem đơn hàng" />
          ) : filteredOrders.length === 0 ? (
            <Empty description="Không có đơn hàng nào tại địa điểm này" />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredOrders}
              rowKey={(record) => `${record.paymentId || record.id}-${record.id}`}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng cộng: ${total} đơn hàng`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

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
            <Card size="small" className="bg-blue-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Trạng thái đơn hàng:</span>
                {getOrderStatusTag(selectedOrder)}
              </div>
            </Card>

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
                      </Descriptions>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Không có thông tin xe</div>
              )}
            </Card>

            <Card title={<><UserOutlined /> Thông tin khách hàng</>} size="small">
              {selectedOrder.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedOrder.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{selectedOrder.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{selectedOrder.user.phone || '-'}</Descriptions.Item>
                  {selectedOrder.user.address && (
                    <Descriptions.Item label="Địa chỉ">{selectedOrder.user.address}</Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            <Card title={<><EnvironmentOutlined /> Địa điểm thuê</>} size="small">
              {selectedOrder.rentalLocation ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Tên địa điểm">{selectedOrder.rentalLocation.name}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">{selectedOrder.rentalLocation.address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{selectedOrder.rentalLocation.phone || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin địa điểm</div>
              )}
            </Card>

            <Card title="Chi tiết đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedOrder.phoneNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{formatVietnamTime(selectedOrder.orderDate || selectedOrder.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedOrder.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatVietnamTime(selectedOrder.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatVietnamTime(selectedOrder.expectedReturnTime)}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatVietnamTime(selectedOrder.actualReturnTime)}</Descriptions.Item>
                )}
                {selectedOrder.subTotal && (
                  <Descriptions.Item label="Tổng phụ">
                    <span className="font-semibold">
                      {selectedOrder.subTotal.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.deposit && (
                  <Descriptions.Item label="Tiền cọc">
                    <span className="font-semibold">
                      {selectedOrder.deposit.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.extraFee && (
                  <Descriptions.Item label="Phí phát sinh">
                    {selectedOrder.extraFee.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
                {selectedOrder.damageFee && (
                  <Descriptions.Item label="Phí hư hỏng">
                    {selectedOrder.damageFee.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
                {selectedOrder.total && (
                  <Descriptions.Item label="Tổng tiền">
                    <span className="font-semibold text-green-600">
                      {selectedOrder.total.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.damageNotes && (
                  <Descriptions.Item label="Ghi chú hư hỏng" span={2}>
                    {selectedOrder.damageNotes}
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

