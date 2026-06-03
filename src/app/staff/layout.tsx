"use client";

import React, { useEffect, useState } from "react";
import {
  TeamOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileOutlined,
  DownOutlined,
  LogoutOutlined,
  PieChartOutlined,
  DesktopOutlined,
  UserOutlined,
  IdcardOutlined,
  BellOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Hand } from "lucide-react";
import {
  Layout,
  Menu,
  Dropdown,
  Breadcrumb,
  Space,
  Avatar,
  Modal,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Tabs,
  Alert,
  Button,
} from "antd";
import CarStatusList from "@/components/CarStatusList";
import DeliveryForm from "@/components/DeliveryForm";
import ReturnForm from "@/components/ReturnForm";
import CarManagement from "@/components/admin/CarManagement";
import CarStatusManagement from "@/components/staff/CarStatusManagement";
import RentalOrderManagement from "@/components/staff/RentalOrderManagement";
import CustomerList from "@/components/staff/CustomerList";
import DocumentManagement from "@/components/staff/DocumentManagement";
import CarMaintenanceManagement from "@/components/staff/CarMaintenanceManagement";
import { authUtils } from "@/utils/auth";
import { carsApi, bookingsApi as bookingsApiWrapped, rentalOrderApi, authApi, type ApiResponse } from "@/services/api";
import { useRouter } from "next/navigation"; // ✅ Đúng cho App Router

const { Header, Sider, Content, Footer } = Layout;

/* =========================================================
 🧱 PHẦN 1: MENU CHÍNH (HEADER MENU)
 ========================================================= */
const mainMenu = [
  { key: "dashboard", label: "Bảng điều khiển", icon: <AppstoreOutlined /> },
  { key: "orders", label: "Quản lý đơn thuê xe", icon: <FileOutlined /> },
  { key: "tasks", label: "Giao / Nhận xe", icon: <Hand size={16} /> },
  { key: "customers", label: "Xác thực khách hàng", icon: <TeamOutlined /> },
  { key: "payments", label: "Thanh toán tại điểm", icon: <DollarOutlined /> },
  { key: "vehicles", label: "Xe tại điểm", icon: <EnvironmentOutlined /> },
  { key: "reports", label: "Gửi báo cáo cho Admin", icon: <ExclamationCircleOutlined /> },
];

/* =========================================================
 📑 PHẦN 2: SUBMENU (SIDEBAR)
 ========================================================= */
const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  orders: [
    { key: "1", label: "Danh sách đơn hàng", icon: <FileOutlined /> },
    { key: "2", label: "Xác thực giấy tờ", icon: <IdcardOutlined /> },
   
  ],

  tasks: [
    { key: "1", label: "Danh sách xe sẵn sàng", icon: <PieChartOutlined /> },
    { key: "2", label: "Xe đã đặt / đang thuê", icon: <DesktopOutlined /> },
    { key: "3", label: "Thủ tục bàn giao xe", icon: <FileOutlined /> },
    { key: "4", label: "Ký xác nhận giao / nhận", icon: <UserOutlined /> },
  ],

  customers: [
    { key: "2", label: "Đối chiếu hồ sơ hệ thống", icon: <TeamOutlined /> },
  ],

  payments: [
    { key: "1", label: "Ghi nhận thanh toán", icon: <DesktopOutlined /> },
    { key: "2", label: "Đặt cọc / Hoàn cọc", icon: <FileOutlined /> },
  ],

  vehicles: [
    { key: "1", label: "Quản lý xe", icon: <TeamOutlined /> },
    { key: "2", label: "Trạng thái pin & kỹ thuật", icon: <TeamOutlined /> },
    { key: "3", label: "Báo cáo sự cố / hỏng hóc", icon: <FileOutlined /> },
  ],

  reports: [
    { key: "1", label: "Báo cáo sự cố / hỏng hóc", icon: <ExclamationCircleOutlined /> },
    { key: "2", label: "Trạng thái pin & kỹ thuật", icon: <TeamOutlined /> },
  ],
};

/* =========================================================
 👤 PHẦN 3: COMPONENT CHÍNH
 ========================================================= */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModule, setSelectedModule] = useState("dashboard");
  const [selectedSubMenu, setSelectedSubMenu] = useState("1");

  const [showDelivery, setShowDelivery] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selectedCar, setSelectedCar] = useState<{ carId: string; carName: string } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    revenue: number;
    orders: number;
    templates: number;
    clients: number;
    availableCars: number; // Số xe còn xe (status = 1)
    unavailableCars: number; // Số xe hết xe (status = 0)
  }>({
    revenue: 0,
    orders: 0,
    templates: 0,
    clients: 0,
    availableCars: 0,
    unavailableCars: 0,
  });

  const [transferNotification, setTransferNotification] = useState<{
    id: number;
    message: string;
    newLocationName: string;
    newLocationAddress: string;
    transferredAt: string;
    transferHours?: number;
    transferDisplay?: string;
    deadline?: string;
  } | null>(null);

  const router = useRouter();

  // ✅ Kiểm tra quyền staff
  useEffect(() => {
    const isAuthed = authUtils.isAuthenticated();
    const isStaff = authUtils.isStaff();

    if (!isAuthed || !isStaff) {
      message.warning("Bạn không có quyền truy cập trang này.");
      setDenied(true);
      setAllowed(false);
      return;
    }

    setAllowed(true);
    setDenied(false);
  }, [router]);

  // 📢 Load thông báo điều phối cho staff
  useEffect(() => {
    if (!allowed) return;

    const loadTransferNotification = () => {
      try {
        const user = authUtils.getCurrentUser();
        if (!user || !user.id) return;

        const notifications = localStorage.getItem(`staffNotifications_${user.id}`);
        if (notifications) {
          const notificationList = JSON.parse(notifications);
          // Tìm thông báo chưa đọc gần nhất
          const unreadNotification = notificationList.find((n: any) => !n.read && n.type === "transfer");
          if (unreadNotification) {
            setTransferNotification({
              id: unreadNotification.id,
              message: unreadNotification.message,
              newLocationName: unreadNotification.newLocationName,
              newLocationAddress: unreadNotification.newLocationAddress || "",
              transferredAt: unreadNotification.transferredAt,
              transferHours: unreadNotification.transferHours,
              transferDisplay: unreadNotification.transferDisplay,
              deadline: unreadNotification.deadline || unreadNotification.effectiveFrom, // Backward compatibility
            });
          }
        }
      } catch (error) {
        console.error("Error loading transfer notification:", error);
      }
    };

    loadTransferNotification();

    // Lắng nghe event khi có thông báo mới
    const handleNotificationUpdate = (e: CustomEvent) => {
      const user = authUtils.getCurrentUser();
      if (user && user.id === e.detail?.userId) {
        loadTransferNotification();
      }
    };

    window.addEventListener('staffNotificationUpdated', handleNotificationUpdate as EventListener);
    
    // Auto-refresh mỗi 5 giây
    const interval = setInterval(loadTransferNotification, 5000);

    return () => {
      window.removeEventListener('staffNotificationUpdated', handleNotificationUpdate as EventListener);
      clearInterval(interval);
    };
  }, [allowed]);

  // Đánh dấu thông báo đã đọc
  const markNotificationAsRead = () => {
    try {
      const user = authUtils.getCurrentUser();
      if (!user || !user.id || !transferNotification) return;

      const notifications = localStorage.getItem(`staffNotifications_${user.id}`);
      if (notifications) {
        const notificationList = JSON.parse(notifications);
        const updatedList = notificationList.map((n: any) => 
          n.id === transferNotification.id ? { ...n, read: true } : n
        );
        localStorage.setItem(`staffNotifications_${user.id}`, JSON.stringify(updatedList));
      }

      setTransferNotification(null);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // 📊 Load dashboard metrics from real APIs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setMetricsLoading(true);

        // Load dữ liệu giống như CarStatusManagement
        const [ordersRes, carsRes, usersRes] = await Promise.all([
          rentalOrderApi.getAll().catch(() => ({ success: false, data: [] } as ApiResponse<unknown>)),
          carsApi.getAll(),
          authApi.getAllUsers().catch(() => ({ success: false, data: [] } as ApiResponse<unknown>)),
        ]);

        // Orders and revenue
        let revenue = 0;
        let orders = 0;
        
        if (ordersRes.success && ordersRes.data) {
          const ordersList = Array.isArray(ordersRes.data)
            ? ordersRes.data
            : (ordersRes.data as any)?.$values || [];
          
          orders = ordersList.length;
          
          const getNumberField = (obj: unknown, keys: string[]): number => {
            if (typeof obj === "object" && obj !== null) {
              const rec = obj as Record<string, unknown>;
              for (const k of keys) {
                if (k in rec) {
                  const v = rec[k];
                  const n = typeof v === "number" ? v : Number(v);
                  if (!Number.isNaN(n)) return n;
                }
              }
            }
            return 0;
          };
          revenue = (ordersList as unknown[]).reduce((sum: number, o: unknown) => sum + getNumberField(o, ["total", "Total", "totalAmount"]), 0);
        }

        // Vehicles count - sử dụng cùng logic như CarStatusManagement
        let availableCars = 0;
        let unavailableCars = 0;
        let vehiclesCount = 0;
        
        if (carsRes.success && carsRes.data) {
          const carsList = Array.isArray(carsRes.data)
            ? carsRes.data
            : (carsRes.data as any)?.$values || [];
          
          // Filter và đếm giống như CarStatusManagement
          const activeCars = carsList.filter((car: any) => !car.isDeleted);
          vehiclesCount = activeCars.length;
          
          // Đếm số xe còn xe (status = 1) và hết xe (status = 0)
          activeCars.forEach((car: any) => {
            // Xác định trạng thái từ car.status (0 = Disabled, 1 = Available)
            const carStatusNum = typeof car.status === "number" 
              ? car.status 
              : (car.status === 1 || car.status === "1" ? 1 : 0);
            
            if (carStatusNum === 1) {
              availableCars++;
            } else {
              unavailableCars++;
            }
          });
        }

        // Clients count - lấy từ authApi response
        let clientsCount = 0;
        if (usersRes && typeof usersRes === "object" && "success" in usersRes && usersRes.success) {
          const users = (usersRes as any).data || [];
          if (Array.isArray(users)) {
            // Chỉ đếm user có role là Customer/Custom (không phải Admin/Staff)
            // Backend tự động set role là "Customer" hoặc "Custom" khi đăng ký
            clientsCount = users.filter((user: any) => {
              const role = (user.role || user.roleName || "").toLowerCase().trim();
              // Loại trừ Admin và Staff, chỉ đếm Customer/Custom hoặc role rỗng (mặc định là customer)
              return role !== "admin" && role !== "staff";
            }).length;
          }
        }

        if (mounted) {
          setMetrics({ 
            revenue, 
            orders, 
            templates: vehiclesCount, 
            clients: clientsCount,
            availableCars,
            unavailableCars,
          });
        }
      } catch {
        // swallow; metrics stay default
      } finally {
        if (mounted) setMetricsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 📦 Mở modal bàn giao xe
  const handleOpenDelivery = (car: { carId: string; carName: string }) => {
    setSelectedCar(car);
    setShowDelivery(true);
  };

  // 📦 Mở modal nhận xe
  const handleOpenReturn = (car: { carId: string; carName: string }) => {
    setSelectedCar(car);
    setShowReturn(true);
  };

  // 📤 Xử lý hoàn tất
  const handleDeliverySubmit = async () => {
    message.success("Bàn giao thành công");
    setShowDelivery(false);
  };

  const handleReturnSubmit = async () => {
    message.success("Nhận xe thành công");
    setShowReturn(false);
  };

  // 🚫 Nếu không có quyền thì không render
  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E3EFFF] p-6">
        <h2 className="text-2xl font-semibold text-red-500">
          Bạn không có quyền truy cập trang này.
        </h2>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <Layout style={{ minHeight: "100vh", background: "#F5F7FB" }}>
      {/* 🧭 SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={230}
        style={{ 
          background: "#fff", 
          borderRight: "1px solid #e8e8e8",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "auto"
        }}
      >
        <div 
          className="p-4 text-center font-bold text-gray-800 text-lg"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            margin: collapsed ? "8px" : "0",
            borderRadius: collapsed ? "8px" : "0",
            padding: collapsed ? "12px 8px" : "16px"
          }}
        >
          {collapsed ? "EV" : "EV STAFF"}
        </div>

        <Menu
          mode="inline"
          theme="light"
          items={mainMenu}
          selectedKeys={[selectedModule]}
          onClick={(e) => {
            setSelectedModule(e.key);
            setSelectedSubMenu(subMenus[e.key]?.[0]?.key || "1");
            if (e.key === "dashboard") router.push("/staff");
          }}
          style={{
            borderRight: "none",
            paddingTop: "8px"
          }}
        />
      </Sider>

      {/* 🧩 MAIN CONTENT */}
      <Layout>
        {/* 🔷 HEADER */}
        <Header
          style={{
            background: "#fff",
            color: "#333",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 16px",
            gap: 12,
            borderBottom: "1px solid #e8e8e8",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Input.Search placeholder="Tìm kiếm nhanh" allowClear style={{ width: 260 }} />
            
          </div>

          {/* ✅ Dropdown người dùng */}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "1", label: "Thông tin cá nhân" },
                { key: "2", label: "Đăng xuất", icon: <LogoutOutlined /> },
              ],
              onClick: ({ key }) => {
                if (key === "1") router.push("/profile");
                if (key === "2") {
                  authUtils.logout();
                  message.success("Đăng xuất thành công!");
                  router.push("/login");
                }
              },
            }}
          >
            <Space style={{ color: "#333", cursor: "pointer" }}>
              <Avatar size="small" style={{ backgroundColor: "#1447E6", color: "#fff" }}>
                S
              </Avatar>
              <span>Staff</span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>

          {/* 📍 BREADCRUMB + CONTENT */}
        <Content style={{ margin: "16px" }}>
          {/* Thông báo điều phối */}
          {transferNotification && (
            <Card
              style={{
                marginBottom: 16,
                border: "2px solid #ff4d4f",
                borderRadius: 8,
                background: "linear-gradient(135deg, #fff1f0 0%, #fff2f0 100%)",
              }}
              bodyStyle={{ padding: "16px 20px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <BellOutlined style={{ fontSize: 20, color: "#ff4d4f", marginRight: 8 }} />
                    <span style={{ fontSize: 16, fontWeight: "bold", color: "#ff4d4f" }}>
                      🔔 Thông báo điều phối
                    </span>
                  </div>
                  
                  <div style={{ marginLeft: 28, marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#333", marginBottom: 8 }}>
                      {transferNotification.message}
                    </div>
                    
                    <div style={{ 
                      background: "#fff", 
                      padding: "12px 16px", 
                      borderRadius: 6,
                      border: "1px solid #d9d9d9",
                      marginTop: 8
                    }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                        <EnvironmentOutlined style={{ color: "#52c41a", marginRight: 8, fontSize: 16 }} />
                        <span style={{ fontWeight: 600, color: "#333" }}>Địa điểm mới:</span>
                      </div>
                      <div style={{ marginLeft: 24, marginTop: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#ff4d4f", marginBottom: 4 }}>
                          📍 {transferNotification.newLocationName}
                        </div>
                        {transferNotification.newLocationAddress && (
                          <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                            {transferNotification.newLocationAddress}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 10, fontSize: 12, color: "#8c8c8c" }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        <span>Thời gian thông báo: {new Date(transferNotification.transferredAt).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span>
                      </div>
                      {transferNotification.deadline && (
                        <div style={{ display: "flex", alignItems: "center", marginTop: 4, color: "#ff4d4f", fontWeight: 500 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          <span>
                            ⏰ Hết hiệu lực vào: {new Date(transferNotification.deadline).toLocaleString("vi-VN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} 
                            {transferNotification.transferDisplay && `  (Sau ${transferNotification.transferDisplay})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  type="primary"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={markNotificationAsRead}
                  style={{ marginLeft: 16 }}
                >
                  Đã hiểu
                </Button>
              </div>
            </Card>
          )}

          {selectedModule !== "dashboard" && (
            <Breadcrumb
              style={{ marginBottom: 16 }}
              items={[
                { title: mainMenu.find((m) => m.key === selectedModule)?.label || "" },
                {
                  title: subMenus[selectedModule]?.find((s) => s.key === selectedSubMenu)?.label || "",
                },
              ]}
            />
          )}

          {/* Tabs cho submenu khi chọn "Quản lý đơn thuê xe" */}
          {selectedModule === "orders" && (
            <Tabs
              activeKey={selectedSubMenu}
              onChange={(key) => setSelectedSubMenu(key)}
              items={subMenus.orders.map((item) => ({
                key: item.key,
                label: (
                  <Space>
                    {item.icon}
                    {item.label}
                  </Space>
                ),
              }))}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Tabs cho submenu khi chọn "Gửi báo cáo cho Admin" */}
          {selectedModule === "reports" && (
            <Tabs
              activeKey={selectedSubMenu}
              onChange={(key) => setSelectedSubMenu(key)}
              items={subMenus.reports.map((item) => ({
                key: item.key,
                label: (
                  <Space>
                    {item.icon}
                    {item.label}
                  </Space>
                ),
              }))}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* ElaAdmin-like top summary cards */}
          {selectedModule !== "dashboard" && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Card 
                variant="outlined"
                hoverable 
                loading={metricsLoading}
                onClick={() => {
                  setSelectedModule("payments");
                  setSelectedSubMenu(subMenus["payments"]?.[0]?.key || "1");
                }}
                style={{ cursor: "pointer" }}
              >
                <Statistic title="Doanh thu" prefix={<span>₫</span>} value={metrics.revenue} precision={0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="outlined" hoverable loading={metricsLoading}>
                <Statistic title="Đơn hàng đã cọc" value={metrics.orders} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="outlined" hoverable loading={metricsLoading}>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-500 mb-3">Số xe</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-2xl font-bold text-green-600">{metrics.availableCars || 0}</span>
                    </div>
                    <span className="text-gray-300 text-xl">/</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-2xl font-bold text-red-600">{metrics.unavailableCars || 0}</span>
                    </div>
                    <span className="text-gray-500 text-base ml-1">xe</span>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                variant="outlined"
                hoverable 
                loading={metricsLoading}
                onClick={() => {
                  setSelectedModule("customers");
                  setSelectedSubMenu(subMenus["customers"]?.[0]?.key || "2");
                }}
                style={{ cursor: "pointer" }}
              >
                <Statistic title="Tài Khoản Khách Hàng" value={metrics.clients} suffix="người" />
              </Card>
            </Col>
          </Row>
          )}

          {/* Đã bỏ các khối Lưu lượng và Chỉ số theo yêu cầu */}

          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              minHeight: 400,
            }}
          >
            {selectedModule === "orders" ? (
              selectedSubMenu === "2" ? (
                <DocumentManagement />
              ) : (
                <RentalOrderManagement />
              )
            ) : selectedModule === "tasks" ? (
              selectedSubMenu === "1" ? (
                // Xem toàn bộ xe theo trạng thái
                <CarStatusManagement />
              ) : selectedSubMenu === "2" || selectedSubMenu === "3" || selectedSubMenu === "4" ? (
                <CarStatusList
                  onDeliver={(car) => handleOpenDelivery(car)}
                  onReturn={(car) => handleOpenReturn(car)}
                />
              ) : null
            ) : selectedModule === "customers" ? (
              <CustomerList />
            ) : selectedModule === "payments" ? (
              <RentalOrderManagement />
            ) : selectedModule === "vehicles" ? (
              selectedSubMenu === "1" ? (
                <CarManagement staffMode={true} />
              ) : selectedSubMenu === "2" ? (
                <CarMaintenanceManagement selectedSubMenu="2" />
              ) : (
                <CarMaintenanceManagement selectedSubMenu="3" />
              )
            ) : selectedModule === "reports" ? (
              <CarMaintenanceManagement selectedSubMenu={selectedSubMenu} />
            ) : (
              children
            )}

            {/* 🪟 MODAL */}
            <Modal
              title={selectedCar ? `Bàn giao xe - ${selectedCar.carName}` : "Bàn giao xe"}
              open={showDelivery}
              onCancel={() => setShowDelivery(false)}
              footer={null}
              destroyOnHidden
            >
              {selectedCar && (
                <DeliveryForm
                  carId={selectedCar.carId}
                  customerId="KH-001"
                  onSubmit={handleDeliverySubmit}
                />
              )}
            </Modal>

            <Modal
              title={selectedCar ? `Nhận xe - ${selectedCar.carName}` : "Nhận xe"}
              open={showReturn}
              onCancel={() => setShowReturn(false)}
              footer={null}
              destroyOnHidden
            >
              {selectedCar && (
                <ReturnForm
                  carId={selectedCar.carId}
                  customerId="KH-001"
                  onSubmit={handleReturnSubmit}
                />
              )}
            </Modal>
          </div>
        </Content>

        {/* ⚙️ FOOTER */}
        <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
          EV Rental Staff Portal ©{new Date().getFullYear()} Created by Duy
        </Footer>
      </Layout>
    </Layout>
  );
}
