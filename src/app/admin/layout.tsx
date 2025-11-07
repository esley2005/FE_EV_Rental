"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  History,
  Shuffle,
  User,
  Users,
  LogOut,
  BarChart3,
  Clock,
  LineChart,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Layout, Menu, Dropdown, Space, Avatar, Breadcrumb, message, Result, Button } from "antd";
import { authUtils } from "@/utils/auth";

// Các component nội dung mẫu
import HistoryList from "@/components/HistoryList";
import DispatchList from "@/components/DispatchList";
import CarManagement from "@/components/admin/CarManagement";
import AIAnalysis from "@/components/admin/AIAnalysis";

const { Header, Sider, Content, Footer } = Layout;

// Menu chính (navbar trên cùng)
const mainMenu = [
  { key: "cars", label: "Đội xe & Điểm thuê", icon: <Car /> },
  { key: "customers", label: "Khách hàng", icon: <User /> },
  { key: "staff", label: "Nhân viên", icon: <Users /> },
  { key: "reports", label: "Báo cáo & Phân tích", icon: <BarChart3 /> },
];

// Submenu trái (sidebar)
const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  cars: [
    { key: "1", label: "Danh sách xe", icon: <Car /> },
    { key: "2", label: "Lịch sử giao nhận", icon: <History /> },
    { key: "3", label: "Điều phối xe", icon: <Shuffle /> },
  ],

  customers: [
    { key: "1", label: "Hồ sơ khách hàng", icon: <User /> },
    { key: "2", label: "Khiếu nại", icon: <FileText /> },
    { key: "3", label: "Danh sách khách hàng có rủi ro", icon: <Users /> },
  ],

  staff: [
    { key: "1", label: "Danh sách nhân viên tại các điểm", icon: <Users /> },
  
  ],

  reports: [
    { key: "1", label: "Doanh thu", icon: <LineChart /> },
    { key: "2", label: "Tỷ lệ sử dụng xe", icon: <Clock /> },
    { key: "3", label: "Phân tích AI", icon: <BarChart3 /> },
  ],

};

// Menu người dùng (dropdown admin)
const userMenu = {
  items: [
    { key: "1", label: "Thông tin cá nhân" },
    { key: "2", label: "Đăng xuất", icon: <LogOut /> },
  ],
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModule, setSelectedModule] = useState("cars");
  const [selectedSubMenu, setSelectedSubMenu] = useState("1");
  const [allowed, setAllowed] = useState(false);
  const [denied, setDenied] = useState(false);
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Admin");
  const [userInitial, setUserInitial] = useState<string>("A");

  // Chỉ cho phép user có role admin truy cập
  useEffect(() => {
    // Kiểm tra đăng nhập và role admin (dựa trên localStorage: token + user.role)
    const isAuthed = authUtils.isAuthenticated();
    const isAdmin = authUtils.isAdmin();

    if (!isAuthed || !isAdmin) {
      // Không redirect ngay để hiển thị cảnh báo trên trang
      message.warning("Bạn không có quyền truy cập trang này.");
      setDenied(true);
      setAllowed(false);
      return;
    }
    setAllowed(true);
    setDenied(false);
  }, [router]);

  // Lấy tên user để hiển thị trên header
  useEffect(() => {
    const u = authUtils.getCurrentUser();
    const name = u?.fullName ?? u?.name ?? u?.Email ?? u?.email ?? "Admin";
    setUserName(name);
    const initial = (name || "A").trim().charAt(0).toUpperCase();
    setUserInitial(initial || "A");
  }, []);

  // Hiển thị nội dung theo module và submenu
  const renderContent = () => {
    if (selectedModule === "cars") {
      switch (selectedSubMenu) {
        case "1":
          return <CarManagement />;
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
          // TODO: Hiển thị danh sách khách hàng từ API
          return <p>Hồ sơ khách hàng</p>;
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
          return <AIAnalysis variant="car-usage" />;
        case "3":
          return <AIAnalysis />;
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

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E3EFFF] p-6">
        <Result
          status="403"
          title="403"
          subTitle={
            <div className="text-lg md:text-xl font-large">
              Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản Admin hoặc quay lại trang chủ.
            </div>
          }
          extra={
            <Space>
              <Button
                type="primary"
                size="large"
                className="font-semibold"
                onClick={() => router.push("/")}
              >
                Về trang chủ
              </Button>
              <Button
                size="large"
                className="font-semibold"
                onClick={() => router.push("/login")}
              >
                Đăng nhập
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  if (!allowed) return null;

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
        <Link href="/" className="block p-4 text-center font-bold text-blue-600 text-lg hover:opacity-90">
          {collapsed ? "EV" : "EV ADMIN"}
        </Link>
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
          <Dropdown
            trigger={["click"]}
            menu={{
              items: userMenu.items,
              onClick: ({ key }) => {
                if (key === "2") {
                  // Đăng xuất
                  authUtils.logout();
                  router.push("/");
                } else if (key === "1") {
                  router.push("/profile");
                }
              },
            }}
          >
            <Space style={{ color: "white", cursor: "pointer" }}>
              <Avatar size="small" style={{ backgroundColor: "#fff", color: "#1447E6" }}>
                {userInitial}
              </Avatar>
              <span>{userName}</span>
              <ChevronDown />
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
