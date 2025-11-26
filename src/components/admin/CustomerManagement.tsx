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
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { authApi, driverLicenseApi, citizenIdApi, rentalOrderApi, carsApi, rentalLocationApi } from "@/services/api";
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
  // Order history states
  const [orderHistoryVisible, setOrderHistoryVisible] = useState(false);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<RentalOrderData[]>([]);
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState<User | null>(null);
  const [carsMap, setCarsMap] = useState<Map<number, any>>(new Map());
  const [locationsMap, setLocationsMap] = useState<Map<number, any>>(new Map());

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
      // Load customers
      const usersResponse = await authApi.getAllUsers();

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

      // Tạo map userId -> driver license (gọi API cho từng customer)
      const documentsMap = new Map<number, { driverLicense?: DriverLicenseData }>();

      // Load driver license cho từng customer
      const licensePromises = customerList.map(async (customer) => {
        if (customer.id) {
          try {
            const licenseRes = await driverLicenseApi.getByUserId(customer.id);
            if (licenseRes.success && licenseRes.data) {
              documentsMap.set(customer.id, {
                driverLicense: licenseRes.data,
              });
            }
          } catch (error) {
            console.error(`Error loading license for user ${customer.id}:`, error);
          }
        }
      });

      // Đợi tất cả các API calls hoàn thành
      await Promise.all(licensePromises);

      setUserDocumentsMap(documentsMap as Map<number, { driverLicense?: DriverLicenseData; citizenId?: CitizenIdData }>);
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
      // Lấy GPLX theo userId
      let customerLicenses: DriverLicenseData[] = [];
      
      const licenseByUserIdRes = await driverLicenseApi.getByUserId(customer.id);
      if (licenseByUserIdRes.success && licenseByUserIdRes.data) {
        customerLicenses = [licenseByUserIdRes.data];
      }

      setDriverLicenses(customerLicenses);
      setCitizenIds([]);
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

  const loadCustomerOrders = async (customer: User) => {
    if (!customer?.id) return;
    setOrderHistoryLoading(true);
    try {
      const res = await rentalOrderApi.getByUserId(customer.id);
      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.$values || [];
        
        // Load cars để map carId thành tên xe
        const carsResponse = await carsApi.getAll();
        const carsData = carsResponse.success && carsResponse.data
          ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
          : [];
        const newCarsMap = new Map<number, any>(carsData.map((car: any) => [car.id || car.Id, car]));
        setCarsMap(newCarsMap);
        
        // Load locations để map locationId thành tên địa điểm
        const locationsResponse = await rentalLocationApi.getAll();
        const locationsData = locationsResponse.success && locationsResponse.data
          ? (Array.isArray(locationsResponse.data) ? locationsResponse.data : (locationsResponse.data as any)?.$values || [])
          : [];
        const newLocationsMap = new Map<number, any>(locationsData.map((loc: any) => [loc.id || loc.Id, loc]));
        setLocationsMap(newLocationsMap);
        
        // Normalize fields với nhiều tên field khác nhau từ backend
        const normalized: (RentalOrderData & { carName?: string; pickupLocationName?: string; dropoffLocationName?: string })[] = raw.map((o: any) => {
          const carId = o.carId ?? o.CarId ?? o.car?.id ?? o.Car?.Id;
          const car = carId ? newCarsMap.get(carId) : null;
          
          const pickupLocationId = o.rentalLocationId ?? o.RentalLocationId ?? o.pickupLocationId ?? o.PickupLocationId;
          const pickupLocation = pickupLocationId ? newLocationsMap.get(pickupLocationId) : null;
          
          // Lấy total từ nhiều field khác nhau
          const total = o.total ?? o.Total ?? o.totalPrice ?? o.TotalPrice ?? o.totalAmount ?? o.TotalAmount ?? 0;
          
          return {
            id: o.id ?? o.Id,
            userId: o.userId ?? o.UserId,
            carId: carId,
            carName: car?.name || car?.Name || `Xe #${carId || 'N/A'}`,
            // Map pickupTime và expectedReturnTime (backend dùng tên này)
            pickupTime: o.pickupTime ?? o.PickupTime ?? o.startDate ?? o.StartDate,
            expectedReturnTime: o.expectedReturnTime ?? o.ExpectedReturnTime ?? o.endDate ?? o.EndDate,
            // Map location
            rentalLocationId: pickupLocationId,
            pickupLocationName: pickupLocation?.name || pickupLocation?.Name || o.pickupLocation || o.PickupLocation || '-',
            dropoffLocationName: o.dropoffLocation ?? o.DropoffLocation ?? '-',
            // Map total
            total: total,
            totalPrice: total,
            // Map status và dates
            status: o.status ?? o.Status,
            orderDate: o.orderDate ?? o.OrderDate,
            createdAt: o.createdAt ?? o.CreatedAt ?? o.orderDate ?? o.OrderDate,
            phoneNumber: o.phoneNumber ?? o.PhoneNumber,
            withDriver: o.withDriver ?? o.WithDriver ?? false,
          } as any;
        });
        
        // Sort by createdAt descending (mới nhất trước)
        normalized.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        setOrderHistory(normalized);
      } else {
        setOrderHistory([]);
      }
    } catch (e) {
      console.error('Load order history error', e);
      setOrderHistory([]);
    } finally {
      setOrderHistoryLoading(false);
    }
  };

  const handleViewOrderHistory = (customer: User) => {
    setOrderHistoryCustomer(customer);
    setOrderHistoryVisible(true);
    loadCustomerOrders(customer);
  };

  const handleVerifyLicense = async (licenseId: number, status: 0 | 1 | 2) => {
    setLoadingDocuments(true);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, status);
      if (response.success) {
        const statusText = status === 1 ? "xác thực" : status === 2 ? "từ chối" : "chờ xác thực";
        api.success({
          message: `Cập nhật trạng thái GPLX thành công`,
          description: `GPLX đã được ${statusText}.`,
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        // Reload documents
        if (selectedCustomer) {
          await loadCustomerDocuments(selectedCustomer);
        }
        // Reload customers để cập nhật status trong bảng
        await loadCustomers();
      } else {
        api.error({
          message: "Lỗi cập nhật trạng thái",
          description: response.error || "Không thể cập nhật trạng thái GPLX!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Verify license error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể cập nhật trạng thái GPLX. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleVerifyCitizenId = async (citizenId: number, status: 0 | 1 | 2) => {
    setLoadingDocuments(true);
    try {
      const response = await citizenIdApi.updateStatus(citizenId, status);
      if (response.success) {
        const statusText = status === 1 ? "xác thực" : status === 2 ? "từ chối" : "chờ xác thực";
        api.success({
          message: `Cập nhật trạng thái CCCD thành công`,
          description: `CCCD đã được ${statusText}.`,
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        // Reload documents
        if (selectedCustomer) {
          await loadCustomerDocuments(selectedCustomer);
        }
        // Reload customers để cập nhật status trong bảng
        await loadCustomers();
      } else {
        api.error({
          message: "Lỗi cập nhật trạng thái",
          description: response.error || "Không thể cập nhật trạng thái CCCD!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Verify citizen ID error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể cập nhật trạng thái CCCD. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoadingDocuments(false);
    }
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
      fixed: 'left' as const,
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
      width: 180,
      sorter: (a: User, b: User) =>
        (a.fullName || "").localeCompare(b.fullName || ""),
      render: (text: string) => <strong>{text || "Chưa cập nhật"}</strong>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
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
      width: 150,
      render: (text: string) => (
        <Space>
          <PhoneOutlined />
          <span>{text || "Chưa cập nhật"}</span>
        </Space>
      ),
    },
    // Đã xóa các cột Địa chỉ, Ngày sinh theo yêu cầu
    {
      title: "Trạng thái",
      // Đã xóa các cột Ngày tạo & Ngày cập nhật theo yêu cầu
      key: "verification",
      width: 200,
      render: (_: any, record: User) => {
        const userDocs = userDocumentsMap.get(record.id);
        const driverLicense = userDocs?.driverLicense;
        
        // Chuyển đổi status từ number sang string để getStatusTag hoạt động
        const licenseStatus = driverLicense?.status !== undefined 
          ? String(driverLicense.status) 
          : undefined;
        
        return (
          <Space direction="vertical" size="small">
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">GPLX:</span>
              {getStatusTag(licenseStatus)}
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
      title: "Lịch sử đặt hàng",
      key: "orderHistory",
      width: 150,
      render: (_: any, record: User) => (
        <Button size="small" type="primary" onClick={() => handleViewOrderHistory(record)}>
          Xem lịch sử
        </Button>
      ),
    },
  
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
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
      width: 150,
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
          <Space.Compact style={{ width: 400 }}>
            <Input
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              allowClear
              size="large"
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              onPressEnter={(e: React.KeyboardEvent<HTMLInputElement>) => setSearchText(e.currentTarget.value)}
            />
            <Button 
              icon={<SearchOutlined />} 
              size="large"
              onClick={() => setSearchText(searchText)}
            />
          </Space.Compact>
        </div>

        <Spin spinning={loading}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table
              columns={columns}
              dataSource={filteredCustomers}
              rowKey="id"
              scroll={{ x: 'max-content' }}
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
          </div>
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
                            {license.id && (
                              <div className="mt-4 flex gap-2">
                                <Button
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => handleVerifyLicense(license.id!, 1)}
                                  disabled={String(license.status) === '1' || String(license.status).toLowerCase() === 'approved'}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Xác thực
                                </Button>
                                <Button
                                  danger
                                  icon={<CloseCircleOutlined />}
                                  onClick={() => handleVerifyLicense(license.id!, 2)}
                                  disabled={String(license.status) === '2' || String(license.status).toLowerCase() === 'rejected'}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 mt-4">
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
            ]}
          />
        </Spin>
      </Modal>

      {/* Order History Modal */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Lịch sử thuê xe của {orderHistoryCustomer?.fullName || orderHistoryCustomer?.email}</span>
          </Space>
        }
        open={orderHistoryVisible}
        onCancel={() => {
          setOrderHistoryVisible(false);
          setOrderHistoryCustomer(null);
          setOrderHistory([]);
        }}
        footer={null}
        width="95%"
        style={{ maxWidth: 1400, top: 20 }}
        styles={{
          body: { maxHeight: 'calc(100vh - 120px)', overflow: 'auto', padding: '16px' }
        }}
      >
        <Spin spinning={orderHistoryLoading}>
          {orderHistory.length === 0 ? (
            <Empty description="Không có đơn hàng" />
          ) : (
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', fontSize: '13px', color: '#0050b3' }}>
                <Space>
                  <PlusOutlined />
                  <span>💡 <strong>Hướng dẫn:</strong> Click vào dấu <PlusOutlined style={{ color: '#1890ff' }} /> ở cuối mỗi dòng để xem chi tiết đơn hàng</span>
                </Space>
              </div>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={orderHistory}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
                columns={[
                  { title: 'ID', dataIndex: 'id', key: 'id', width: 60, fixed: 'left' },
                  { 
                    title: 'Xe', 
                    dataIndex: 'carId', 
                    key: 'carId', 
                    width: 150,
                    render: (carId: number) => {
                      const car = carsMap.get(carId);
                      if (car) {
                        return car.name || car.model || `Xe #${carId}`;
                      }
                      return `Xe #${carId}`;
                    }
                  },
                  { 
                    title: 'Bắt đầu', 
                    dataIndex: 'pickupTime', 
                    key: 'pickupTime', 
                    width: 120,
                    render: (t: any) => {
                      if (!t) return '-';
                      try {
                        return dayjs(t).format('DD/MM/YYYY HH:mm');
                      } catch {
                        return t;
                      }
                    }
                  },
                  { 
                    title: 'Kết thúc', 
                    dataIndex: 'expectedReturnTime', 
                    key: 'expectedReturnTime', 
                    width: 120,
                    render: (t: any) => {
                      if (!t) return '-';
                      try {
                        return dayjs(t).format('DD/MM/YYYY HH:mm');
                      } catch {
                        return t;
                      }
                    }
                  },
                  { 
                    title: 'Tổng tiền', 
                    dataIndex: 'subTotal', 
                    key: 'subTotal', 
                    width: 110,
                    render: (v: any) => {
                      if (v == null || v === undefined) return '-';
                      return new Intl.NumberFormat('vi-VN').format(v) + '₫';
                    }
                  },
                
                  
               
                 
                  { 
                    title: 'Thành tiền', 
                    dataIndex: 'total', 
                    key: 'total', 
                    width: 110,
                    render: (v: any) => {
                      if (v == null || v === undefined) return '-';
                      return <strong>{new Intl.NumberFormat('vi-VN').format(v) + '₫'}</strong>;
                    }
                  },
                  { 
                    title: 'Trạng thái', 
                    dataIndex: 'status', 
                    key: 'status', 
                    width: 120,
                    render: (s: any) => {
                      if (!s) return '-';
                      const st = s.toString().toLowerCase();
                      if (st.includes('completed') || st === 'done' || st.includes('hoàn tất')) {
                        return <Tag color="success">Hoàn tất</Tag>;
                      }
                      if (st.includes('cancel') || st.includes('hủy')) {
                        return <Tag color="error">Đã hủy</Tag>;
                      }
                      if (st.includes('pending') || st.includes('chờ')) {
                        return <Tag color="warning">Chờ xử lý</Tag>;
                      }
                      if (st.includes('confirmed') || st.includes('xác nhận')) {
                        return <Tag color="blue">Đã xác nhận</Tag>;
                      }
                      return <Tag color="default">{s}</Tag>;
                    }
                  },
                  {
                    title: 'Chi tiết',
                    key: 'action',
                    width: 80,
                    fixed: 'right',
                    render: (_: any, record: any) => {
                      // This will be handled by expandIcon, but we show it here for clarity
                      return null;
                    }
                  },
                ]}
                expandable={{
                  expandIcon: ({ expanded, onExpand, record }) => (
                    <span
                      onClick={(e) => onExpand(record, e)}
                      style={{ cursor: 'pointer', padding: '0 8px', fontSize: '18px', color: '#1890ff', fontWeight: 'bold' }}
                      title={expanded ? 'Thu gọn' : 'Xem chi tiết'}
                    >
                      {expanded ? <MinusOutlined /> : <PlusOutlined />}
                    </span>
                  ),
                  expandIconColumnIndex: 7,
                  expandedRowRender: (record: any) => (
                    <div style={{ padding: '16px', background: '#fafafa', maxWidth: '100%', overflow: 'hidden' }}>
                      <Descriptions column={2} bordered size="small" layout="horizontal">
                        <Descriptions.Item label="ID đơn hàng">{record.id}</Descriptions.Item>
                        <Descriptions.Item label="Xe">
                          {(() => {
                            const car = carsMap.get(record.carId);
                            return car ? (car.name || car.model || `Xe #${record.carId}`) : `Xe #${record.carId}`;
                          })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày đặt">
                          {record.orderDate ? dayjs(record.orderDate).format('DD/MM/YYYY HH:mm') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Bắt đầu">
                          {record.pickupTime ? dayjs(record.pickupTime).format('DD/MM/YYYY HH:mm') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Kết thúc dự kiến">
                          {record.expectedReturnTime ? dayjs(record.expectedReturnTime).format('DD/MM/YYYY HH:mm') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Kết thúc thực tế">
                          {record.actualReturnTime ? dayjs(record.actualReturnTime).format('DD/MM/YYYY HH:mm') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Có tài xế">
                          {record.withDriver ? <Tag color="success">Có</Tag> : <Tag color="default">Không</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Địa điểm thuê">{record.rentalLocationId || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Tổng tiền">
                          {record.subTotal != null ? new Intl.NumberFormat('vi-VN').format(record.subTotal) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cọc đơn hàng">
                          {record.depositOrder != null ? new Intl.NumberFormat('vi-VN').format(record.depositOrder) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cọc xe">
                          {record.depositCar != null ? new Intl.NumberFormat('vi-VN').format(record.depositCar) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Giảm giá">
                          {record.discount != null && record.discount !== 0 ? new Intl.NumberFormat('vi-VN').format(record.discount) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phí phụ thu">
                          {record.extraFee != null && record.extraFee !== 0 ? new Intl.NumberFormat('vi-VN').format(record.extraFee) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phí hư hỏng">
                          {record.damageFee != null && record.damageFee !== 0 ? new Intl.NumberFormat('vi-VN').format(record.damageFee) + '₫' : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú hư hỏng" span={2}>
                          <div style={{ wordBreak: 'break-word', maxWidth: '500px' }}>{record.damageNotes || '-'}</div>
                        </Descriptions.Item>
                        <Descriptions.Item label="Thành tiền">
                          <strong>{record.total != null ? new Intl.NumberFormat('vi-VN').format(record.total) + '₫' : '-'}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú liên hệ" span={2}>
                          <div style={{ wordBreak: 'break-word', maxWidth: '500px' }}>{record.contactNotes || '-'}</div>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú báo cáo" span={2}>
                          <div style={{ wordBreak: 'break-word', maxWidth: '500px' }}>{record.reportNote || '-'}</div>
                        </Descriptions.Item>
                        {record.contactImageUrl && (
                          <Descriptions.Item label="Ảnh liên hệ 1" span={1}>
                            <Image src={record.contactImageUrl} width={100} alt="Contact 1" />
                          </Descriptions.Item>
                        )}
                        {record.contactImageUrl2 && (
                          <Descriptions.Item label="Ảnh liên hệ 2" span={1}>
                            <Image src={record.contactImageUrl2} width={100} alt="Contact 2" />
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ),
                  rowExpandable: () => true,
                }}
              />
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
}




