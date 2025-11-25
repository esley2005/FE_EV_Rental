"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Button, 
  Input, 
  Select, 
  Space, 
  Table, 
  Tag, 
  message, 
  Image, 
  Descriptions, 
  Card, 
  Modal, 
  Popconfirm,
  Avatar
} from "antd";
import { 
  IdcardOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined
} from "@ant-design/icons";
import { driverLicenseApi, authApi } from "@/services/api";
import type { DriverLicenseData, User } from "@/services/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatVietnamTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  try {
    const parsedDate = dayjs(date);
    if (parsedDate.isUTC() || typeof date === 'string' && (date.includes('Z') || date.includes('+') || date.includes('-', 10))) {
      return parsedDate.tz("Asia/Ho_Chi_Minh").format('DD/MM/YYYY HH:mm');
    }
    return parsedDate.format('DD/MM/YYYY HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '-';
  }
};

interface LicenseWithUser extends DriverLicenseData {
  user?: User;
}

const getDocumentStatusTag = (status?: string | number) => {
  const statusStr = status?.toString() || '';
  const statusLower = statusStr.toLowerCase();
  
  if (statusLower === 'approved' || statusLower === '1' || status === 1) {
    return <Tag color="success" icon={<CheckCircleOutlined />}>Đã xác thực</Tag>;
  }
  if (statusLower === 'rejected' || statusLower === '2' || status === 2) {
    return <Tag color="error" icon={<CloseCircleOutlined />}>Đã từ chối</Tag>;
  }
  return <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ xác thực</Tag>;
};

export default function DocumentManagement() {
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<LicenseWithUser[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithUser | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const licensesResponse = await driverLicenseApi.getAll();
    
      
      if (!licensesResponse.success) {
        message.warning(licensesResponse.error || "Không thể tải danh sách giấy phép lái xe");
        setLoading(false);
        return;
      }

      // Xử lý nhiều format response khác nhau
      let licensesData: any[] = [];
      
      if (licensesResponse.data) {
        if (Array.isArray(licensesResponse.data)) {
          licensesData = licensesResponse.data;
        } else if ((licensesResponse.data as any)?.$values) {
          licensesData = (licensesResponse.data as any).$values;
        } else if ((licensesResponse.data as any)?.data) {
          // Có thể response có format { data: [...] }
          const data = (licensesResponse.data as any).data;
          licensesData = Array.isArray(data) ? data : (data?.$values || []);
        } else if (typeof licensesResponse.data === 'object') {
          // Thử parse như một object có thể chứa array
          licensesData = Object.values(licensesResponse.data).filter(Array.isArray)[0] || [];
        }
      }

      

      // Load users để map với licenses
      const usersResponse = await authApi.getAllUsers();
      const users: User[] = usersResponse.success && usersResponse.data
        ? (Array.isArray(usersResponse.data) 
            ? usersResponse.data 
            : (usersResponse.data as any)?.$values || [])
        : [];

      const licensesWithUsers: LicenseWithUser[] = licensesData.map((license: any) => {
        // Xử lý cả camelCase và PascalCase
        const userId = license.userId || license.UserId;
        const user = users.find((u) => u.id === userId);
        
        return {
          id: license.id || license.Id,
          name: license.name || license.Name || '',
          licenseNumber: license.licenseNumber || license.LicenseNumber || '',
          imageUrl: license.imageUrl || license.ImageUrl,
          imageUrl2: license.imageUrl2 || license.ImageUrl2,
          status: license.status !== undefined ? license.status : (license.Status !== undefined ? license.Status : 0),
          userId: userId,
          rentalOrderId: license.rentalOrderId || license.RentalOrderId,
          createdAt: license.createdAt || license.CreatedAt,
          updatedAt: license.updatedAt || license.UpdatedAt,
          user: user || undefined,
        };
      });

      console.log('[DocumentManagement] Licenses with users:', licensesWithUsers);

      // Sắp xếp theo ngày tạo mới nhất
      licensesWithUsers.sort((a, b) => {
        const dateA = new Date(a.createdAt || '').getTime() || 0;
        const dateB = new Date(b.createdAt || '').getTime() || 0;
        return dateB - dateA;
      });

      setLicenses(licensesWithUsers);
      
      if (licensesWithUsers.length === 0) {
        message.info("Chưa có giấy phép lái xe nào trong hệ thống");
      }
    } catch (error) {
      console.error("Load licenses error:", error);
      message.error("Không thể tải danh sách giấy phép lái xe: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 1);
      if (response.success) {
        message.success('Xác thực giấy phép lái xe thành công!');
        await loadLicenses();
        if (selectedLicense?.id === licenseId) {
          setDetailModalVisible(false);
        }
      } else {
        message.error(response.error || 'Không thể xác thực giấy phép lái xe');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi xác thực');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 2);
      if (response.success) {
        message.success('Đã từ chối giấy phép lái xe');
        await loadLicenses();
        if (selectedLicense?.id === licenseId) {
          setDetailModalVisible(false);
        }
      } else {
        message.error(response.error || 'Không thể từ chối giấy phép lái xe');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = useMemo(() => {
    return licenses.filter((license) => {
      const matchText = search
        ? `${license.name || ''} ${license.licenseNumber || ''} ${license.user?.fullName || ''} ${license.user?.email || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      
      const statusNum = typeof license.status === 'number' 
        ? license.status 
        : (license.status === '1' || license.status === 'Approved' ? 1 : 
           license.status === '2' || license.status === 'Rejected' ? 2 : 0);
      
      const matchStatus = filterStatus === "all" 
        ? true 
        : statusNum.toString() === filterStatus;
      return matchText && matchStatus;
    });
  }, [licenses, search, filterStatus]);

  const columns = [
    {
      title: "Mã GPLX",
      key: "id",
      width: 100,
      render: (_: any, record: LicenseWithUser) => (
        <span className="font-semibold text-blue-600">#{record.id}</span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_: any, record: LicenseWithUser) => getDocumentStatusTag(record.status),
    },
    {
      title: "Người dùng",
      key: "user",
      width: 200,
      render: (_: any, record: LicenseWithUser) => {
        if (!record.user) return '-';
        return (
          <div>
            <div className="font-medium text-sm">{record.user.fullName || record.user.email}</div>
            <div className="text-xs text-gray-500">{record.user.email}</div>
            {record.user.phone && (
              <div className="text-xs text-gray-500">{record.user.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Họ tên trên GPLX",
      key: "name",
      width: 180,
      render: (_: any, record: LicenseWithUser) => (
        <span className="font-medium">{record.name || '-'}</span>
      ),
    },
    {
      title: "Số bằng lái",
      key: "licenseNumber",
      width: 150,
      render: (_: any, record: LicenseWithUser) => (
        <span>{record.licenseNumber || '-'}</span>
      ),
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      width: 150,
      render: (_: any, record: LicenseWithUser) => (
        <span className="text-sm">
          {formatVietnamTime(record.createdAt || (record as any).CreatedAt)}
        </span>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: LicenseWithUser) => {
        const statusNum = typeof record.status === 'number' 
          ? record.status 
          : (record.status === '1' || record.status === 'Approved' ? 1 : 
             record.status === '2' || record.status === 'Rejected' ? 2 : 0);
        
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedLicense(record);
                setDetailModalVisible(true);
              }}
            >
              Chi tiết
            </Button>
            {statusNum === 0 && record.id && (
              <>
                <Popconfirm
                  title="Xác nhận xác thực"
                  description="Bạn có chắc chắn muốn xác thực giấy phép lái xe này?"
                  onConfirm={() => record.id && handleApproveLicense(record.id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="link"
                    size="small"
                    loading={processingId === record.id}
                    icon={<CheckCircleOutlined />}
                  >
                    Duyệt
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Xác nhận từ chối"
                  description="Bạn có chắc chắn muốn từ chối giấy phép lái xe này?"
                  onConfirm={() => record.id && handleRejectLicense(record.id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    loading={processingId === record.id}
                    icon={<CloseCircleOutlined />}
                  >
                    Từ chối
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Tìm theo tên, số bằng lái, người dùng..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          value={filterStatus}
          style={{ width: 200 }}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "0", label: "Chờ xác thực" },
            { value: "1", label: "Đã xác thực" },
            { value: "2", label: "Đã từ chối" },
          ]}
        />
        <Button icon={<IdcardOutlined />} onClick={loadLicenses}>
          Làm mới
        </Button>
      </Space>

      <Table<LicenseWithUser>
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowKey={(record) => record.id || `license-${record.userId}-${record.name}`}
        pagination={{ 
          pageSize: 10, 
          showSizeChanger: true, 
          showTotal: (total) => `Tổng ${total} giấy phép lái xe`,
          showQuickJumper: true
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: 'Chưa có giấy phép lái xe nào'
        }}
      />

      {/* Detail Modal */}
      {selectedLicense && (
        <Modal
          title={
            <Space>
              <IdcardOutlined /> Chi tiết giấy phép lái xe #{selectedLicense.id}
            </Space>
          }
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={900}
        >
          <div className="space-y-4">
            <Card size="small" className="bg-blue-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Trạng thái:</span>
                {getDocumentStatusTag(selectedLicense.status)}
              </div>
            </Card>

            <Card title={<><UserOutlined /> Thông tin người dùng</>} size="small">
              {selectedLicense.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedLicense.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>{selectedLicense.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{selectedLicense.user.phone || '-'}</Descriptions.Item>
                  {selectedLicense.user.address && (
                    <Descriptions.Item label="Địa chỉ">{selectedLicense.user.address}</Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            <Card title={<><IdcardOutlined /> Thông tin giấy phép lái xe</>} size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Họ tên trên GPLX">{selectedLicense.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Số bằng lái">{selectedLicense.licenseNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{formatVietnamTime(selectedLicense.createdAt || (selectedLicense as any).CreatedAt)}</Descriptions.Item>
                <Descriptions.Item label="Ngày cập nhật">{formatVietnamTime(selectedLicense.updatedAt || (selectedLicense as any).UpdatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>

            {(selectedLicense.imageUrl || selectedLicense.imageUrl2) && (
              <Card title="Ảnh giấy phép lái xe" size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {selectedLicense.imageUrl && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Mặt trước:</div>
                      <Image src={selectedLicense.imageUrl} alt="GPLX mặt trước" className="max-w-full" />
                    </div>
                  )}
                  {selectedLicense.imageUrl2 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Mặt sau:</div>
                      <Image src={selectedLicense.imageUrl2} alt="GPLX mặt sau" className="max-w-full" />
                    </div>
                  )}
                </Space>
              </Card>
            )}

            {(() => {
              const statusNum = typeof selectedLicense.status === 'number' 
                ? selectedLicense.status 
                : (selectedLicense.status === '1' || selectedLicense.status === 'Approved' ? 1 : 
                   selectedLicense.status === '2' || selectedLicense.status === 'Rejected' ? 2 : 0);
              
              if (statusNum === 0 && selectedLicense.id) {
                return (
                  <Card size="small" className="bg-yellow-50">
                    <Space>
                      <Popconfirm
                        title="Xác nhận xác thực"
                        description="Bạn có chắc chắn muốn xác thực giấy phép lái xe này?"
                        onConfirm={() => selectedLicense.id && handleApproveLicense(selectedLicense.id)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                      >
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={processingId === selectedLicense.id}
                        >
                          Duyệt giấy phép lái xe
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        title="Xác nhận từ chối"
                        description="Bạn có chắc chắn muốn từ chối giấy phép lái xe này?"
                        onConfirm={() => selectedLicense.id && handleRejectLicense(selectedLicense.id)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                      >
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          loading={processingId === selectedLicense.id}
                        >
                          Từ chối
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Card>
                );
              }
              return null;
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}

