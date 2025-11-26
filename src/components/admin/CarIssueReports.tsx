"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Image,
  Input,
  Spin,
  Empty,
  Button,
  Modal,
  message,
  Descriptions,
  Select,
  Badge,
} from "antd";
import {
  CarOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";

const { TextArea } = Input;

// Hàm utility để đếm số báo cáo pending (export để dùng ở layout)
export const getPendingReportsCount = (): number => {
  try {
    const stored = localStorage.getItem("carIssueReports");
    if (!stored) return 0;
    
    const reports: CarIssueReport[] = JSON.parse(stored);
    
    // Đếm những báo cáo có status là "pending"
    const pendingCount = reports.filter((r) => r.status === "pending").length;
    
    return pendingCount;
  } catch (error) {
    console.error("Error counting pending reports:", error);
    return 0;
  }
};

interface CarIssueReport {
  id?: number;
  carId: number;
  carName?: string;
  issueType: "mechanical" | "electrical" | "body" | "interior" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  reportedBy?: string;
  reportedAt?: string;
  status: "pending" | "in_progress" | "resolved";
  images?: string[];
}

export default function CarIssueReports() {
  const [issueReports, setIssueReports] = useState<CarIssueReport[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [selectedReport, setSelectedReport] = useState<CarIssueReport | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadIssueReports();
    loadCars();

    // Lắng nghe sự kiện storage để tự động cập nhật khi có báo cáo mới
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "carIssueReports") {
        console.log('[CarIssueReports] Storage changed, reloading reports...');
        loadIssueReports();
      }
    };

    // Lắng nghe storage events từ các tab/window khác
    window.addEventListener("storage", handleStorageChange);

    // Lắng nghe custom event từ cùng window (khi Staff tạo báo cáo mới)
    const handleCustomStorageChange = () => {
      console.log('[CarIssueReports] Custom storage event, reloading reports...');
      loadIssueReports();
    };
    window.addEventListener("carIssueReportsUpdated", handleCustomStorageChange);

    // Auto-refresh mỗi 5 giây để đảm bảo luôn có dữ liệu mới nhất
    const interval = setInterval(() => {
      loadIssueReports();
    }, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("carIssueReportsUpdated", handleCustomStorageChange);
      clearInterval(interval);
    };
  }, []);

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

  const loadIssueReports = () => {
    try {
      const stored = localStorage.getItem("carIssueReports");
      if (stored) {
        const reports = JSON.parse(stored);
        console.log('[CarIssueReports] Loaded reports:', reports.length);
        // Debug: Log ảnh của từng report
        reports.forEach((report: CarIssueReport) => {
          if (report.images && report.images.length > 0) {
            console.log(`[CarIssueReports] Report #${report.id} has ${report.images.length} images:`, report.images);
          }
        });
        setIssueReports(reports);
      } else {
        console.log('[CarIssueReports] No reports found in localStorage');
        setIssueReports([]);
      }
    } catch (error) {
      console.error("Load issue reports error:", error);
      setIssueReports([]);
    }
  };

  const updateReportStatus = (reportId: number | undefined, newStatus: "pending" | "in_progress" | "resolved") => {
    if (!reportId) return;
    
    const updatedReports = issueReports.map((report) =>
      report.id === reportId ? { ...report, status: newStatus } : report
    );
    setIssueReports(updatedReports);
    localStorage.setItem("carIssueReports", JSON.stringify(updatedReports));
    message.success("Cập nhật trạng thái thành công!");
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mechanical: "Cơ khí",
      electrical: "Điện",
      body: "Thân xe",
      interior: "Nội thất",
      other: "Khác",
    };
    return labels[type] || type;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
      critical: "Nghiêm trọng",
    };
    return labels[severity] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "default",
      medium: "orange",
      high: "red",
      critical: "red",
    };
    return colors[severity] || "default";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ xử lý",
      in_progress: "Đang xử lý",
      resolved: "Đã xử lý",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "orange",
      in_progress: "blue",
      resolved: "green",
    };
    return colors[status] || "default";
  };

  const filteredReports = issueReports.filter((report) => {
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const car = cars.find((c) => c.id === report.carId);
      return (
        String(report.carId).includes(searchLower) ||
        report.carName?.toLowerCase().includes(searchLower) ||
        car?.name?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        getIssueTypeLabel(report.issueType).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const columns = [
    {
      title: "ID Báo cáo",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: number) => <strong>#{id}</strong>,
    },
    {
      title: "Xe",
      key: "car",
      render: (_: any, record: CarIssueReport) => {
        const car = cars.find((c) => c.id === record.carId);
        return (
          <Space>
            <CarOutlined style={{ color: "#1890ff" }} />
            <div>
              <div className="font-medium">
                {record.carName || car?.name || `ID: ${record.carId}`}
              </div>
              <div className="text-xs text-gray-500">{car?.model || ""}</div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Loại sự cố",
      dataIndex: "issueType",
      key: "issueType",
      render: (type: string) => <Tag>{getIssueTypeLabel(type)}</Tag>,
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{getSeverityLabel(severity)}</Tag>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => (
        <span style={{ maxWidth: 300, display: "block" }}>{text}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string, record: CarIssueReport) => (
        <Select
          value={status}
          onChange={(value) => updateReportStatus(record.id, value)}
          style={{ width: 140 }}
        >
          <Select.Option value="pending">
            <Tag color="orange">Chờ xử lý</Tag>
          </Select.Option>
          <Select.Option value="in_progress">
            <Tag color="blue">Đang xử lý</Tag>
          </Select.Option>
          <Select.Option value="resolved">
            <Tag color="green">Đã xử lý</Tag>
          </Select.Option>
        </Select>
      ),
    },
    {
      title: "Ngày báo cáo",
      dataIndex: "reportedAt",
      key: "reportedAt",
      width: 150,
      render: (date: string) =>
        date ? new Date(date).toLocaleString("vi-VN") : "-",
    },
    {
      title: "Hành động",
      key: "action",
      width: 100,
      render: (_: any, record: CarIssueReport) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedReport(record);
            setDetailModalVisible(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const pendingCount = issueReports.filter((r) => r.status === "pending").length;
  const inProgressCount = issueReports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = issueReports.filter((r) => r.status === "resolved").length;

  return (
    <div>
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
              Báo cáo sự cố từ staff
              
            </h2>
            <Space>
              <Badge count={pendingCount} showZero>
                <Tag color="orange">Chờ xử lý: {pendingCount}</Tag>
              </Badge>
              <Badge count={inProgressCount} showZero>
                <Tag color="blue">Đang xử lý: {inProgressCount}</Tag>
              </Badge>
              <Badge count={resolvedCount} showZero>
                <Tag color="green">Đã xử lý: {resolvedCount}</Tag>
              </Badge>
            </Space>
          </div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              style={{ width: 200 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "pending", label: "Chờ xử lý" },
                { value: "in_progress", label: "Đang xử lý" },
                { value: "resolved", label: "Đã xử lý" },
              ]}
            />
            <Input.Search
              placeholder="Tìm kiếm theo ID xe, tên xe, mô tả..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 400 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
            <Button onClick={() => {
              console.log('[CarIssueReports] Manual refresh triggered');
              loadIssueReports();
              message.success("Đã làm mới danh sách báo cáo");
            }}>Làm mới</Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          {filteredReports.length === 0 ? (
            <Empty description="Không có báo cáo sự cố nào" />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredReports}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng cộng: ${total} báo cáo`,
              }}
            />
          )}
        </Spin>
      </Card>

      {/* Modal chi tiết báo cáo */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>Chi tiết báo cáo sự cố</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="ID Báo cáo">
                <strong>#{selectedReport.id}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Xe">
                {(() => {
                  const car = cars.find((c) => c.id === selectedReport.carId);
                  return (
                    <Space>
                      <CarOutlined />
                      <span>
                        {selectedReport.carName || car?.name || `ID: ${selectedReport.carId}`} - {car?.model || ""}
                      </span>
                    </Space>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Loại sự cố">
                <Tag>{getIssueTypeLabel(selectedReport.issueType)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Mức độ nghiêm trọng">
                <Tag color={getSeverityColor(selectedReport.severity)}>
                  {getSeverityLabel(selectedReport.severity)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedReport.status)}>
                  {getStatusLabel(selectedReport.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả chi tiết">
                <div style={{ whiteSpace: "pre-wrap" }}>{selectedReport.description}</div>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày báo cáo">
                {selectedReport.reportedAt
                  ? new Date(selectedReport.reportedAt).toLocaleString("vi-VN")
                  : "-"}
              </Descriptions.Item>
              {selectedReport.images && selectedReport.images.length > 0 && (
                <Descriptions.Item label="Hình ảnh">
                  <div style={{ marginTop: 8 }}>
                    <Image.PreviewGroup>
                      <Space wrap>
                        {selectedReport.images.map((img, index) => {
                          // Xử lý cả URL string và object có url property
                          const imageUrl = typeof img === 'string' ? img : (img as any)?.url || img;
                          if (!imageUrl) return null;
                          
                          return (
                            <Image
                              key={index}
                              src={imageUrl}
                              alt={`Hình ảnh sự cố ${index + 1}`}
                              width={200}
                              height={150}
                              style={{ 
                                objectFit: "cover", 
                                borderRadius: 8,
                                border: "1px solid #d9d9d9",
                                cursor: "pointer"
                              }}
                              fallback="/logo_ev.png"
                              preview={{
                                mask: "Xem ảnh",
                              }}
                            />
                          );
                        })}
                      </Space>
                    </Image.PreviewGroup>
                    <div style={{ marginTop: 8, fontSize: "12px", color: "#666" }}>
                      Tổng cộng: {selectedReport.images.length} ảnh - Click vào ảnh để xem phóng to
                    </div>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <strong>Cập nhật trạng thái:</strong>
              <Space style={{ marginTop: 8 }}>
                <Button
                  type={selectedReport.status === "pending" ? "primary" : "default"}
                  onClick={() => {
                    updateReportStatus(selectedReport.id, "pending");
                    setSelectedReport({ ...selectedReport, status: "pending" });
                  }}
                >
                  Chờ xử lý
                </Button>
                <Button
                  type={selectedReport.status === "in_progress" ? "primary" : "default"}
                  onClick={() => {
                    updateReportStatus(selectedReport.id, "in_progress");
                    setSelectedReport({ ...selectedReport, status: "in_progress" });
                  }}
                >
                  Đang xử lý
                </Button>
                <Button
                  type={selectedReport.status === "resolved" ? "primary" : "default"}
                  onClick={() => {
                    updateReportStatus(selectedReport.id, "resolved");
                    setSelectedReport({ ...selectedReport, status: "resolved" });
                  }}
                >
                  Đã xử lý
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

