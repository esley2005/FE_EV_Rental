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
  Switch,
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

      // Filter only customers (role = "Customer") và normalize dữ liệu
      const rawCustomers = usersResponse.data.filter(
        (user: User) => user.role?.toLowerCase() === "customer"
      );
      
      // Normalize dữ liệu để map PascalCase từ backend sang camelCase theo DTO mới
      const customerList = rawCustomers.map((u: any) => {
        // Xử lý updateAt - nếu là giá trị mặc định "0001-01-01T00:00:00" thì coi như null
        const updateAtRaw = u.updateAt ?? u.UpdateAt ?? u.updatedAt ?? u.UpdatedAt;
        const updateAt = updateAtRaw && updateAtRaw !== "0001-01-01T00:00:00" && !updateAtRaw.startsWith("0001-01-01") 
          ? updateAtRaw 
          : null;
        
        return {
          id: u.userId ?? u.id ?? u.UserId,
          email: u.email ?? u.Email,
          fullName: u.fullName ?? u.FullName ?? u.name,
          role: u.role ?? u.Role ?? 'Customer',
          phone: u.phone ?? u.phoneNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId,
          rentalLocationId: u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId,
          driverLicenseStatus: u.driverLicenseStatus,
          citizenIdStatus: u.citizenIdStatus,
          isEmailConfirmed: u.isEmailConfirmed ?? u.IsEmailConfirmed,
          // Normalize isActive: hỗ trợ cả boolean và string từ backend
          isActive: (() => {
            const activeValue = u.isActive ?? u.IsActive;
            if (activeValue === true || activeValue === "true" || activeValue === 1) return true;
            if (activeValue === false || activeValue === "false" || activeValue === 0) return false;
            return false; // Mặc định là false nếu không có
          })(),
          createdAt: u.createdAt ?? u.CreatedAt,
          updatedAt: updateAt, // Map từ updateAt (backend) sang updatedAt (frontend)
        };
      }) as User[];

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

  const handleToggleActive = async (customer: User, isActive: boolean) => {
    if (!customer.id) return;
    
    // Cập nhật state ngay lập tức để UI phản hồi nhanh
    setCustomers(prev => prev.map(c => 
      c.id === customer.id ? { ...c, isActive } : c
    ));
    setFilteredCustomers(prev => prev.map(c => 
      c.id === customer.id ? { ...c, isActive } : c
    ));
    
    setLoading(true);
    try {
      const response = await authApi.updateUserActiveStatus(customer.id, isActive);
      if (response.success) {
        if (isActive) {
          // Mở khóa - màu xanh (success)
          api.success({
            message: "Mở khóa tài khoản thành công",
            description: `Tài khoản ${customer.fullName} đã được mở khóa.`,
            placement: "topRight",
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          });
        } else {
          // Khóa - màu đỏ (error)
          api.error({
            message: "Khóa tài khoản thành công",
            description: `Tài khoản ${customer.fullName} đã được khóa.`,
            placement: "topRight",
            icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
          });
        }
        // Reload customers để đồng bộ với database
        await loadCustomers();
      } else {
        // Nếu API thất bại, revert lại state
        setCustomers(prev => prev.map(c => 
          c.id === customer.id ? { ...c, isActive: !isActive } : c
        ));
        setFilteredCustomers(prev => prev.map(c => 
          c.id === customer.id ? { ...c, isActive: !isActive } : c
        ));
        api.error({
          message: "Lỗi cập nhật trạng thái",
          description: response.error || "Không thể cập nhật trạng thái tài khoản!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      // Nếu có lỗi, revert lại state
      setCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, isActive: !isActive } : c
      ));
      setFilteredCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, isActive: !isActive } : c
      ));
      console.error("Toggle active status error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
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
      render: (_: any, record: User) => {
        // isActive: true = Đang hoạt động, false = Đã khóa
        // Kiểm tra cả boolean true và string "true" từ backend
        const activeValue = record.isActive ?? (record as any).IsActive;
        const isActive = activeValue === true || activeValue === "true" || activeValue === 1;
        return (
          <Space direction="vertical" size="small">
            {record.isEmailConfirmed ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Email đã xác thực
              </Tag>
            ) : (
              <Tag color="warning">Email chưa xác thực</Tag>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                checkedChildren="Mở"
                unCheckedChildren="Khóa"
                onChange={(checked) => handleToggleActive(record, checked)}
                loading={loading}
                style={{
                  minWidth: '60px',
                  ...(isActive 
                    ? { backgroundColor: '#52c41a' } 
                    : { backgroundColor: '#ff4d4f' }
                  ),
                }}
              />
              {isActive ? (
                <Tag color="success" className="m-0 font-semibold">Đang hoạt động</Tag>
              ) : (
                <Tag color="error" className="m-0 font-semibold">Đã khóa</Tag>
              )}
            </div>
          </Space>
        );
      },
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
        const dateA = (a.createdAt ?? (a as any).CreatedAt) ? new Date(a.createdAt ?? (a as any).CreatedAt).getTime() : 0;
        const dateB = (b.createdAt ?? (b as any).CreatedAt) ? new Date(b.createdAt ?? (b as any).CreatedAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (_: any, record: User) => {
        const createdAt = record.createdAt ?? (record as any).CreatedAt;
        return createdAt ? dayjs(createdAt).format("DD/MM/YYYY HH:mm") : "N/A";
      },
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: (a: User, b: User) => {
        const dateA = a.updatedAt && !a.updatedAt.toString().startsWith("0001-01-01") 
          ? new Date(a.updatedAt).getTime() 
          : 0;
        const dateB = b.updatedAt && !b.updatedAt.toString().startsWith("0001-01-01") 
          ? new Date(b.updatedAt).getTime() 
          : 0;
        return dateA - dateB;
      },
      render: (_: any, record: User) => {
        const updatedAt = record.updatedAt;
        // Kiểm tra nếu updatedAt là null, undefined, hoặc giá trị mặc định
        const isValidDate = updatedAt && 
          updatedAt !== "0001-01-01T00:00:00" && 
          !updatedAt.toString().startsWith("0001-01-01");
        
        return isValidDate ? (
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(updatedAt).format("DD/MM/YYYY HH:mm")}</span>
          </Space>
        ) : (
          <span className="text-gray-400">Chưa cập nhật</span>
        );
      },
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

