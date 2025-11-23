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
} from "@ant-design/icons";
import { carsApi, rentalOrderApi, authApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

interface CarWithStatus extends Car {
  status: "available" | "booked" | "renting";
  currentOrder?: RentalOrderData & {
    user?: { fullName?: string; email?: string; phone?: string };
  };
}

export default function CarStatusManagement() {
  const [cars, setCars] = useState<CarWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("available");

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

          // Xác định trạng thái
          let status: "available" | "booked" | "renting" = "available";
          let currentOrder: (RentalOrderData & { user?: any }) | undefined;

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

          return {
            ...car,
            status,
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

    // Lọc theo tab
    if (activeTab === "available") {
      filtered = filtered.filter((car) => car.status === "available");
    } else if (activeTab === "booked") {
      filtered = filtered.filter((car) => car.status === "booked");
    } else if (activeTab === "renting") {
      filtered = filtered.filter((car) => car.status === "renting");
    }

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
        if (record.status === "available") {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Có sẵn
            </Tag>
          );
        } else if (record.status === "booked") {
          return (
            <Tag color="warning" icon={<ClockCircleOutlined />}>
              Đã đặt trước
            </Tag>
          );
        } else {
          return (
            <Tag color="processing" icon={<ClockCircleOutlined />}>
              Đang cho thuê
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
          return <span className="text-gray-400">-</span>;
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
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      title: "Thời gian",
      key: "time",
      render: (_: any, record: CarWithStatus) => {
        if (!record.currentOrder) return <span className="text-gray-400">-</span>;
        
        if (record.status === "booked") {
          return (
            <div>
              <div className="text-xs text-gray-500">Nhận xe:</div>
              <div className="text-sm">
                {record.currentOrder.pickupTime
                  ? dayjs(record.currentOrder.pickupTime).format("DD/MM/YYYY HH:mm")
                  : "-"}
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
                  : "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1">Trả dự kiến:</div>
              <div className="text-sm">
                {record.currentOrder.expectedReturnTime
                  ? dayjs(record.currentOrder.expectedReturnTime).format("DD/MM/YYYY HH:mm")
                  : "-"}
              </div>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
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
            key: "available",
            label: (
              <Space>
                <CheckCircleOutlined />
                <span>Xe có sẵn ({cars.filter((c) => c.status === "available").length})</span>
              </Space>
            ),
          },
          {
            key: "booked",
            label: (
              <Space>
                <ClockCircleOutlined />
                <span>Xe đã đặt trước ({cars.filter((c) => c.status === "booked").length})</span>
              </Space>
            ),
          },
          {
            key: "renting",
            label: (
              <Space>
                <ClockCircleOutlined />
                <span>Xe đang cho thuê ({cars.filter((c) => c.status === "renting").length})</span>
              </Space>
            ),
          },
        ]}
      />

      <Spin spinning={loading}>
        {filteredCars.length === 0 ? (
          <Empty
            description={
              activeTab === "available"
                ? "Không có xe nào có sẵn"
                : activeTab === "booked"
                ? "Không có xe nào đã đặt trước"
                : "Không có xe nào đang cho thuê"
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

