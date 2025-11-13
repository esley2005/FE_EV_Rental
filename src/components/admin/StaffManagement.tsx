"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Avatar,
  Tag,
  Space,
  Input,
  Select,
  notification as antdNotification,
  Spin,
  Empty,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { authApi, rentalLocationApi } from "@/services/api";
import type { User, RentalLocationData } from "@/services/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Search } = Input;

// Mở rộng kiểu User cho màn quản trị nhân viên
type AdminUser = User & {
  isEmailConfirmed?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  rentalLocation?: { name?: string; address?: string } | null;
  rentalLocationId?: number;
  locationId?: number;
};

export default function StaffManagement() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [locationMap, setLocationMap] = useState<Record<number, RentalLocationData>>({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    // Load staff when locationId changes
    if (selectedLocationId !== undefined) {
      loadStaffByLocation(selectedLocationId);
    } else {
      loadStaff();
    }
  }, [selectedLocationId]);

  useEffect(() => {
    // Filter staff based on search text only (location filter is done via API)
    if (!searchText.trim()) {
      setFilteredStaff(staff);
    } else {
      const filtered = staff.filter(
        (member) =>
          member.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          member.phone?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredStaff(filtered);
    }
  }, [searchText, staff]);

  const loadLocations = async () => {
    try {
      const response = await rentalLocationApi.getAll();
      if (response.success && response.data) {
        // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
        const raw = response.data as any;
        let locationsData: RentalLocationData[] = [];

        if (Array.isArray(raw)) {
          locationsData = raw;
        } else if (Array.isArray(raw.$values)) {
          locationsData = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          locationsData = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          locationsData = raw.data;
        }

        setLocations(locationsData);
        // Tạo map để dễ dàng lookup
        const map: Record<number, RentalLocationData> = {};
        locationsData.forEach((loc) => {
          map[loc.id] = loc;
        });
        setLocationMap(map);
      }
    } catch (error) {
      console.error("Load locations error:", error);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAllUsers();
      if (response.success && response.data) {
        const filtered = response.data.filter(
            (user: User) => user.role?.toLowerCase() === "staff"
          );

          const normalized = filtered.map((u: any) => ({
          id: u.userId ?? u.id,
          email: u.email,
          fullName: u.fullName ?? u.name,
          role: u.role ?? "Staff",
          phone: u.phone ?? u.phoneNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId,
          rentalLocationId: u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId,
          rentalLocation: u.rentalLocation ?? u.RentalLocation ?? null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          isEmailConfirmed: u.isEmailConfirmed,
          isActive: u.isActive,
          })) as AdminUser[];

        setStaff(normalized);
        setFilteredStaff(normalized);
      } else {
        api.error({
          message: "Lỗi tải danh sách nhân viên",
          description: response.error || "Không thể tải danh sách nhân viên!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Load staff error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể tải danh sách nhân viên. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyLocalFilterByLocation = (list: AdminUser[], locationId: number) =>
    list.filter((u) => (u.rentalLocationId ?? u.locationId) === locationId);

  const loadStaffByLocation = async (locationId: number) => {
    setLoading(true);
    try {
      const response = await rentalLocationApi.getAllStaffByLocationId(locationId);
      if (response.success && response.data) {
        // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
        const raw = response.data as any;
        let staffList: AdminUser[] = [];

        if (Array.isArray(raw)) {
          staffList = raw;
        } else if (Array.isArray(raw.$values)) {
          staffList = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          staffList = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          staffList = raw.data;
        }

        // Normalize field names to match User type
        const normalized = staffList.map((u: any) => ({
          id: u.userId ?? u.id,
          email: u.email,
          fullName: u.fullName ?? u.name,
          role: u.role ?? 'Staff',
          phone: u.phone ?? u.phoneNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: Number(u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId),
          rentalLocationId: Number(u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId),
          rentalLocation: u.rentalLocation ?? u.RentalLocation ?? null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          isEmailConfirmed: u.isEmailConfirmed,
          isActive: u.isActive,
        })) as AdminUser[];

        setStaff(normalized);
        setFilteredStaff(normalized);
      } else {
        // Fallback: lọc cục bộ từ danh sách đang có
        const baseList = staff.length ? staff : [];
        if (baseList.length) {
          const locallyFiltered = applyLocalFilterByLocation(baseList, locationId);
          setFilteredStaff(locallyFiltered);
        } else {
          // Nếu chưa có staff nào, thử load toàn bộ rồi lọc
          await loadStaff();
          setFilteredStaff((prev) => applyLocalFilterByLocation(prev as AdminUser[], locationId));
        }
      }
    } catch (error) {
      console.error("Load staff by location error:", error);
      // Fallback: lọc cục bộ khi API lỗi
      const baseList = staff.length ? staff : [];
      if (baseList.length) {
        const locallyFiltered = applyLocalFilterByLocation(baseList, locationId);
        setFilteredStaff(locallyFiltered);
      } else {
        await loadStaff();
        setFilteredStaff((prev) => applyLocalFilterByLocation(prev as AdminUser[], locationId));
      }
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: "Avatar",
      key: "avatar",
      width: 80,
      render: (_: unknown, record: AdminUser) => (
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
      sorter: (a: AdminUser, b: AdminUser) =>
        (a.fullName || "").localeCompare(b.fullName || ""),
      render: (text: string) => (
        <Space>
          <TeamOutlined style={{ color: "#1890ff" }} />
          <strong>{text || "Chưa cập nhật"}</strong>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
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
      render: (text: string) => (
        <Space>
          <PhoneOutlined />
          <span>{text || "Chưa cập nhật"}</span>
        </Space>
      ),
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      render: (text: string) => text || "Chưa cập nhật",
    },
    {
      title: "Ngày sinh",
      dataIndex: "dateOfBirth",
      key: "dateOfBirth",
      render: (text: string) =>
        text ? dayjs(text).format("DD/MM/YYYY") : "Chưa cập nhật",
    },
    {
      title: "Điểm thuê",
      key: "location",
      sorter: (a: AdminUser, b: AdminUser) => {
        const locA = locationMap[a.locationId || a.rentalLocationId || 0]?.name || "";
        const locB = locationMap[b.locationId || b.rentalLocationId || 0]?.name || "";
        return locA.localeCompare(locB);
      },
      render: (_: unknown, record: AdminUser) => {
        // Ưu tiên sử dụng rentalLocation navigation property nếu có
        const location = record.rentalLocation;
        const locationId = record.rentalLocationId || record.locationId;
        
        if (location) {
          return (
            <Space>
              <EnvironmentOutlined style={{ color: "#52c41a" }} />
              <div>
                <div style={{ fontWeight: 500 }}>{location.name}</div>
                {location.address && (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{location.address}</div>
                )}
              </div>
            </Space>
          );
        }
        
        // Fallback to locationMap if navigation property not available
        const locationFromMap = locationId !== undefined && locationId !== null ? locationMap[locationId as number] : null;
        if (locationFromMap) {
          return (
            <Space>
              <EnvironmentOutlined style={{ color: "#52c41a" }} />
              <div>
                <div style={{ fontWeight: 500 }}>{locationFromMap.name}</div>
                {locationFromMap.address && (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{locationFromMap.address}</div>
                )}
                <Tag color="default" style={{ marginTop: 4 }}>
                  ID: {locationId}
                </Tag>
              </div>
            </Space>
          );
        }

        // Nếu có locationId nhưng chưa load được map, vẫn hiển thị ID
        if (locationId) {
          return (
            <Tag color="default">ID: {locationId}</Tag>
          );
        }

        return <Tag color="default">Chưa phân công điểm</Tag>;
      },
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (text: string) => (
        <Tag color="blue">{text || "Staff"}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, record: AdminUser) => (
        <Space direction="vertical" size="small">
          {record.isEmailConfirmed ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Email đã xác thực
            </Tag>
          ) : (
            <Tag color="warning">Email chưa xác thực</Tag>
          )}
          {record.isActive !== false ? (
            <Tag color="success">Đang hoạt động</Tag>
          ) : (
            <Tag color="error">Đã khóa</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: AdminUser, b: AdminUser) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (text: string) =>
        text ? dayjs(text).format("DD/MM/YYYY HH:mm") : "N/A",
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: (a: AdminUser, b: AdminUser) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (text: string) =>
        text ? (
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(text).format("DD/MM/YYYY HH:mm")}</span>
          </Space>
        ) : (
          "Chưa cập nhật"
        ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>
              Danh sách nhân viên tại các điểm
            </h2>
            <Search
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 400 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>Lọc theo điểm thuê:</span>
            <Select
              placeholder="Chọn điểm thuê"
              allowClear
              style={{ width: 300 }}
              value={selectedLocationId}
              onChange={(value) => setSelectedLocationId(value)}
              options={[
                { label: "Tất cả điểm", value: undefined },
                ...locations.map((loc) => ({
                  label: `${loc.name} (ID: ${loc.id})`,
                  value: loc.id,
                })),
              ]}
            />
            {selectedLocationId && (
              <Tag
                closable
                onClose={() => setSelectedLocationId(undefined)}
                color="blue"
              >
                Đang lọc: {locationMap[selectedLocationId]?.name || `ID: ${selectedLocationId}`}
              </Tag>
            )}
          </div>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredStaff}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng cộng: ${total} nhân viên`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Không có nhân viên nào"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}

