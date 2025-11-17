"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  InputNumber,
  Form
} from "antd";
import { 
  CarOutlined, 
  UserOutlined, 
  IdcardOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  EditOutlined
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, driverLicenseApi, citizenIdApi, paymentApi } from "@/services/api";
import type { RentalOrderData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";

interface OrderWithDetails extends Omit<RentalOrderData, 'citizenId'> {
  car?: Car;
  user?: User;
  driverLicense?: DriverLicenseData;
  citizenIdDoc?: CitizenIdData;
  deposit?: number;
}

// Status enum mapping
const RentalOrderStatus = {
  Pending: 0,
  DocumentsSubmitted: 1,
  DepositPending: 2,
  Confirmed: 3,
  Renting: 4,
  Returned: 5,
  PaymentPending: 6,
  Cancelled: 7,
  Completed: 8,
} as const;

const statusLabels: Record<number, { text: string; color: string; icon: any }> = {
  0: { text: 'Chờ xác nhận', color: 'gold', icon: <ClockCircleOutlined /> },
  1: { text: 'Đã nộp giấy tờ', color: 'blue', icon: <IdcardOutlined /> },
  2: { text: 'Chờ tiền cọc', color: 'orange', icon: <DollarOutlined /> },
  3: { text: 'Đã xác nhận', color: 'cyan', icon: <CheckCircleOutlined /> },
  4: { text: 'Đang thuê', color: 'green', icon: <CarOutlined /> },
  5: { text: 'Đã trả xe', color: 'purple', icon: <CarOutlined /> },
  6: { text: 'Chờ thanh toán', color: 'orange', icon: <DollarOutlined /> },
  7: { text: 'Đã hủy', color: 'red', icon: <CloseCircleOutlined /> },
  8: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
};

export default function RentalOrderManagement() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updateTotalModalVisible, setUpdateTotalModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form] = Form.useForm();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể tải danh sách đơn hàng");
        setLoading(false);
        return;
      }

      const ordersData = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      const [carsResponse, usersResponse, licensesResponse, citizenIdsResponse] = await Promise.all([
        carsApi.getAll(),
        authApi.getAllUsers(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll()
      ]);

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
        : [];

      const users: User[] = usersResponse.success && usersResponse.data
        ? (Array.isArray(usersResponse.data) ? usersResponse.data : [])
        : [];

      const licenses: DriverLicenseData[] = licensesResponse.success && licensesResponse.data
        ? (Array.isArray(licensesResponse.data) ? licensesResponse.data : (licensesResponse.data as any)?.$values || [])
        : [];

      const citizenIds: CitizenIdData[] = citizenIdsResponse.success && citizenIdsResponse.data
        ? (Array.isArray(citizenIdsResponse.data) ? citizenIdsResponse.data : (citizenIdsResponse.data as any)?.$values || [])
        : [];

      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = cars.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        const license = licenses.find((l) => l.rentalOrderId === order.id);
        const citizenIdDoc = citizenIds.find((c) => c.rentalOrderId === order.id);

        return {
          ...order,
          car,
          user,
          driverLicense: license,
          citizenIdDoc,
        };
      });

      ordersWithDetails.sort((a, b) => {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime();
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Load orders error:", error);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const getStatusNumber = (status: string | undefined): number => {
    if (!status) return RentalOrderStatus.Pending;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending') && !statusLower.includes('deposit') && !statusLower.includes('payment')) return RentalOrderStatus.Pending;
    if (statusLower.includes('documentssubmitted') || statusLower.includes('đã nộp giấy tờ')) return RentalOrderStatus.DocumentsSubmitted;
    if (statusLower.includes('depositpending') || statusLower.includes('chờ tiền cọc')) return RentalOrderStatus.DepositPending;
    if (statusLower.includes('confirmed') || statusLower.includes('đã xác nhận')) return RentalOrderStatus.Confirmed;
    if (statusLower.includes('renting') || statusLower.includes('đang thuê')) return RentalOrderStatus.Renting;
    if (statusLower.includes('returned') || statusLower.includes('đã trả xe')) return RentalOrderStatus.Returned;
    if (statusLower.includes('paymentpending') || statusLower.includes('chờ thanh toán')) return RentalOrderStatus.PaymentPending;
    if (statusLower.includes('cancelled') || statusLower.includes('hủy')) return RentalOrderStatus.Cancelled;
    if (statusLower.includes('completed') || statusLower.includes('hoàn thành')) return RentalOrderStatus.Completed;
    return RentalOrderStatus.Pending;
  };

  const getOrderStatusTag = (order: OrderWithDetails) => {
    const statusNum = getStatusNumber(order.status);
    const config = statusLabels[statusNum] || statusLabels[RentalOrderStatus.Pending];
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
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

  // Xử lý cập nhật status
  const handleStatusChange = async (orderId: number, newStatus: number) => {
    try {
      setLoading(true);
      const response = await rentalOrderApi.updateStatus(orderId, newStatus);
      
      if (response.success) {
        message.success('Cập nhật trạng thái đơn hàng thành công!');
        await loadOrders();
      } else {
        message.error(response.error || 'Cập nhật trạng thái thất bại');
      }
    } catch (error) {
      console.error('Update status error:', error);
      message.error('Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận tiền cọc
  const handleConfirmDeposit = async (orderId: number) => {
    try {
      setLoading(true);
      const response = await paymentApi.confirmDepositPayment(orderId);
      
      if (response.success) {
        message.success('Xác nhận thanh toán đặt cọc thành công!');
        await loadOrders();
      } else {
        message.error(response.error || 'Xác nhận tiền cọc thất bại');
      }
    } catch (error) {
      console.error('Confirm deposit error:', error);
      message.error('Có lỗi xảy ra khi xác nhận tiền cọc');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật tổng tiền
  const handleUpdateTotal = async (values: { extraFee: number; damageFee: number; damageNotes?: string }) => {
    if (!selectedOrder) return;
    
    try {
      setLoading(true);
      const response = await rentalOrderApi.updateTotal(
        selectedOrder.id,
        values.extraFee || 0,
        values.damageFee || 0,
        values.damageNotes
      );
      
      if (response.success) {
        message.success('Cập nhật tổng tiền thành công!');
        setUpdateTotalModalVisible(false);
        form.resetFields();
        await loadOrders();
      } else {
        message.error(response.error || 'Cập nhật tổng tiền thất bại');
      }
    } catch (error) {
      console.error('Update total error:', error);
      message.error('Có lỗi xảy ra khi cập nhật tổng tiền');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận tổng tiền (tạo payment record)
  const handleConfirmTotal = async (orderId: number) => {
    try {
      setLoading(true);
      const response = await rentalOrderApi.confirmTotal(orderId);
      
      if (response.success) {
        message.success('Xác nhận tổng tiền thành công!');
        await loadOrders();
      } else {
        message.error(response.error || 'Xác nhận tổng tiền thất bại');
      }
    } catch (error) {
      console.error('Confirm total error:', error);
      message.error('Có lỗi xảy ra khi xác nhận tổng tiền');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận thanh toán
  const handleConfirmPayment = async (orderId: number) => {
    try {
      setLoading(true);
      const response = await rentalOrderApi.confirmPayment(orderId);
      
      if (response.success) {
        message.success('Xác nhận thanh toán thành công!');
        await loadOrders();
      } else {
        message.error(response.error || 'Xác nhận thanh toán thất bại');
      }
    } catch (error) {
      console.error('Confirm payment error:', error);
      message.error('Có lỗi xảy ra khi xác nhận thanh toán');
    } finally {
      setLoading(false);
    }
  };

  // Lấy các status có thể chuyển từ status hiện tại
  const getAvailableStatuses = (currentStatus: number): Array<{ value: number; label: string }> => {
    const available: Array<{ value: number; label: string }> = [];
    
    switch (currentStatus) {
      case RentalOrderStatus.Pending:
        available.push({ value: RentalOrderStatus.Cancelled, label: 'Hủy đơn' });
        break;
      case RentalOrderStatus.DocumentsSubmitted:
        available.push({ value: RentalOrderStatus.Cancelled, label: 'Hủy đơn' });
        break;
      case RentalOrderStatus.DepositPending:
        available.push({ value: RentalOrderStatus.Cancelled, label: 'Hủy đơn' });
        break;
      case RentalOrderStatus.Confirmed:
        available.push(
          { value: RentalOrderStatus.Renting, label: 'Bắt đầu thuê' },
          { value: RentalOrderStatus.Cancelled, label: 'Hủy đơn' }
        );
        break;
      case RentalOrderStatus.Renting:
        available.push({ value: RentalOrderStatus.Returned, label: 'Xác nhận trả xe' });
        break;
      case RentalOrderStatus.Returned:
        // Không thể chuyển status trực tiếp, phải cập nhật total
        break;
      case RentalOrderStatus.PaymentPending:
        available.push(
          { value: RentalOrderStatus.Completed, label: 'Hoàn thành' },
          { value: RentalOrderStatus.Cancelled, label: 'Hủy đơn' }
        );
        break;
    }
    
    return available;
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchText = search
        ? `${order.id} ${order.car?.name || ''} ${order.car?.model || ''} ${order.user?.fullName || ''} ${order.user?.email || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      
      const matchStatus = filterStatus === "all" 
        ? true 
        : getStatusNumber(order.status).toString() === filterStatus;
      return matchText && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Xe đã order",
      key: "car",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.car) return '-';
        return (
          <div className="flex items-center gap-2">
            <Image
              src={record.car.imageUrl}
              alt={record.car.name}
              width={40}
              height={30}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="/logo_ev.png"
              preview={false}
            />
            <div>
              <div className="font-medium text-sm">{record.car.name}</div>
              <div className="text-xs text-gray-500">{record.car.model}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Người dùng",
      key: "user",
      width: 180,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.user) return '-';
        return (
          <div>
            <div className="font-medium text-sm">{record.user.fullName || record.user.email}</div>
            <div className="text-xs text-gray-500">{record.user.email}</div>
          </div>
        );
      },
    },
    {
      title: "Giấy tờ",
      key: "documents",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        return (
          <Space direction="vertical" size="small">
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">GPLX:</span> {getDocumentStatusTag(record.driverLicense?.status)}
            </div>
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">CCCD:</span> {getDocumentStatusTag(record.citizenIdDoc?.status)}
            </div>
          </Space>
        );
      },
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatus",
      width: 250,
      render: (_: any, record: OrderWithDetails) => {
        const currentStatus = getStatusNumber(record.status);
        const availableStatuses = getAvailableStatuses(currentStatus);
        
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {getOrderStatusTag(record)}
            {availableStatuses.length > 0 && (
              <Select
                style={{ width: '100%' }}
                size="small"
                placeholder="Chọn hành động"
                options={availableStatuses}
                onChange={(value) => handleStatusChange(record.id, value)}
              />
            )}
            {currentStatus === RentalOrderStatus.DepositPending && (
              <Popconfirm
                title="Xác nhận thanh toán đặt cọc?"
                onConfirm={() => handleConfirmDeposit(record.id)}
                okText="Xác nhận"
                cancelText="Hủy"
              >
                <Button size="small" type="primary" block>
                  Xác nhận tiền cọc
                </Button>
              </Popconfirm>
            )}
            {currentStatus === RentalOrderStatus.Returned && (
              <Button 
                size="small" 
                type="primary" 
                block
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedOrder(record);
                  form.setFieldsValue({
                    extraFee: record.extraFee || 0,
                    damageFee: record.damageFee || 0,
                    damageNotes: record.damageNotes || '',
                  });
                  setUpdateTotalModalVisible(true);
                }}
              >
                Cập nhật tiền
              </Button>
            )}
            {currentStatus === RentalOrderStatus.PaymentPending && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Popconfirm
                  title="Xác nhận tổng tiền (tạo payment record)?"
                  onConfirm={() => handleConfirmTotal(record.id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button size="small" type="default" block>
                    Xác nhận tổng tiền
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Xác nhận thanh toán đã hoàn thành?"
                  onConfirm={() => handleConfirmPayment(record.id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button size="small" type="primary" block>
                    Xác nhận thanh toán
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </Space>
        );
      },
    },
    {
      title: "Ngày nhận",
      key: "pickupTime",
      width: 150,
      render: (_: any, record: OrderWithDetails) =>
        record.pickupTime ? dayjs(record.pickupTime).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: any, record: OrderWithDetails) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOrder(record);
            setDetailModalVisible(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Tìm theo mã đơn, tên xe, người dùng..."
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
            { value: "0", label: "Chờ xác nhận" },
            { value: "1", label: "Đã nộp giấy tờ" },
            { value: "2", label: "Chờ tiền cọc" },
            { value: "3", label: "Đã xác nhận" },
            { value: "4", label: "Đang thuê" },
            { value: "5", label: "Đã trả xe" },
            { value: "6", label: "Chờ thanh toán" },
            { value: "7", label: "Đã hủy" },
            { value: "8", label: "Hoàn thành" },
          ]}
        />
      </Space>

      <Table<OrderWithDetails>
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1400 }}
      />

      {/* Detail Modal */}
      {selectedOrder && (
        <Modal
          title={
            <Space>
              <CarOutlined /> Chi tiết đơn hàng #{selectedOrder.id}
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
                <span className="font-semibold">Trạng thái đơn hàng:</span>
                {getOrderStatusTag(selectedOrder)}
              </div>
            </Card>

            <Card title={<><CarOutlined /> Thông tin xe</>} size="small">
              {selectedOrder.car ? (
                <div>
                  <div className="flex gap-4 mb-3">
                    <Image
                      src={selectedOrder.car.imageUrl}
                      alt={selectedOrder.car.name}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback="/logo_ev.png"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedOrder.car.name}</h3>
                      <p className="text-gray-600">{selectedOrder.car.model}</p>
                      <Descriptions column={2} size="small" className="mt-2">
                        <Descriptions.Item label="Số chỗ">{selectedOrder.car.seats}</Descriptions.Item>
                        <Descriptions.Item label="Loại pin">{selectedOrder.car.batteryType}</Descriptions.Item>
                        <Descriptions.Item label="Giá/ngày">{selectedOrder.car.rentPricePerDay?.toLocaleString('vi-VN')} VNĐ</Descriptions.Item>
                      </Descriptions>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Không có thông tin xe</div>
              )}
            </Card>

            <Card title={<><UserOutlined /> Thông tin người dùng</>} size="small">
              {selectedOrder.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedOrder.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>{selectedOrder.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{selectedOrder.user.phone || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            <Card title={<><IdcardOutlined /> Trạng thái giấy tờ</>} size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Giấy phép lái xe (GPLX)">
                  {selectedOrder.driverLicense ? (
                    <Space>
                      {getDocumentStatusTag(selectedOrder.driverLicense.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedOrder.driverLicense.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Căn cước công dân (CCCD)">
                  {selectedOrder.citizenIdDoc ? (
                    <Space>
                      {getDocumentStatusTag(selectedOrder.citizenIdDoc.status)}
                      <span className="text-sm text-gray-600">
                        ({selectedOrder.citizenIdDoc.name})
                      </span>
                    </Space>
                  ) : (
                    <Tag color="default">Chưa upload</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Chi tiết đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedOrder.phoneNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{dayjs(selectedOrder.orderDate || selectedOrder.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedOrder.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{dayjs(selectedOrder.pickupTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{dayjs(selectedOrder.expectedReturnTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{dayjs(selectedOrder.actualReturnTime).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                )}
                {selectedOrder.subTotal && (
                  <Descriptions.Item label="Tổng phụ">
                    <span className="font-semibold">
                      {selectedOrder.subTotal.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.deposit && (
                  <Descriptions.Item label="Tiền cọc">
                    <span className="font-semibold">
                      {selectedOrder.deposit.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.extraFee && (
                  <Descriptions.Item label="Phí phát sinh">
                    {selectedOrder.extraFee.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
                {selectedOrder.damageFee && (
                  <Descriptions.Item label="Phí hư hỏng">
                    {selectedOrder.damageFee.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
                {selectedOrder.total && (
                  <Descriptions.Item label="Tổng tiền">
                    <span className="font-semibold text-green-600">
                      {selectedOrder.total.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </Descriptions.Item>
                )}
                {selectedOrder.damageNotes && (
                  <Descriptions.Item label="Ghi chú hư hỏng" span={2}>
                    {selectedOrder.damageNotes}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        </Modal>
      )}

      {/* Update Total Modal */}
      <Modal
        title="Cập nhật tổng tiền đơn hàng"
        open={updateTotalModalVisible}
        onCancel={() => {
          setUpdateTotalModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateTotal}
        >
          <Form.Item
            label="Phí phát sinh (VNĐ)"
            name="extraFee"
            rules={[{ required: true, message: 'Vui lòng nhập phí phát sinh' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              // @ts-ignore
              parser={(value) => {
                if (!value) return 0;
                const parsed = value.replace(/\$\s?|(,*)/g, '');
                return Number(parsed) || 0;
              }}
            />
          </Form.Item>
          <Form.Item
            label="Phí hư hỏng (VNĐ)"
            name="damageFee"
            rules={[{ required: true, message: 'Vui lòng nhập phí hư hỏng' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              // @ts-ignore
              parser={(value) => {
                if (!value) return 0;
                const parsed = value.replace(/\$\s?|(,*)/g, '');
                return Number(parsed) || 0;
              }}
            />
          </Form.Item>
          <Form.Item
            label="Ghi chú hư hỏng"
            name="damageNotes"
          >
            <Input.TextArea rows={4} placeholder="Nhập ghi chú về hư hỏng (nếu có)" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Cập nhật
              </Button>
              <Button onClick={() => {
                setUpdateTotalModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

