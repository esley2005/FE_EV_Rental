"use client";

import React, { useEffect, useState } from "react";
import { Table, Card, Input, Tag, Space, Avatar, Typography, Spin, message } from "antd";
import { UserOutlined, SearchOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { authApi } from "@/services/api";
import type { User } from "@/services/api";
import dayjs from "dayjs";

const { Title } = Typography;

export default function CustomerList() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const usersRes = await authApi.getAllUsers();
      if (usersRes.success && usersRes.data) {
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        
        // Filter chỉ lấy customer (loại trừ Admin và Staff)
        const customersList = usersData.filter((user: any) => {
          const role = (user.role || user.roleName || "").toLowerCase().trim();
          // Loại trừ Admin và Staff, chỉ lấy Customer/Custom hoặc role rỗng (mặc định là customer)
          return role !== "admin" && role !== "staff";
        });
        
        setCustomers(customersList);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      message.error("Không thể tải danh sách khách hàng");
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
      title: "Ngày tạo",
      key: "createdAt",
      render: (_: any, record: User) =>
        record.createdAt ? dayjs(record.createdAt).format("DD/MM/YYYY HH:mm") : "-",
    },
  ];

  return (
    <div>
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
    </div>
  );
}


