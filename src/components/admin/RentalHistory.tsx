"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Input,
  Select,
  message,
  Modal,
  Descriptions,
  Image,
  Typography,
  Spin,
  Empty,
} from "antd";
import {
  EyeOutlined,
  SearchOutlined,
  CarOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, driverLicenseApi, citizenIdApi } from "@/services/api";
import type { RentalOrderData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const { Search } = Input;

// Helper function để format thời gian theo múi giờ Việt Nam
const formatVietnamTime = (date: string | Date | undefined | null): string => {
  if (!date) return "-";
  try {
    const parsedDate = dayjs(date);
    if (parsedDate.isUTC() || (typeof date === "string" && (date.includes("Z") || date.includes("+") || date.includes("-", 10)))) {
      return parsedDate.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm");
    }
    return parsedDate.format("DD/MM/YYYY HH:mm");
  } catch (error) {
    console.error("Error formatting date:", error, date);
    return "-";
  }
};

interface OrderWithDetails extends Omit<RentalOrderData, "citizenId"> {
  car?: Car;
  user?: User;
  driverLicense?: DriverLicenseData;
  citizenIdDoc?: CitizenIdData;
}

const statusLabels: Record<number, { text: string; color: string; icon: React.ReactNode }> = {
  0: { text: "Chờ xác nhận", color: "gold", icon: <ClockCircleOutlined /> },
  1: { text: "Đã nộp giấy tờ", color: "blue", icon: <IdcardOutlined /> },
  2: { text: "Chờ tiền cọc", color: "orange", icon: <DollarOutlined /> },
  3: { text: "Đã xác nhận", color: "cyan", icon: <CheckCircleOutlined /> },
  4: { text: "Đang thuê", color: "green", icon: <CarOutlined /> },
  5: { text: "Đã trả xe", color: "purple", icon: <CarOutlined /> },
  6: { text: "Chờ thanh toán", color: "orange", icon: <DollarOutlined /> },
  7: { text: "Đã hủy", color: "red", icon: <CloseCircleOutlined /> },
  8: { text: "Hoàn thành", color: "green", icon: <CheckCircleOutlined /> },
};

const getStatusNumber = (status: string | number | undefined): number => {
  if (typeof status === "number") return status;
  if (!status) return 0;
  const statusLower = status.toLowerCase();
  if (statusLower.includes("pending") && !statusLower.includes("deposit") && !statusLower.includes("payment")) return 0;
  if (statusLower.includes("documentssubmitted") || statusLower.includes("đã nộp giấy tờ")) return 1;
  if (statusLower.includes("depositpending") || statusLower.includes("chờ tiền cọc")) return 2;
  if (statusLower.includes("confirmed") || statusLower.includes("đã xác nhận")) return 3;
  if (statusLower.includes("renting") || statusLower.includes("đang thuê")) return 4;
  if (statusLower.includes("returned") || statusLower.includes("đã trả xe")) return 5;
  if (statusLower.includes("paymentpending") || statusLower.includes("chờ thanh toán")) return 6;
  if (statusLower.includes("cancelled") || statusLower.includes("hủy")) return 7;
  if (statusLower.includes("completed") || statusLower.includes("hoàn thành")) return 8;
  return 0;
};

// Helper function để xử lý status của giấy tờ (có thể là string hoặc number)
const getDocumentStatusInfo = (status: string | number | undefined) => {
  const isApproved = 
    (typeof status === 'number' && status === 1) ||
    (typeof status === 'string' && (status === '1' || status.toLowerCase() === 'approved'));
  
  const isRejected = 
    (typeof status === 'number' && status === 2) ||
    (typeof status === 'string' && (status === '2' || status.toLowerCase() === 'rejected'));
  
  return {
    isApproved,
    isRejected,
    color: isApproved ? 'success' : isRejected ? 'error' : 'warning',
    text: isApproved ? 'Đã xác thực' : isRejected ? 'Đã từ chối' : 'Chờ xác thực'
  };
};

export default function RentalHistory() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
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

      const [carsResponse, usersResponse, licensesResponse, citizenIdsResponse] = await Promise.all([
        carsApi.getAll(),
        authApi.getAllUsers(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
      ]);

      const cars: Car[] =
        carsResponse.success && carsResponse.data
          ? Array.isArray(carsResponse.data)
            ? carsResponse.data
            : (carsResponse.data as any)?.$values || []
          : [];

      const users: User[] =
        usersResponse.success && usersResponse.data
          ? Array.isArray(usersResponse.data)
            ? usersResponse.data
            : (usersResponse.data as any)?.$values || []
          : [];

      const licenses: DriverLicenseData[] =
        licensesResponse.success && licensesResponse.data
          ? Array.isArray(licensesResponse.data)
            ? licensesResponse.data
            : (licensesResponse.data as any)?.$values || []
          : [];

      const citizenIds: CitizenIdData[] =
        citizenIdsResponse.success && citizenIdsResponse.data
          ? Array.isArray(citizenIdsResponse.data)
            ? citizenIdsResponse.data
            : (citizenIdsResponse.data as any)?.$values || []
          : [];

      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        const license = licenses.find((l) => l.rentalOrderId != null && l.rentalOrderId === order.id);
        const citizenIdDoc = citizenIds.find((c) => c.rentalOrderId != null && c.rentalOrderId === order.id);

        return {
          ...order,
          car,
          user: user || undefined,
          driverLicense: license || undefined,
          citizenIdDoc: citizenIdDoc || undefined,
        };
      });

      ordersWithDetails.sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || "").getTime();
        const dateB = new Date(b.orderDate || b.createdAt || "").getTime();
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

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by status
    if (filterStatus !== "all") {
      const statusNum = parseInt(filterStatus);
      filtered = filtered.filter((order) => getStatusNumber(order.status) === statusNum);
    }

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((order) => {
        const carName = order.car?.name?.toLowerCase() || "";
        const userName = order.user?.fullName?.toLowerCase() || order.user?.email?.toLowerCase() || "";
        const orderId = order.id?.toString() || "";
        const phone = order.phoneNumber?.toLowerCase() || "";
        return (
          carName.includes(searchLower) ||
          userName.includes(searchLower) ||
          orderId.includes(searchLower) ||
          phone.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [orders, filterStatus, searchText]);

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 200,
      render: (record: OrderWithDetails) => (
        <div>
          <div className="font-medium">{record.user?.fullName || record.user?.email || "N/A"}</div>
          <div className="text-xs text-gray-500">{record.phoneNumber || "-"}</div>
        </div>
      ),
    },
    {
      title: "Xe thuê",
      key: "car",
      width: 200,
      render: (record: OrderWithDetails) => (
        <div>
          <div className="font-medium">{record.car?.name || "N/A"}</div>
          <div className="text-xs text-gray-500">{record.car?.model || "-"}</div>
        </div>
      ),
    },
    {
      title: "Thời gian thuê",
      key: "rentalTime",
      width: 180,
      render: (record: OrderWithDetails) => (
        <div>
          <div className="text-xs">
            <CalendarOutlined className="mr-1" />
            {formatVietnamTime(record.pickupTime)}
          </div>
          <div className="text-xs text-gray-500">
            <ClockCircleOutlined className="mr-1" />
            {formatVietnamTime(record.expectedReturnTime)}
          </div>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      key: "total",
      width: 150,
      render: (record: OrderWithDetails) => {
        // Tính tổng tiền: total hoặc subTotal + extraFee + damageFee
        const total = record.total || 
          ((record.subTotal || 0) + (record.extraFee || 0) + (record.damageFee || 0));
        return (
          <span className="font-semibold text-blue-600">
            {total ? total.toLocaleString("vi-VN") : 0} đ
          </span>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (record: OrderWithDetails) => {
        const statusNum = getStatusNumber(record.status);
        const config = statusLabels[statusNum] || statusLabels[0];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "Ngày đặt",
      key: "orderDate",
      width: 150,
      render: (record: OrderWithDetails) => formatVietnamTime(record.orderDate || record.createdAt),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right" as const,
      render: (record: OrderWithDetails) => (
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
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Search
              placeholder="Tìm kiếm theo tên khách hàng, xe, mã đơn, SĐT..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            size="large"
            style={{ width: 200 }}
            placeholder="Lọc theo trạng thái"
          >
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            {Object.entries(statusLabels).map(([key, value]) => (
              <Select.Option key={key} value={key}>
                {value.text}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} đơn hàng`,
          }}
          locale={{
            emptyText: <Empty description="Không có đơn hàng nào" />,
          }}
        />
      </Card>

      <Modal
        title="Chi tiết đơn hàng"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedOrder(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions title="Thông tin đơn hàng" bordered column={2}>
              <Descriptions.Item label="Mã đơn">#{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {(() => {
                  const statusNum = getStatusNumber(selectedOrder.status);
                  const config = statusLabels[statusNum] || statusLabels[0];
                  return (
                    <Tag color={config.color} icon={config.icon}>
                      {config.text}
                    </Tag>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đặt">
                {formatVietnamTime(selectedOrder.orderDate || selectedOrder.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedOrder.phoneNumber || "-"}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="Thông tin khách hàng" bordered column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="Họ tên">
                {selectedOrder.user?.fullName || selectedOrder.user?.email || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Email">{selectedOrder.user?.email || "-"}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedOrder.user?.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">{selectedOrder.user?.address || "-"}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="Thông tin xe" bordered column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="Tên xe">{selectedOrder.car?.name || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Model">{selectedOrder.car?.model || "-"}</Descriptions.Item>
              <Descriptions.Item label="Loại kích thước">{selectedOrder.car?.sizeType || "-"}</Descriptions.Item>
              <Descriptions.Item label="Số chỗ ngồi">{selectedOrder.car?.seats || "-"}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="Thông tin thuê" bordered column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="Thời gian nhận xe">
                {formatVietnamTime(selectedOrder.pickupTime)}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian trả xe dự kiến">
                {formatVietnamTime(selectedOrder.expectedReturnTime)}
              </Descriptions.Item>
              <Descriptions.Item label="Có tài xế">
                {selectedOrder.withDriver ? (
                  <Tag color="green">Có</Tag>
                ) : (
                  <Tag color="default">Không</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <span className="font-semibold text-blue-600">
                  {(() => {
                    const total = selectedOrder.total || 
                      ((selectedOrder.subTotal || 0) + (selectedOrder.extraFee || 0) + (selectedOrder.damageFee || 0));
                    return total ? total.toLocaleString("vi-VN") : 0;
                  })()}{" "}
                  đ
                </span>
              </Descriptions.Item>
              {selectedOrder.subTotal && (
                <Descriptions.Item label="Tổng phụ">
                  <span className="text-gray-600">
                    {selectedOrder.subTotal.toLocaleString("vi-VN")} đ
                  </span>
                </Descriptions.Item>
              )}
              {selectedOrder.extraFee && selectedOrder.extraFee > 0 && (
                <Descriptions.Item label="Phí phát sinh">
                  <span className="text-orange-600">
                    +{selectedOrder.extraFee.toLocaleString("vi-VN")} đ
                  </span>
                </Descriptions.Item>
              )}
              {selectedOrder.damageFee && selectedOrder.damageFee > 0 && (
                <Descriptions.Item label="Phí hỏng hóc">
                  <span className="text-red-600">
                    +{selectedOrder.damageFee.toLocaleString("vi-VN")} đ
                  </span>
                </Descriptions.Item>
              )}
              {selectedOrder.deposit && (
                <Descriptions.Item label="Tiền cọc">
                  <span className="text-blue-600">
                    {selectedOrder.deposit.toLocaleString("vi-VN")} đ
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>

            {(selectedOrder.driverLicense || selectedOrder.citizenIdDoc) && (
              <Descriptions title="Giấy tờ" bordered column={1} style={{ marginTop: 16 }}>
                {selectedOrder.driverLicense && (
                  <Descriptions.Item label="Bằng lái xe">
                    <Space>
                      {selectedOrder.driverLicense.imageUrl && (
                        <Image
                          width={100}
                          src={selectedOrder.driverLicense.imageUrl}
                          alt="Bằng lái mặt trước"
                        />
                      )}
                      {selectedOrder.driverLicense.imageUrl2 && (
                        <Image
                          width={100}
                          src={selectedOrder.driverLicense.imageUrl2}
                          alt="Bằng lái mặt sau"
                        />
                      )}
                      <Tag color={getDocumentStatusInfo(selectedOrder.driverLicense.status).color}>
                        {getDocumentStatusInfo(selectedOrder.driverLicense.status).text}
                      </Tag>
                    </Space>
                  </Descriptions.Item>
                )}
                {selectedOrder.citizenIdDoc && (
                  <Descriptions.Item label="CCCD/CMND">
                    <Space>
                      {selectedOrder.citizenIdDoc.imageUrl && (
                        <Image
                          width={100}
                          src={selectedOrder.citizenIdDoc.imageUrl}
                          alt="CCCD mặt trước"
                        />
                      )}
                      {selectedOrder.citizenIdDoc.imageUrl2 && (
                        <Image
                          width={100}
                          src={selectedOrder.citizenIdDoc.imageUrl2}
                          alt="CCCD mặt sau"
                        />
                      )}
                      <Tag color={getDocumentStatusInfo(selectedOrder.citizenIdDoc.status).color}>
                        {getDocumentStatusInfo(selectedOrder.citizenIdDoc.status).text}
                      </Tag>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

