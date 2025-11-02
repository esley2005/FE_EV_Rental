"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingOutlined,
  CalendarOutlined,
  CarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { 
  Card, 
  Tag, 
  Button, 
  Empty,
  Input,
  Select,
  Space,
  Descriptions,
  Modal,
  Timeline,
  notification as antdNotification
} from "antd";

// Interface cho đơn hàng
interface Booking {
  id: string;
  carName: string;
  carImage: string;
  carModel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  pickupLocation: string;
  returnLocation: string;
  bookingDate: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  notes?: string;
}

// Mock data mẫu (sẽ thay bằng API call sau)
const mockBookings: Booking[] = [
  {
    id: "BK001",
    carName: "VinFast VF 8",
    carImage: "/xe_vf6.png",
    carModel: "VF 8 Plus",
    startDate: "2024-11-01",
    endDate: "2024-11-05",
    totalDays: 4,
    totalPrice: 4800000,
    status: "confirmed",
    pickupLocation: "Sân bay Tân Sơn Nhất",
    returnLocation: "Sân bay Tân Sơn Nhất",
    bookingDate: "2024-10-20",
    paymentStatus: "paid"
  },
  {
    id: "BK002",
    carName: "Tesla Model 3",
    carImage: "/Xe_TeslaMD3.png",
    carModel: "Model 3 Standard Range",
    startDate: "2024-10-15",
    endDate: "2024-10-17",
    totalDays: 2,
    totalPrice: 2600000,
    status: "completed",
    pickupLocation: "Quận 1, TP.HCM",
    returnLocation: "Quận 1, TP.HCM",
    bookingDate: "2024-10-10",
    paymentStatus: "paid"
  },
  {
    id: "BK003",
    carName: "VinFast VF 3",
    carImage: "/xe_vf3.png",
    carModel: "VF 3 Standard",
    startDate: "2024-11-15",
    endDate: "2024-11-20",
    totalDays: 5,
    totalPrice: 3500000,
    status: "pending",
    pickupLocation: "Quận 7, TP.HCM",
    returnLocation: "Quận 7, TP.HCM",
    bookingDate: "2024-10-25",
    paymentStatus: "unpaid"
  },
  {
    id: "BK004",
    carName: "BYD Atto 3",
    carImage: "/xe_byd.png",
    carModel: "Atto 3 Extended Range",
    startDate: "2024-09-10",
    endDate: "2024-09-12",
    totalDays: 2,
    totalPrice: 2200000,
    status: "cancelled",
    pickupLocation: "Quận 3, TP.HCM",
    returnLocation: "Quận 3, TP.HCM",
    bookingDate: "2024-09-05",
    paymentStatus: "refunded",
    notes: "Khách hàng hủy do thay đổi lịch trình"
  }
];

export default function MyBookingsPage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [selectedStatus, searchText, bookings]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Kiểm tra đăng nhập
      const token = localStorage.getItem('token');
      if (!token) {
        api.warning({
          message: 'Chưa đăng nhập',
          description: 'Vui lòng đăng nhập để xem đơn hàng!',
          placement: 'topRight',
          icon: <WarningOutlined style={{ color: '#faad14' }} />,
        });
        router.push('/login');
        return;
      }

      // TODO: Thay bằng API call thực tế
      // const response = await bookingsApi.getMyBookings();
      // setBookings(response.data);
      
      // Mock data tạm thời
      setTimeout(() => {
        setBookings(mockBookings);
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Load bookings error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể tải danh sách đơn hàng!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter theo status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Filter theo search text
    if (searchText) {
      filtered = filtered.filter(b => 
        b.id.toLowerCase().includes(searchText.toLowerCase()) ||
        b.carName.toLowerCase().includes(searchText.toLowerCase()) ||
        b.carModel.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string; icon: any }> = {
      pending: { color: 'gold', text: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
      confirmed: { color: 'blue', text: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
      completed: { color: 'green', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: 'Đã hủy', icon: <CloseCircleOutlined /> }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getPaymentTag = (status: string) => {
    const paymentConfig: Record<string, { color: string; text: string }> = {
      paid: { color: 'success', text: 'Đã thanh toán' },
      unpaid: { color: 'warning', text: 'Chưa thanh toán' },
      refunded: { color: 'default', text: 'Đã hoàn tiền' }
    };

    const config = paymentConfig[status] || paymentConfig.unpaid;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const showBookingDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button 
              type="link" 
              onClick={() => router.back()}
              className="mb-2"
            >
              ← Quay lại
            </Button>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingOutlined /> Đơn hàng của tôi
            </h1>
            <p className="text-gray-600 mt-1">Quản lý tất cả đơn thuê xe của bạn</p>
          </div>

          {/* Filters */}
          <Card className="mb-6 shadow-md">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Tìm kiếm theo mã đơn, tên xe..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="md:w-64"
                size="large"
              />
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                className="md:w-48"
                size="large"
                suffixIcon={<FilterOutlined />}
              >
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value="pending">Chờ xác nhận</Select.Option>
                <Select.Option value="confirmed">Đã xác nhận</Select.Option>
                <Select.Option value="completed">Hoàn thành</Select.Option>
                <Select.Option value="cancelled">Đã hủy</Select.Option>
              </Select>
              <div className="flex-1 text-right">
                <span className="text-gray-600">
                  Tìm thấy <strong>{filteredBookings.length}</strong> đơn hàng
                </span>
              </div>
            </div>
          </Card>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <Card className="shadow-md">
              <Empty
                description={
                  <span className="text-gray-500">
                    {searchText || selectedStatus !== "all" 
                      ? "Không tìm thấy đơn hàng phù hợp" 
                      : "Bạn chưa có đơn hàng nào"}
                  </span>
                }
              >
                {!searchText && selectedStatus === "all" && (
                  <Button type="primary" onClick={() => router.push('/')} className="bg-blue-600">
                    Thuê xe ngay
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card 
                  key={booking.id}
                  className="shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Car Image */}
                    <div className="md:w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={booking.carImage} 
                        alt={booking.carName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo_ev.png';
                        }}
                      />
                    </div>

                    {/* Booking Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">
                            {booking.carName}
                          </h3>
                          <p className="text-gray-600 text-sm">{booking.carModel}</p>
                          <p className="text-xs text-gray-500 mt-1">Mã đơn: {booking.id}</p>
                        </div>
                        <div className="text-right">
                          {getStatusTag(booking.status)}
                          <div className="mt-1">{getPaymentTag(booking.paymentStatus)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarOutlined className="text-blue-600" />
                          <div>
                            <div className="text-gray-500">Nhận xe</div>
                            <div className="font-medium">{formatDate(booking.startDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarOutlined className="text-red-600" />
                          <div>
                            <div className="text-gray-500">Trả xe</div>
                            <div className="font-medium">{formatDate(booking.endDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarOutlined className="text-green-600" />
                          <div>
                            <div className="text-gray-500">Tổng tiền</div>
                            <div className="font-semibold text-lg text-green-600">
                              {formatCurrency(booking.totalPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-sm text-gray-600">
                          <InfoCircleOutlined /> Đặt ngày: {formatDate(booking.bookingDate)}
                        </div>
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => showBookingDetail(booking)}
                          className="bg-blue-600"
                        >
                          Xem chi tiết
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={<span className="text-xl font-semibold">Chi tiết đơn hàng</span>}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedBooking && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Mã đơn hàng:</span>
                  <span className="ml-2 font-semibold text-lg">{selectedBooking.id}</span>
                </div>
                {getStatusTag(selectedBooking.status)}
              </div>
            </div>

            <Descriptions bordered column={1}>
              <Descriptions.Item label={<><CarOutlined /> Xe thuê</>}>
                <div className="font-medium">{selectedBooking.carName}</div>
                <div className="text-sm text-gray-600">{selectedBooking.carModel}</div>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày nhận xe">
                {formatDate(selectedBooking.startDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày trả xe">
                {formatDate(selectedBooking.endDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Số ngày thuê">
                {selectedBooking.totalDays} ngày
              </Descriptions.Item>
              <Descriptions.Item label="Địa điểm nhận xe">
                {selectedBooking.pickupLocation}
              </Descriptions.Item>
              <Descriptions.Item label="Địa điểm trả xe">
                {selectedBooking.returnLocation}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái thanh toán">
                {getPaymentTag(selectedBooking.paymentStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(selectedBooking.totalPrice)}
                </span>
              </Descriptions.Item>
              {selectedBooking.notes && (
                <Descriptions.Item label="Ghi chú">
                  {selectedBooking.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Lịch sử đơn hàng</h4>
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: `Đặt hàng ngày ${formatDate(selectedBooking.bookingDate)}`
                  },
                  {
                    color: selectedBooking.status === 'cancelled' ? 'red' : 'blue',
                    children: selectedBooking.status === 'cancelled' 
                      ? 'Đơn hàng đã bị hủy'
                      : selectedBooking.status === 'confirmed'
                      ? 'Đơn hàng đã được xác nhận'
                      : selectedBooking.status === 'completed'
                      ? 'Đơn hàng đã hoàn thành'
                      : 'Đang chờ xác nhận'
                  }
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

