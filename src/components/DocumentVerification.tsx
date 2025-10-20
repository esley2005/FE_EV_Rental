"use client";

import React, { useState } from 'react';
import { Card, Form, Input, Button, Upload, message, Steps, Descriptions, Alert, Space, Tag } from 'antd';
import SystemVerification from './SystemVerification';
import { 
  IdcardOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UploadOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Step } = Steps;
const { TextArea } = Input;

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
  const [currentStep, setCurrentStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [form] = Form.useForm();

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

  const handleSearchCustomer = (values: { phone: string; idCard: string }) => {
    // Mock search - trong thực tế sẽ gọi API
    if (values.phone === '0901234567' || values.idCard === '123456789012') {
      setCustomerInfo(mockCustomerData);
      setCurrentStep(1);
      message.success('Tìm thấy thông tin khách hàng');
    } else {
      message.error('Không tìm thấy thông tin khách hàng');
    }
  };

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
    setCurrentStep(2);
    message.success('Xác thực giấy tờ thành công');
  };

  const handleRejectDocuments = () => {
    setVerificationStatus('rejected');
    setCurrentStep(2);
    message.error('Giấy tờ không hợp lệ');
  };

  const renderSearchStep = () => (
    <Card title="🔍 Tìm kiếm khách hàng" className="mb-4">
      <Form form={form} onFinish={handleSearchCustomer} layout="vertical">
        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
        >
          <Input prefix="📱" placeholder="Nhập số điện thoại" />
        </Form.Item>
        
        <Form.Item
          name="idCard"
          label="Số CCCD/CMND"
          rules={[{ required: true, message: 'Vui lòng nhập số CCCD/CMND' }]}
        >
          <Input prefix="🆔" placeholder="Nhập số CCCD/CMND" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} block>
            Tìm kiếm khách hàng
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

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
          setCurrentStep(0);
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
      <Steps current={currentStep} className="mb-6">
        <Step title="Tìm kiếm" description="Tìm thông tin khách hàng" />
        <Step title="Kiểm tra" description="Xác thực giấy tờ" />
        <Step title="Kết quả" description="Hoàn thành xác thực" />
      </Steps>

      {currentStep === 0 && renderSearchStep()}
      {currentStep === 1 && (
        <>
          {renderCustomerInfo()}
          {renderDocumentCheck()}
        </>
      )}
      {currentStep === 2 && renderVerificationResult()}
    </div>
  );
}
