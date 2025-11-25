"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Form, Input, Button, Alert, Space, message, Select } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { authApi, rentalOrderApi } from "@/services/api";
import { authUtils } from "@/utils/auth";

// Danh sách các ngân hàng Việt Nam
const VIETNAM_BANKS = [
  "Vietcombank (Ngân hàng Ngoại thương Việt Nam)",
  "Vietinbank (Ngân hàng Công thương Việt Nam)",
  "BIDV (Ngân hàng Đầu tư và Phát triển Việt Nam)",
  "Agribank (Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam)",
  "Techcombank (Ngân hàng Kỹ thương Việt Nam)",
  "ACB (Ngân hàng Á Châu)",
  "VPBank (Ngân hàng Việt Nam Thịnh Vượng)",
  "TPBank (Ngân hàng Tiên Phong)",
  "MBBank (Ngân hàng Quân đội)",
  "VietABank (Ngân hàng Việt Á)",
  "HDBank (Ngân hàng Phát triển Thành phố Hồ Chí Minh)",
  "SHB (Ngân hàng Sài Gòn - Hà Nội)",
  "VIB (Ngân hàng Quốc tế Việt Nam)",
  "Eximbank (Ngân hàng Xuất Nhập khẩu Việt Nam)",
  "MSB (Ngân hàng Hàng Hải)",
  "OCB (Ngân hàng Phương Đông)",
  "SCB (Ngân hàng Sài Gòn)",
  "PGBank (Ngân hàng Xăng dầu Petrolimex)",
  "NamABank (Ngân hàng Nam Á)",
  "BacABank (Ngân hàng Bắc Á)",
  "SeABank (Ngân hàng Đông Nam Á)",
  "PVcomBank (Ngân hàng Đại Chúng Việt Nam)",
  "ABBank (Ngân hàng An Bình)",
  "VietBank (Ngân hàng Việt Nam Thương Tín)",
  "GPBank (Ngân hàng Dầu Khí Toàn Cầu)",
  "Kienlongbank (Ngân hàng Kiên Long)",
  "NCB (Ngân hàng Quốc Dân)",
  "OceanBank (Ngân hàng Đại Dương)",
  "PublicBank (Ngân hàng Đại Chúng)",
  "VCCB (Ngân hàng Bản Việt)",
  "LPBank (Ngân hàng Lào - Việt)",
  "VietCapitalBank (Ngân hàng Bản Việt)",
  "BAOVIET Bank (Ngân hàng Bảo Việt)",
  "DongABank (Ngân hàng Đông Á)",
  "Sacombank (Ngân hàng Sài Gòn Thương Tín)",
  "VietA Bank (Ngân hàng Việt Á)",
  "Indovina Bank (Ngân hàng Indovina)",
  "Woori Bank (Ngân hàng Woori Việt Nam)",
  "Shinhan Bank (Ngân hàng Shinhan Việt Nam)",
  "HSBC Vietnam (Ngân hàng HSBC Việt Nam)",
  "Standard Chartered (Ngân hàng Standard Chartered Việt Nam)",
  "ANZ Vietnam (Ngân hàng ANZ Việt Nam)",
  "Public Bank Vietnam (Ngân hàng Public Bank Việt Nam)",
  "Hong Leong Bank Vietnam (Ngân hàng Hong Leong Việt Nam)",
  "UOB Vietnam (Ngân hàng UOB Việt Nam)",
  "CIMB Bank Vietnam (Ngân hàng CIMB Việt Nam)",
];

export default function RefundBankingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Lấy orderId từ query params
    const orderIdParam = searchParams?.get('orderId');
    if (orderIdParam) {
      setOrderId(parseInt(orderIdParam, 10));
    }

    // Lấy thông tin user hiện tại
    const currentUser = authUtils.getCurrentUser();
    if (!currentUser) {
      message.error('Vui lòng đăng nhập để tiếp tục');
      router.push('/login');
      return;
    }
    setUser(currentUser);
  }, [searchParams, router]);

  const handleSubmit = async (values: {
    bankAccountName: string;
    bankNumber: string;
    bankName: string;
  }) => {
    if (!user || !orderId) {
      message.error('Thiếu thông tin người dùng hoặc đơn hàng');
      return;
    }

    try {
      setLoading(true);
      
      // Bước 1: Cập nhật thông tin ngân hàng
      const bankingResponse = await authApi.updateBankingInfo({
        userId: user.id || user.userId,
        bankAccountName: values.bankAccountName,
        bankNumber: values.bankNumber,
        bankName: values.bankName,
      });
      
      if (!bankingResponse.success) {
        const errorMsg = bankingResponse.error || bankingResponse.message || 'Không thể cập nhật thông tin ngân hàng';
        throw new Error(errorMsg);
      }

      // Bước 2: Sau khi cập nhật banking info thành công, hủy đơn hàng
      if (orderId) {
        const cancelResponse = await rentalOrderApi.cancelOrder(orderId);
        
        if (!cancelResponse.success) {
          const errorMsg = cancelResponse.error || cancelResponse.message || 'Không thể hủy đơn hàng';
          throw new Error(errorMsg);
        }
      }

      // Bước 3: Thành công - hiển thị thông báo và chuyển về trang my-bookings
      setSubmitted(true);
      message.success('Cập nhật thông tin ngân hàng và hủy đơn hàng thành công!');
      
      // Redirect về trang my-bookings sau 3 giây
      setTimeout(() => {
        router.push('/my-bookings');
      }, 3000);
    } catch (error: any) {
      console.error('Update banking info error:', error);
      const errorMessage = error?.message || error?.error || 'Có lỗi xảy ra khi cập nhật thông tin ngân hàng. Vui lòng thử lại.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center bg-gray-50 py-12">
          <Card className="w-full max-w-2xl mx-4">
            <div className="text-center">
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Hủy đơn và cập nhật thông tin ngân hàng thành công!
              </h2>
              <p className="text-gray-600 mb-6">
                Đơn hàng đã được hủy và thông tin ngân hàng đã được cập nhật thành công. Tiền sẽ được hoàn về tài khoản của bạn trong vòng 3-5 ngày làm việc.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Bạn sẽ được chuyển về trang đơn hàng của tôi trong giây lát...
              </p>
              <Button type="primary" onClick={() => router.push('/my-bookings')}>
                Quay về trang đơn hàng
              </Button>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            className="mb-6"
          >
            Quay lại
          </Button>

          <Card title={<h1 className="text-2xl font-bold">Nhập thông tin ngân hàng để hoàn tiền</h1>}>
            <Alert
              message="Thông tin quan trọng"
              description="Vui lòng nhập chính xác thông tin tài khoản ngân hàng. Tiền sẽ được hoàn về tài khoản này trong vòng 3-5 ngày làm việc."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            {orderId && (
              <Alert
                message={`Đơn hàng #${orderId}`}
                description="Vui lòng nhập thông tin ngân hàng để hoàn tiền. Sau khi điền xong, đơn hàng sẽ được hủy và tiền sẽ được hoàn về tài khoản của bạn."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                label="Tên chủ tài khoản"
                name="bankAccountName"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên chủ tài khoản' },
                  { min: 2, message: 'Tên chủ tài khoản phải có ít nhất 2 ký tự' }
                ]}
              >
                <Input placeholder="Nhập tên chủ tài khoản" size="large" />
              </Form.Item>

              <Form.Item
                label="Số tài khoản"
                name="bankNumber"
                rules={[
                  { required: true, message: 'Vui lòng nhập số tài khoản' },
                  { pattern: /^\d+$/, message: 'Số tài khoản chỉ được chứa số' },
                  { min: 8, message: 'Số tài khoản phải có ít nhất 8 số' }
                ]}
              >
                <Input placeholder="Nhập số tài khoản" size="large" />
              </Form.Item>

              <Form.Item
                label="Tên ngân hàng"
                name="bankName"
                rules={[
                  { required: true, message: 'Vui lòng chọn ngân hàng' }
                ]}
              >
                <Select
                  placeholder="Chọn ngân hàng"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={VIETNAM_BANKS.map(bank => ({
                    value: bank,
                    label: bank,
                  }))}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                  >
                    Xác nhận
                  </Button>
                  <Button
                    onClick={() => router.back()}
                    size="large"
                  >
                    Hủy
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

