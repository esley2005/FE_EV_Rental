"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Card,
  Input,
  Tag,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Descriptions,
  Empty,
  Button,
  Badge,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { authApi, rentalOrderApi } from "@/services/api";
import type { User, RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

const { Title } = Typography;

interface RiskyCustomer extends User {
  currentPoint: number;
  riskLevel: "high" | "medium" | "low" | "safe";
  cancelledOrders: RentalOrderData[];
  totalCancelled: number;
  phoneNumber?: string;
}

interface PointDeductionHistory {
  orderId: number;
  orderDate: string;
  cancelledAt: string;
  cancelledWithin1Hour: boolean;
  pointsDeducted: number;
  reason?: string;
}

export default function RiskyCustomer() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<RiskyCustomer[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<RiskyCustomer | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointDeductionHistory[]>([]);

  useEffect(() => {
    loadRiskyCustomers();
  }, []);

  const loadRiskyCustomers = async () => {
    setLoading(true);
    try {
      const [usersResponse, ordersResponse] = await Promise.all([
        authApi.getAllUsers(),
        rentalOrderApi.getAll(),
      ]);

      if (!usersResponse.success || !usersResponse.data) {
        message.error("Không thể tải danh sách khách hàng");
        setLoading(false);
        return;
      }

      if (!ordersResponse.success || !ordersResponse.data) {
        message.error("Không thể tải danh sách đơn hàng");
        setLoading(false);
        return;
      }

      // Normalize users data
      const allUsers = Array.isArray(usersResponse.data)
        ? usersResponse.data
        : (usersResponse.data as any)?.$values || [];

      // Filter only customers
      const customerUsers = allUsers.filter(
        (user: any) => (user.role || user.Role || "").toLowerCase() === "customer"
      );

      // Normalize orders data
      const allOrders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      // Process each customer
      const riskyCustomers: RiskyCustomer[] = customerUsers.map((user: any) => {
        const userId = user.id || user.userId || user.Id || user.UserId;
        // Điểm mặc định là 100 nếu null/undefined
        const currentPoint = user.point ?? user.Point ?? 100;

        // Get all orders for this customer
        const customerOrders = allOrders.filter(
          (order: any) => (order.userId || order.UserId) === userId
        );

        // Get cancelled orders (status = Cancelled = 7)
        const cancelledOrders = customerOrders.filter(
          (order: any) =>
            order.status === 7 ||
            order.Status === 7 ||
            (order.status as string)?.toLowerCase() === "cancelled" ||
            (order.Status as string)?.toLowerCase() === "cancelled"
        );

        // Determine risk level based on point
        // Điểm mặc định là 100, nếu null/undefined thì coi như 100
        const pointValue = currentPoint ?? 100;
        let riskLevel: "high" | "medium" | "low" | "safe" = "safe";
        if (pointValue < 50) {
          riskLevel = "high";
        } else if (pointValue < 70) {
          riskLevel = "medium";
        } else if (pointValue < 90) {
          riskLevel = "low";
        } else {
          riskLevel = "safe"; // >= 90 là an toàn
        }

        return {
          id: userId,
          email: user.email || user.Email || "",
          fullName: user.fullName || user.FullName || "",
          phoneNumber: user.phoneNumber || user.PhoneNumber || user.phone || "",
          point: pointValue,
          currentPoint: pointValue,
          riskLevel,
          cancelledOrders,
          totalCancelled: cancelledOrders.length,
          role: user.role || user.Role || "Customer",
          isActive: user.isActive ?? user.IsActive ?? true,
          createdAt: user.createdAt || user.CreatedAt,
        } as RiskyCustomer;
      });

      // Sort by risk level (high -> medium -> low -> safe) then by point (ascending)
      riskyCustomers.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2, safe: 3 };
        const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        return a.currentPoint - b.currentPoint;
      });

      setCustomers(riskyCustomers);
    } catch (error) {
      console.error("Load risky customers error:", error);
      message.error("Có lỗi xảy ra khi tải danh sách khách hàng rủi ro");
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (customer: RiskyCustomer) => {
    setSelectedCustomer(customer);
    
    // Calculate point deduction history from cancelled orders
    const history: PointDeductionHistory[] = customer.cancelledOrders.map((order: any) => {
      const orderDate = dayjs(order.orderDate || order.OrderDate || order.createdAt || order.CreatedAt);
      const cancelledAt = dayjs(order.updatedAt || order.UpdatedAt || order.orderDate || order.OrderDate);
      const timeDiff = cancelledAt.diff(orderDate, "hour", true);
      const cancelledWithin1Hour = timeDiff <= 1;
      const pointsDeducted = cancelledWithin1Hour ? 5 : 10;

      return {
        orderId: order.id || order.Id,
        orderDate: orderDate.format("DD/MM/YYYY HH:mm"),
        cancelledAt: cancelledAt.format("DD/MM/YYYY HH:mm"),
        cancelledWithin1Hour,
        pointsDeducted,
        reason: order.reportNote || order.ReportNote || "Hủy đơn thuê",
      };
    });

    setPointHistory(history);
    setHistoryModalVisible(true);
  };

  const getRiskLevelConfig = (level: string) => {
    switch (level) {
      case "high":
        return {
          color: "red",
          text: "Rủi ro cao",
          icon: <ExclamationCircleOutlined />,
        };
      case "medium":
        return {
          color: "orange",
          text: "Rủi ro trung bình",
          icon: <WarningOutlined />,
        };
      case "low":
        return {
          color: "gold",
          text: "Rủi ro thấp",
          icon: <WarningOutlined />,
        };
      case "safe":
        return {
          color: "green",
          text: "An toàn",
          icon: <CheckCircleOutlined />,
        };
      default:
        return {
          color: "default",
          text: "Chưa xác định",
          icon: <UserOutlined />,
        };
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchText.trim()) return customers;

    const searchLower = searchText.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.fullName?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phoneNumber?.toLowerCase().includes(searchLower) ||
        customer.id?.toString().includes(searchLower)
    );
  }, [customers, searchText]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: (a: RiskyCustomer, b: RiskyCustomer) => a.id - b.id,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 250,
      render: (_: any, record: RiskyCustomer) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{record.fullName || "Chưa có tên"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{record.email}</div>
            <div style={{ fontSize: 12, color: "#999" }}>{record.phoneNumber || "Chưa có SĐT"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Điểm hiện tại",
      dataIndex: "currentPoint",
      key: "currentPoint",
      width: 120,
      align: "center" as const,
      sorter: (a: RiskyCustomer, b: RiskyCustomer) => a.currentPoint - b.currentPoint,
      render: (point: number) => (
        <Badge
          count={point}
          style={{
            backgroundColor: point < 50 ? "#ff4d4f" : point < 70 ? "#faad14" : point < 90 ? "#fa8c16" : "#52c41a",
          }}
        />
      ),
    },
    {
      title: "Mức độ rủi ro",
      dataIndex: "riskLevel",
      key: "riskLevel",
      width: 150,
      filters: [
        { text: "Rủi ro cao", value: "high" },
        { text: "Rủi ro trung bình", value: "medium" },
        { text: "Rủi ro thấp", value: "low" },
        { text: "An toàn", value: "safe" },
      ],
      onFilter: (value: any, record: RiskyCustomer) => record.riskLevel === value,
      render: (level: string) => {
        const config = getRiskLevelConfig(level);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "Số đơn đã hủy",
      dataIndex: "totalCancelled",
      key: "totalCancelled",
      width: 130,
      align: "center" as const,
      sorter: (a: RiskyCustomer, b: RiskyCustomer) => a.totalCancelled - b.totalCancelled,
      render: (count: number) => (
        <Tag color={count > 0 ? "red" : "green"}>{count} đơn</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      render: (_: any, record: RiskyCustomer) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewHistory(record)}
          disabled={record.totalCancelled === 0}
        >
          Xem lịch sử
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>
            <ExclamationCircleOutlined style={{ marginRight: 8, color: "#ff4d4f" }} />
            Danh sách khách hàng rủi ro
          </Title>
          <Input.Search
            placeholder="Tìm kiếm theo tên, email, SĐT..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            onSearch={(value) => setSearchText(value)}
            enterButton={<SearchOutlined />}
          />
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredCustomers}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} khách hàng`,
            }}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: <Empty description="Không có dữ liệu" />,
            }}
          />
        </Spin>
      </Card>

      {/* Modal hiển thị lịch sử trừ điểm */}
      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
            Lịch sử trừ điểm - {selectedCustomer?.fullName || "Khách hàng"}
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedCustomer(null);
          setPointHistory([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHistoryModalVisible(false);
            setSelectedCustomer(null);
            setPointHistory([]);
          }}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedCustomer && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Khách hàng">{selectedCustomer.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedCustomer.email}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedCustomer.phoneNumber || "Chưa có"}</Descriptions.Item>
              <Descriptions.Item label="Điểm hiện tại">
                <Badge
                  count={selectedCustomer.currentPoint}
                  style={{
                    backgroundColor:
                      selectedCustomer.currentPoint < 50
                        ? "#ff4d4f"
                        : selectedCustomer.currentPoint < 70
                        ? "#faad14"
                        : selectedCustomer.currentPoint < 90
                        ? "#fa8c16"
                        : "#52c41a",
                  }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Mức độ rủi ro" span={2}>
                {(() => {
                  const config = getRiskLevelConfig(selectedCustomer.riskLevel);
                  return (
                    <Tag color={config.color} icon={config.icon}>
                      {config.text}
                    </Tag>
                  );
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Lịch sử trừ điểm</Title>
            {pointHistory.length === 0 ? (
              <Empty description="Không có lịch sử trừ điểm" />
            ) : (
              <Table
                dataSource={pointHistory}
                rowKey="orderId"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Mã đơn hàng",
                    dataIndex: "orderId",
                    key: "orderId",
                    render: (id: number) => `#${id}`,
                  },
                  {
                    title: "Ngày đặt",
                    dataIndex: "orderDate",
                    key: "orderDate",
                  },
                  {
                    title: "Ngày hủy",
                    dataIndex: "cancelledAt",
                    key: "cancelledAt",
                  },
                  {
                    title: "Thời gian hủy",
                    key: "cancelledWithin1Hour",
                    render: (_: any, record: PointDeductionHistory) => (
                      <Tag color={record.cancelledWithin1Hour ? "orange" : "red"}>
                        {record.cancelledWithin1Hour ? "Trong 1 giờ" : "Sau 1 giờ"}
                      </Tag>
                    ),
                  },
                  {
                    title: "Điểm trừ",
                    dataIndex: "pointsDeducted",
                    key: "pointsDeducted",
                    align: "center" as const,
                    render: (points: number) => (
                      <Tag color="red" icon={<CloseCircleOutlined />}>
                        -{points}
                      </Tag>
                    ),
                  },
                  {
                    title: "Lý do",
                    dataIndex: "reason",
                    key: "reason",
                  },
                ]}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

