"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Typography, Button, Space, Spin, Alert, Skeleton, Tooltip, Empty, message, Table, Tag, Progress } from "antd";
import type { CardProps } from "antd";
import { ReloadOutlined, BulbOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { analyzeAI, analyzeCarUsage } from "@/services/ai";
import { carsApi, rentalOrderApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;

type AIAnalysisProps = {
  variant?: "general" | "car-usage";
};

interface CarUsageData {
  car: Car;
  totalOrders: number;
  totalDays: number;
  usageRate: number;
  lastRentalDate?: string;
}

export default function AIAnalysis({ variant = "general" }: AIAnalysisProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<string>("");
  const [copying, setCopying] = useState<boolean>(false);
  const [carUsageData, setCarUsageData] = useState<CarUsageData[]>([]);

  const fetchCarUsageData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      // Lấy danh sách tất cả xe
      const carsResponse = await carsApi.getAll();
      if (!carsResponse.success || !carsResponse.data) {
        setError("Không thể tải danh sách xe.");
        return;
      }

      // Lấy danh sách tất cả đơn hàng
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        setError("Không thể tải danh sách đơn hàng.");
        return;
      }

      // Normalize data
      const carsList = Array.isArray(carsResponse.data)
        ? carsResponse.data
        : (carsResponse.data as any)?.$values || [];
      
      const ordersList = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      // Tính tỷ lệ sử dụng cho từng xe
      const usageData: CarUsageData[] = carsList
        .filter((car: Car) => car.isActive && !car.isDeleted)
        .map((car: Car) => {
          // Lọc đơn hàng của xe này
          const carOrders = ordersList.filter(
            (order: RentalOrderData) => order.carId === car.id
          );

          // Tính tổng số ngày thuê
          let totalDays = 0;
          let lastRentalDate: string | undefined;

          carOrders.forEach((order: RentalOrderData) => {
            if (order.pickupTime && order.expectedReturnTime) {
              const start = dayjs(order.pickupTime);
              const end = dayjs(order.expectedReturnTime);
              const days = end.diff(start, 'day') || 1;
              totalDays += days;

              // Lấy ngày thuê gần nhất
              if (!lastRentalDate || dayjs(order.pickupTime).isAfter(dayjs(lastRentalDate))) {
                lastRentalDate = order.pickupTime;
              }
            }
          });

          // Tính tỷ lệ sử dụng (giả sử thời gian hoạt động là 90 ngày gần nhất)
          const activeDays = 90; // Có thể điều chỉnh
          const usageRate = activeDays > 0 ? (totalDays / activeDays) * 100 : 0;

          return {
            car,
            totalOrders: carOrders.length,
            totalDays,
            usageRate: Math.min(usageRate, 100), // Giới hạn tối đa 100%
            lastRentalDate,
          };
        })
        .sort((a, b) => b.usageRate - a.usageRate); // Sắp xếp theo tỷ lệ sử dụng giảm dần

      setCarUsageData(usageData);
    } catch (e: unknown) {
      const messageText = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    if (variant === "car-usage") {
      await fetchCarUsageData();
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const res = await analyzeAI();
      if (res.success && res.data?.response) {
        setAnalysis(res.data.response);
      } else {
        setError(res.error || "Không thể lấy kết quả phân tích.");
      }
    } catch (e: unknown) {
      const messageText = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }, [variant, fetchCarUsageData]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleCopy = async () => {
    if (variant === "car-usage") {
      // Copy dữ liệu bảng
      const text = carUsageData
        .map((item, index) => {
          return `${index + 1}. ${item.car.name || item.car.model} - ${item.totalOrders} đơn - ${item.totalDays} ngày - ${Math.round(item.usageRate)}%`;
        })
        .join("\n");
      
      if (!text) return;
      setCopying(true);
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        message.success("Đã sao chép dữ liệu");
      } catch {
        message.error("Sao chép thất bại");
      } finally {
        setCopying(false);
      }
      return;
    }

    if (!analysis) return;
    setCopying(true);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(analysis);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = analysis;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("Đã sao chép nội dung");
    } catch {
      message.error("Sao chép thất bại");
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = () => {
    if (variant === "car-usage") {
      // Download dữ liệu bảng
      const text = carUsageData
        .map((item, index) => {
          return `${index + 1}. ${item.car.name || item.car.model} - ${item.totalOrders} đơn - ${item.totalDays} ngày - ${Math.round(item.usageRate)}%`;
        })
        .join("\n");
      
      if (!text) return;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ty-le-su-dung-xe.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (!analysis) return;
    const blob = new Blob([analysis], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-analysis.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      variant="outlined"
      title={
        <Space align="center">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 20,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #1447E6 0%, #22D3EE 100%)",
              boxShadow: "0 6px 20px rgba(20,71,230,0.25)",
              color: "#fff"
            }}
          >
            <BulbOutlined />
          </div>
          <Title level={4} style={{ margin: 0, fontSize: 22 }}>
            <span style={{ color: "#0B1220" }}>
              {variant === "car-usage" ? "Tỷ lệ sử dụng xe" : "Phân tích AI · Gợi ý nâng cấp"}
            </span>
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Sao chép">
            <Button
              onClick={handleCopy}
              icon={<CopyOutlined />}
              loading={copying}
              disabled={(variant === "car-usage" ? carUsageData.length === 0 : !analysis) || loading}
            />
          </Tooltip>
          <Tooltip title="Tải xuống">
            <Button 
              onClick={handleDownload} 
              icon={<DownloadOutlined />} 
              disabled={(variant === "car-usage" ? carUsageData.length === 0 : !analysis) || loading} 
            />
          </Tooltip>
          <Tooltip title="Làm mới">
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis} loading={loading}>
              Làm mới
            </Button>
          </Tooltip>
        </Space>
      }
      style={{ boxShadow: "0 12px 32px rgba(2,6,23,0.06)" }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {loading && (
          <div>
            <div className="flex flex-col items-center gap-4 py-4">
              <Spin size="large" />
              <p className="text-gray-600">Đang phân tích dữ liệu...</p>
            </div>
            <Card type="inner" style={{ marginTop: 12 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            message="Lỗi phân tích"
            description={
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text type="secondary">{error}</Text>
                <Button onClick={fetchAnalysis} icon={<ReloadOutlined />}>Thử lại</Button>
              </Space>
            }
            showIcon
          />
        )}

        {!loading && !error && variant === "car-usage" && (
          carUsageData.length > 0 ? (
            <Table
              dataSource={carUsageData}
              rowKey={(record) => record.car.id?.toString() || ""}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} xe` }}
              columns={[
                {
                  title: "Tên xe",
                  dataIndex: ["car", "name"],
                  key: "name",
                  width: 200,
                  render: (text: string, record: CarUsageData) => (
                    <div>
                      <Text strong>{text || record.car.model}</Text>
                      {record.car.model && text !== record.car.model && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{record.car.model}</Text>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: "Số đơn hàng",
                  dataIndex: "totalOrders",
                  key: "totalOrders",
                  width: 120,
                  align: "center",
                  sorter: (a, b) => a.totalOrders - b.totalOrders,
                  render: (value: number) => (
                    <Tag color={value > 0 ? "blue" : "default"}>{value}</Tag>
                  ),
                },
                {
                  title: "Tổng ngày thuê",
                  dataIndex: "totalDays",
                  key: "totalDays",
                  width: 130,
                  align: "center",
                  sorter: (a, b) => a.totalDays - b.totalDays,
                  render: (value: number) => (
                    <Text>{value} ngày</Text>
                  ),
                },
                {
                  title: "Tỷ lệ sử dụng",
                  dataIndex: "usageRate",
                  key: "usageRate",
                  width: 200,
                  sorter: (a, b) => a.usageRate - b.usageRate,
                  render: (value: number) => (
                    <div>
                      <Progress
                        percent={Math.round(value)}
                        status={value >= 70 ? "success" : value >= 40 ? "normal" : "exception"}
                        strokeColor={
                          value >= 70 ? "#52c41a" : value >= 40 ? "#1890ff" : "#ff4d4f"
                        }
                        format={(percent) => `${percent}%`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Ngày thuê gần nhất",
                  dataIndex: "lastRentalDate",
                  key: "lastRentalDate",
                  width: 150,
                  render: (date: string | undefined) => (
                    date ? (
                      <Text type="secondary">{dayjs(date).format("DD/MM/YYYY")}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: "italic" }}>Chưa có</Text>
                    )
                  ),
                },
                {
                  title: "Trạng thái",
                  dataIndex: ["car", "status"],
                  key: "status",
                  width: 100,
                  render: (status: number) => (
                    <Tag color={status === 1 ? "green" : "red"}>
                      {status === 1 ? "Sẵn sàng" : "Hết xe"}
                    </Tag>
                  ),
                },
              ]}
            />
          ) : (
            <Card type="inner" style={{ textAlign: "center" }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span>Chưa có dữ liệu xe</span>}
              >
                <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis}>
                  Tải lại
                </Button>
              </Empty>
            </Card>
          )
        )}

        {!loading && !error && variant !== "car-usage" && (
          analysis ? (
            <Card
              type="inner"
              styles={{ body: { padding: 0 } } as CardProps["styles"]}
              style={{
                background:
                  "linear-gradient(180deg, rgba(236,248,255,1) 0%, rgba(240,244,255,1) 50%, rgba(241,253,246,1) 100%)",
                border: "1px solid #DDE7FF",
                boxShadow: "0 10px 30px rgba(20,71,230,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px dashed #DFE7FF",
                  background: "rgba(255,255,255,0.6)"
                }}
              >
                <Text type="secondary">Kết quả phân tích</Text>
              </div>
              <div style={{ padding: 20 }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  <div
                    style={{
                      position: "relative",
                      padding: 2,
                      borderRadius: 14,
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,197,94,0.35))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 12,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.65))",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          background: "#FFFFFF",
                          color: "#0B1220",
                          padding: 20,
                          borderRadius: 10,
                          border: "1px solid rgba(2,6,23,0.08)",
                          boxShadow: "0 6px 18px rgba(2,6,23,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
                          maxHeight: 420,
                          overflow: "auto",
                          fontSize: 15,
                          lineHeight: 1.7,
                        }}
                      >
                        {analysis}
                      </pre>
                    </div>
                  </div>
                </Paragraph>
              </div>
            </Card>
          ) : (
            <Card type="inner" style={{ textAlign: "center" }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span>Chưa có nội dung gợi ý</span>}
              >
                <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis}>Phân tích lại</Button>
              </Empty>
            </Card>
          )
        )}
      </Space>
    </Card>
  );
}



