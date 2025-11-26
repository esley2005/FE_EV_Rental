"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Image,
  Input,
  Spin,
  Empty,
  Tabs,
  Button,
} from "antd";
import {
  CarOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { carsApi, rentalOrderApi, authApi, rentalLocationApi, paymentApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalOrderData, RentalLocationData, PaymentData } from "@/services/api";
import dayjs from "dayjs";
import { MapPin } from "lucide-react";

// Status enum mapping - giống như trong RentalOrderManagement
const RentalOrderStatus = {
  Pending: 0,
  OrderDepositConfirmed: 1,
  CheckedIn: 2,
  Renting: 3,
  Returned: 4,
  PaymentPending: 5,
  RefundDepositCar: 6,
  Cancelled: 7,
  RefundDepositOrder: 8,
  Completed: 9,
} as const;

// Helper function để convert status string sang number - giống như trong RentalOrderManagement
const getStatusNumber = (status: string | number | undefined): number => {
  if (typeof status === 'number') return status;
  if (!status) return RentalOrderStatus.Pending;
  const statusLower = String(status).toLowerCase();
  if (statusLower.includes('pending') && !statusLower.includes('deposit') && !statusLower.includes('payment')) return RentalOrderStatus.Pending;
  if (statusLower.includes('orderdepositconfirmed') || statusLower.includes('đã xác nhận cọc đơn')) return RentalOrderStatus.OrderDepositConfirmed;
  if (statusLower.includes('checkedin') || statusLower.includes('đã check-in') || statusLower.includes('check-in')) return RentalOrderStatus.CheckedIn;
  if (statusLower.includes('renting') || statusLower.includes('đang thuê')) return RentalOrderStatus.Renting;
  if (statusLower.includes('returned') || statusLower.includes('đã trả xe')) return RentalOrderStatus.Returned;
  if (statusLower.includes('paymentpending') || statusLower.includes('chờ thanh toán')) return RentalOrderStatus.PaymentPending;
  if (statusLower.includes('refunddepositcar') || statusLower.includes('hoàn tiền cọc xe')) return RentalOrderStatus.RefundDepositCar;
  if (statusLower.includes('cancelled') || statusLower.includes('hủy')) return RentalOrderStatus.Cancelled;
  if (statusLower.includes('refunddepositorder') || statusLower.includes('hoàn tiền cọc đơn')) return RentalOrderStatus.RefundDepositOrder;
  if (statusLower.includes('completed') || statusLower.includes('hoàn thành')) return RentalOrderStatus.Completed;
  return RentalOrderStatus.Pending;
};

interface CarWithStatus extends Car {
  status: "available" | "booked" | "renting" | "maintenance";
  originalStatus?: number; // Lưu car.status gốc từ database
  currentOrder?: RentalOrderData & {
    user?: { fullName?: string; email?: string; phone?: string };
  };
}

export default function CarStatusManagement() {
  const [cars, setCars] = useState<CarWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load rental locations
      const locationsRes = await rentalLocationApi.getAll();
      if (locationsRes.success && locationsRes.data) {
        const locationsData = Array.isArray(locationsRes.data)
          ? locationsRes.data
          : (locationsRes.data as any)?.$values || [];
        setRentalLocations(locationsData.filter((loc: RentalLocationData) => loc.isActive !== false));
      }

      // Load tất cả xe
      const carsRes = await carsApi.getAll();
      if (!carsRes.success || !carsRes.data) {
        setCars([]);
        return;
      }

      const carsList = Array.isArray(carsRes.data)
        ? carsRes.data
        : (carsRes.data as any)?.$values || [];

      // Load tất cả đơn hàng
      const ordersRes = await rentalOrderApi.getAll();
      const orders = ordersRes.success && ordersRes.data
        ? (Array.isArray(ordersRes.data)
            ? ordersRes.data
            : (ordersRes.data as any)?.$values || [])
        : [];

      // Load thông tin user cho các đơn hàng
      const usersRes = await authApi.getAllUsers();
      const users = usersRes.success && usersRes.data
        ? (Array.isArray(usersRes.data) 
            ? usersRes.data 
            : (usersRes.data as any)?.$values || [])
        : [];
      
      // Debug: Log để kiểm tra dữ liệu users
      console.log('[CarStatusManagement] Loaded users:', {
        count: users.length,
        sample: users.slice(0, 3).map((u: any) => ({ id: u.id, userId: u.userId, email: u.email, fullName: u.fullName }))
      });
      
      // Tạo userMap với cả id và userId để đảm bảo tìm được user
      const userMap = new Map();
      users.forEach((u: any) => {
        const userId = u.id || u.userId;
        if (userId) {
          userMap.set(userId, u);
          // Nếu có cả id và userId khác nhau, map cả hai
          if (u.id && u.userId && u.id !== u.userId) {
            userMap.set(u.userId, u);
          }
        }
      });

      // Load tất cả payments
      const paymentsRes = await paymentApi.getAll();
      const paymentsList = paymentsRes.success && paymentsRes.data
        ? (Array.isArray(paymentsRes.data)
            ? paymentsRes.data
            : (paymentsRes.data as any)?.$values || [])
        : [];
      setPayments(paymentsList);

      // Load car rental locations cho tất cả xe
      // Car đã có rentalLocationId, không cần gọi carRentalLocationApi nữa
      const carsWithLocations = await Promise.all(
        carsList
          .filter((car: Car) => !car.isDeleted)
          .map(async (car: Car) => {
            // Sử dụng rentalLocationId từ Car object
            if (car.rentalLocationId) {
              try {
                const locationResponse = await rentalLocationApi.getById(car.rentalLocationId);
                if (locationResponse.success && locationResponse.data) {
                  return {
                    ...car,
                    currentLocation: locationResponse.data
                  };
                }
              } catch (error) {
                // Location không tồn tại hoặc lỗi
              }
            }
            return car;
          })
      );

      // Xác định trạng thái của từng xe dựa trên đơn hàng
      const carsWithStatus: CarWithStatus[] = carsWithLocations
        .map((car: Car) => {
          // Tìm đơn hàng liên quan đến xe này
          const relatedOrders = orders.filter(
            (order: RentalOrderData) => order.carId === car.id
          );

          // Xác định trạng thái từ car.isActive (false = Disabled, true = Available)
          // Handle both boolean and number/string formats for backward compatibility
          const isActive = typeof car.isActive === "boolean" 
            ? car.isActive 
            : (car.isActive === 1 || car.isActive === "1" || String(car.isActive).toLowerCase() === "true");
          
          // Nếu xe bị disabled (isActive = false), đánh dấu là maintenance/disabled
          let status: "available" | "booked" | "renting" | "maintenance" = !isActive ? "maintenance" : "available";
          let currentOrder: (RentalOrderData & { user?: any }) | undefined;

          // Chỉ kiểm tra đơn hàng nếu xe không bị disabled
          if (isActive) {
            // Debug: Log tất cả orders liên quan đến xe này
            if (relatedOrders.length > 0) {
              console.log(`[CarStatusManagement] Car ${car.id} has ${relatedOrders.length} related orders:`, 
                relatedOrders.map((o: RentalOrderData) => ({
                  orderId: o.id,
                  userId: o.userId,
                  status: o.status,
                  statusNum: getStatusNumber(o.status)
                }))
              );
            }
            
            // Ưu tiên 1: Kiểm tra đơn hàng đang thuê (status = 3: Renting)
            const rentingOrder = relatedOrders.find(
              (order: RentalOrderData) => {
                const statusNum = getStatusNumber(order.status);
                return statusNum === RentalOrderStatus.Renting; // Renting = 3
              }
            );

            if (rentingOrder) {
              status = "renting";
              const user = userMap.get(rentingOrder.userId);
              
              // Debug: Log để kiểm tra user không tìm thấy
              if (!user && rentingOrder.userId) {
                console.warn(`[CarStatusManagement] Car ${car.id}: User not found for order ${rentingOrder.id}, userId: ${rentingOrder.userId}`, {
                  availableUserIds: Array.from(userMap.keys()),
                  orderUserId: rentingOrder.userId,
                  orderStatus: rentingOrder.status
                });
              }
              
              currentOrder = {
                ...rentingOrder,
                user: user
                  ? {
                      fullName: user.fullName || user.name || user.FullName,
                      email: user.email || user.Email,
                      phone: user.phone || user.phoneNumber || user.PhoneNumber,
                    }
                  : undefined,
              };
            } else {
              // Ưu tiên 2: Kiểm tra OrderDepositConfirmed (1) - đã xác nhận cọc đơn, sẵn sàng thuê
              const orderDepositConfirmedOrder = relatedOrders.find(
                (order: RentalOrderData) => {
                  const statusNum = getStatusNumber(order.status);
                  return statusNum === RentalOrderStatus.OrderDepositConfirmed; // OrderDepositConfirmed = 1
                }
              );

              if (orderDepositConfirmedOrder) {
                status = "booked";
                const user = userMap.get(orderDepositConfirmedOrder.userId);
                
                // Debug: Log để kiểm tra user không tìm thấy
                if (!user && orderDepositConfirmedOrder.userId) {
                  console.warn(`[CarStatusManagement] Car ${car.id}: User not found for order ${orderDepositConfirmedOrder.id}, userId: ${orderDepositConfirmedOrder.userId}`, {
                    availableUserIds: Array.from(userMap.keys()),
                    orderUserId: orderDepositConfirmedOrder.userId,
                    orderStatus: orderDepositConfirmedOrder.status
                  });
                }
                
                currentOrder = {
                  ...orderDepositConfirmedOrder,
                  user: user
                    ? {
                        fullName: user.fullName || user.name || user.FullName,
                        email: user.email || user.Email,
                        phone: user.phone || user.phoneNumber || user.PhoneNumber,
                      }
                    : undefined,
                };
              } else {
                // Ưu tiên 3: Kiểm tra các đơn hàng đã đặt trước khác (status = 0, 2: Pending, CheckedIn)
                const bookedOrder = relatedOrders.find(
                  (order: RentalOrderData) => {
                    const statusNum = getStatusNumber(order.status);
                    // Booked = Pending (0), CheckedIn (2) - không bao gồm OrderDepositConfirmed (1) vì đã check ở trên
                    return statusNum === RentalOrderStatus.Pending || statusNum === RentalOrderStatus.CheckedIn;
                  }
                );

                if (bookedOrder) {
                  status = "booked";
                  const user = userMap.get(bookedOrder.userId);
                  
                  // Debug: Log để kiểm tra user không tìm thấy
                  if (!user && bookedOrder.userId) {
                    console.warn(`[CarStatusManagement] Car ${car.id}: User not found for order ${bookedOrder.id}, userId: ${bookedOrder.userId}`, {
                      availableUserIds: Array.from(userMap.keys()),
                      orderUserId: bookedOrder.userId,
                      orderStatus: bookedOrder.status
                    });
                  }
                  
                  currentOrder = {
                    ...bookedOrder,
                    user: user
                      ? {
                          fullName: user.fullName || user.name || user.FullName,
                          email: user.email || user.Email,
                          phone: user.phone || user.phoneNumber || user.PhoneNumber,
                        }
                      : undefined,
                  };
                }
              }
            }
          }

          return {
            ...car,
            status,
            originalStatus: isActive ? 1 : 0, // Lưu isActive dưới dạng số (1 = true, 0 = false) để backward compatibility
            currentOrder,
          };
        });

      setCars(carsWithStatus);
    } catch (error) {
      console.error("Load data error:", error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCars = useMemo(() => {
    let filtered = cars;

    // Lọc theo tab - nếu "all" thì không lọc
    if (activeTab === "available") {
      filtered = filtered.filter((car) => car.status === "available");
    }
    // Nếu activeTab === "all" thì không lọc, hiển thị tất cả

    // Lọc theo search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (car) =>
          car.name?.toLowerCase().includes(searchLower) ||
          car.model?.toLowerCase().includes(searchLower) ||
          String(car.id).includes(searchLower) ||
          car.currentOrder?.user?.fullName?.toLowerCase().includes(searchLower) ||
          car.currentOrder?.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [cars, activeTab, searchText]);

  const columns = [
    {
      title: "Hình ảnh",
      key: "image",
      width: 120,
      render: (_: any, record: CarWithStatus) => (
        <Image
          src={record.imageUrl}
          alt={record.name}
          width={100}
          height={60}
          style={{ objectFit: "cover", borderRadius: 4 }}
          fallback="/logo_ev.png"
          preview={false}
        />
      ),
    },
    {
      title: "Tên xe",
      key: "name",
      render: (_: any, record: CarWithStatus) => (
        <Space>
          <CarOutlined style={{ color: "#1890ff" }} />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-500">{record.model}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Số ghế",
      dataIndex: "seats",
      key: "seats",
      width: 100,
      render: (seats: number) => <Tag>{seats} chỗ</Tag>,
    },
    {
      title: "Giá thuê/ngày",
      dataIndex: "rentPricePerDay",
      key: "rentPricePerDay",
      width: 150,
      render: (price: number) => (
        <span className="font-semibold text-blue-600">
          {price?.toLocaleString("vi-VN")} đ/ngày
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_: any, record: CarWithStatus) => {
        // Lấy trạng thái gốc từ database (false = Hết xe, true = Còn xe)
        // Handle both boolean and number/string formats for backward compatibility
        const isActiveValue = typeof record.isActive === "boolean" 
          ? record.isActive 
          : (record.isActive === 1 || record.isActive === "1" || String(record.isActive).toLowerCase() === "true");
        const carStatusNum = record.originalStatus !== undefined 
          ? record.originalStatus 
          : (isActiveValue ? 1 : 0);
        
        // Chỉ hiển thị 2 trạng thái: Còn xe (xanh lá) hoặc Hết xe (đỏ)
        if (carStatusNum === 1) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Còn xe
            </Tag>
          );
        } else {
          return (
            <Tag color="red" icon={<CloseCircleOutlined />}>
              Hết xe
            </Tag>
          );
        }
      },
    },
    {
      title: activeTab === "available" ? "Thông tin" : "Khách hàng",
      key: "customer",
      width: 180,
      render: (_: any, record: CarWithStatus) => {
        if (record.status === "available") {
          return <span className="text-gray-400">Chưa có đơn</span>;
        }
        if (record.currentOrder?.user) {
          return (
            <div>
              <div className="font-medium text-sm">
                {record.currentOrder.user.fullName || record.currentOrder.user.email || "N/A"}
              </div>
              {record.currentOrder.user.email && (
                <div className="text-xs text-gray-500">
                  {record.currentOrder.user.email}
                </div>
              )}
              {record.currentOrder.user.phone && (
                <div className="text-xs text-gray-500">
                  {record.currentOrder.user.phone}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-gray-400">Chưa có đơn</span>;
      },
    },
    {
      title: "Thời gian thuê",
      key: "time",
      render: (_: any, record: CarWithStatus) => {
        if (!record.currentOrder) return <span className="text-gray-400">Chưa cập nhật</span>;
        
        // Lấy status number của order
        const orderStatusNum = getStatusNumber(record.currentOrder.status);
        
        // Nếu là OrderDepositConfirmed (1), Renting (3), hoặc booked - hiển thị thời gian thuê
        if (orderStatusNum === RentalOrderStatus.OrderDepositConfirmed || 
            orderStatusNum === RentalOrderStatus.Renting || 
            record.status === "booked" || 
            record.status === "renting") {
          return (
            <div>
              <div className="text-xs text-gray-500">Nhận xe:</div>
              <div className="text-sm">
                {record.currentOrder.pickupTime
                  ? dayjs(record.currentOrder.pickupTime).format("DD/MM/YYYY HH:mm")
                  : "Chưa cập nhật"}
              </div>
              {record.currentOrder.expectedReturnTime && (
                <>
                  <div className="text-xs text-gray-500 mt-1">Trả dự kiến:</div>
                  <div className="text-sm">
                    {dayjs(record.currentOrder.expectedReturnTime).format("DD/MM/YYYY HH:mm")}
                  </div>
                </>
              )}
            </div>
          );
        }
        
        return <span className="text-gray-400">Chưa cập nhật</span>;
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 180,
      render: (_: any, record: CarWithStatus) => {
        if (!record.currentOrder) {
          return <span className="text-gray-400">Chưa có đơn</span>;
        }

        // Tìm payments liên quan đến đơn hàng này
        const orderPayments = payments.filter(
          (payment: PaymentData) => payment.rentalOrderId === record.currentOrder?.id || payment.rentalOrderId === record.currentOrder?.orderId
        );

        if (orderPayments.length === 0) {
          return <Tag color="default">Chưa thanh toán</Tag>;
        }

        // Tính tổng số tiền đã thanh toán
        const totalPaid = orderPayments
          .filter((p: PaymentData) => {
            const status = typeof p.status === "number" ? p.status : parseInt(String(p.status || "0"), 10);
            return status === 1 || status === 2; // Completed hoặc Confirmed
          })
          .reduce((sum: number, p: PaymentData) => sum + (p.amount || 0), 0);

        // Tổng số tiền cần thanh toán (từ đơn hàng)
        const totalAmount = record.currentOrder.total || record.currentOrder.subTotal || 0;

        // Kiểm tra trạng thái thanh toán
        const hasCompletedPayment = orderPayments.some((p: PaymentData) => {
          const status = typeof p.status === "number" ? p.status : parseInt(String(p.status || "0"), 10);
          return status === 1 || status === 2; // Completed hoặc Confirmed
        });

        const hasPendingPayment = orderPayments.some((p: PaymentData) => {
          const status = typeof p.status === "number" ? p.status : parseInt(String(p.status || "0"), 10);
          return status === 0; // Pending
        });

        if (hasCompletedPayment && totalPaid >= totalAmount) {
          return (
            <div>
              <Tag color="success">Đã thanh toán</Tag>
              <div className="text-xs text-gray-600 mt-1">
                {totalPaid.toLocaleString("vi-VN")} đ
              </div>
            </div>
          );
        } else if (hasCompletedPayment && totalPaid < totalAmount) {
          return (
            <div>
              <Tag color="warning">Đã cọc</Tag>
              <div className="text-xs text-gray-600 mt-1">
                {totalPaid.toLocaleString("vi-VN")} / {totalAmount.toLocaleString("vi-VN")} đ
              </div>
            </div>
          );
        } else if (hasPendingPayment) {
          return (
            <div>
              <Tag color="processing">Đang chờ</Tag>
              <div className="text-xs text-gray-600 mt-1">
                {orderPayments[0]?.amount?.toLocaleString("vi-VN") || 0} đ
              </div>
            </div>
          );
        }

        return <Tag color="default">Chưa thanh toán</Tag>;
      },
    },
    {
      title: "Địa điểm",
      key: "location",
      width: 250,
      render: (_: any, record: CarWithStatus) => {
        const carLocations = (record as unknown as { carRentalLocations?: unknown })?.carRentalLocations;
        if (!carLocations) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        const locationsList = Array.isArray(carLocations)
          ? carLocations
          : (carLocations as any)?.$values || [];
        
        if (locationsList.length === 0) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        // Lấy location đầu tiên
        const firstLocation = locationsList[0] as any;
        const locationInfo = firstLocation.rentalLocation ?? firstLocation.RentalLocation;
        
        let locationName = '';
        let locationAddress = '';
        
        if (locationInfo) {
          locationName = locationInfo.name ?? locationInfo.Name ?? '';
          locationAddress = locationInfo.address ?? locationInfo.Address ?? '';
        } else {
          // Nếu không có locationInfo, tìm trong rentalLocations state
          const locationId = firstLocation.rentalLocationId ?? firstLocation.RentalLocationId ?? firstLocation.locationId ?? firstLocation.LocationId;
          if (locationId) {
            const foundLocation = rentalLocations.find(l => l.id === locationId || l.id === Number(locationId));
            if (foundLocation) {
              locationName = foundLocation.name || '';
              locationAddress = foundLocation.address || '';
            }
          }
        }

        if (!locationName && !locationAddress) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        return (
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              {locationName && (
                <div className="text-xs font-medium text-gray-800 leading-tight truncate">{locationName}</div>
              )}
              {locationAddress && (
                <div className="text-xs text-gray-600 leading-tight truncate">{locationAddress}</div>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>
            Quản lý xe
          </h2>
          <Space.Compact style={{ width: 400 }}>
            <Input
              placeholder="Tìm kiếm theo tên xe, model, khách hàng..."
              allowClear
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={(e) => setSearchText(e.currentTarget.value)}
            />
            <Button 
              icon={<SearchOutlined />} 
              size="large"
              onClick={() => setSearchText(searchText)}
            />
          </Space.Compact>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "all",
            label: (
              <Space>
                <CarOutlined />
                <span>Tất cả ({cars.length})</span>
              </Space>
            ),
          },
          {
            key: "available",
            label: (
              <Space>
                <CheckCircleOutlined />
                <span>Available ({cars.filter((c) => c.status === "available").length})</span>
              </Space>
            ),
          },
        ]}
      />

      <Spin spinning={loading}>
        {filteredCars.length === 0 ? (
          <Empty
            description={
              activeTab === "all"
                ? "Không có xe nào trong hệ thống"
                : activeTab === "available"
                ? "Không có xe nào có sẵn"
                : "Không có dữ liệu"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredCars}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng cộng: ${total} xe`,
            }}
          />
        )}
      </Spin>
    </Card>
  );
}

