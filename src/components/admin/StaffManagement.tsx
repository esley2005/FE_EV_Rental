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
import dayjs from "dayjs";

const { Search } = Input;

export default function StaffManagement() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [staff, setStaff] = useState<User[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<User[]>([]);
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
        let list: any[] = [];

        if (Array.isArray(raw)) {
          list = raw;
        } else if (Array.isArray(raw.$values)) {
          list = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          list = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          list = raw.data;
        }

        // Chuẩn hóa key id/name/address để tránh lệch chữ hoa/chữ thường từ .NET
        const normalized: RentalLocationData[] = list
          .map((l: any) => ({
            id: Number(l?.id ?? l?.Id),
            name: l?.name ?? l?.Name ?? `#${l?.id ?? l?.Id}`,
            address: l?.address ?? l?.Address ?? "",
            coordinates: l?.coordinates ?? null,
            isActive: l?.isActive ?? l?.IsActive,
          }))
          .filter((l: any) => !!l.id);

        setLocations(normalized as any);
        // Tạo map để dễ dàng lookup
        const map: Record<number, RentalLocationData> = {};
        normalized.forEach((loc: any) => {
          map[Number(loc.id)] = loc as RentalLocationData;
        });
        setLocationMap(map);
      }
    } catch (error) {
      console.error("Load locations error:", error);
    }
  };

  // Helper: Điền rentalLocation từ locationMap nếu thiếu
  const fillStaffWithLocation = (list: any[], locMap: Record<number, RentalLocationData>) => {
    return list.map((u: any) => {
      const existing = u.rentalLocation || u.RentalLocation;
      if (existing && (existing.name || existing.Name)) return u;
      const id = Number(u.rentalLocationId || u.locationId || u.RentalLocationId || u.LocationId || 0);
      const loc = id ? locMap[id] : undefined;
      if (loc) {
        return { ...u, rentalLocation: loc };
      }
      return u;
    });
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAllUsers();
      if (response.success && response.data) {
        const filtered = response.data.filter(
          (user: User) => user.role?.toLowerCase() === "staff"
        );

        let normalized = filtered.map((u: any) => ({
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
        })) as User[];

        // Điền rentalLocation nếu thiếu bằng map hiện có
        normalized = fillStaffWithLocation(normalized as any[], locationMap) as any;
        setStaff(normalized as any);
        setFilteredStaff(normalized as any);
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

  const loadStaffByLocation = async (locationId: number) => {
    setLoading(true);
    try {
      const response = await rentalLocationApi.getAllStaffByLocationId(locationId);
      if (response.success && response.data) {
        // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
        const raw = response.data as any;
        let staffList: User[] = [];

        if (Array.isArray(raw)) {
          staffList = raw;
        } else if (Array.isArray(raw.$values)) {
          staffList = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          staffList = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          staffList = raw.data;
        }

        // Normalize field names to match User type (bao gồm rentalLocation nếu có)
        let normalized = staffList.map((u: any) => ({
          id: u.userId ?? u.id,
          email: u.email,
          fullName: u.fullName ?? u.name,
          role: u.role ?? 'Staff',
          phone: u.phone ?? u.phoneNumber,
          address: u.address,
          dateOfBirth: u.dateOfBirth ?? u.dob,
          avatar: u.avatar,
          locationId: u.locationId ?? u.rentalLocationId ?? u.LocationId ?? u.RentalLocationId,
          rentalLocationId: u.rentalLocationId ?? u.locationId ?? u.RentalLocationId ?? u.LocationId,
          rentalLocation: u.rentalLocation ?? u.RentalLocation ?? null,
          createdAt: u.createdAt,
        })) as User[];
        // Điền rentalLocation nếu thiếu bằng map hiện có
        normalized = fillStaffWithLocation(normalized as any[], locationMap) as any;
        setStaff(normalized as any);
        setFilteredStaff(normalized as any);
      } else {
        api.error({
          message: "Lỗi tải danh sách nhân viên",
          description: response.error || "Không thể tải danh sách nhân viên theo điểm thuê!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Load staff by location error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể tải danh sách nhân viên theo điểm thuê. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Avatar",
      key: "avatar",
      width: 80,
      render: (_: any, record: User) => (
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
      sorter: (a: User, b: User) =>
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
      sorter: (a: any, b: any) => {
        const aId = Number(a.locationId || a.rentalLocationId || 0);
        const bId = Number(b.locationId || b.rentalLocationId || 0);
        const locA = locationMap[aId]?.name || "";
        const locB = locationMap[bId]?.name || "";
        return locA.localeCompare(locB);
      },
      render: (_: any, record: any) => {
        // Ưu tiên sử dụng rentalLocation navigation property nếu có
        const location = (record as any).rentalLocation || (record as any).RentalLocation;
        const locationId = record.rentalLocationId || record.locationId || (record as any).RentalLocationId || (record as any).LocationId;
        
        if (location) {
          return (
            <Space>
              <EnvironmentOutlined style={{ color: "#52c41a" }} />
              <div>
                <div style={{ fontWeight: 500 }}>{location.name || location.Name}</div>
                {(location.address || location.Address) && (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{location.address || location.Address}</div>
                )}
              </div>
            </Space>
          );
        }
        
        // Fallback to locationMap if navigation property not available
        const idNum = Number(locationId);
        const locationFromMap = idNum ? locationMap[idNum] : null;
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
                  ID: {idNum}
                </Tag>
              </div>
            </Space>
          );
        }
        
        return (
          <Tag color="default">
            Chưa phân công điểm
          </Tag>
        );
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
      render: (_: any, record: any) => (
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

