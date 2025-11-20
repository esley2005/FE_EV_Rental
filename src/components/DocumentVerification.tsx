"use client";

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Button, 
  message, 
  Space, 
  Tag, 
  Table, 
  Typography, 
  Image, 
  Modal,
  Descriptions,
  Tabs,
  Badge,
  Spin
} from 'antd';
import { driverLicenseApi, citizenIdApi, authApi, rentalOrderApi } from '@/services/api';
import type { DriverLicenseData, CitizenIdData, User, RentalOrderData } from '@/services/api';
import { 
  IdcardOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  EyeOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

interface DocumentVerificationProps {
  mode?: 'check-documents' | 'verify-system';
}

export default function DocumentVerification({ mode = 'check-documents' }: DocumentVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [driverLicenses, setDriverLicenses] = useState<DriverLicenseData[]>([]);
  const [citizenIds, setCitizenIds] = useState<CitizenIdData[]>([]);
  const [users, setUsers] = useState<Record<number, User>>({});
  const [orders, setOrders] = useState<Record<number, RentalOrderData>>({});
  const [selectedLicense, setSelectedLicense] = useState<DriverLicenseData | null>(null);
  const [selectedCitizenId, setSelectedCitizenId] = useState<CitizenIdData | null>(null);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [citizenIdModalVisible, setCitizenIdModalVisible] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Load all documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load driver licenses and citizen IDs in parallel
      const [licenseRes, citizenRes, usersRes] = await Promise.all([
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
        authApi.getAllUsers()
      ]);

      // Process driver licenses
      if (licenseRes.success && licenseRes.data) {
        const licenses = Array.isArray(licenseRes.data) 
          ? licenseRes.data 
          : (licenseRes.data as any)?.$values || [];
        setDriverLicenses(licenses);
      }

      // Process citizen IDs
      if (citizenRes.success && citizenRes.data) {
        const citizenIdsData = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        setCitizenIds(citizenIdsData);
      }

      // Process users for lookup
      if (usersRes.success && usersRes.data) {
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const usersMap: Record<number, User> = {};
        usersData.forEach((user: any) => {
          const userId = user.id || user.userId;
          if (userId) {
            usersMap[userId] = user;
          }
        });
        setUsers(usersMap);
      }

      // Load all rental orders to get userId from rentalOrderId
      // Collect unique rentalOrderIds from documents
      const allRentalOrderIds = new Set<number>();
      if (licenseRes.success && licenseRes.data) {
        const licenses = Array.isArray(licenseRes.data) 
          ? licenseRes.data 
          : (licenseRes.data as any)?.$values || [];
        licenses.forEach((license: DriverLicenseData) => {
          if (license.rentalOrderId) {
            allRentalOrderIds.add(license.rentalOrderId);
          }
        });
      }
      if (citizenRes.success && citizenRes.data) {
        const citizenIdsData = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        citizenIdsData.forEach((citizenId: CitizenIdData) => {
          if (citizenId.rentalOrderId) {
            allRentalOrderIds.add(citizenId.rentalOrderId);
          }
        });
      }

      // Load orders by their IDs
      const ordersMap: Record<number, RentalOrderData> = {};
      await Promise.all(
        Array.from(allRentalOrderIds).map(async (orderId) => {
          try {
            const orderRes = await rentalOrderApi.getById(orderId);
            if (orderRes.success && orderRes.data) {
              ordersMap[orderId] = orderRes.data;
            }
          } catch (error) {
            console.error(`Error loading order ${orderId}:`, error);
          }
        })
      );
      setOrders(ordersMap);
    } catch (error) {
      console.error('Error loading documents:', error);
      message.error('Không thể tải danh sách giấy tờ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'approved' || statusLower === '1') {
      return <Tag color="success">Đã xác thực</Tag>;
    }
    if (statusLower === 'rejected' || statusLower === '2') {
      return <Tag color="error">Đã từ chối</Tag>;
    }
    return <Tag color="warning">Chờ xác thực</Tag>;
  };

  const handleApproveLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 1);
      if (response.success) {
        // Kiểm tra xem cả 2 giấy tờ đã được approve chưa để thông báo chính xác
        const license = driverLicenses.find(l => l.id === licenseId);
        if (license?.rentalOrderId) {
          const order = orders[license.rentalOrderId];
          if (order) {
            // Tìm citizen ID của order này
            const citizenId = citizenIds.find(c => c.rentalOrderId === license.rentalOrderId);
            if (citizenId && (citizenId.status === '1' || citizenId.status === 'Approved')) {
              message.success('Xác thực giấy phép lái xe thành công. Email thông báo đã được gửi đến khách hàng (cả 2 giấy tờ đã được xác nhận).');
            } else {
              message.success('Xác thực giấy phép lái xe thành công. Vui lòng xác nhận thêm căn cước công dân để gửi email thông báo đến khách hàng.');
            }
          } else {
            message.success('Xác thực giấy phép lái xe thành công.');
          }
        } else {
          message.success('Xác thực giấy phép lái xe thành công.');
        }
        loadDocuments();
        setLicenseModalVisible(false);
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
        loadDocuments();
        setLicenseModalVisible(false);
      } else {
        message.error(response.error || 'Không thể từ chối giấy phép lái xe');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 1);
      if (response.success) {
        // Kiểm tra xem cả 2 giấy tờ đã được approve chưa để thông báo chính xác
        const citizenId = citizenIds.find(c => c.id === citizenIdId);
        if (citizenId?.rentalOrderId) {
          const order = orders[citizenId.rentalOrderId];
          if (order) {
            // Tìm driver license của order này
            const license = driverLicenses.find(l => l.rentalOrderId === citizenId.rentalOrderId);
            if (license && (license.status === '1' || license.status === 'Approved')) {
              message.success('Xác thực căn cước công dân thành công. Email thông báo đã được gửi đến khách hàng (cả 2 giấy tờ đã được xác nhận).');
            } else {
              message.success('Xác thực căn cước công dân thành công. Vui lòng xác nhận thêm giấy phép lái xe để gửi email thông báo đến khách hàng.');
            }
          } else {
            message.success('Xác thực căn cước công dân thành công.');
          }
        } else {
          message.success('Xác thực căn cước công dân thành công.');
        }
        loadDocuments();
        setCitizenIdModalVisible(false);
      } else {
        message.error(response.error || 'Không thể xác thực căn cước công dân');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi xác thực');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 2);
      if (response.success) {
        message.success('Đã từ chối căn cước công dân');
        loadDocuments();
        setCitizenIdModalVisible(false);
      } else {
        message.error(response.error || 'Không thể từ chối căn cước công dân');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessingId(null);
    }
  };

  const openLicenseModal = (license: DriverLicenseData) => {
    setSelectedLicense(license);
    setLicenseModalVisible(true);
  };

  const openCitizenIdModal = (citizenId: CitizenIdData) => {
    setSelectedCitizenId(citizenId);
    setCitizenIdModalVisible(true);
  };

  // Get user info from rentalOrderId
  const getUserFromOrder = (rentalOrderId?: number | null): User | null => {
    if (!rentalOrderId) return null;
    const order = orders[rentalOrderId];
    if (!order) return null;
    return users[order.userId] || null;
  };

  // Driver License columns
  const licenseColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Họ tên (trên GPLX)',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Người upload',
      key: 'user',
      render: (_: any, record: DriverLicenseData) => {
        const user = getUserFromOrder(record.rentalOrderId);
        if (!user) return '-';
        return (
          <div>
            <div className="font-medium">{user.fullName || user.email}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        );
      },
    },
    {
      title: 'Mã đơn hàng',
      key: 'rentalOrderId',
      render: (_: any, record: DriverLicenseData) => 
        record.rentalOrderId ? `#${record.rentalOrderId}` : '-',
    },
    {
      title: 'Số bằng lái',
      dataIndex: 'licenseNumber',
      key: 'licenseNumber',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: DriverLicenseData) => getStatusTag(record.status || ''),
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      render: (_: any, record: DriverLicenseData) => 
        record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: DriverLicenseData) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => openLicenseModal(record)}
        >
          Xem
        </Button>
      ),
    },
  ];

  // Citizen ID columns
  const citizenIdColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Họ tên (trên CCCD)',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Người upload',
      key: 'user',
      render: (_: any, record: CitizenIdData) => {
        const user = getUserFromOrder(record.rentalOrderId);
        if (!user) return '-';
        return (
          <div>
            <div className="font-medium">{user.fullName || user.email}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        );
      },
    },
    {
      title: 'Mã đơn hàng',
      key: 'rentalOrderId',
      render: (_: any, record: CitizenIdData) => 
        record.rentalOrderId ? `#${record.rentalOrderId}` : '-',
    },
    {
      title: 'Số CCCD',
      dataIndex: 'citizenIdNumber',
      key: 'citizenIdNumber',
    },
    {
      title: 'Ngày sinh',
      key: 'birthDate',
      render: (_: any, record: CitizenIdData) => 
        record.birthDate ? dayjs(record.birthDate).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: CitizenIdData) => getStatusTag(record.status || ''),
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      render: (_: any, record: CitizenIdData) => 
        record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: CitizenIdData) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => openCitizenIdModal(record)}
        >
          Xem
        </Button>
      ),
    },
  ];

  // Filter pending documents
  const pendingLicenses = driverLicenses.filter(
    (l) => !l.status || l.status.toLowerCase() === 'pending' || l.status === '0'
  );
  const pendingCitizenIds = citizenIds.filter(
    (c) => !c.status || c.status.toLowerCase() === 'pending' || c.status === '0'
  );

  return (
    <div>
      <Card>
        <Title level={4}>Xác thực giấy tờ khách hàng</Title>
        <h2 className="text-lg text-gray-500">(Xác thực chỉ dành cho khách hàng thuê xe tự lái)</h2>
        <Tabs 
          defaultActiveKey="license"
          items={[
            {
              key: 'license',
              label: (
                <span>
                  <CarOutlined /> Giấy phép lái xe
                  {pendingLicenses.length > 0 && (
                    <Badge count={pendingLicenses.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <Table
                  loading={loading}
                  columns={licenseColumns}
                  dataSource={driverLicenses}
                  rowKey={(record) => record.id || Math.random()}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'citizenId',
              label: (
                <span>
                  <IdcardOutlined /> Căn cước công dân
                  {pendingCitizenIds.length > 0 && (
                    <Badge count={pendingCitizenIds.length} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <Table
                  loading={loading}
                  columns={citizenIdColumns}
                  dataSource={citizenIds}
                  rowKey={(record) => record.id || Math.random()}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Driver License Modal */}
      <Modal
        title={
          <Space>
            <CarOutlined /> Chi tiết giấy phép lái xe
            {selectedLicense && getStatusTag(selectedLicense.status || '')}
          </Space>
        }
        open={licenseModalVisible}
        onCancel={() => setLicenseModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLicense && (
          <div>
            <Descriptions column={2} bordered className="mb-4">
              <Descriptions.Item label="Họ tên (trên GPLX)">{selectedLicense.name}</Descriptions.Item>
              <Descriptions.Item label="Số bằng lái">{selectedLicense.licenseNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="ID Giấy phép">{selectedLicense.id}</Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                {selectedLicense.rentalOrderId ? (
                  <Tag color="blue">#{selectedLicense.rentalOrderId}</Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> Người upload</>}>
                {(() => {
                  const user = getUserFromOrder(selectedLicense.rentalOrderId);
                  if (!user) return '-';
                  return (
                    <div>
                      <div className="font-medium">{user.fullName || 'Chưa có tên'}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-600">{user.phone}</div>
                      )}
                    </div>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {getStatusTag(selectedLicense.status || '')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {selectedLicense.createdAt ? dayjs(selectedLicense.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Title level={5}>Mặt trước</Title>
                <Image
                  src={selectedLicense.imageUrl}
                  alt="Mặt trước GPLX"
                  width="100%"
                  style={{ maxHeight: 300, objectFit: 'contain' }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                />
              </div>
              <div>
                <Title level={5}>Mặt sau</Title>
                <Image
                  src={selectedLicense.imageUrl2}
                  alt="Mặt sau GPLX"
                  width="100%"
                  style={{ maxHeight: 300, objectFit: 'contain' }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                />
              </div>
            </div>

            {(selectedLicense.status?.toLowerCase() === 'pending' || selectedLicense.status === '0') && selectedLicense.id && (
              <Space size="large" className="w-full justify-end">
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => selectedLicense.id && handleRejectLicense(selectedLicense.id)}
                  loading={processingId === selectedLicense.id}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => selectedLicense.id && handleApproveLicense(selectedLicense.id)}
                  loading={processingId === selectedLicense.id}
                  className="bg-green-600"
                >
                  Xác thực
                </Button>
              </Space>
            )}
          </div>
        )}
      </Modal>

      {/* Citizen ID Modal */}
      <Modal
        title={
          <Space>
            <IdcardOutlined /> Chi tiết căn cước công dân
            {selectedCitizenId && getStatusTag(selectedCitizenId.status || '')}
          </Space>
        }
        open={citizenIdModalVisible}
        onCancel={() => setCitizenIdModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedCitizenId && (
          <div>
            <Descriptions column={2} bordered className="mb-4">
              <Descriptions.Item label="Họ tên (trên CCCD)">{selectedCitizenId.name}</Descriptions.Item>
              <Descriptions.Item label="Số CCCD">{selectedCitizenId.citizenIdNumber}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedCitizenId.birthDate ? dayjs(selectedCitizenId.birthDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="ID CCCD">{selectedCitizenId.id}</Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                {selectedCitizenId.rentalOrderId ? (
                  <Tag color="blue">#{selectedCitizenId.rentalOrderId}</Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> Người upload</>}>
                {(() => {
                  const user = getUserFromOrder(selectedCitizenId.rentalOrderId);
                  if (!user) return '-';
                  return (
                    <div>
                      <div className="font-medium">{user.fullName || 'Chưa có tên'}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-600">{user.phone}</div>
                      )}
                    </div>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {getStatusTag(selectedCitizenId.status || '')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {selectedCitizenId.createdAt ? dayjs(selectedCitizenId.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Title level={5}>Mặt trước</Title>
                <Image
                  src={selectedCitizenId.imageUrl}
                  alt="Mặt trước CCCD"
                  width="100%"
                  style={{ maxHeight: 300, objectFit: 'contain' }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                />
              </div>
              <div>
                <Title level={5}>Mặt sau</Title>
                <Image
                  src={selectedCitizenId.imageUrl2}
                  alt="Mặt sau CCCD"
                  width="100%"
                  style={{ maxHeight: 300, objectFit: 'contain' }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                />
              </div>
            </div>

            {(selectedCitizenId.status?.toLowerCase() === 'pending' || selectedCitizenId.status === '0') && selectedCitizenId.id && (
              <Space size="large" className="w-full justify-end">
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => selectedCitizenId.id && handleRejectCitizenId(selectedCitizenId.id)}
                  loading={processingId === selectedCitizenId.id}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => selectedCitizenId.id && handleApproveCitizenId(selectedCitizenId.id)}
                  loading={processingId === selectedCitizenId.id}
                  className="bg-green-600"
                >
                  Xác thực
                </Button>
              </Space>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
