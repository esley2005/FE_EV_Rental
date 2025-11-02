"use client";

import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Alert, Descriptions, Modal, Form, Input, message } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  UserOutlined,
  CarOutlined
} from '@ant-design/icons';

interface BookingRecord {
  id: string;
  customerId: string;
  carId: string;
  carName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalDays: number;
  totalAmount: number;
  pickupLocation: string;
  createdAt: string;
}

interface SystemVerificationProps {
  customerInfo?: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
  };
}

export default function SystemVerification({ customerInfo }: SystemVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>([]);
  const [verificationResult, setVerificationResult] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [form] = Form.useForm();

  // Mock data - trong thực tế sẽ gọi API
  const mockBookingHistory: BookingRecord[] = [
    {
      id: 'BK-001',
      customerId: 'KH-001',
      carId: 'VF-003',
      carName: 'VinFast VF 3',
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      status: 'completed',
      totalDays: 2,
      totalAmount: 1000000,
      pickupLocation: 'HCM Center',
      createdAt: '2024-01-10T10:00:00Z'
    },
    {
      id: 'BK-002',
      customerId: 'KH-001',
      carId: 'VF-006',
      carName: 'VinFast VF 6',
      startDate: '2024-02-20',
      endDate: '2024-02-22',
      status: 'confirmed',
      totalDays: 2,
      totalAmount: 1400000,
      pickupLocation: 'HCM Center',
      createdAt: '2024-02-15T14:30:00Z'
    }
  ];

  const handleSearchHistory = async (values: { customerId: string }) => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (values.customerId === 'KH-001') {
        setBookingHistory(mockBookingHistory);
        message.success('Tìm thấy lịch sử thuê xe');
      } else {
        setBookingHistory([]);
        message.warning('Không tìm thấy lịch sử thuê xe');
      }
    } catch (error) {
      message.error('Lỗi khi tìm kiếm lịch sử');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySystem = () => {
    // Kiểm tra logic xác thực
    const hasGoodHistory = bookingHistory.every(booking => 
      booking.status === 'completed' && 
      new Date(booking.endDate) < new Date()
    );
    
    const hasRecentViolations = bookingHistory.some(booking => 
      booking.status === 'cancelled' && 
      new Date(booking.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (hasGoodHistory && !hasRecentViolations) {
      setVerificationResult('verified');
      message.success('Xác thực hệ thống thành công');
    } else {
      setVerificationResult('rejected');
      message.error('Khách hàng có lịch sử không tốt');
    }
  };

  const handleViewDetail = (record: BookingRecord) => {
    setSelectedBooking(record);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'confirmed': return 'blue';
      case 'pending': return 'orange';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'confirmed': return 'Đã xác nhận';
      case 'pending': return 'Chờ xác nhận';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const columns = [
    {
      title: 'Mã booking',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Xe thuê',
      dataIndex: 'carName',
      key: 'carName',
    },
    {
      title: 'Ngày thuê',
      dataIndex: 'startDate',
      key: 'startDate',
    },
    {
      title: 'Ngày trả',
      dataIndex: 'endDate',
      key: 'endDate',
    },
    {
      title: 'Số ngày',
      dataIndex: 'totalDays',
      key: 'totalDays',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: BookingRecord) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetail(record)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card title="🔍 Đối chiếu hồ sơ hệ thống" className="mb-4">
        <Form form={form} onFinish={handleSearchHistory} layout="inline">
          <Form.Item
            name="customerId"
            label="Mã khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập mã khách hàng' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nhập mã khách hàng" />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SearchOutlined />}
              loading={loading}
            >
              Tìm lịch sử
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {customerInfo && (
        <Card title="👤 Thông tin khách hàng" className="mb-4">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Mã khách hàng">{customerInfo.id}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{customerInfo.fullName}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{customerInfo.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{customerInfo.email}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {bookingHistory.length > 0 && (
        <Card title="📋 Lịch sử thuê xe" className="mb-4">
          <Table 
            columns={columns} 
            dataSource={bookingHistory} 
            rowKey="id"
            pagination={false}
            size="small"
          />
          
          <div className="mt-4">
            <Space>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={handleVerifySystem}
              >
                Xác thực hệ thống
              </Button>
              <Button 
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setVerificationResult('rejected')}
              >
                Từ chối
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {verificationResult !== 'pending' && (
        <Card title="📋 Kết quả xác thực hệ thống">
          {verificationResult === 'verified' ? (
            <Alert
              message="Xác thực thành công"
              description="Khách hàng có lịch sử thuê xe tốt, có thể tiến hành thuê xe."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          ) : (
            <Alert
              message="Xác thực thất bại"
              description="Khách hàng có lịch sử không tốt, cần kiểm tra thêm."
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          )}
        </Card>
      )}

      <Modal
        title="📄 Chi tiết booking"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedBooking && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Mã booking">{selectedBooking.id}</Descriptions.Item>
            <Descriptions.Item label="Mã khách hàng">{selectedBooking.customerId}</Descriptions.Item>
            <Descriptions.Item label="Xe thuê">{selectedBooking.carName}</Descriptions.Item>
            <Descriptions.Item label="Mã xe">{selectedBooking.carId}</Descriptions.Item>
            <Descriptions.Item label="Ngày thuê">{selectedBooking.startDate}</Descriptions.Item>
            <Descriptions.Item label="Ngày trả">{selectedBooking.endDate}</Descriptions.Item>
            <Descriptions.Item label="Số ngày">{selectedBooking.totalDays}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">{selectedBooking.totalAmount.toLocaleString()} VNĐ</Descriptions.Item>
            <Descriptions.Item label="Điểm thuê">{selectedBooking.pickupLocation}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getStatusColor(selectedBooking.status)}>
                {getStatusText(selectedBooking.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{new Date(selectedBooking.createdAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
