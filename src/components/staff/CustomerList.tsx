"use client";

import React, { useEffect, useState } from "react";
import { 
  Table, 
  Card, 
  Input, 
  Tag, 
  Space, 
  Avatar, 
  Typography, 
  Spin, 
  message, 
  Modal, 
  Image, 
  Descriptions, 
  Tabs, 
  Button,
  Empty,
  notification as antdNotification,
} from "antd";
import { 
  UserOutlined, 
  SearchOutlined, 
  MailOutlined, 
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  IdcardOutlined,
  CarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { authApi, driverLicenseApi, citizenIdApi, rentalOrderApi } from "@/services/api";
import type { User, DriverLicenseData, CitizenIdData, RentalOrderData } from "@/services/api";
import dayjs from "dayjs";

const { Title } = Typography;

export default function CustomerList() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState("");
  
  // Document modal states
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [driverLicenses, setDriverLicenses] = useState<DriverLicenseData[]>([]);
  const [citizenIds, setCitizenIds] = useState<CitizenIdData[]>([]);
  const [userDocumentsMap, setUserDocumentsMap] = useState<Map<number, { driverLicense?: DriverLicenseData; citizenId?: CitizenIdData }>>(new Map());
  
  // Order history states
  const [orderHistoryVisible, setOrderHistoryVisible] = useState(false);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<RentalOrderData[]>([]);
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState<User | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
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

      const rawCustomers = usersResponse.data.filter(
        (user: User) => user.role?.toLowerCase() === "customer"
      );
      
      const customerList = rawCustomers.map((u: any) => {
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
          citizenIdNumber: u.citizenIdNumber ?? u.CitizenIdNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId,
          rentalLocationId: u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId,
          driverLicenseStatus: u.driverLicenseStatus,
          citizenIdStatus: u.citizenIdStatus,
          isEmailConfirmed: u.isEmailConfirmed ?? u.IsEmailConfirmed,
          isActive: (() => {
            const activeValue = u.isActive ?? u.IsActive;
            if (activeValue === true || activeValue === "true" || activeValue === 1) return true;
            if (activeValue === false || activeValue === "false" || activeValue === 0) return false;
            return false;
          })(),
          createdAt: u.createdAt ?? u.CreatedAt,
          updatedAt: updateAt,
        };
      }) as User[];

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

      const documentsMap = new Map<number, { driverLicense?: DriverLicenseData; citizenId?: CitizenIdData }>();

      if (licenseRes.success && licenseRes.data) {
        const allLicenses = Array.isArray(licenseRes.data)
          ? licenseRes.data
          : (licenseRes.data as any)?.$values || [];
        
        allLicenses.forEach((license: DriverLicenseData) => {
          if (license.rentalOrderId) {
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(license.rentalOrderId)) {
                const current = documentsMap.get(userId);
                const currentLicense = current?.driverLicense;
                
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

      if (citizenRes.success && citizenRes.data) {
        const allCitizenIds = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        
        allCitizenIds.forEach((citizenId: CitizenIdData) => {
          if (citizenId.rentalOrderId) {
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(citizenId.rentalOrderId)) {
                const current = documentsMap.get(userId);
                const currentCitizenId = current?.citizenId;
                
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

  // Filter customers based on search text
  const filteredCustomers = customers.filter((customer) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    const fullName = (customer.fullName || "").toLowerCase();
    const email = (customer.email || "").toLowerCase();
    const phone = (customer.phone || customer.phoneNumber || "").toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
  });

  const loadCustomerDocuments = async (customer: User) => {
    if (!customer.id) return;
    
    setLoadingDocuments(true);
    try {
      let customerLicenses: DriverLicenseData[] = [];
      let customerCitizenIds: CitizenIdData[] = [];
      
      try {
        const licenseByUserIdRes = await driverLicenseApi.getByUserId(customer.id);
        if (licenseByUserIdRes.success && licenseByUserIdRes.data) {
          customerLicenses = [licenseByUserIdRes.data];
        }
      } catch (e) {
        const ordersResponse = await rentalOrderApi.getByUserId(customer.id);
        if (ordersResponse.success && ordersResponse.data) {
          const orders = Array.isArray(ordersResponse.data)
            ? ordersResponse.data
            : (ordersResponse.data as any)?.$values || [];
          
          const orderIds = orders.map((order: RentalOrderData) => order.id);

          const [licenseRes, citizenRes] = await Promise.all([
            driverLicenseApi.getAll(),
            citizenIdApi.getAll(),
          ]);

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
        }
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

  const loadCustomerOrders = async (customer: User) => {
    if (!customer?.id) return;
    setOrderHistoryLoading(true);
    try {
      const res = await rentalOrderApi.getByUserId(customer.id);
      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.$values || [];
        const normalized: RentalOrderData[] = raw.map((o: any) => ({
          id: o.id ?? o.Id,
          userId: o.userId ?? o.UserId,
          carId: o.carId ?? o.CarId,
          startDate: o.startDate ?? o.StartDate,
          endDate: o.endDate ?? o.EndDate,
          pickupLocation: o.pickupLocation ?? o.PickupLocation,
          dropoffLocation: o.dropoffLocation ?? o.DropoffLocation,
          totalPrice: o.totalPrice ?? o.TotalPrice,
          status: o.status ?? o.Status,
          createdAt: o.createdAt ?? o.CreatedAt,
        })) as RentalOrderData[];
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
        if (selectedCustomer) {
          await loadCustomerDocuments(selectedCustomer);
        }
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
        if (selectedCustomer) {
          await loadCustomerDocuments(selectedCustomer);
        }
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

  const getStatusTag = (status?: string | number) => {
    const statusStr = typeof status === 'number' ? String(status) : (status || '');
    const statusLower = statusStr.toLowerCase();
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
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: any, record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          <div>
            <div className="font-medium">{record.fullName || "Chưa có tên"}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => (
        <Space>
          <MailOutlined className="text-gray-400" />
          <span>{email || "-"}</span>
        </Space>
      ),
    },
    {
      title: "Số điện thoại",
      key: "phone",
      render: (_: any, record: User) => (
        <Space>
          <PhoneOutlined className="text-gray-400" />
          <span>{record.phone || record.phoneNumber || "-"}</span>
        </Space>
      ),
    },
    {
      title: "Vai trò",
      key: "role",
      render: (_: any, record: User) => {
        const role = (record.role || record.roleName || "Customer").toLowerCase();
        const roleMap: Record<string, { color: string; text: string }> = {
          customer: { color: "blue", text: "Khách hàng" },
          custom: { color: "blue", text: "Khách hàng" },
          admin: { color: "red", text: "Quản trị viên" },
          staff: { color: "orange", text: "Nhân viên" },
        };
        const roleInfo = roleMap[role] || { color: "default", text: role };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      key: "verification",
      render: (_: any, record: User) => {
        const userDocs = userDocumentsMap.get(record.id);
        const driverLicense = userDocs?.driverLicense;
        const citizenId = userDocs?.citizenId;
        
        // GPLX status từ DB
        const licenseStatus = driverLicense?.status !== undefined 
          ? (typeof driverLicense.status === 'number' ? driverLicense.status : parseInt(String(driverLicense.status)))
          : null;
        
        // CCCD status: ưu tiên kiểm tra citizenIdNumber, nếu không có thì dùng status từ DB
        const hasCitizenIdNumber = (record as any).citizenIdNumber || (record as any).CitizenIdNumber;
        const citizenIdStatusFromDb = citizenId?.status !== undefined 
          ? (typeof citizenId.status === 'number' ? citizenId.status : parseInt(String(citizenId.status)))
          : null;
        
        return (
          <Space direction="vertical" size="small">
            <div className="flex gap-2">
              {/* GPLX status tags - giống profile page */}
              {licenseStatus === 1 && <Tag color="success">GPLX: Đã xác thực</Tag>}
              {licenseStatus === 0 && <Tag color="warning">GPLX: Đã up</Tag>}
              {licenseStatus === 2 && <Tag color="error">GPLX: Bị từ chối</Tag>}
              {licenseStatus === null && <Tag color="default">GPLX: Chưa gửi</Tag>}
              
              {/* CCCD status tags - giống profile page */}
              {hasCitizenIdNumber ? (
                <Tag color="warning">CCCD: Đã gửi</Tag>
              ) : (
                <Tag color="default">CCCD: Chưa gửi</Tag>
              )}
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
      render: (_: any, record: User) => (
        <Button size="small" type="primary" onClick={() => handleViewOrderHistory(record)}>
          Xem lịch sử
        </Button>
      ),
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      render: (_: any, record: User) =>
        record.createdAt ? dayjs(record.createdAt).format("DD/MM/YYYY HH:mm") : "-",
    },
  ];

  return (
    <div>
      {contextHolder}
      <Card>
        <div className="mb-4">
          <Title level={4}>Danh sách khách hàng</Title>
          <p className="text-gray-500">Hiển thị toàn bộ khách hàng trong hệ thống (trừ Admin và Staff)</p>
        </div>

        <div className="mb-4">
          <Input.Search
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            allowClear
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          loading={loading}
          columns={columns}
          dataSource={filteredCustomers}
          rowKey={(record) => record.id || record.userId || Math.random()}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} khách hàng`,
          }}
        />
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
                            {citizenId.id && (
                              <div className="mt-4 flex gap-2">
                                <Button
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => handleVerifyCitizenId(citizenId.id!, 1)}
                                  disabled={String(citizenId.status) === '1' || String(citizenId.status).toLowerCase() === 'approved'}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Xác thực
                                </Button>
                                <Button
                                  danger
                                  icon={<CloseCircleOutlined />}
                                  onClick={() => handleVerifyCitizenId(citizenId.id!, 2)}
                                  disabled={String(citizenId.status) === '2' || String(citizenId.status).toLowerCase() === 'rejected'}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 mt-4">
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

      {/* Order History Modal */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Lịch sử đặt hàng của {orderHistoryCustomer?.fullName || orderHistoryCustomer?.email}</span>
          </Space>
        }
        open={orderHistoryVisible}
        onCancel={() => {
          setOrderHistoryVisible(false);
          setOrderHistoryCustomer(null);
          setOrderHistory([]);
        }}
        footer={null}
        width={800}
      >
        <Spin spinning={orderHistoryLoading}>
          {orderHistory.length === 0 ? (
            <Empty description="Không có đơn hàng" />
          ) : (
            <Table
              size="small"
              rowKey="id"
              dataSource={orderHistory}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
                { title: 'Xe', dataIndex: 'carId', key: 'carId', width: 90 },
                { title: 'Bắt đầu', dataIndex: 'startDate', key: 'startDate', render: (t: any) => t ? dayjs(t).format('DD/MM/YYYY HH:mm') : '-' },
                { title: 'Kết thúc', dataIndex: 'endDate', key: 'endDate', render: (t: any) => t ? dayjs(t).format('DD/MM/YYYY HH:mm') : '-' },
                { title: 'Đón', dataIndex: 'pickupLocation', key: 'pickupLocation', ellipsis: true },
                { title: 'Trả', dataIndex: 'dropoffLocation', key: 'dropoffLocation', ellipsis: true },
                { title: 'Giá', dataIndex: 'totalPrice', key: 'totalPrice', render: (v: any) => v != null ? new Intl.NumberFormat('vi-VN').format(v) + '₫' : '-' },
                { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s: any) => {
                    const st = (s || '').toString().toLowerCase();
                    if (st.includes('completed') || st === 'done') return <Tag color="success">Hoàn tất</Tag>;
                    if (st.includes('cancel')) return <Tag color="error">Đã hủy</Tag>;
                    if (st.includes('pending')) return <Tag color="warning">Chờ xử lý</Tag>;
                    return <Tag color="blue">{s}</Tag>;
                  }
                },
                { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt', render: (t: any) => t ? dayjs(t).format('DD/MM/YYYY HH:mm') : '-' },
              ]}
            />
          )}
        </Spin>
      </Modal>
    </div>
  );
}


