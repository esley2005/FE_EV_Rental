"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
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
  WarningOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  UserOutlined,
  MailOutlined,
  IdcardOutlined,
  ReloadOutlined
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
  Image,
  Alert,
  notification as antdNotification
} from "antd";
import { rentalOrderApi, carsApi, rentalLocationApi, authApi, driverLicenseApi, citizenIdApi } from "@/services/api";
import type { RentalOrderData, RentalLocationData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";
import Link from "next/link";

// Extended interface với thông tin car và location
interface BookingWithDetails extends RentalOrderData {
  car?: Car;
  location?: RentalLocationData;
  user?: User;
  driverLicense?: DriverLicenseData;
  citizenIdDoc?: CitizenIdData;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUserAndBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [selectedStatus, searchText, bookings]);

  const loadUserAndBookings = async () => {
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

      // Load user profile
      const userResponse = await authApi.getProfile();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        await loadBookings(userResponse.data.id);
      } else {
        // Fallback: lấy từ localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          await loadBookings(userData.id);
        }
      }
    } catch (error) {
      console.error('Load user error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể tải thông tin người dùng!',
        placement: 'topRight',
      });
      setLoading(false);
    }
  };

  const loadBookings = async (userId: number) => {
    try {
      // Load orders
      const ordersResponse = await rentalOrderApi.getByUserId(userId);
      
      if (!ordersResponse.success || !ordersResponse.data) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const orders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      // Load all cars, locations, licenses, and citizen IDs for mapping
      const [carsResponse, locationsResponse, licensesResponse, citizenIdsResponse] = await Promise.all([
        carsApi.getAll(),
        rentalLocationApi.getAll(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll()
      ]);

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
        : [];
      
      // Xử lý nhiều format cho locations
      let locations: RentalLocationData[] = [];
      if (locationsResponse.success && locationsResponse.data) {
        const raw = locationsResponse.data as any;
        if (Array.isArray(raw)) {
          locations = raw;
        } else if (Array.isArray(raw.$values)) {
          locations = raw.$values;
        } else if (raw.data && Array.isArray(raw.data.$values)) {
          locations = raw.data.$values;
        } else if (raw.data && Array.isArray(raw.data)) {
          locations = raw.data;
        }
      }

      // Xử lý licenses
      const licenses: DriverLicenseData[] = licensesResponse.success && licensesResponse.data
        ? (Array.isArray(licensesResponse.data) ? licensesResponse.data : (licensesResponse.data as any)?.$values || [])
        : [];

      // Xử lý citizen IDs
      const citizenIds: CitizenIdData[] = citizenIdsResponse.success && citizenIdsResponse.data
        ? (Array.isArray(citizenIdsResponse.data) ? citizenIdsResponse.data : (citizenIdsResponse.data as any)?.$values || [])
        : [];

      // Map orders with car, location, license, and citizen ID info
      const bookingsWithDetails: BookingWithDetails[] = orders.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const location = locations.find((l) => l.id === order.rentalLocationId);
        const license = licenses.find((l) => l.rentalOrderId === order.id);
        const citizenIdDoc = citizenIds.find((c) => c.rentalOrderId === order.id);
        return {
          ...order,
          car,
          location,
          user,
          driverLicense: license,
          citizenIdDoc,
        };
      });

      // Sort by orderDate descending (newest first)
      bookingsWithDetails.sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime();
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setBookings(bookingsWithDetails);
    } catch (error) {
      console.error('Load bookings error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể tải danh sách đơn hàng!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter theo status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(b => {
        const status = normalizeStatus(b.status);
        return status === selectedStatus;
      });
    }

    // Filter theo search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(b => 
        String(b.id).toLowerCase().includes(searchLower) ||
        b.car?.name?.toLowerCase().includes(searchLower) ||
        b.car?.model?.toLowerCase().includes(searchLower) ||
        b.location?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(filtered);
  };

  const normalizeStatus = (status?: string): string => {
    if (!status) return 'pending';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending') || statusLower.includes('chờ')) return 'pending';
    if (statusLower.includes('confirmed') || statusLower.includes('xác nhận')) return 'confirmed';
    if (statusLower.includes('completed') || statusLower.includes('hoàn thành')) return 'completed';
    if (statusLower.includes('cancelled') || statusLower.includes('hủy')) return 'cancelled';
    return 'pending';
  };

  const getStatusTag = (status?: string) => {
    const normalized = normalizeStatus(status);
    const statusConfig: Record<string, { color: string; text: string; icon: any }> = {
      pending: { color: 'gold', text: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
      confirmed: { color: 'blue', text: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
      completed: { color: 'green', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: 'Đã hủy', icon: <CloseCircleOutlined /> }
    };

    const config = statusConfig[normalized] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getDocumentStatusTag = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'approved' || statusLower === '1') {
      return <Tag color="success">Đã xác thực</Tag>;
    }
    if (statusLower === 'rejected' || statusLower === '2') {
      return <Tag color="error">Đã từ chối</Tag>;
    }
    return <Tag color="warning">Chờ xác thực</Tag>;
  };

  const handleRefreshBooking = async () => {
    if (!selectedBooking || !user) return;
    try {
      setLoading(true);
      await loadBookings(user.id);
      // Reload selected booking
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id);
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
      }
      api.success({
        message: 'Đã làm mới thông tin',
        placement: 'topRight',
      });
    } catch (error) {
      console.error('Refresh booking error:', error);
    } finally {
      setLoading(false);
    }
  };

  const showBookingDetail = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm');
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('DD/MM/YYYY');
  };

  const calculateDays = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return end.diff(start, 'day') || 1; // Minimum 1 day
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Header chung */}
          <Header />
        <div className="max-w-6xl mx-auto px-4 pt-24 pb-8">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Đơn hàng của tôi</h1>
            <p className="text-gray-600 mt-1">Quản lý tất cả đơn thuê xe của bạn</p>
          </div>

          {/* Filters */}
          <Card className="mb-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Input
                placeholder="Tìm kiếm theo mã đơn, tên xe, địa điểm..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full md:w-1/2"
                size="large"
              />
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                className="md:w-44 shrink-0"
                size="large"
                suffixIcon={<FilterOutlined />}
              >
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value="pending">Chờ xác nhận</Select.Option>
                <Select.Option value="confirmed">Đã xác nhận</Select.Option>
                <Select.Option value="completed">Hoàn thành</Select.Option>
                <Select.Option value="cancelled">Đã hủy</Select.Option>
              </Select>
              <div className="ml-auto text-right">
                <span className="text-gray-600 whitespace-nowrap">
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
              {filteredBookings.map((booking) => {
                const totalDays = calculateDays(booking.pickupTime, booking.expectedReturnTime);
                const carImage = booking.car?.imageUrl || '/logo_ev.png';
                const carName = booking.car?.name || 'Không xác định';
                const carModel = booking.car?.model || '';
                const locationName = booking.location?.name || booking.location?.address || 'Không xác định';

                return (
                  <Card 
                    key={booking.id}
                    className="shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Car Image */}
                      <div className="md:w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={carImage}
                          alt={carName}
                          className="w-full h-full object-cover"
                          fallback="/logo_ev.png"
                          preview={false}
                        />
                      </div>

                      {/* Booking Info */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800">
                              {carName}
                            </h3>
                            <p className="text-gray-600 text-sm">{carModel}</p>
                            <p className="text-xs text-gray-500 mt-1">Mã đơn: #{booking.id}</p>
                          </div>
                          <div className="text-right">
                            {getStatusTag(booking.status)}
                          </div>
                        </div>

                        {/* Thông báo khi đơn hàng đã xác nhận */}
                        {normalizeStatus(booking.status) === 'confirmed' && (
                          <Alert
                            message="Đơn hàng đã được xác nhận"
                            description={
                              <div>
                                <p className="mb-2">
                                  Đơn hàng đã được xác nhận, bạn hãy đến vị trí thuê của bạn để tiến hành thanh toán và nhận xe.
                                </p>
                                <p className="mb-2">
                                  <strong>Địa điểm nhận xe:</strong> {locationName}
                                </p>
                                <p className="mb-2">
                                  <strong>Thời gian nhận xe:</strong> {formatDate(booking.pickupTime)}
                                </p>
                                <Link href="/guides/terms" className="text-blue-600 hover:text-blue-700 underline">
                                  Xem điều khoản cầm giấy tờ →
                                </Link>
                              </div>
                            }
                            type="success"
                            showIcon
                            className="mb-3"
                            icon={<InfoCircleOutlined />}
                          />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarOutlined className="text-blue-600" />
                            <div>
                              <div className="text-gray-500">Nhận xe</div>
                              <div className="font-medium">{formatDate(booking.pickupTime)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarOutlined className="text-red-600" />
                            <div>
                              <div className="text-gray-500">Trả xe</div>
                              <div className="font-medium">{formatDate(booking.expectedReturnTime)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarOutlined className="text-green-600" />
                            <div>
                              <div className="text-gray-500">Tổng tiền</div>
                              <div className="font-semibold text-lg text-green-600">
                                {formatCurrency(booking.total || booking.subTotal)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="text-sm text-gray-600 flex items-center gap-4 flex-wrap">
                            <span>
                              <InfoCircleOutlined /> Đặt ngày: {formatDateOnly(booking.orderDate || booking.createdAt)}
                            </span>
                            {booking.withDriver && (
                              <Tag color="blue">Có tài xế</Tag>
                            )}
                            <span>
                              <EnvironmentOutlined /> {locationName}
                            </span>
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Chi tiết đơn hàng #{selectedBooking?.id}</span>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefreshBooking}
              loading={loading}
              size="small"
            >
              Làm mới
            </Button>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={900}
      >
        {selectedBooking && (
          <div className="space-y-4">
            {/* Order Status & Basic Info */}
            <Card size="small" className="bg-blue-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Trạng thái đơn hàng:</span>
                {getStatusTag(selectedBooking.status)}
              </div>
            </Card>

            {/* Thông báo khi đơn hàng đã xác nhận trong modal */}
            {normalizeStatus(selectedBooking.status) === 'confirmed' && (
              <Alert
                message="Đơn hàng đã được xác nhận"
                description={
                  <div>
                    <p className="mb-2">
                      Đơn hàng đã được xác nhận, bạn hãy đến vị trí thuê của bạn để tiến hành thanh toán và nhận xe.
                    </p>
                    <p className="mb-2">
                      <strong>Địa điểm nhận xe:</strong> {selectedBooking.location?.name || selectedBooking.location?.address || 'Không xác định'}
                    </p>
                    <p className="mb-2">
                      <strong>Thời gian nhận xe:</strong> {formatDate(selectedBooking.pickupTime)}
                    </p>
                    <Link href="/guides/terms" className="text-blue-600 hover:text-blue-700 underline">
                      Xem điều khoản cầm giấy tờ →
                    </Link>
                  </div>
                }
                type="success"
                showIcon
                className="mb-4"
                icon={<InfoCircleOutlined />}
              />
            )}

            {/* Car Information */}
            <Card title={<><CarOutlined /> Thông tin xe</>} size="small">
              {selectedBooking.car ? (
                <div>
                  <div className="flex gap-4 mb-3">
                    <Image
                      src={selectedBooking.car.imageUrl}
                      alt={selectedBooking.car.name}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback="/logo_ev.png"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedBooking.car.name}</h3>
                      <p className="text-gray-600">{selectedBooking.car.model}</p>
                      <Descriptions column={2} size="small" className="mt-2">
                        <Descriptions.Item label="Số chỗ">{selectedBooking.car.seats}</Descriptions.Item>
                        <Descriptions.Item label="Loại pin">{selectedBooking.car.batteryType}</Descriptions.Item>
                        <Descriptions.Item label="Giá/ngày">{formatCurrency(selectedBooking.car.rentPricePerDay)}</Descriptions.Item>
                      </Descriptions>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Không có thông tin xe</div>
              )}
            </Card>

            {/* Customer Information */}
            <Card title={<><UserOutlined /> Thông tin khách hàng</>} size="small">
              {selectedBooking.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedBooking.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>{selectedBooking.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{selectedBooking.user.phone || selectedBooking.phoneNumber || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            {/* Document Status */}
            <Card title={<><IdcardOutlined /> Trạng thái giấy tờ</>} size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Giấy phép lái xe (GPLX)">
                  {selectedBooking.driverLicense ? (
                    <Space>
                      {getDocumentStatusTag(selectedBooking.driverLicense.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedBooking.driverLicense.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Căn cước công dân (CCCD)">
                  {selectedBooking.citizenIdDoc ? (
                    <Space>
                      {getDocumentStatusTag(selectedBooking.citizenIdDoc.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedBooking.citizenIdDoc.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Time and Location Info */}
            <Card title="Thông tin thời gian và địa điểm" size="small">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Mã đơn hàng">#{selectedBooking.id}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedBooking.phoneNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{formatDate(selectedBooking.orderDate || selectedBooking.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedBooking.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatDate(selectedBooking.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatDate(selectedBooking.expectedReturnTime)}</Descriptions.Item>
                {selectedBooking.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatDate(selectedBooking.actualReturnTime)}</Descriptions.Item>
                )}
                <Descriptions.Item label="Số ngày thuê">
                  {calculateDays(selectedBooking.pickupTime, selectedBooking.expectedReturnTime)} ngày
                </Descriptions.Item>
                <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm nhận xe</>} span={2}>
                  {selectedBooking.location?.name || selectedBooking.location?.address || 'Không xác định'}
                  {selectedBooking.location?.address && (
                    <div className="text-sm text-gray-600 mt-1">{selectedBooking.location.address}</div>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Payment Details */}
            <Card title={<><DollarOutlined /> Chi tiết thanh toán</>} size="small">
              <Descriptions column={2} size="small" bordered>
                {selectedBooking.subTotal && (
                  <Descriptions.Item label="Tổng phụ">
                    <span className="font-semibold">{formatCurrency(selectedBooking.subTotal)}</span>
                  </Descriptions.Item>
                )}
                {selectedBooking.deposit && (
                  <Descriptions.Item label="Tiền cọc">
                    <span className="font-semibold">{formatCurrency(selectedBooking.deposit)}</span>
                  </Descriptions.Item>
                )}
                {selectedBooking.discount && selectedBooking.discount > 0 && (
                  <Descriptions.Item label="Giảm giá">
                    <span className="text-red-600">- {formatCurrency(selectedBooking.discount)}</span>
                  </Descriptions.Item>
                )}
                {selectedBooking.extraFee && selectedBooking.extraFee > 0 && (
                  <Descriptions.Item label="Phí phát sinh">
                    <span className="text-orange-600">+ {formatCurrency(selectedBooking.extraFee)}</span>
                  </Descriptions.Item>
                )}
                {selectedBooking.damageFee && selectedBooking.damageFee > 0 && (
                  <Descriptions.Item label="Phí hư hỏng">
                    <span className="text-red-600">+ {formatCurrency(selectedBooking.damageFee)}</span>
                  </Descriptions.Item>
                )}
                {selectedBooking.total && (
                  <Descriptions.Item label="Tổng tiền">
                    <span className="font-semibold text-green-600 text-lg">
                      {formatCurrency(selectedBooking.total)}
                    </span>
                  </Descriptions.Item>
                )}
                {selectedBooking.damageNotes && (
                  <Descriptions.Item label="Ghi chú hư hỏng" span={2}>
                    <div className="text-red-600">{selectedBooking.damageNotes}</div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Order History Timeline */}
            <Card title="Lịch sử đơn hàng" size="small">
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: `Đặt hàng ngày ${formatDate(selectedBooking.orderDate || selectedBooking.createdAt)}`
                  },
                  {
                    color: normalizeStatus(selectedBooking.status) === 'cancelled' ? 'red' : 
                           normalizeStatus(selectedBooking.status) === 'completed' ? 'green' :
                           normalizeStatus(selectedBooking.status) === 'confirmed' ? 'blue' : 'orange',
                    children: normalizeStatus(selectedBooking.status) === 'cancelled' 
                      ? 'Đơn hàng đã bị hủy'
                      : normalizeStatus(selectedBooking.status) === 'confirmed'
                      ? 'Đơn hàng đã được xác nhận'
                      : normalizeStatus(selectedBooking.status) === 'completed'
                      ? 'Đơn hàng đã hoàn thành'
                      : 'Đang chờ xác nhận'
                  },
                  ...(selectedBooking.actualReturnTime ? [{
                    color: 'green',
                    children: `Đã trả xe ngày ${formatDate(selectedBooking.actualReturnTime)}`
                  }] : [])
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>
    </>
  );
}
