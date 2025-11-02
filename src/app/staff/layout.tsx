"use client";

import React, { useEffect, useState } from "react";
import {
  PieChartOutlined,
  DesktopOutlined,
  UserOutlined,
  TeamOutlined,
  FileOutlined,
  DownOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  Dropdown,
  Breadcrumb,
  Space,
  Avatar,
  Modal,
  message,
} from "antd";
import CarStatusList from "@/components/CarStatusList";
import DeliveryForm from "@/components/DeliveryForm";
import ReturnForm from "@/components/ReturnForm";
import DocumentVerification from "@/components/DocumentVerification";
import CarManagement from "@/components/admin/CarManagement";
import { authUtils } from "@/utils/auth";
import { useRouter } from "next/navigation"; // ✅ Đúng cho App Router

const { Header, Sider, Content, Footer } = Layout;

/* =========================================================
 🧱 PHẦN 1: MENU CHÍNH (HEADER MENU)
 ========================================================= */
const mainMenu = [
  { key: "tasks", label: "Giao / Nhận xe", icon: <PieChartOutlined /> },
  { key: "customers", label: "Xác thực khách hàng", icon: <UserOutlined /> },
  { key: "payments", label: "Thanh toán tại điểm", icon: <DesktopOutlined /> },
  { key: "vehicles", label: "Xe tại điểm", icon: <TeamOutlined /> },
  { key: "documents", label: "Tài liệu", icon: <FileOutlined /> },
];

/* =========================================================
 📑 PHẦN 2: SUBMENU (SIDEBAR)
 ========================================================= */
const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  tasks: [
    { key: "1", label: "Danh sách xe sẵn sàng", icon: <PieChartOutlined /> },
    { key: "2", label: "Xe đã đặt / đang thuê", icon: <DesktopOutlined /> },
    { key: "3", label: "Thủ tục bàn giao xe", icon: <FileOutlined /> },
    { key: "4", label: "Ký xác nhận giao / nhận", icon: <UserOutlined /> },
  ],

  customers: [
    { key: "1", label: "Kiểm tra giấy tờ", icon: <UserOutlined /> },
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

  documents: [
    { key: "1", label: "Hướng dẫn sử dụng hệ thống", icon: <FileOutlined /> },
  ],
};

/* =========================================================
 👤 PHẦN 3: COMPONENT CHÍNH
 ========================================================= */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModule, setSelectedModule] = useState("tasks");
  const [selectedSubMenu, setSelectedSubMenu] = useState("1");

  const [showDelivery, setShowDelivery] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selectedCar, setSelectedCar] = useState<{ carId: string; carName: string } | null>(null);

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
    <Layout style={{ minHeight: "100vh", background: "#E3EFFF" }}>
      {/* 🧭 SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={230}
        style={{ background: "#fff", borderRight: "1px solid #e8e8e8" }}
      >
        <div className="p-4 text-center font-bold text-blue-600 text-lg">
          {collapsed ? "EV" : "EV STAFF"}
        </div>

        <Menu
          mode="inline"
          theme="light"
          items={subMenus[selectedModule]}
          selectedKeys={[selectedSubMenu]}
          onClick={(e) => setSelectedSubMenu(e.key)}
        />
      </Sider>

      {/* 🧩 MAIN CONTENT */}
      <Layout>
        {/* 🔷 HEADER */}
        <Header
          style={{
            background: "#1447E6",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedModule]}
            items={mainMenu}
            onClick={(e) => {
              setSelectedModule(e.key);
              setSelectedSubMenu(subMenus[e.key]?.[0]?.key || "1");
            }}
            style={{ flex: 1, background: "transparent" }}
          />

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
            <Space style={{ color: "white", cursor: "pointer" }}>
              <Avatar size="small" style={{ backgroundColor: "#fff", color: "#1447E6" }}>
                S
              </Avatar>
              <span>Staff</span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>

        {/* 📍 BREADCRUMB + CONTENT */}
        <Content style={{ margin: "16px" }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[
              { title: mainMenu.find((m) => m.key === selectedModule)?.label },
              {
                title: subMenus[selectedModule].find((s) => s.key === selectedSubMenu)?.label,
              },
            ]}
          />

          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              minHeight: 400,
            }}
          >
            {selectedModule === "tasks" ? (
              selectedSubMenu === "1" || selectedSubMenu === "2" ? (
                <CarStatusList
                  onDeliver={(car) => handleOpenDelivery(car)}
                  onReturn={(car) => handleOpenReturn(car)}
                />
              ) : selectedSubMenu === "3" ? (
                <div>
                  <p>Chọn xe ở danh sách để thực hiện thủ tục bàn giao.</p>
                  <CarStatusList onDeliver={(car) => handleOpenDelivery(car)} />
                </div>
              ) : selectedSubMenu === "4" ? (
                <div>
                  <p>Chọn xe để ký xác nhận giao / nhận.</p>
                  <CarStatusList
                    onDeliver={(car) => handleOpenDelivery(car)}
                    onReturn={(car) => handleOpenReturn(car)}
                  />
                </div>
              ) : null
            ) : selectedModule === "customers" ? (
              <DocumentVerification
                mode={selectedSubMenu === "1" ? "check-documents" : "verify-system"}
              />
            ) : selectedModule === "vehicles" ? (
              selectedSubMenu === "1" ? (
                <CarManagement />
              ) : selectedSubMenu === "2" ? (
                <p>Trang theo dõi trạng thái pin & kỹ thuật</p>
              ) : (
                <p>Trang báo cáo sự cố / hỏng hóc</p>
              )
            ) : (
              children
            )}

            {/* 🪟 MODAL */}
            <Modal
              title={selectedCar ? `Bàn giao xe - ${selectedCar.carName}` : "Bàn giao xe"}
              open={showDelivery}
              onCancel={() => setShowDelivery(false)}
              footer={null}
              destroyOnClose
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
              destroyOnClose
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
