"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Upload, message, Descriptions, Alert, Space, Tag, Table, Typography } from 'antd';
import { authApi, type User } from '@/services/api';
import SystemVerification from './SystemVerification';
import { 
  IdcardOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UploadOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title } = Typography;

interface CustomerInfo {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  idCardNumber: string;
  address: string;
  dateOfBirth: string;
  licenseExpiry: string;
}

interface DocumentVerificationProps {
  mode?: 'check-documents' | 'verify-system';
}

export default function DocumentVerification({ mode = 'check-documents' }: DocumentVerificationProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);

  // Mock data - trong thực tế sẽ gọi API
  const mockCustomerData: CustomerInfo = {
    id: 'KH-001',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'nguyenvana@email.com',
    licenseNumber: 'B1-123456789',
    idCardNumber: '123456789012',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    dateOfBirth: '1990-01-15',
    licenseExpiry: '2025-12-31'
  };

  // Tải danh sách khách hàng từ API sẵn có (userService)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Lấy từ auth API chuẩn
        const res = await authApi.getAllUsers();
        const users: any[] = Array.isArray((res as any)?.data) ? (res as any).data : [];
        if (!mounted) return;
        const mapped: CustomerInfo[] = users.map((u: any, idx: number) => ({
          id: String(u.userId ?? u.id ?? idx + 1),
          fullName: u.fullName || u.name || u.username || 'Chưa rõ',
          phone: u.phone || u.phoneNumber || '',
          email: u.email || u.mail || '',
          licenseNumber: '',
          idCardNumber: '',
          address: u.address || u.homeAddress || '',
          dateOfBirth: u.dateOfBirth || u.dob || '',
          licenseExpiry: '',
        }));
        setCustomers(mapped);
      } catch (e) {
        // fallback: dùng mock nếu API không sẵn
        setCustomers([mockCustomerData]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleDocumentUpload = (info: any) => {
    if (info.file.status === 'done') {
      message.success('Tải lên thành công');
    } else if (info.file.status === 'error') {
      message.error('Tải lên thất bại');
    }
  };

  const handleVerifyDocuments = () => {
    // Mock verification process
    setVerificationStatus('verified');
    message.success('Xác thực giấy tờ thành công');
  };

  const handleRejectDocuments = () => {
    setVerificationStatus('rejected');
    message.error('Giấy tờ không hợp lệ');
  };

  const filteredCustomers = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return customers;
    return customers.filter((c) =>
      [c.phone, c.fullName, c.email, c.idCardNumber].some((v) => (v || '').toLowerCase().includes(key))
    );
  }, [search, customers]);

  const customersColumns = [
    { title: 'Mã KH', dataIndex: 'id', key: 'id', width: 100 },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone', width: 160 },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_: any, record: CustomerInfo) => (
        <Button type="link" onClick={() => setCustomerInfo(record)}>Chọn</Button>
      ),
    },
  ];

  const renderCustomerInfo = () => (
    <Card title="👤 Thông tin khách hàng" className="mb-4">
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Mã khách hàng">{customerInfo?.id}</Descriptions.Item>
        <Descriptions.Item label="Họ tên">{customerInfo?.fullName}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{customerInfo?.phone}</Descriptions.Item>
        <Descriptions.Item label="Email">{customerInfo?.email}</Descriptions.Item>
        <Descriptions.Item label="Số CCCD">{customerInfo?.idCardNumber}</Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">{customerInfo?.dateOfBirth}</Descriptions.Item>
        <Descriptions.Item label="Số GPLX">{customerInfo?.licenseNumber}</Descriptions.Item>
        <Descriptions.Item label="Hạn GPLX">{customerInfo?.licenseExpiry}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>{customerInfo?.address}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const renderDocumentCheck = () => (
    <Card title="📄 Kiểm tra giấy tờ" className="mb-4">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* CCCD/CMND */}
        <Card size="small" title={<><IdcardOutlined /> CCCD/CMND</>}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert 
              message="Yêu cầu: CCCD/CMND còn hạn sử dụng, ảnh rõ nét, đầy đủ thông tin"
              type="info" 
              showIcon 
            />
            <Upload
              name="idCard"
              listType="picture-card"
              onChange={handleDocumentUpload}
              beforeUpload={() => false}
            >
              <div>
                <UploadOutlined />
                <div>Tải lên CCCD/CMND</div>
              </div>
            </Upload>
            <div>
              <Tag color="green">✅ Số CCCD: {customerInfo?.idCardNumber}</Tag>
              <Tag color="blue">📅 Còn hạn sử dụng</Tag>
            </div>
          </Space>
        </Card>

        {/* Giấy phép lái xe */}
        <Card size="small" title={<><CarOutlined /> Giấy phép lái xe</>}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert 
              message="Yêu cầu: GPLX còn hạn sử dụng, đúng hạng lái xe, ảnh rõ nét"
              type="info" 
              showIcon 
            />
            <Upload
              name="license"
              listType="picture-card"
              onChange={handleDocumentUpload}
              beforeUpload={() => false}
            >
              <div>
                <UploadOutlined />
                <div>Tải lên GPLX</div>
              </div>
            </Upload>
            <div>
              <Tag color="green">✅ Số GPLX: {customerInfo?.licenseNumber}</Tag>
              <Tag color="orange">📅 Hạn đến: {customerInfo?.licenseExpiry}</Tag>
              <Tag color="blue">🚗 Hạng B1</Tag>
            </div>
          </Space>
        </Card>

        {/* Ghi chú */}
        <Form.Item label="Ghi chú (nếu có)">
          <TextArea rows={3} placeholder="Ghi chú về giấy tờ, lưu ý đặc biệt..." />
        </Form.Item>

        {/* Nút xác thực */}
        <Space size="middle">
          <Button 
            type="primary" 
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleVerifyDocuments}
          >
            Xác thực thành công
          </Button>
          <Button 
            danger 
            size="large"
            icon={<CloseCircleOutlined />}
            onClick={handleRejectDocuments}
          >
            Từ chối giấy tờ
          </Button>
        </Space>
      </Space>
    </Card>
  );

  const renderVerificationResult = () => (
    <Card title="📋 Kết quả xác thực" className="mb-4">
      {verificationStatus === 'verified' ? (
        <Alert
          message="Xác thực thành công"
          description="Giấy tờ hợp lệ, khách hàng có thể tiến hành thuê xe."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
      ) : (
        <Alert
          message="Xác thực thất bại"
          description="Giấy tờ không hợp lệ, vui lòng kiểm tra lại."
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
        />
      )}
      
      <div className="mt-4">
        <Button type="primary" onClick={() => {
          setCustomerInfo(null);
          setVerificationStatus('pending');
          form.resetFields();
        }}>
          Xác thực khách hàng khác
        </Button>
      </div>
    </Card>
  );

  if (mode === 'verify-system') {
    return <SystemVerification customerInfo={customerInfo || undefined} />;
  }

  return (
    <div>
      <Card className="mb-4">
        <Title level={5} style={{ marginBottom: 12 }}>Danh sách khách hàng</Title>
        <Input.Search
          placeholder="Tìm theo số điện thoại"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 12 }}
        />
        <Table
          loading={loading}
          columns={customersColumns as any}
          dataSource={filteredCustomers}
          rowKey={(r) => r.id}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {customerInfo && (
        <>
          {renderCustomerInfo()}
          {renderDocumentCheck()}
          {verificationStatus !== 'pending' && renderVerificationResult()}
        </>
      )}
    </div>
  );
}
