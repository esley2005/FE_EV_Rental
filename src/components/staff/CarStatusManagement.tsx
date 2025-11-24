"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Image,
  Input,
  Spin,
  Empty,
  Tabs,
} from "antd";
import {
  CarOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { carsApi, rentalOrderApi, authApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

interface CarWithStatus extends Car {
  status: "available" | "booked" | "renting" | "maintenance";
  originalStatus?: number; // Lưu car.status gốc từ database
  currentOrder?: RentalOrderData & {
    user?: { fullName?: string; email?: string; phone?: string };
  };
}

export default function CarStatusManagement() {
  const [cars, setCars] = useState<CarWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load tất cả xe
      const carsRes = await carsApi.getAll();
      if (!carsRes.success || !carsRes.data) {
        setCars([]);
        return;
      }

      const carsList = Array.isArray(carsRes.data)
        ? carsRes.data
        : (carsRes.data as any)?.$values || [];

      // Load tất cả đơn hàng
      const ordersRes = await rentalOrderApi.getAll();
      const orders = ordersRes.success && ordersRes.data
        ? (Array.isArray(ordersRes.data)
            ? ordersRes.data
            : (ordersRes.data as any)?.$values || [])
        : [];

      // Load thông tin user cho các đơn hàng
      const usersRes = await authApi.getAllUsers();
      const users = usersRes.success && usersRes.data ? usersRes.data : [];
      const userMap = new Map(users.map((u: any) => [u.id || u.userId, u]));

      // Xác định trạng thái của từng xe dựa trên đơn hàng
      const carsWithStatus: CarWithStatus[] = carsList
        .filter((car: Car) => !car.isDeleted)
        .map((car: Car) => {
          // Tìm đơn hàng liên quan đến xe này
          const relatedOrders = orders.filter(
            (order: RentalOrderData) => order.carId === car.id
          );

          // Xác định trạng thái từ car.status (0 = Disabled, 1 = Available)
          const carStatusNum = typeof car.status === "number" 
            ? car.status 
            : (car.status === 1 || car.status === "1" ? 1 : 0);
          
          // Nếu xe bị disabled (status = 0), đánh dấu là maintenance/disabled
          let status: "available" | "booked" | "renting" | "maintenance" = carStatusNum === 0 ? "maintenance" : "available";
          let currentOrder: (RentalOrderData & { user?: any }) | undefined;

          // Chỉ kiểm tra đơn hàng nếu xe không bị disabled
          if (carStatusNum === 1) {
            // Kiểm tra đơn hàng đang thuê (status = 4: Renting)
            const rentingOrder = relatedOrders.find(
              (order: RentalOrderData) => {
                const statusNum = typeof order.status === "number"
                  ? order.status
                  : parseInt(String(order.status || "0"), 10);
                return statusNum === 4; // Renting
              }
            );

            if (rentingOrder) {
              status = "renting";
              const user = userMap.get(rentingOrder.userId);
              currentOrder = {
                ...rentingOrder,
                user: user
                  ? {
                      fullName: user.fullName || user.name,
                      email: user.email,
                      phone: user.phone || user.phoneNumber,
                    }
                  : undefined,
              };
            } else {
              // Kiểm tra đơn hàng đã đặt trước (status = 0, 1, 2, 3: Pending, DocumentsSubmitted, DepositPending, Confirmed)
              const bookedOrder = relatedOrders.find(
                (order: RentalOrderData) => {
                  const statusNum = typeof order.status === "number"
                    ? order.status
                    : parseInt(String(order.status || "0"), 10);
                  return statusNum >= 0 && statusNum <= 3;
                }
              );

              if (bookedOrder) {
                status = "booked";
                const user = userMap.get(bookedOrder.userId);
                currentOrder = {
                  ...bookedOrder,
                  user: user
                    ? {
                        fullName: user.fullName || user.name,
                        email: user.email,
                        phone: user.phone || user.phoneNumber,
                      }
                    : undefined,
                };
              }
            }
          }

          return {
            ...car,
            status,
            originalStatus: carStatusNum, // Lưu status gốc từ database
            currentOrder,
          };
        });

      setCars(carsWithStatus);
    } catch (error) {
      console.error("Load data error:", error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCars = useMemo(() => {
    let filtered = cars;

    // Lọc theo tab - nếu "all" thì không lọc
    if (activeTab === "available") {
      filtered = filtered.filter((car) => car.status === "available");
    }
    // Nếu activeTab === "all" thì không lọc, hiển thị tất cả

    // Lọc theo search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (car) =>
          car.name?.toLowerCase().includes(searchLower) ||
          car.model?.toLowerCase().includes(searchLower) ||
          String(car.id).includes(searchLower) ||
          car.currentOrder?.user?.fullName?.toLowerCase().includes(searchLower) ||
          car.currentOrder?.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [cars, activeTab, searchText]);

  const columns = [
    {
      title: "Hình ảnh",
      key: "image",
      width: 120,
      render: (_: any, record: CarWithStatus) => (
        <Image
          src={record.imageUrl}
          alt={record.name}
          width={100}
          height={60}
          style={{ objectFit: "cover", borderRadius: 4 }}
          fallback="/logo_ev.png"
          preview={false}
        />
      ),
    },
    {
      title: "Tên xe",
      key: "name",
      render: (_: any, record: CarWithStatus) => (
        <Space>
          <CarOutlined style={{ color: "#1890ff" }} />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-500">{record.model}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Số ghế",
      dataIndex: "seats",
      key: "seats",
      width: 100,
      render: (seats: number) => <Tag>{seats} chỗ</Tag>,
    },
    {
      title: "Giá thuê/ngày",
      dataIndex: "rentPricePerDay",
      key: "rentPricePerDay",
      width: 150,
      render: (price: number) => (
        <span className="font-semibold text-blue-600">
          {price?.toLocaleString("vi-VN")} đ/ngày
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_: any, record: CarWithStatus) => {
        // Lấy trạng thái gốc từ database (0 = Hết xe, 1 = Còn xe)
        const carStatusNum = record.originalStatus !== undefined 
          ? record.originalStatus 
          : (typeof (record as Car).status === "number" 
            ? (record as Car).status 
            : ((record as Car).status === 1 || (record as Car).status === "1" ? 1 : 0));
        
        // Chỉ hiển thị 2 trạng thái: Còn xe (xanh lá) hoặc Hết xe (đỏ)
        if (carStatusNum === 1) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Còn xe
            </Tag>
          );
        } else {
          return (
            <Tag color="red" icon={<CloseCircleOutlined />}>
              Hết xe
            </Tag>
          );
        }
      },
    },
    {
      title: activeTab === "available" ? "Thông tin" : "Khách hàng",
      key: "customer",
      render: (_: any, record: CarWithStatus) => {
        if (record.status === "available") {
          return <span className="text-gray-400">Chưa có đơn</span>;
        }
        if (record.currentOrder?.user) {
          return (
            <Space>
              <UserOutlined />
              <div>
                <div className="font-medium">
                  {record.currentOrder.user.fullName || "N/A"}
                </div>
                <div className="text-xs text-gray-500">
                  {record.currentOrder.user.email || record.currentOrder.user.phone || ""}
                </div>
              </div>
            </Space>
          );
        }
        return <span className="text-gray-400">Chưa có đơn</span>;
      },
    },
    {
      title: "Thời gian thuê",
      key: "time",
      render: (_: any, record: CarWithStatus) => {
        if (!record.currentOrder) return <span className="text-gray-400">Chưa cập nhật</span>;
        
        if (record.status === "booked") {
          return (
            <div>
              <div className="text-xs text-gray-500">Nhận xe:</div>
              <div className="text-sm">
                {record.currentOrder.pickupTime
                  ? dayjs(record.currentOrder.pickupTime).format("DD/MM/YYYY HH:mm")
                  : "Chưa cập nhật"}
              </div>
            </div>
          );
        } else if (record.status === "renting") {
          return (
            <div>
              <div className="text-xs text-gray-500">Nhận xe:</div>
              <div className="text-sm">
                {record.currentOrder.pickupTime
                  ? dayjs(record.currentOrder.pickupTime).format("DD/MM/YYYY HH:mm")
                  : "Chưa cập nhật"}
              </div>
              <div className="text-xs text-gray-500 mt-1">Trả dự kiến:</div>
              <div className="text-sm">
                {record.currentOrder.expectedReturnTime
                  ? dayjs(record.currentOrder.expectedReturnTime).format("DD/MM/YYYY HH:mm")
                  : "Chưa cập nhật"}
              </div>
            </div>
          );
        }
        return <span className="text-gray-400">Chưa cập nhật</span>;
      },
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>
            Quản lý xe
          </h2>
          <Input.Search
            placeholder="Tìm kiếm theo tên xe, model, khách hàng..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => setSearchText(value)}
          />
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "all",
            label: (
              <Space>
                <CarOutlined />
                <span>Tất cả ({cars.length})</span>
              </Space>
            ),
          },
          {
            key: "available",
            label: (
              <Space>
                <CheckCircleOutlined />
                <span>Available ({cars.filter((c) => c.status === "available").length})</span>
              </Space>
            ),
          },
        ]}
      />

      <Spin spinning={loading}>
        {filteredCars.length === 0 ? (
          <Empty
            description={
              activeTab === "all"
                ? "Không có xe nào trong hệ thống"
                : activeTab === "available"
                ? "Không có xe nào có sẵn"
                : "Không có dữ liệu"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredCars}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng cộng: ${total} xe`,
            }}
          />
        )}
      </Spin>
    </Card>
  );
}

