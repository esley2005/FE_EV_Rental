"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Avatar,
  Tag,
  Space,
  Button,
  Input,
  notification as antdNotification,
  Spin,
  Empty,
  Modal,
  Image,
  Descriptions,
  Tabs,
  Typography,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  IdcardOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { authApi, driverLicenseApi, citizenIdApi, rentalOrderApi } from "@/services/api";
import type { User, DriverLicenseData, CitizenIdData, RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

const { Title } = Typography;

const { Search } = Input;

export default function CustomerManagement() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [customers, setCustomers] = useState<User[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Document modal states
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [driverLicenses, setDriverLicenses] = useState<DriverLicenseData[]>([]);
  const [citizenIds, setCitizenIds] = useState<CitizenIdData[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search text
    if (!searchText.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchText, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAllUsers();
      if (response.success && response.data) {
        // Filter only customers (role = "Customer")
        const customerList = response.data.filter(
          (user: User) => user.role?.toLowerCase() === "customer"
        );
        setCustomers(customerList);
        setFilteredCustomers(customerList);
      } else {
        api.error({
          message: "Lỗi tải danh sách khách hàng",
          description: response.error || "Không thể tải danh sách khách hàng!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Load customers error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể tải danh sách khách hàng. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDocuments = async (customer: User) => {
    if (!customer.id) return;
    
    setLoadingDocuments(true);
    try {
      // Lấy tất cả orders của customer
      const ordersResponse = await rentalOrderApi.getByUserId(customer.id);
      if (!ordersResponse.success || !ordersResponse.data) {
        setDriverLicenses([]);
        setCitizenIds([]);
        return;
      }

      const orders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];
      
      const orderIds = orders.map((order: RentalOrderData) => order.id);

      // Lấy tất cả documents
      const [licenseRes, citizenRes] = await Promise.all([
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
      ]);

      // Filter documents theo orderIds của customer
      let customerLicenses: DriverLicenseData[] = [];
      let customerCitizenIds: CitizenIdData[] = [];

      if (licenseRes.success && licenseRes.data) {
        const allLicenses = Array.isArray(licenseRes.data)
          ? licenseRes.data
          : (licenseRes.data as any)?.$values || [];
        customerLicenses = allLicenses.filter((license: DriverLicenseData) =>
          license.rentalOrderId && orderIds.includes(license.rentalOrderId)
        );
      }

      if (citizenRes.success && citizenRes.data) {
        const allCitizenIds = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        customerCitizenIds = allCitizenIds.filter((citizenId: CitizenIdData) =>
          citizenId.rentalOrderId && orderIds.includes(citizenId.rentalOrderId)
        );
      }

      setDriverLicenses(customerLicenses);
      setCitizenIds(customerCitizenIds);
    } catch (error) {
      console.error("Load customer documents error:", error);
      api.error({
        message: "Lỗi tải giấy tờ",
        description: "Không thể tải giấy tờ của khách hàng. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewDocuments = (customer: User) => {
    setSelectedCustomer(customer);
    setDocumentsModalVisible(true);
    loadCustomerDocuments(customer);
  };

  const getStatusTag = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'approved' || statusLower === '1') {
      return <Tag color="success">Đã xác thực</Tag>;
    }
    if (statusLower === 'rejected' || statusLower === '2') {
      return <Tag color="error">Đã từ chối</Tag>;
    }
    return <Tag color="warning">Chờ xác thực</Tag>;
  };

  const columns = [
    {
      title: "Avatar",
      key: "avatar",
      width: 80,
      render: (_: any, record: User) => (
        <Avatar
          size={48}
          src={record.avatar}
          icon={<UserOutlined />}
          className="border"
        />
      ),
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a: User, b: User) =>
        (a.fullName || "").localeCompare(b.fullName || ""),
      render: (text: string) => <strong>{text || "Chưa cập nhật"}</strong>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text: string) => (
        <Space>
          <MailOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (text: string) => (
        <Space>
          <PhoneOutlined />
          <span>{text || "Chưa cập nhật"}</span>
        </Space>
      ),
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      render: (text: string) => text || "Chưa cập nhật",
    },
    {
      title: "Ngày sinh",
      dataIndex: "dateOfBirth",
      key: "dateOfBirth",
      render: (text: string) =>
        text ? dayjs(text).format("DD/MM/YYYY") : "Chưa cập nhật",
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: any, record: User) => (
        <Space direction="vertical" size="small">
          {record.isEmailConfirmed ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Email đã xác thực
            </Tag>
          ) : (
            <Tag color="warning">Email chưa xác thực</Tag>
          )}
          {record.isActive !== false ? (
            <Tag color="success">Đang hoạt động</Tag>
          ) : (
            <Tag color="error">Đã khóa</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Trạng thái xác thực",
      key: "verification",
      render: (_: any, record: User) => (
        <Space direction="vertical" size="small">
          {record.driverLicenseStatus === 1 ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              GPLX: Đã xác thực
            </Tag>
          ) : (
            <Tag color="default">GPLX: Chưa xác thực</Tag>
          )}
          {record.citizenIdStatus === 1 ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              CCCD: Đã xác thực
            </Tag>
          ) : (
            <Tag color="default">CCCD: Chưa xác thực</Tag>
          )}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDocuments(record)}
            style={{ padding: 0 }}
          >
            Xem giấy tờ
          </Button>
        </Space>
      ),
    },
    {
      title: "Điểm thuê",
      key: "rentalLocation",
      render: (_: any, record: User) => {
        const location = record.rentalLocation;
        const locationId = record.rentalLocationId || record.locationId;
        if (location) {
          return (
            <Space>
              <EnvironmentOutlined style={{ color: "#52c41a" }} />
              <div>
                <div style={{ fontWeight: 500 }}>{location.name}</div>
                {location.address && (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{location.address}</div>
                )}
              </div>
            </Space>
          );
        }
        if (locationId) {
          return <Tag color="default">ID: {locationId}</Tag>;
        }
        return <Tag color="default">Chưa có</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: User, b: User) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (text: string) =>
        text ? dayjs(text).format("DD/MM/YYYY HH:mm") : "N/A",
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: (a: User, b: User) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (text: string) =>
        text ? (
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(text).format("DD/MM/YYYY HH:mm")}</span>
          </Space>
        ) : (
          "Chưa cập nhật"
        ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>
            Quản lý khách hàng
          </h2>
          <Search
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => setSearchText(value)}
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
              showTotal: (total) => `Tổng cộng: ${total} khách hàng`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Không có khách hàng nào"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </Spin>
      </Card>

      {/* Documents Modal */}
      <Modal
        title={
          <Space>
            <IdcardOutlined />
            <span>Giấy tờ của {selectedCustomer?.fullName || selectedCustomer?.email}</span>
          </Space>
        }
        open={documentsModalVisible}
        onCancel={() => {
          setDocumentsModalVisible(false);
          setSelectedCustomer(null);
          setDriverLicenses([]);
          setCitizenIds([]);
        }}
        footer={null}
        width={900}
      >
        <Spin spinning={loadingDocuments}>
          <Tabs
            items={[
              {
                key: 'license',
                label: (
                  <span>
                    <CarOutlined /> Giấy phép lái xe ({driverLicenses.length})
                  </span>
                ),
                children: (
                  <div>
                    {driverLicenses.length === 0 ? (
                      <Empty description="Khách hàng chưa upload GPLX" />
                    ) : (
                      <div className="space-y-4">
                        {driverLicenses.map((license, index) => (
                          <Card key={license.id || index} size="small" className="mb-4">
                            <Descriptions column={2} bordered size="small" className="mb-4">
                              <Descriptions.Item label="Họ tên">{license.name}</Descriptions.Item>
                              <Descriptions.Item label="Số bằng lái">
                                {license.licenseNumber || "-"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">
                                {getStatusTag(license.status)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ngày tạo">
                                {license.createdAt
                                  ? dayjs(license.createdAt).format("DD/MM/YYYY HH:mm")
                                  : "-"}
                              </Descriptions.Item>
                            </Descriptions>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Title level={5}>Mặt trước</Title>
                                <Image
                                  src={license.imageUrl}
                                  alt="Mặt trước GPLX"
                                  width="100%"
                                  style={{ maxHeight: 300, objectFit: "contain" }}
                                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                                />
                              </div>
                              <div>
                                <Title level={5}>Mặt sau</Title>
                                {license.imageUrl2 ? (
                                  <Image
                                    src={license.imageUrl2}
                                    alt="Mặt sau GPLX"
                                    width="100%"
                                    style={{ maxHeight: 300, objectFit: "contain" }}
                                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-[300px] bg-gray-100 rounded">
                                    <span className="text-gray-400">Chưa có ảnh</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'citizenId',
                label: (
                  <span>
                    <IdcardOutlined /> Căn cước công dân ({citizenIds.length})
                  </span>
                ),
                children: (
                  <div>
                    {citizenIds.length === 0 ? (
                      <Empty description="Khách hàng chưa upload CCCD" />
                    ) : (
                      <div className="space-y-4">
                        {citizenIds.map((citizenId, index) => (
                          <Card key={citizenId.id || index} size="small" className="mb-4">
                            <Descriptions column={2} bordered size="small" className="mb-4">
                              <Descriptions.Item label="Họ tên">{citizenId.name}</Descriptions.Item>
                              <Descriptions.Item label="Số CCCD">
                                {citizenId.citizenIdNumber}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ngày sinh">
                                {citizenId.birthDate
                                  ? dayjs(citizenId.birthDate).format("DD/MM/YYYY")
                                  : "-"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">
                                {getStatusTag(citizenId.status)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ngày tạo">
                                {citizenId.createdAt
                                  ? dayjs(citizenId.createdAt).format("DD/MM/YYYY HH:mm")
                                  : "-"}
                              </Descriptions.Item>
                            </Descriptions>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Title level={5}>Mặt trước</Title>
                                <Image
                                  src={citizenId.imageUrl}
                                  alt="Mặt trước CCCD"
                                  width="100%"
                                  style={{ maxHeight: 300, objectFit: "contain" }}
                                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                                />
                              </div>
                              <div>
                                <Title level={5}>Mặt sau</Title>
                                {citizenId.imageUrl2 ? (
                                  <Image
                                    src={citizenId.imageUrl2}
                                    alt="Mặt sau CCCD"
                                    width="100%"
                                    style={{ maxHeight: 300, objectFit: "contain" }}
                                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-[300px] bg-gray-100 rounded">
                                    <span className="text-gray-400">Chưa có ảnh</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Spin>
      </Modal>
    </div>
  );
}

