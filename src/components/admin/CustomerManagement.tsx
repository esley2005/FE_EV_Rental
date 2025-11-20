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
  
  // Map để lưu documents mới nhất cho mỗi user (userId -> { driverLicense, citizenId })
  const [userDocumentsMap, setUserDocumentsMap] = useState<Map<number, { driverLicense?: DriverLicenseData; citizenId?: CitizenIdData }>>(new Map());

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
      // Load customers và documents song song
      const [usersResponse, licenseRes, citizenRes, ordersRes] = await Promise.all([
        authApi.getAllUsers(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
        rentalOrderApi.getAll(),
      ]);

      if (!usersResponse.success || !usersResponse.data) {
        api.error({
          message: "Lỗi tải danh sách khách hàng",
          description: usersResponse.error || "Không thể tải danh sách khách hàng!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        return;
      }

      // Filter only customers (role = "Customer")
      const customerList = usersResponse.data.filter(
        (user: User) => user.role?.toLowerCase() === "customer"
      );

      // Tạo map userId -> orderIds
      const userIdToOrderIdsMap = new Map<number, number[]>();
      if (ordersRes.success && ordersRes.data) {
        const orders = Array.isArray(ordersRes.data)
          ? ordersRes.data
          : (ordersRes.data as any)?.$values || [];
        
        orders.forEach((order: RentalOrderData) => {
          const userId = order.userId || (order as any).UserId;
          if (userId) {
            if (!userIdToOrderIdsMap.has(userId)) {
              userIdToOrderIdsMap.set(userId, []);
            }
            userIdToOrderIdsMap.get(userId)?.push(order.id);
          }
        });
      }

      // Tạo map userId -> latest documents
      const documentsMap = new Map<number, { driverLicense?: DriverLicenseData; citizenId?: CitizenIdData }>();

      // Xử lý driver licenses - lấy document mới nhất cho mỗi user
      if (licenseRes.success && licenseRes.data) {
        const allLicenses = Array.isArray(licenseRes.data)
          ? licenseRes.data
          : (licenseRes.data as any)?.$values || [];
        
        allLicenses.forEach((license: DriverLicenseData) => {
          if (license.rentalOrderId) {
            // Tìm userId từ rentalOrderId
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(license.rentalOrderId)) {
                const current = documentsMap.get(userId);
                const currentLicense = current?.driverLicense;
                
                // Chuyển đổi status sang number để so sánh
                const licenseStatus = typeof license.status === 'number' 
                  ? license.status 
                  : (license.status === '1' || license.status === 'approved' ? 1 : 
                     (license.status === '2' || license.status === 'rejected' ? 2 : 0));
                const currentStatus = currentLicense 
                  ? (typeof currentLicense.status === 'number' 
                      ? currentLicense.status 
                      : (currentLicense.status === '1' || currentLicense.status === 'approved' ? 1 : 
                         (currentLicense.status === '2' || currentLicense.status === 'rejected' ? 2 : 0)))
                  : 0;
                
                // Lấy license mới nhất (ưu tiên status = 1, sau đó là mới nhất theo id)
                if (!currentLicense || 
                    (licenseStatus === 1 && currentStatus !== 1) ||
                    (licenseStatus === currentStatus && (license.id ?? 0) > (currentLicense.id ?? 0))) {
                  documentsMap.set(userId, {
                    driverLicense: license,
                    citizenId: current?.citizenId,
                  });
                }
                break;
              }
            }
          }
        });
      }

      // Xử lý citizen IDs - lấy document mới nhất cho mỗi user
      if (citizenRes.success && citizenRes.data) {
        const allCitizenIds = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        
        allCitizenIds.forEach((citizenId: CitizenIdData) => {
          if (citizenId.rentalOrderId) {
            // Tìm userId từ rentalOrderId
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(citizenId.rentalOrderId)) {
                const current = documentsMap.get(userId);
                const currentCitizenId = current?.citizenId;
                
                // Chuyển đổi status sang number để so sánh
                const citizenIdStatus = typeof citizenId.status === 'number' 
                  ? citizenId.status 
                  : (citizenId.status === '1' || citizenId.status === 'approved' ? 1 : 
                     (citizenId.status === '2' || citizenId.status === 'rejected' ? 2 : 0));
                const currentStatus = currentCitizenId 
                  ? (typeof currentCitizenId.status === 'number' 
                      ? currentCitizenId.status 
                      : (currentCitizenId.status === '1' || currentCitizenId.status === 'approved' ? 1 : 
                         (currentCitizenId.status === '2' || currentCitizenId.status === 'rejected' ? 2 : 0)))
                  : 0;
                
                // Lấy citizenId mới nhất (ưu tiên status = 1, sau đó là mới nhất theo id)
                if (!currentCitizenId || 
                    (citizenIdStatus === 1 && currentStatus !== 1) ||
                    (citizenIdStatus === currentStatus && (citizenId.id ?? 0) > (currentCitizenId.id ?? 0))) {
                  documentsMap.set(userId, {
                    driverLicense: current?.driverLicense,
                    citizenId: citizenId,
                  });
                }
                break;
              }
            }
          }
        });
      }

      setUserDocumentsMap(documentsMap);
      setCustomers(customerList);
      setFilteredCustomers(customerList);
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
      render: (_: any, record: User) => {
        const userDocs = userDocumentsMap.get(record.id);
        const driverLicense = userDocs?.driverLicense;
        const citizenId = userDocs?.citizenId;
        
        // Chuyển đổi status từ number sang string để getStatusTag hoạt động
        const licenseStatus = driverLicense?.status !== undefined 
          ? String(driverLicense.status) 
          : undefined;
        const citizenIdStatus = citizenId?.status !== undefined 
          ? String(citizenId.status) 
          : undefined;
        
        return (
          <Space direction="vertical" size="small">
            <div className="flex flex-col">
  <div className="flex items-center">
    <span className="text-xs text-gray-500 mr-2">GPLX:</span>
    {getStatusTag(licenseStatus)}
  </div>

  <div className="flex items-center mt-1">
    <span className="text-xs text-gray-500 mr-2">CCCD:</span>
    {getStatusTag(citizenIdStatus)}
  </div>
</div>

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
        );
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

