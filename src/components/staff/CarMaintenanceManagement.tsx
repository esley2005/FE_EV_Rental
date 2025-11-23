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
  Form,
  InputNumber,
  Select,
  Button,
  Modal,
  message,
  Descriptions,
  Upload,
} from "antd";
import {
  CarOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { UploadFile } from "antd/es/upload/interface";

const { TextArea } = Input;

interface CarMaintenanceManagementProps {
  selectedSubMenu: string;
}

interface CarTechnicalStatus {
  carId: number;
  batteryLevel?: number; // 0-100
  batteryHealth?: "excellent" | "good" | "fair" | "poor";
  technicalCondition?: "excellent" | "good" | "fair" | "poor" | "needs_repair";
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
}

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

export default function CarMaintenanceManagement({
  selectedSubMenu,
}: CarMaintenanceManagementProps) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [technicalStatuses, setTechnicalStatuses] = useState<
    Record<number, CarTechnicalStatus>
  >({});
  const [issueReports, setIssueReports] = useState<CarIssueReport[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [form] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [issueImages, setIssueImages] = useState<UploadFile[]>([]);
  const [selectCarModalVisible, setSelectCarModalVisible] = useState(false);
  const [selectCarForm] = Form.useForm();

  useEffect(() => {
    loadCars();
    loadIssueReports();
  }, []);

  const loadCars = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const loadIssueReports = async () => {
    // Load từ localStorage hoặc API (nếu có)
    try {
      const stored = localStorage.getItem("carIssueReports");
      if (stored) {
        setIssueReports(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Load issue reports error:", error);
    }
  };

  const saveIssueReport = (report: CarIssueReport) => {
    const newReports = [...issueReports, { ...report, id: Date.now(), reportedAt: new Date().toISOString(), status: "pending" }];
    setIssueReports(newReports);
    localStorage.setItem("carIssueReports", JSON.stringify(newReports));
  };

  const handleUpdateTechnicalStatus = async (values: any) => {
    if (!selectedCar) return;

    setUploading(true);
    try {
      // Lưu vào state (có thể gửi lên API sau)
      setTechnicalStatuses((prev) => ({
        ...prev,
        [selectedCar.id]: {
          carId: selectedCar.id,
          batteryLevel: values.batteryLevel,
          batteryHealth: values.batteryHealth,
          technicalCondition: values.technicalCondition,
          lastMaintenanceDate: values.lastMaintenanceDate,
          nextMaintenanceDate: values.nextMaintenanceDate,
          notes: values.notes,
        },
      }));

      message.success("Cập nhật trạng thái kỹ thuật thành công!");
      setModalVisible(false);
      form.resetFields();
      setSelectedCar(null);
    } catch (error) {
      console.error("Update technical status error:", error);
      message.error("Cập nhật thất bại. Vui lòng thử lại!");
    } finally {
      setUploading(false);
    }
  };

  // Upload ảnh lên Cloudinary
  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars';
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    
    formData.append('upload_preset', uploadPreset);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Upload failed with status: ${response.status}`);
      }

      if (data.secure_url) {
        return data.secure_url;
      }
      throw new Error('No secure_url in response');
    } catch (error) {
      console.error('[Upload] Cloudinary upload failed:', error);
      throw error;
    }
  };

  const handleSubmitIssue = async (values: any) => {
    if (!selectedCar) return;

    setUploading(true);
    try {
      // Upload tất cả ảnh lên Cloudinary trước
      const uploadedImageUrls: string[] = [];
      
      for (const file of issueImages) {
        if (file.originFileObj) {
          try {
            const imageUrl = await uploadImageToCloudinary(file.originFileObj);
            uploadedImageUrls.push(imageUrl);
          } catch (error) {
            console.error('Failed to upload image:', error);
            message.warning(`Không thể upload ảnh ${file.name}. Báo cáo sẽ được gửi không có ảnh này.`);
          }
        } else if (file.url && file.url.startsWith('http')) {
          // Nếu đã có URL (đã upload trước đó), giữ nguyên
          uploadedImageUrls.push(file.url);
        }
      }

      const report: CarIssueReport = {
        carId: selectedCar.id,
        carName: selectedCar.name,
        issueType: values.issueType,
        severity: values.severity,
        description: values.description,
        status: "pending",
        images: uploadedImageUrls,
      };

      console.log('[CarMaintenanceManagement] Saving report with images:', {
        reportId: report.id,
        carId: report.carId,
        imageCount: uploadedImageUrls.length,
        imageUrls: uploadedImageUrls
      });

      saveIssueReport(report);
      message.success(
        uploadedImageUrls.length > 0
          ? `Báo cáo sự cố đã được gửi lên admin! (${uploadedImageUrls.length} ảnh đã được upload)`
          : "Báo cáo sự cố đã được gửi lên admin!"
      );
      setIssueModalVisible(false);
      issueForm.resetFields();
      setIssueImages([]);
      setSelectedCar(null);
    } catch (error) {
      console.error("Submit issue error:", error);
      message.error("Gửi báo cáo thất bại. Vui lòng thử lại!");
    } finally {
      setUploading(false);
    }
  };

  const openTechnicalModal = (car: Car) => {
    setSelectedCar(car);
    const existingStatus = technicalStatuses[car.id];
    form.setFieldsValue({
      batteryLevel: existingStatus?.batteryLevel || undefined,
      batteryHealth: existingStatus?.batteryHealth || undefined,
      technicalCondition: existingStatus?.technicalCondition || undefined,
      lastMaintenanceDate: existingStatus?.lastMaintenanceDate || undefined,
      nextMaintenanceDate: existingStatus?.nextMaintenanceDate || undefined,
      notes: existingStatus?.notes || undefined,
    });
    setModalVisible(true);
  };

  const openIssueModal = (car: Car) => {
    setSelectedCar(car);
    issueForm.resetFields();
    setIssueImages([]);
    setIssueModalVisible(true);
  };

  const filteredCars = cars.filter((car) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      car.name?.toLowerCase().includes(searchLower) ||
      car.model?.toLowerCase().includes(searchLower) ||
      String(car.id).includes(searchLower)
    );
  });

  const filteredIssues = issueReports.filter((issue) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      issue.carName?.toLowerCase().includes(searchLower) ||
      issue.description?.toLowerCase().includes(searchLower) ||
      String(issue.carId).includes(searchLower)
    );
  });

  // Tab 1: Cập nhật trạng thái pin & kỹ thuật
  const technicalColumns = [
    {
      title: "Hình ảnh",
      key: "image",
      width: 120,
      render: (_: any, record: Car) => (
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
      render: (_: any, record: Car) => (
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
      title: "Trạng thái pin",
      key: "battery",
      render: (_: any, record: Car) => {
        const status = technicalStatuses[record.id];
        if (!status?.batteryLevel) {
          return <Tag color="default">Chưa cập nhật</Tag>;
        }
        const level = status.batteryLevel;
        const health = status.batteryHealth;
        const healthColors: Record<string, string> = {
          excellent: "green",
          good: "blue",
          fair: "orange",
          poor: "red",
        };
        return (
          <Space direction="vertical" size="small">
            <Tag color={level >= 80 ? "green" : level >= 50 ? "orange" : "red"}>
              {level}%
            </Tag>
            {health && (
              <Tag color={healthColors[health] || "default"}>
                {health === "excellent"
                  ? "Tuyệt vời"
                  : health === "good"
                  ? "Tốt"
                  : health === "fair"
                  ? "Khá"
                  : "Kém"}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Tình trạng kỹ thuật",
      key: "technical",
      render: (_: any, record: Car) => {
        const status = technicalStatuses[record.id];
        if (!status?.technicalCondition) {
          return <Tag color="default">Chưa cập nhật</Tag>;
        }
        const condition = status.technicalCondition;
        const colors: Record<string, string> = {
          excellent: "green",
          good: "blue",
          fair: "orange",
          poor: "orange",
          needs_repair: "red",
        };
        const labels: Record<string, string> = {
          excellent: "Tuyệt vời",
          good: "Tốt",
          fair: "Khá",
          poor: "Kém",
          needs_repair: "Cần sửa chữa",
        };
        return (
          <Tag color={colors[condition] || "default"}>
            {labels[condition] || condition}
          </Tag>
        );
      },
    },
    {
      title: "Bảo trì",
      key: "maintenance",
      render: (_: any, record: Car) => {
        const status = technicalStatuses[record.id];
        if (!status?.lastMaintenanceDate) {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <div className="text-sm">
            <div>Lần cuối: {status.lastMaintenanceDate}</div>
            {status.nextMaintenanceDate && (
              <div className="text-orange-600">
                Lần tới: {status.nextMaintenanceDate}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      render: (_: any, record: Car) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => openTechnicalModal(record)}
        >
          Cập nhật
        </Button>
      ),
    },
  ];

  // Tab 2: Báo cáo sự cố
  const issueColumns = [
    {
      title: "Xe",
      key: "car",
      render: (_: any, record: CarIssueReport) => {
        const car = cars.find((c) => c.id === record.carId);
        return (
          <Space>
            <CarOutlined style={{ color: "#1890ff" }} />
            <div>
              <div className="font-medium">{record.carName || car?.name || `ID: ${record.carId}`}</div>
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
      render: (type: string) => {
        const labels: Record<string, string> = {
          mechanical: "Cơ khí",
          electrical: "Điện",
          body: "Thân xe",
          interior: "Nội thất",
          other: "Khác",
        };
        return <Tag>{labels[type] || type}</Tag>;
      },
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => {
        const colors: Record<string, string> = {
          low: "default",
          medium: "orange",
          high: "red",
          critical: "red",
        };
        const labels: Record<string, string> = {
          low: "Thấp",
          medium: "Trung bình",
          high: "Cao",
          critical: "Nghiêm trọng",
        };
        return (
          <Tag color={colors[severity] || "default"}>
            {labels[severity] || severity}
          </Tag>
        );
      },
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: "orange",
          in_progress: "blue",
          resolved: "green",
        };
        const labels: Record<string, string> = {
          pending: "Chờ xử lý",
          in_progress: "Đang xử lý",
          resolved: "Đã xử lý",
        };
        return (
          <Tag color={colors[status] || "default"}>
            {labels[status] || status}
          </Tag>
        );
      },
    },
    {
      title: "Ngày báo cáo",
      dataIndex: "reportedAt",
      key: "reportedAt",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString("vi-VN") : "-",
    },
  ];

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
              {selectedSubMenu === "1"
                ? "Cập nhật trạng thái pin & kỹ thuật"
                : "Báo cáo sự cố / hỏng hóc"}
            </h2>
            <Input.Search
              placeholder="Tìm kiếm theo tên xe, model..."
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

        {selectedSubMenu === "1" ? (
          <Spin spinning={loading}>
            {filteredCars.length === 0 ? (
              <Empty description="Không có xe nào" />
            ) : (
              <Table
                columns={technicalColumns}
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
        ) : (
          <div>
            <div style={{ marginBottom: 16, textAlign: "right" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (cars.length > 0) {
                    setSelectCarModalVisible(true);
                  } else {
                    message.warning("Không có xe nào để báo cáo");
                  }
                }}
              >
                Báo cáo sự cố mới
              </Button>
            </div>
            <Table
              columns={issueColumns}
              dataSource={filteredIssues}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng cộng: ${total} báo cáo`,
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal cập nhật trạng thái kỹ thuật */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            <span>Cập nhật trạng thái pin & kỹ thuật</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedCar(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateTechnicalStatus}
        >
          {selectedCar ? (
            <div>
              <Descriptions column={1} bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Xe">
                  {selectedCar.name} - {selectedCar.model}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Mức pin (%)"
                name="batteryLevel"
                rules={[
                  { required: true, message: "Vui lòng nhập mức pin" },
                  { type: "number", min: 0, max: 100, message: "Mức pin từ 0-100%" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  max={100}
                  placeholder="Nhập mức pin (0-100%)"
                />
              </Form.Item>
              <Form.Item
                label="Tình trạng pin"
                name="batteryHealth"
                rules={[{ required: true, message: "Vui lòng chọn tình trạng pin" }]}
              >
                <Select placeholder="Chọn tình trạng pin">
                  <Select.Option value="excellent">Tuyệt vời</Select.Option>
                  <Select.Option value="good">Tốt</Select.Option>
                  <Select.Option value="fair">Khá</Select.Option>
                  <Select.Option value="poor">Kém</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="Tình trạng kỹ thuật"
                name="technicalCondition"
                rules={[
                  { required: true, message: "Vui lòng chọn tình trạng kỹ thuật" },
                ]}
              >
                <Select placeholder="Chọn tình trạng kỹ thuật">
                  <Select.Option value="excellent">Tuyệt vời</Select.Option>
                  <Select.Option value="good">Tốt</Select.Option>
                  <Select.Option value="fair">Khá</Select.Option>
                  <Select.Option value="poor">Kém</Select.Option>
                  <Select.Option value="needs_repair">Cần sửa chữa</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="Ngày bảo trì lần cuối" name="lastMaintenanceDate">
                <Input placeholder="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Ngày bảo trì lần tới" name="nextMaintenanceDate">
                <Input placeholder="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Ghi chú" name="notes">
                <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    icon={<ToolOutlined />}
                  >
                    Cập nhật
                  </Button>
                  <Button onClick={() => setModalVisible(false)}>Hủy</Button>
                </Space>
              </Form.Item>
            </div>
          ) : null}
        </Form>
      </Modal>

      {/* Modal báo cáo sự cố */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>Báo cáo sự cố / hỏng hóc</span>
          </Space>
        }
        open={issueModalVisible}
        onCancel={() => {
          setIssueModalVisible(false);
          issueForm.resetFields();
          setIssueImages([]);
          setSelectedCar(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={issueForm}
          layout="vertical"
          onFinish={handleSubmitIssue}
        >
          {selectedCar ? (
            <div>
              <Descriptions column={1} bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Xe">
                  {selectedCar.name} - {selectedCar.model}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Loại sự cố"
                name="issueType"
                rules={[{ required: true, message: "Vui lòng chọn loại sự cố" }]}
              >
                <Select placeholder="Chọn loại sự cố">
                  <Select.Option value="mechanical">Cơ khí</Select.Option>
                  <Select.Option value="electrical">Điện</Select.Option>
                  <Select.Option value="body">Thân xe</Select.Option>
                  <Select.Option value="interior">Nội thất</Select.Option>
                  <Select.Option value="other">Khác</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="Mức độ nghiêm trọng"
                name="severity"
                rules={[
                  { required: true, message: "Vui lòng chọn mức độ nghiêm trọng" },
                ]}
              >
                <Select placeholder="Chọn mức độ">
                  <Select.Option value="low">Thấp</Select.Option>
                  <Select.Option value="medium">Trung bình</Select.Option>
                  <Select.Option value="high">Cao</Select.Option>
                  <Select.Option value="critical">Nghiêm trọng</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="Mô tả chi tiết"
                name="description"
                rules={[
                  { required: true, message: "Vui lòng nhập mô tả sự cố" },
                  { min: 10, message: "Mô tả phải có ít nhất 10 ký tự" },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Mô tả chi tiết về sự cố hoặc hỏng hóc..."
                />
              </Form.Item>
              <Form.Item label="Hình ảnh (nếu có)" name="images">
                <Upload
                  listType="picture-card"
                  fileList={issueImages}
                  onChange={({ fileList }) => setIssueImages(fileList)}
                  beforeUpload={() => false}
                >
                  {issueImages.length < 5 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Tải lên</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    icon={<ExclamationCircleOutlined />}
                  >
                    Gửi báo cáo
                  </Button>
                  <Button onClick={() => setIssueModalVisible(false)}>Hủy</Button>
                </Space>
              </Form.Item>
            </div>
          ) : null}
        </Form>
      </Modal>

      {/* Modal chọn xe để báo cáo sự cố */}
      <Modal
        title="Chọn xe để báo cáo sự cố"
        open={selectCarModalVisible}
        onOk={() => {
          selectCarForm.validateFields().then((values) => {
            const car = cars.find((c) => c.id === values.selectedCarId);
            if (car) {
              setSelectCarModalVisible(false);
              selectCarForm.resetFields();
              openIssueModal(car);
            }
          });
        }}
        onCancel={() => {
          setSelectCarModalVisible(false);
          selectCarForm.resetFields();
        }}
        okText="Tiếp tục"
        cancelText="Hủy"
      >
        <Form form={selectCarForm} layout="vertical">
          <Form.Item
            name="selectedCarId"
            label="Tìm kiếm xe theo ID"
            rules={[{ required: true, message: "Vui lòng chọn xe" }]}
          >
            <Select
              placeholder="Tìm kiếm theo ID xe"
              showSearch
              filterOption={(input, option) => {
                // Search theo ID
                const carId = String(option?.value || "");
                return carId.includes(input);
              }}
              options={cars.map((car) => ({
                label: `ID: ${car.id} - ${car.name} - ${car.model}`,
                value: car.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

