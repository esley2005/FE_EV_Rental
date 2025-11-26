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
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { authApi, driverLicenseApi, citizenIdApi, rentalOrderApi, carsApi } from "@/services/api";
import type { User, DriverLicenseData, CitizenIdData, RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";
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
  
  // Cars map for displaying car names
  const [carsMap, setCarsMap] = useState<Map<number, Car>>(new Map());

  useEffect(() => {
    loadCustomers();
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      const carsResponse = await carsApi.getAll();
      if (carsResponse.success && carsResponse.data) {
        const carsData = Array.isArray(carsResponse.data)
          ? carsResponse.data
          : (carsResponse.data as any)?.$values || [];
        
        const map = new Map<number, Car>();
        carsData.forEach((car: Car) => {
          if (car.id) {
            map.set(car.id, car);
          }
        });
        setCarsMap(map);
      }
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  };

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

      // Helper function to normalize status
      const normalizeStatus = (status: any): number | null => {
        if (status === undefined || status === null) return null;
        if (typeof status === 'number') return status;
        if (status === '1' || status === 'approved' || status === 'Approved') return 1;
        if (status === '2' || status === 'rejected' || status === 'Rejected') return 2;
        if (status === '0' || status === 'pending' || status === 'Pending') return 0;
        return null;
      };

      // Map driver licenses to users
      if (licenseRes.success && licenseRes.data) {
        const allLicenses = Array.isArray(licenseRes.data)
          ? licenseRes.data
          : (licenseRes.data as any)?.$values || [];
        
        allLicenses.forEach((license: DriverLicenseData) => {
          // Try to find userId from rentalOrderId first
          let targetUserId: number | null = null;
          
          if (license.rentalOrderId) {
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(license.rentalOrderId)) {
                targetUserId = userId;
                break;
              }
            }
          }
          
          // If not found via order, try to get from userId field if available
          if (!targetUserId && (license as any).userId) {
            targetUserId = (license as any).userId;
          }
          
          if (targetUserId) {
            const current = documentsMap.get(targetUserId);
            const currentLicense = current?.driverLicense;
            
            const licenseStatus = normalizeStatus(license.status);
            const currentStatus = currentLicense ? normalizeStatus(currentLicense.status) : null;
            
            // Priority: 1 (Approved) > current status > newer document (higher id)
            if (!currentLicense || 
                (licenseStatus === 1 && currentStatus !== 1) ||
                (licenseStatus === currentStatus && (license.id ?? 0) > (currentLicense.id ?? 0)) ||
                (licenseStatus !== null && currentStatus === null)) {
              documentsMap.set(targetUserId, {
                driverLicense: license,
                citizenId: current?.citizenId,
              });
            }
          }
        });
      }

      // Map citizen IDs to users
      if (citizenRes.success && citizenRes.data) {
        const allCitizenIds = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        
        allCitizenIds.forEach((citizenId: CitizenIdData) => {
          // Try to find userId from rentalOrderId first
          let targetUserId: number | null = null;
          
          if (citizenId.rentalOrderId) {
            for (const [userId, orderIds] of userIdToOrderIdsMap.entries()) {
              if (orderIds.includes(citizenId.rentalOrderId)) {
                targetUserId = userId;
                break;
              }
            }
          }
          
          // If not found via order, try to get from userId field if available
          if (!targetUserId && (citizenId as any).userId) {
            targetUserId = (citizenId as any).userId;
          }
          
          if (targetUserId) {
            const current = documentsMap.get(targetUserId);
            const currentCitizenId = current?.citizenId;
            
            const citizenIdStatus = normalizeStatus(citizenId.status);
            const currentStatus = currentCitizenId ? normalizeStatus(currentCitizenId.status) : null;
            
            // Priority: 1 (Approved) > current status > newer document (higher id)
            if (!currentCitizenId || 
                (citizenIdStatus === 1 && currentStatus !== 1) ||
                (citizenIdStatus === currentStatus && (citizenId.id ?? 0) > (currentCitizenId.id ?? 0)) ||
                (citizenIdStatus !== null && currentStatus === null)) {
              documentsMap.set(targetUserId, {
                driverLicense: current?.driverLicense,
                citizenId: citizenId,
              });
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
        const normalized: any[] = raw.map((o: any) => ({
          id: o.id ?? o.Id ?? o.orderId ?? o.OrderId,
          userId: o.userId ?? o.UserId,
          carId: o.carId ?? o.CarId,
          phoneNumber: o.phoneNumber ?? o.PhoneNumber ?? '',
          orderDate: o.orderDate ?? o.OrderDate ?? o.createdAt ?? o.CreatedAt,
          pickupTime: o.pickupTime ?? o.PickupTime ?? o.startDate ?? o.StartDate,
          expectedReturnTime: o.expectedReturnTime ?? o.ExpectedReturnTime ?? o.endDate ?? o.EndDate,
          actualReturnTime: o.actualReturnTime ?? o.ActualReturnTime,
          subTotal: o.subTotal ?? o.SubTotal,
          deposit: o.deposit ?? o.Deposit,
          depositOrder: o.depositOrder ?? o.DepositOrder,
          depositCar: o.depositCar ?? o.DepositCar,
          total: o.total ?? o.Total ?? o.totalPrice ?? o.TotalPrice,
          discount: o.discount ?? o.Discount,
          extraFee: o.extraFee ?? o.ExtraFee,
          damageFee: o.damageFee ?? o.DamageFee,
          damageNotes: o.damageNotes ?? o.DamageNotes,
          withDriver: o.withDriver ?? o.WithDriver ?? false,
          status: o.status ?? o.Status ?? '',
          createdAt: o.createdAt ?? o.CreatedAt ?? o.orderDate ?? o.OrderDate,
          updatedAt: o.updatedAt ?? o.UpdatedAt,
          rentalLocationId: o.rentalLocationId ?? o.RentalLocationId,
          rentalContactId: o.rentalContactId ?? o.RentalContactId,
          pickupLocation: o.pickupLocation ?? o.PickupLocation,
          dropoffLocation: o.dropoffLocation ?? o.DropoffLocation,
          contactImageUrl: o.contactImageUrl ?? o.ContactImageUrl,
          contactImageUrl2: o.contactImageUrl2 ?? o.ContactImageUrl2,
          contactNotes: o.contactNotes ?? o.ContactNotes,
          reportNote: o.reportNote ?? o.ReportNote,
        }));
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
      title: "STT",
      key: "index",
      width: 60,
      fixed: 'left',
      render: (_: any, __: any, index: number) => {
        // Ant Design Table tự động truyền index, nhưng cần tính với pagination
        // Sẽ được tính tự động bởi Table component dựa trên current page
        return index + 1;
      },
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 200,
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
      width: 200,
      ellipsis: true,
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
      width: 150,
      render: (_: any, record: User) => (
        <Space>
          <PhoneOutlined className="text-gray-400" />
          <span>{record.phone || record.phoneNumber || "-"}</span>
        </Space>
      ),
    },
   
    {
      title: "Trạng thái",
      key: "verification",
      width: 200,
      render: (_: any, record: User) => {
        const userDocs = userDocumentsMap.get(record.id);
        const driverLicense = userDocs?.driverLicense;
        const citizenId = userDocs?.citizenId;
        
        // Helper function to normalize status
        const normalizeStatus = (status: any): number | null => {
          if (status === undefined || status === null) return null;
          if (typeof status === 'number') return status;
          if (status === '1' || status === 'approved' || status === 'Approved') return 1;
          if (status === '2' || status === 'rejected' || status === 'Rejected') return 2;
          if (status === '0' || status === 'pending' || status === 'Pending') return 0;
          return null;
        };
        
        // GPLX status từ API
        const licenseStatus = normalizeStatus(driverLicense?.status);
        
        // CCCD status từ API - ưu tiên check status từ document, nếu không có thì check citizenIdNumber
        const citizenIdStatus = normalizeStatus(citizenId?.status);
        const hasCitizenIdNumber = (record as any).citizenIdNumber || (record as any).CitizenIdNumber;
        
        // Render GPLX status
        const renderGPLXStatus = () => {
          if (licenseStatus === 1) {
            return <Tag color="success">GPLX: Đã xác thực</Tag>;
          }
          if (licenseStatus === 0) {
            return <Tag color="warning">GPLX: Chờ xác thực</Tag>;
          }
          if (licenseStatus === 2) {
            return <Tag color="error">GPLX: Bị từ chối</Tag>;
          }
          // licenseStatus === null
          return <Tag color="default">GPLX: Chưa gửi</Tag>;
        };
        
        // Render CCCD status
        const renderCCCDStatus = () => {
          // Nếu có status từ API, ưu tiên dùng status
          if (citizenIdStatus !== null) {
            if (citizenIdStatus === 1) {
              return <Tag color="success">CCCD: Đã xác thực</Tag>;
            }
            if (citizenIdStatus === 0) {
              return <Tag color="warning">CCCD: Chờ xác thực</Tag>;
            }
            if (citizenIdStatus === 2) {
              return <Tag color="error">CCCD: Bị từ chối</Tag>;
            }
          }
          
          // Nếu không có status từ API nhưng có citizenIdNumber, coi như đã gửi
          if (hasCitizenIdNumber) {
            return <Tag color="warning">CCCD: Chờ xác thực</Tag>;
          }
          
          // Không có cả status và citizenIdNumber - không hiển thị gì
          return null;
        };
        
        return (
          <Space direction="vertical" size="small" style={{ maxWidth: '200px' }}>
            <div className="flex gap-2 flex-wrap">
              {renderGPLXStatus()}
              {renderCCCDStatus()}
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
      key: "createdAt",
      width: 150,
      render: (_: any, record: User) =>
        record.createdAt ? dayjs(record.createdAt).format("DD/MM/YYYY HH:mm") : "-",
    },
  ];

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
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

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            loading={loading}
            columns={columns}
            dataSource={filteredCustomers}
            rowKey={(record) => record.id || record.userId || Math.random()}
            scroll={{ x: 'max-content' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} khách hàng`,
              showQuickJumper: true,
            }}
          />
        </div>
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
        width="90%"
        style={{ maxWidth: 1200 }}
      >
        <Spin spinning={orderHistoryLoading}>
          {orderHistory.length === 0 ? (
            <Empty description="Không có đơn hàng" />
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', fontSize: '13px', color: '#0050b3' }}>
                <Space>
                  <PlusOutlined />
                  <span>💡 <strong>Hướng dẫn:</strong> Click vào dấu <PlusOutlined style={{ color: '#1890ff' }} /> ở cuối mỗi dòng để xem chi tiết đơn hàng</span>
                </Space>
              </div>
              <Table
                size="small"
                rowKey="id"
                dataSource={orderHistory}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 'max-content' }}
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
                    <div style={{ padding: '16px', background: '#fafafa' }}>
                      <Descriptions column={2} bordered size="small">
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
                          {record.damageNotes || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Thành tiền">
                          <strong>{record.total != null ? new Intl.NumberFormat('vi-VN').format(record.total) + '₫' : '-'}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú liên hệ" span={2}>
                          {record.contactNotes || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ghi chú báo cáo" span={2}>
                          {record.reportNote || '-'}
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
          )}
        </Spin>
      </Modal>
    </div>
  );
}


