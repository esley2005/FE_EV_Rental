"use client";

import React, { useState } from "react";
import {
  CarOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  SwapOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  DownOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Dropdown, Space, Avatar, Breadcrumb } from "antd";

// Các component nội dung mẫu
import CarList from "@/components/CarList";
import HistoryList from "@/components/HistoryList";
import DispatchList from "@/components/DispatchList";

const { Header, Sider, Content, Footer } = Layout;

// Menu chính (navbar trên cùng)
const mainMenu = [
  { key: "cars", label: "Đội xe & Điểm thuê", icon: <CarOutlined /> },
  { key: "customers", label: "Khách hàng", icon: <UserOutlined /> },
  { key: "staff", label: "Nhân viên", icon: <TeamOutlined /> },
  { key: "reports", label: "Báo cáo & Phân tích", icon: <BarChartOutlined /> },
  { key: "settings", label: "Cài đặt", icon: <SettingOutlined /> },
];

// Submenu trái (sidebar)
const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  cars: [
    { key: "1", label: "Danh sách xe", icon: <CarOutlined /> },
    { key: "2", label: "Lịch sử giao nhận", icon: <HistoryOutlined /> },
    { key: "3", label: "Điều phối xe", icon: <SwapOutlined /> },
  ],

  customers: [
    { key: "1", label: "Hồ sơ khách hàng", icon: <UserOutlined /> },
    { key: "2", label: "Khiếu nại", icon: <FileTextOutlined /> },
    { key: "3", label: "Danh sách khách hàng có rủi ro", icon: <TeamOutlined /> },
  ],

  staff: [
    { key: "1", label: "Danh sách nhân viên tại các điểm", icon: <TeamOutlined /> },
  
  ],

  reports: [
    { key: "1", label: "Doanh thu", icon: <LineChartOutlined /> },
    { key: "2", label: "Tỷ lệ sử dụng xe", icon: <ClockCircleOutlined /> },
  ],

  settings: [{ key: "1", label: "Cấu hình hệ thống", icon: <SettingOutlined /> }],
};

// Menu người dùng (dropdown admin)
const userMenu = {
  items: [
    { key: "1", label: "Thông tin cá nhân" },
    { key: "2", label: "Đăng xuất", icon: <LogoutOutlined /> },
  ],
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModule, setSelectedModule] = useState("cars");
  const [selectedSubMenu, setSelectedSubMenu] = useState("1");

  // Hiển thị nội dung theo module và submenu
  const renderContent = () => {
    if (selectedModule === "cars") {
      switch (selectedSubMenu) {
        case "1":
          return <CarList />;
        case "2":
          return <HistoryList />;
        case "3":
          return <DispatchList />;
        default:
          return <p>Chưa có nội dung.</p>;
      }
    }

    if (selectedModule === "customers") {
      switch (selectedSubMenu) {
        case "1":
          return 
        case "2":
          return <p>Trang Khiếu nại khách hàng</p>;
        case "3":
          return <p>Danh sách khách hàng có rủi ro</p>;
        default:
          return <p>Chưa có nội dung.</p>;
      }
    }

    if (selectedModule === "staff") {
      switch (selectedSubMenu) {
        case "1":
          return <p>Danh sách nhân viên tại các điểm</p>;

        default:
          return <p>Chưa có nội dung.</p>;
      }
    }

    if (selectedModule === "reports") {
      switch (selectedSubMenu) {
        case "1":
          return <p>Báo cáo doanh thu theo điểm thuê</p>;
        case "2":
          return <p>Phân tích tỷ lệ sử dụng xe và giờ cao điểm</p>;
        default:
          return <p>Chưa có nội dung.</p>;
      }
    }

    return (
      <p>
        Nội dung của module{" "}
        <strong>{mainMenu.find((m) => m.key === selectedModule)?.label}</strong> đang được phát triển.
      </p>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#E3EFFF" }}>
      {/* Sidebar trái */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={230}
        style={{ background: "#fff", borderRight: "1px solid #e8e8e8" }}
      >
        <div className="p-4 text-center font-bold text-blue-600 text-lg">
          {collapsed ? "EV" : "EV ADMIN"}
        </div>
        <Menu
          mode="inline"
          theme="light"
          items={subMenus[selectedModule]}
          selectedKeys={[selectedSubMenu]}
          onClick={(e) => setSelectedSubMenu(e.key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* Layout chính */}
      <Layout>
        {/* Header */}
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

          {/* Dropdown admin */}
          <Dropdown menu={userMenu} trigger={["click"]}>
            <Space style={{ color: "white", cursor: "pointer" }}>
              <Avatar size="small" style={{ backgroundColor: "#fff", color: "#1447E6" }}>
                A
              </Avatar>
              <span>Admin</span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{ margin: "16px" }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[
              { title: mainMenu.find((m) => m.key === selectedModule)?.label },
              { title: subMenus[selectedModule].find((s) => s.key === selectedSubMenu)?.label },
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
            {renderContent()}
          </div>
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
          EV Rental Admin ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
}
