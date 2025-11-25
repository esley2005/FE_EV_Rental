"use client";

// ✅ Ensure patch is loaded before antd imports
import '@/lib/antd-setup';

// @ts-ignore - React types are defined in global.d.ts
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
  MapPin,
} from "lucide-react";
import { Layout, Menu, Dropdown, Space, Avatar, Breadcrumb, message, Result, Button } from "antd";
import { authUtils } from "@/utils/auth";

// Các component nội dung mẫu

import VehicleDispatch from "@/components/admin/VehicleDispatch";
import CarManagement from "@/components/admin/CarManagement";
import CustomerManagement from "@/components/admin/CustomerManagement";
import StaffManagement from "@/components/admin/StaffManagement";
import AIAnalysis from "@/components/admin/AIAnalysis";
import RevenueByLocation from "@/components/admin/RevenueByLocation";
import TransactionHistory from "@/components/admin/TransactionHistory";
import RentalHistory from "@/components/admin/RentalHistory";
import CarIssueReports from "@/components/admin/CarIssueReports";
import RentalOrdersByLocation from "@/components/admin/RentalOrdersByLocation";
import OrderDetailsWithPayments from "@/components/admin/OrderDetailsWithPayments";
import CarUtilizationRate from "@/components/admin/CarUtilizationRate";


const { Header, Sider, Content, Footer } = Layout;

// Menu chính (navbar trên cùng)
const mainMenu = [
  { key: "cars", label: "Đội xe & Điểm thuê", icon: <Car /> },
  { key: "customers", label: "Khách hàng", icon: <User /> },
  { key: "staff", label: "Nhân viên", icon: <Users /> },
  { key: "order-details", label: "Chi tiết đơn hàng", icon: <FileText /> },

  { key: "reports", label: "Báo cáo & Phân tích", icon: <BarChart3 /> },
];

// Submenu trái (sidebar)
const subMenus: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  cars: [
    { key: "1", label: "Danh sách xe", icon: <Car /> },
    { key: "2", label: "Lịch sử giao nhận xe", icon: <History /> },
    { key: "3", label: "Báo cáo sự cố từ staff", icon: <FileText /> },
    // { key: "4", label: "Điều phối xe", icon: <Shuffle /> },
  ],



  customers: [
    { key: "1", label: "Hồ sơ khách hàng", icon: <User /> },
    { key: "2", label: "Lịch sử thuê xe", icon: <History /> },
    // { key: "3", label: "Danh sách khách hàng có rủi ro", icon: <Users /> },
  ],

  staff: [
    { key: "1", label: "Danh sách nhân viên tại các điểm", icon: <Users /> },
    { key: "2", label: "Điều phối nhân viên", icon: <Shuffle /> },
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

  // Module content riêng, tránh đệ quy
  const getModuleContent = () => {
    switch (selectedModule) {
      case "cars":
        switch (selectedSubMenu) {
          case "1":
            return <CarManagement />;
          case "2":
            return <TransactionHistory />;
          case "3":
            return <CarIssueReports />;
          // case "4":
          //   return <VehicleDispatch />;
          default:
            return <p>Chưa có nội dung.</p>;
        }

      case "customers":
        switch (selectedSubMenu) {
          case "1":
            return <CustomerManagement />;
          case "2":
            return <RentalHistory />;
          // case "3":
          //   return <p>Chưa có</p>;
          default:
            return <p>Chưa có nội dung.</p>;
        }
      case "staff":
        switch (selectedSubMenu) {
          case "1":
            return <StaffManagement mode="list" />;
          case "2":
            return <StaffManagement mode="transfer" />;
          default:
            return <p>Chưa có nội dung.</p>;
        }
      case "order-details":
        return <OrderDetailsWithPayments />;
      case "reports":
        switch (selectedSubMenu) {
          case "1":
            return <RevenueByLocation />;
          case "2":
            return <CarUtilizationRate />;
          case "3":
            return <AIAnalysis />;
          default:
            return <p>Chưa có nội dung.</p>;
        }
      default:
        return <p>Module không tồn tại.</p>;
    }
  };

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E3EFFF] p-6">
        {/* @ts-ignore - Result component from antd is valid JSX */}
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
              <Button type="primary" size="large" className="font-semibold" onClick={() => router.push("/")}>
                Về trang chủ
              </Button>
              <Button size="large" className="font-semibold" onClick={() => router.push("/login")}>
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
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value: boolean) => setCollapsed(value)}
        width={230}
        style={{ background: "#fff", borderRight: "1px solid #e8e8e8" }}
      >
        <Link href="/" className="block p-4 text-center font-bold text-blue-600 text-lg hover:opacity-90">
          {collapsed ? "EV" : "EV ADMIN"}
        </Link>
        <Menu
          mode="inline"
          theme="light"
          items={subMenus[selectedModule] || []}
          selectedKeys={[selectedSubMenu]}
          onClick={(e: { key: string }) => setSelectedSubMenu(e.key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
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
            onClick={(e: { key: string }) => {
              setSelectedModule(e.key);
              // Chỉ set submenu nếu module có submenu
              const moduleSubMenus = subMenus[e.key];
              if (moduleSubMenus && moduleSubMenus.length > 0) {
                setSelectedSubMenu(moduleSubMenus[0].key);
              } else {
                setSelectedSubMenu("1"); // Default value
              }
            }}
            style={{ flex: 1, background: "transparent" }}
          />
          <Dropdown
            trigger={["click"]}
            menu={{
              items: userMenu.items,
              onClick: ({ key }: { key: string }) => {
                if (key === "2") {
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
        <Content style={{ margin: "16px" }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[
              { title: mainMenu.find((m) => m.key === selectedModule)?.label || 'Admin' },
              ...(subMenus[selectedModule] && subMenus[selectedModule].length > 0
                ? [{ title: subMenus[selectedModule].find((s) => s.key === selectedSubMenu)?.label || '' }]
                : []),
            ]}
          />
          <div style={{ padding: 24, background: "#fff", borderRadius: 8, minHeight: 400 }}>
            {getModuleContent()}
          </div>
        </Content>
        <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
          EV Rental Admin ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
}