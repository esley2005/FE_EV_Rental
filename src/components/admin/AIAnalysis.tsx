"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Typography, Button, Space, Spin, Alert, Skeleton, Tooltip, Empty, message, Row, Col, Statistic, Table, Input } from "antd";
import { ReloadOutlined, BulbOutlined, CopyOutlined, DownloadOutlined, CarOutlined, DollarOutlined, UserOutlined, MessageOutlined, StarOutlined, RiseOutlined } from "@ant-design/icons";
import { analyzeAI, analyzeCarUsage, type AnalysisResponse } from "@/services/ai";
import dynamic from "next/dynamic";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Dynamic import Chart.js components
const Pie = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return { default: mod.Pie };
  },
  { ssr: false }
) as any;

const Bar = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return { default: mod.Bar };
  },
  { ssr: false }
) as any;

const Doughnut = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return { default: mod.Doughnut };
  },
  { ssr: false }
) as any;

type AIAnalysisProps = {
  variant?: "general" | "car-usage";
};

export default function AIAnalysis({ variant = "general" }: AIAnalysisProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [copying, setCopying] = useState<boolean>(false);
  const [chartReady, setChartReady] = useState<boolean>(false);

  // Register Chart.js on mount
  useEffect(() => {
    const registerChart = async () => {
      try {
        const chartJs = await import('chart.js');
        const ChartJS = (chartJs as any).Chart;

        if (!ChartJS) {
          console.error('Chart.js not found');
          return;
        }

        const {
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend,
          Filler
        } = chartJs as any;

        ChartJS.register(
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend,
          Filler
        );

        setChartReady(true);
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
      }
    };

    registerChart();
  }, []);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = variant === "car-usage" ? await analyzeCarUsage() : await analyzeAI();
      if (res.success && res.data) {
        // Check if it's the new comprehensive format
        if ('summary' in res.data || 'carStatistics' in res.data) {
          setAnalysisData(res.data as AnalysisResponse);
        } else {
          // Legacy format - convert to new format
          const legacyData = res.data as any;
          setAnalysisData({
            aiAnalysis: legacyData.response || legacyData.analysis || '',
            summary: {
              totalCars: 0,
              totalOrders: 0,
              totalUsers: 0,
              totalFeedbacks: 0,
              totalRevenue: 0,
              avgRating: 0,
            },
            carStatistics: { bySizeType: [], topCars: [] },
            orderStatistics: {
              byStatus: [],
              driverOption: {
                withDriverCount: 0,
                withoutDriverCount: 0,
                withDriverPercentage: 0,
                withoutDriverPercentage: 0,
              },
              recentOrders: [],
            },
            feedbackStatistics: { byRating: [], recentFeedbacks: [] },
            paymentStatistics: { byMethod: [] },
            locationStatistics: { locations: [] },
          });
        }
      } else {
        setError(res.error || "Không thể lấy kết quả phân tích.");
      }
    } catch (e: unknown) {
      const messageText = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleCopy = async () => {
    if (!analysisData?.aiAnalysis) return;
    setCopying(true);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(analysisData.aiAnalysis);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = analysisData.aiAnalysis;
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
    if (!analysisData?.aiAnalysis) return;
    const blob = new Blob([analysisData.aiAnalysis], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-analysis.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  if (loading) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8">
          <Spin size="large" />
          <p className="text-gray-600">Đang phân tích dữ liệu...</p>
        </div>
        <Card type="inner" style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
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
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span>Chưa có dữ liệu phân tích</span>}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis}>Phân tích lại</Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <Card
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
                {variant === "car-usage" ? "Tỷ lệ sử dụng xe" : "Phân tích AI · Báo cáo tổng quan"}
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
                disabled={!analysisData.aiAnalysis}
              />
            </Tooltip>
            <Tooltip title="Tải xuống">
              <Button onClick={handleDownload} icon={<DownloadOutlined />} disabled={!analysisData.aiAnalysis} />
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
        {/* Summary Cards */}
        <SummaryCards summary={analysisData.summary} formatCurrency={formatCurrency} />

        {/* AI Analysis Section */}
        {analysisData.aiAnalysis && (
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: "#1890ff" }} />
                <Text strong>Phân tích AI & Gợi ý nâng cấp</Text>
              </Space>
            }
            style={{ marginTop: 16, borderRadius: 12 }}
          >
            <TextArea
              value={analysisData.aiAnalysis}
              readOnly
              rows={10}
              style={{ whiteSpace: 'pre-line', fontFamily: 'inherit' }}
            />
          </Card>
        )}

        {/* Statistics Sections */}
        <CarStatisticsSection data={analysisData.carStatistics} chartReady={chartReady} formatCurrency={formatCurrency} />
        <OrderStatisticsSection data={analysisData.orderStatistics} chartReady={chartReady} formatCurrency={formatCurrency} formatDate={formatDate} formatDateTime={formatDateTime} />
        <FeedbackStatisticsSection data={analysisData.feedbackStatistics} chartReady={chartReady} formatDate={formatDate} />
        <PaymentStatisticsSection data={analysisData.paymentStatistics} chartReady={chartReady} formatCurrency={formatCurrency} />
        <LocationStatisticsSection data={analysisData.locationStatistics} />
      </Card>
    </div>
  );
}

// Summary Cards Component
function SummaryCards({ summary, formatCurrency }: { summary: any; formatCurrency: (v: number) => string }) {
  const cards = [
    { icon: <CarOutlined />, color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", title: "Tổng số xe", value: summary.totalCars },
    { icon: <RiseOutlined />, color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", title: "Tổng đơn hàng", value: summary.totalOrders },
    { icon: <UserOutlined />, color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", title: "Khách hàng", value: summary.totalUsers },
    { icon: <MessageOutlined />, color: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", title: "Phản hồi", value: summary.totalFeedbacks },
    { icon: <DollarOutlined />, color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", title: "Doanh thu", value: formatCurrency(summary.totalRevenue) },
    { icon: <StarOutlined />, color: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", title: "Đánh giá TB", value: `${summary.avgRating.toFixed(1)}/5` },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card, index) => (
        <Col xs={24} sm={12} md={8} lg={8} xl={4} key={index}>
          <Card
            style={{
              background: card.color,
              border: "none",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>{card.title}</span>}
              value={card.value}
              prefix={card.icon}
              valueStyle={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// Car Statistics Section
function CarStatisticsSection({ data, chartReady, formatCurrency }: { data: any; chartReady: boolean; formatCurrency: (v: number) => string }) {
  if (!data || (data.bySizeType.length === 0 && data.topCars.length === 0)) return null;

  const pieData = {
    labels: data.bySizeType.map((item: any) => item.sizeType),
    datasets: [{
      data: data.bySizeType.map((item: any) => item.count),
      backgroundColor: [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(79, 172, 254, 0.8)',
        'rgba(0, 242, 254, 0.8)',
        'rgba(240, 147, 251, 0.8)',
      ],
    }],
  };

  const topCarsColumns = [
    { title: 'Tên xe', dataIndex: 'name', key: 'name' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Số ghế', dataIndex: 'seats', key: 'seats' },
    { title: 'Pin (km)', dataIndex: 'batteryDuration', key: 'batteryDuration' },
    { title: 'Giá/ngày', dataIndex: 'rentPricePerDay', key: 'rentPricePerDay', render: (v: number) => formatCurrency(v) },
    { title: 'Kích thước', dataIndex: 'sizeType', key: 'sizeType' },
    { title: 'Loại pin', dataIndex: 'batteryType', key: 'batteryType' },
  ];

  return (
    <>
      {data.bySizeType.length > 0 && (
        <Card title="Phân bố xe theo kích thước" style={{ marginTop: 16, borderRadius: 12 }}>
          {chartReady ? (
            <div style={{ height: 300, position: 'relative' }}>
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          ) : (
            <Spin />
          )}
        </Card>
      )}
      {data.topCars.length > 0 && (
        <Card title="Top 5 xe giá cao nhất" style={{ marginTop: 16, borderRadius: 12 }}>
          <Table columns={topCarsColumns} dataSource={data.topCars} rowKey="id" pagination={false} />
        </Card>
      )}
    </>
  );
}

// Order Statistics Section
function OrderStatisticsSection({ data, chartReady, formatCurrency, formatDate, formatDateTime }: { data: any; chartReady: boolean; formatCurrency: (v: number) => string; formatDate: (s: string) => string; formatDateTime: (s: string) => string }) {
  if (!data || (data.byStatus.length === 0 && data.recentOrders.length === 0)) return null;

  const barData = {
    labels: data.byStatus.map((item: any) => item.status),
    datasets: [{
      label: 'Số lượng',
      data: data.byStatus.map((item: any) => item.count),
      backgroundColor: 'rgba(79, 172, 254, 0.8)',
    }],
  };

  const donutData = {
    labels: ['Có tài xế', 'Tự lái'],
    datasets: [{
      data: [data.driverOption.withDriverCount, data.driverOption.withoutDriverCount],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)'],
    }],
  };

  const ordersColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Ngày đặt', dataIndex: 'orderDate', key: 'orderDate', render: formatDate },
    { title: 'Nhận xe', dataIndex: 'pickupTime', key: 'pickupTime', render: formatDateTime },
    { title: 'Trả dự kiến', dataIndex: 'expectedReturnTime', key: 'expectedReturnTime', render: formatDateTime },
    { title: 'Trả thực tế', dataIndex: 'actualReturnTime', key: 'actualReturnTime', render: (v: string | null) => v ? formatDateTime(v) : '-' },
    { title: 'Xe', dataIndex: 'carName', key: 'carName' },
    { title: 'Địa điểm', dataIndex: 'locationName', key: 'locationName' },
    { title: 'Tổng tiền', dataIndex: 'total', key: 'total', render: formatCurrency },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status' },
  ];

  return (
    <>
      {data.byStatus.length > 0 && (
        <Card title="Đơn hàng theo trạng thái" style={{ marginTop: 16, borderRadius: 12 }}>
          {chartReady ? (
            <div style={{ height: 300, position: 'relative' }}>
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          ) : (
            <Spin />
          )}
        </Card>
      )}
      {data.driverOption && (data.driverOption.withDriverCount > 0 || data.driverOption.withoutDriverCount > 0) && (
        <Card title="Tỷ lệ thuê có/không tài xế" style={{ marginTop: 16, borderRadius: 12 }}>
          {chartReady ? (
            <div style={{ height: 300, position: 'relative' }}>
              <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          ) : (
            <Spin />
          )}
        </Card>
      )}
      {data.recentOrders.length > 0 && (
        <Card title="10 đơn hàng gần nhất" style={{ marginTop: 16, borderRadius: 12 }}>
          <Table columns={ordersColumns} dataSource={data.recentOrders} rowKey="id" pagination={false} scroll={{ x: 1200 }} />
        </Card>
      )}
    </>
  );
}

// Feedback Statistics Section
function FeedbackStatisticsSection({ data, chartReady, formatDate }: { data: any; chartReady: boolean; formatDate: (s: string) => string }) {
  if (!data || (data.byRating.length === 0 && data.recentFeedbacks.length === 0)) return null;

  const barData = {
    labels: data.byRating.map((item: any) => `${item.rating} sao`),
    datasets: [{
      label: 'Số lượng',
      data: data.byRating.map((item: any) => item.count),
      backgroundColor: 'rgba(255, 193, 7, 0.8)',
    }],
  };

  return (
    <>
      {data.byRating.length > 0 && (
        <Card title="Phân bố đánh giá" style={{ marginTop: 16, borderRadius: 12 }}>
          {chartReady ? (
            <div style={{ height: 300, position: 'relative' }}>
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          ) : (
            <Spin />
          )}
        </Card>
      )}
      {data.recentFeedbacks.length > 0 && (
        <Card title="Phản hồi gần đây" style={{ marginTop: 16, borderRadius: 12 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {data.recentFeedbacks.map((feedback: any) => (
              <Card key={feedback.id} size="small" style={{ background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>{feedback.title}</Text>
                  <Space>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarOutlined key={i} style={{ color: i < feedback.rating ? '#faad14' : '#d9d9d9' }} />
                    ))}
                  </Space>
                </div>
                <Text>{feedback.content}</Text>
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  {feedback.userName} - {formatDate(feedback.createdAt)}
                </div>
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </>
  );
}

// Payment Statistics Section
function PaymentStatisticsSection({ data, chartReady, formatCurrency }: { data: any; chartReady: boolean; formatCurrency: (v: number) => string }) {
  if (!data || data.byMethod.length === 0) return null;

  const pieData = {
    labels: data.byMethod.map((item: any) => item.paymentMethod),
    datasets: [{
      data: data.byMethod.map((item: any) => item.count),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
    }],
  };

  const paymentColumns = [
    { title: 'Phương thức', dataIndex: 'paymentMethod', key: 'paymentMethod' },
    { title: 'Số lượng', dataIndex: 'count', key: 'count' },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', render: formatCurrency },
  ];

  return (
    <>
      <Card title="Phương thức thanh toán" style={{ marginTop: 16, borderRadius: 12 }}>
        {chartReady ? (
          <div style={{ height: 300, position: 'relative' }}>
            <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        ) : (
          <Spin />
        )}
      </Card>
      <Card title="Chi tiết phương thức thanh toán" style={{ marginTop: 16, borderRadius: 12 }}>
        <Table columns={paymentColumns} dataSource={data.byMethod} rowKey="paymentMethod" pagination={false} />
      </Card>
    </>
  );
}

// Location Statistics Section
function LocationStatisticsSection({ data }: { data: any }) {
  if (!data || data.locations.length === 0) return null;

  return (
    <Card title="Thống kê địa điểm" style={{ marginTop: 16, borderRadius: 12 }}>
      <Row gutter={[16, 16]}>
        {data.locations.map((location: any, index: number) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Title level={5} style={{ marginBottom: 8 }}>{location.name}</Title>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                {location.address}
              </Text>
              <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                <span>🚗 {location.carCount} xe</span>
                <span>📋 {location.orderCount} đơn</span>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
