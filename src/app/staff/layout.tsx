"use client"; // ✅ Chạy phía client (Next.js 13+ yêu cầu khi dùng useState, useEffect)

import React, { useState } from "react";
import {
  PieChartOutlined,
  DesktopOutlined,
  UserOutlined,
  TeamOutlined,
  FileOutlined,
  DownOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Dropdown, Breadcrumb, Space, Avatar } from "antd";

const { Header, Sider, Content, Footer } = Layout;

/* =========================================================
 🧱 PHẦN 1: MENU CHÍNH (HEADER MENU)
 → Tương ứng 4 chức năng chính của Nhân viên tại điểm thuê
 ========================================================= */

const mainMenu = [
  { key: "tasks", label: "Giao / Nhận xe", icon: <PieChartOutlined /> },  // a. Quản lý giao – nhận xe
  { key: "customers", label: "Xác thực khách hàng", icon: <UserOutlined /> }, // b. Xác thực khách hàng
  { key: "payments", label: "Thanh toán tại điểm", icon: <DesktopOutlined /> }, // c. Thanh toán tại điểm
  { key: "vehicles", label: "Xe tại điểm", icon: <TeamOutlined /> }, // d. Quản lý xe tại điểm
  { key: "documents", label: "Tài liệu", icon: <FileOutlined /> }, // Phụ: hướng dẫn sử dụng nội bộ
];

/* =========================================================
 📑 PHẦN 2: SUBMENU (SIDEBAR)
 → Các mục chi tiết nhỏ bên trong mỗi chức năng
 ========================================================= */

const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  // a. GIAO / NHẬN XE
  tasks: [
    { key: "1", label: "Danh sách xe sẵn sàng", icon: <PieChartOutlined /> },   // Xem xe có sẵn
    { key: "2", label: "Xe đã đặt / đang thuê", icon: <DesktopOutlined /> },   // Xe đã đặt hoặc đang thuê
    { key: "3", label: "Thủ tục bàn giao xe", icon: <FileOutlined /> },        // Kiểm tra, chụp ảnh, cập nhật tình trạng
    { key: "4", label: "Ký xác nhận giao / nhận", icon: <UserOutlined /> },    // Ký xác nhận điện tử
  ],

  // b. XÁC THỰC KHÁCH HÀNG
  customers: [
    { key: "1", label: "Kiểm tra giấy tờ", icon: <UserOutlined /> },            // Giấy phép lái xe & CCCD
    { key: "2", label: "Đối chiếu hồ sơ hệ thống", icon: <TeamOutlined /> },    // So khớp với thông tin trong hệ thống
  ],

  // c. THANH TOÁN TẠI ĐIỂM
  payments: [
    { key: "1", label: "Ghi nhận thanh toán", icon: <DesktopOutlined /> },      // Ghi nhận phí thuê xe
    { key: "2", label: "Đặt cọc / Hoàn cọc", icon: <FileOutlined /> },          // Xử lý cọc
  ],

  // d. QUẢN LÝ XE TẠI ĐIỂM
  vehicles: [
    { key: "1", label: "Trạng thái pin & kỹ thuật", icon: <TeamOutlined /> },   // Theo dõi pin, tình trạng xe
    { key: "2", label: "Báo cáo sự cố / hỏng hóc", icon: <FileOutlined /> },    // Gửi báo cáo cho admin
  ],

  // e. TÀI LIỆU
  documents: [
    { key: "1", label: "Hướng dẫn sử dụng hệ thống", icon: <FileOutlined /> },  // Tài liệu trợ giúp
  ],
};

/* =========================================================
 👤 PHẦN 3: MENU NGƯỜI DÙNG (DROPDOWN)
 → Đăng xuất, xem thông tin cá nhân
 ========================================================= */

const userMenu = {
  items: [
    { key: "1", label: "Thông tin cá nhân" },
    { key: "2", label: "Đăng xuất", icon: <LogoutOutlined /> },
  ],
};

/* =========================================================
 🧠 PHẦN 4: COMPONENT CHÍNH
 → Kết hợp toàn bộ layout + cơ chế đổi nội dung
 ========================================================= */

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  // Trạng thái thu gọn sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Module hiện tại (menu trên header)
  const [selectedModule, setSelectedModule] = useState("tasks");

  // Mục con hiện tại (submenu bên trái)
  const [selectedSubMenu, setSelectedSubMenu] = useState("1");

  return (
    <Layout style={{ minHeight: "100vh", background: "#E3EFFF" }}>
      {/* 🧭 SIDEBAR - hiển thị submenu tương ứng module */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={230}
        style={{ background: "#fff", borderRight: "1px solid #e8e8e8" }}
      >
        <div className="p-4 text-center font-bold text-blue-600 text-lg">
          {collapsed ? "EV" : "EcoRide Staff"}
        </div>

        {/* Khi click submenu, đổi selectedSubMenu */}
        <Menu
          mode="inline"
          theme="light"
          items={subMenus[selectedModule]}
          selectedKeys={[selectedSubMenu]}
          onClick={(e) => setSelectedSubMenu(e.key)}
        />
      </Sider>

      {/* 🧩 PHẦN NỘI DUNG CHÍNH */}
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
          {/* MENU CHÍNH - chọn module */}
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

          {/* DROPDOWN NGƯỜI DÙNG */}
          <Dropdown menu={userMenu} trigger={["click"]}>
            <Space style={{ color: "white", cursor: "pointer" }}>
              <Avatar size="small" style={{ backgroundColor: "#fff", color: "#1447E6" }}>
                S
              </Avatar>
              <span>Staff</span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>

        {/* 📍 BREADCRUMB - hiển thị đường dẫn hiện tại */}
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

          {/* 💡 NỘI DUNG CHÍNH - sẽ thay đổi theo submenu */}
          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              minHeight: 400,
            }}
          >
            {children}
          </div>
        </Content>

        {/* ⚙️ FOOTER */}
        <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
          EcoRide Staff Portal ©{new Date().getFullYear()} Created by Duy
        </Footer>
      </Layout>
    </Layout>
  );
}
