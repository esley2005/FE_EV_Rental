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
  Form,
  Upload,
  Alert,
  Radio
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
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
  EditOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, driverLicenseApi, citizenIdApi, paymentApi, carDeliveryHistoryApi, carReturnHistoryApi, rentalLocationApi, carRentalLocationApi } from "@/services/api";
import type { RentalOrderData, User, DriverLicenseData, CitizenIdData, RentalLocationData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Cấu hình dayjs với timezone
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function để format thời gian theo múi giờ Việt Nam (UTC+7)
const formatVietnamTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  try {
    // Parse date và convert sang múi giờ Việt Nam (UTC+7)
    const parsedDate = dayjs(date);
    // Nếu date có timezone info (UTC), convert sang VN time
    if (parsedDate.isUTC() || typeof date === 'string' && (date.includes('Z') || date.includes('+') || date.includes('-', 10))) {
      return parsedDate.tz("Asia/Ho_Chi_Minh").format('DD/MM/YYYY HH:mm');
    }
    // Nếu không có timezone info, giả sử là local time và format
    return parsedDate.format('DD/MM/YYYY HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '-';
  }
};

interface OrderWithDetails extends Omit<RentalOrderData, 'citizenId'> {
  car?: Car;
  user?: User;
  driverLicense?: DriverLicenseData;
  citizenIdDoc?: CitizenIdData;
  deposit?: number;
  location?: RentalLocationData;
}

// Status enum mapping
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

const statusLabels: Record<number, { text: string; color: string; icon: any }> = {
  0: { text: 'Chờ xác nhận', color: 'gold', icon: <ClockCircleOutlined /> },
  1: { text: 'Đã xác nhận cọc đơn', color: 'blue', icon: <DollarOutlined /> },
  2: { text: 'Đã check-in', color: 'cyan', icon: <CheckCircleOutlined /> },
  3: { text: 'Đang thuê', color: 'green', icon: <CarOutlined /> },
  4: { text: 'Đã trả xe', color: 'purple', icon: <CarOutlined /> },
  5: { text: 'Chờ thanh toán', color: 'orange', icon: <DollarOutlined /> },
  6: { text: 'Hoàn tiền cọc xe', color: 'blue', icon: <DollarOutlined /> },
  7: { text: 'Đã hủy', color: 'red', icon: <CloseCircleOutlined /> },
  8: { text: 'Hoàn tiền cọc đơn', color: 'blue', icon: <DollarOutlined /> },
  9: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
};

export default function RentalOrderManagement() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updateTotalModalVisible, setUpdateTotalModalVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [selectedOrderForDocument, setSelectedOrderForDocument] = useState<OrderWithDetails | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [updateLicenseModalVisible, setUpdateLicenseModalVisible] = useState(false);
  const [updateCitizenIdModalVisible, setUpdateCitizenIdModalVisible] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<DriverLicenseData | null>(null);
  const [selectedCitizenId, setSelectedCitizenId] = useState<CitizenIdData | null>(null);
  const [licenseImageFileList, setLicenseImageFileList] = useState<UploadFile[]>([]);
  const [licenseImage2FileList, setLicenseImage2FileList] = useState<UploadFile[]>([]);
  const [citizenIdImageFileList, setCitizenIdImageFileList] = useState<UploadFile[]>([]);
  const [citizenIdImage2FileList, setCitizenIdImage2FileList] = useState<UploadFile[]>([]);
  const [updateLicenseForm] = Form.useForm();
  const [updateCitizenIdForm] = Form.useForm();
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<OrderWithDetails | null>(null);
  const [deliveryForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form] = Form.useForm();
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [deliveryImageFileList, setDeliveryImageFileList] = useState<UploadFile[]>([]);
  const [depositReceiptModalVisible, setDepositReceiptModalVisible] = useState(false);
  const [depositReceiptImageFileList, setDepositReceiptImageFileList] = useState<UploadFile[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [returnImageFileList, setReturnImageFileList] = useState<UploadFile[]>([]);
  const [paymentReceiptModalVisible, setPaymentReceiptModalVisible] = useState(false);
  const [paymentReceiptImageFileList, setPaymentReceiptImageFileList] = useState<UploadFile[]>([]);
  const [paymentMethodForPayment, setPaymentMethodForPayment] = useState<'cash' | 'bank_transfer'>('cash');
  const [refundDepositModalVisible, setRefundDepositModalVisible] = useState(false);
  const [refundDepositImageFileList, setRefundDepositImageFileList] = useState<UploadFile[]>([]);
  const [paymentMethodForRefund, setPaymentMethodForRefund] = useState<'cash' | 'bank_transfer'>('cash');
  const [refundDepositForm] = Form.useForm();
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [orderHistory, setOrderHistory] = useState<{
    deliveryHistory?: any;
    returnHistory?: any;
    payments?: any[];
  } | null>(null);

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

      const [carsResponse, usersResponse, licensesResponse, citizenIdsResponse, locationsResponse] = await Promise.all([
        carsApi.getAll(),
        authApi.getAllUsers(),
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
        rentalLocationApi.getAll()
      ]);

      const cars: Car[] = carsResponse.success && carsResponse.data
        ? (Array.isArray(carsResponse.data) ? carsResponse.data : (carsResponse.data as any)?.$values || [])
        : [];

      const users: User[] = usersResponse.success && usersResponse.data
        ? (Array.isArray(usersResponse.data) 
            ? usersResponse.data 
            : (usersResponse.data as any)?.$values || [])
        : [];
      
      // Debug: Log để kiểm tra dữ liệu users
      console.log('[DEBUG] Loaded users:', {
        count: users.length,
        sample: users.slice(0, 3).map(u => ({ id: u.id, email: u.email, fullName: u.fullName }))
      });

      const licenses: DriverLicenseData[] = licensesResponse.success && licensesResponse.data
        ? (Array.isArray(licensesResponse.data) ? licensesResponse.data : (licensesResponse.data as any)?.$values || [])
        : [];

      const citizenIds: CitizenIdData[] = citizenIdsResponse.success && citizenIdsResponse.data
        ? (Array.isArray(citizenIdsResponse.data) ? citizenIdsResponse.data : (citizenIdsResponse.data as any)?.$values || [])
        : [];

      const locationsData: RentalLocationData[] = locationsResponse.success && locationsResponse.data
        ? (Array.isArray(locationsResponse.data) ? locationsResponse.data : (locationsResponse.data as any)?.$values || [])
        : [];
      
      setRentalLocations(locationsData);

      // Load car rental locations cho tất cả xe
      const carsWithLocations = await Promise.all(
        cars.map(async (car) => {
          try {
            const locationResponse = await carRentalLocationApi.getByCarId(car.id);
            if (locationResponse.success && locationResponse.data) {
              const locationsData = Array.isArray(locationResponse.data)
                ? locationResponse.data
                : (locationResponse.data as any)?.$values || [];
              return {
                ...car,
                carRentalLocations: locationsData
              };
            }
          } catch (error) {
            // 404 là bình thường nếu xe chưa có location
          }
          return car;
        })
      );

      const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: RentalOrderData) => {
        const car = carsWithLocations.find((c) => c.id === order.carId);
        const user = users.find((u) => u.id === order.userId);
        // Tìm giấy tờ với logic rõ ràng hơn, xử lý cả null và undefined
        const license = licenses.find((l) => l.rentalOrderId != null && l.rentalOrderId === order.id);
        const citizenIdDoc = citizenIds.find((c) => c.rentalOrderId != null && c.rentalOrderId === order.id);
        // Tìm địa điểm từ rentalLocationId
        const location = locationsData.find((l) => l.id === order.rentalLocationId);

        // Debug: Log để kiểm tra user không tìm thấy
        if (!user && order.userId) {
          console.warn(`[DEBUG] Order ${order.id}: User not found for userId ${order.userId}`, {
            availableUserIds: users.map(u => u.id),
            orderUserId: order.userId
          });
        }

        // Debug: Log để kiểm tra dữ liệu giấy tờ cho đơn hàng có giấy tờ
        if (license || citizenIdDoc) {
          console.log(`[DEBUG] Order ${order.id} documents:`, {
            license: license ? {
              id: license.id,
              status: license.status,
              imageUrl: license.imageUrl ? 'exists' : 'missing',
              rentalOrderId: license.rentalOrderId
            } : null,
            citizenId: citizenIdDoc ? {
              id: citizenIdDoc.id,
              status: citizenIdDoc.status,
              imageUrl: citizenIdDoc.imageUrl ? 'exists' : 'missing',
              rentalOrderId: citizenIdDoc.rentalOrderId
            } : null
          });
        }

        return {
          ...order,
          car,
          user: user || undefined,
          driverLicense: license || undefined,
          citizenIdDoc: citizenIdDoc || undefined,
          location: location || undefined,
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

  const getOrderStatusTag = (order: OrderWithDetails) => {
    const statusNum = getStatusNumber(order.status);
    const config = statusLabels[statusNum] || statusLabels[RentalOrderStatus.Pending];
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const getDocumentStatusTag = (status?: string | number) => {
    // Status là number: 0 = Chờ xác thực, 1 = Đã xác thực, 2 = Đã từ chối
    const statusNum = typeof status === 'number' ? status : (status === '1' ? 1 : status === '2' ? 2 : status === '0' ? 0 : undefined);
    
    if (statusNum === 1) {
      return <Tag color="success">Đã xác thực</Tag>;
    }
    if (statusNum === 2) {
      return <Tag color="error">Đã từ chối</Tag>;
    }
    // Mặc định: 0, null, undefined -> Chờ xác thực
    return <Tag color="warning">Chờ xác thực</Tag>;
  };

  // Xử lý cập nhật status
  const handleStatusChange = async (orderId: number, newStatus: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Nếu chọn "Xe đang thuê" từ CheckedIn (2) -> Renting (3)
    // Status sẽ được cập nhật tự động bởi backend hoặc các API khác
    const currentStatusNum = getStatusNumber(order.status);
    if (newStatus === RentalOrderStatus.Renting && currentStatusNum === RentalOrderStatus.CheckedIn) {
      // Có thể cần gọi API cụ thể để bắt đầu thuê, hoặc backend tự động xử lý
      // Hiện tại chỉ reload để lấy status mới từ backend
      message.info('Đang xử lý...');
      await loadOrders();
      return;
    }

    // Nếu chọn "Trả xe" (Returned = 4), mở modal nhập thông tin trả xe
    if (newStatus === RentalOrderStatus.Returned) {
      setSelectedOrderForAction(order);
      setReturnModalVisible(true);
      return;
    }

    // Nếu chọn "Hủy đơn" (Cancelled), gọi API CancelOrder
    if (newStatus === RentalOrderStatus.Cancelled) {
      try {
        setLoading(true);
        const response = await rentalOrderApi.cancelOrder(orderId);
        if (response.success) {
          message.success('Hủy đơn hàng thành công!');
          await loadOrders();
        } else {
          message.error(response.error || 'Hủy đơn hàng thất bại');
        }
      } catch (error) {
        console.error('Cancel order error:', error);
        message.error('Có lỗi xảy ra khi hủy đơn hàng');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Các status khác sẽ được xử lý bởi các API cụ thể (cancelOrder, confirmPayment, etc.)
    // Không dùng updateStatus nữa
    message.warning('Vui lòng sử dụng các chức năng cụ thể để cập nhật trạng thái đơn hàng.');
  };

  // Xử lý giao xe (Bắt đầu thuê)
  const handleDelivery = async (values: any) => {
    if (!selectedOrderForAction || !selectedOrderForAction.car || !selectedOrderForAction.user) {
      message.error('Thiếu thông tin đơn hàng, xe hoặc người dùng');
      return;
    }

    try {
      setLoading(true);
      
      // Upload ảnh lên Cloudinary (tối đa 6 ảnh)
      const imageUrls: string[] = [];
      const maxImages = Math.min(deliveryImageFileList.length, 6);
      
      for (let i = 0; i < maxImages; i++) {
        const file = deliveryImageFileList[i];
        if (file.originFileObj) {
          try {
            const formData = new FormData();
            formData.append('file', file.originFileObj);
            formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: 'POST',
              body: formData,
            });
            const uploadData = await uploadResponse.json();
            if (uploadData.secure_url) {
              imageUrls.push(uploadData.secure_url);
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i + 1}:`, uploadError);
            message.warning(`Không thể upload ảnh ${i + 1}`);
          }
        }
      }

      // Backend DTO chỉ yêu cầu: OdometerStart, BatteryLevelStart, VehicleConditionStart, ImageUrl (1-6), OrderId
      // DeliveryDate, UpdateAt, CarId, UserId được backend tự động set từ OrderId
      
      // Validate dữ liệu
      const odometerStart = Number(values.odometerStart);
      const batteryLevelStart = Number(values.batteryLevelStart);
      
      if (isNaN(odometerStart) || odometerStart < 0) {
        message.error('Số km không hợp lệ');
        setLoading(false);
        return;
      }
      
      if (isNaN(batteryLevelStart) || batteryLevelStart < 0 || batteryLevelStart > 100) {
        message.error('% Pin không hợp lệ (phải từ 0-100)');
        setLoading(false);
        return;
      }
      
      if (!values.vehicleConditionStart || values.vehicleConditionStart.trim() === '') {
        message.error('Vui lòng nhập tình trạng xe');
        setLoading(false);
        return;
      }
      
      const requestData = {
        odometerStart: odometerStart,
        batteryLevelStart: batteryLevelStart,
        vehicleConditionStart: values.vehicleConditionStart.trim(),
        orderId: selectedOrderForAction.id,
        ...(imageUrls[0] && { imageUrl: imageUrls[0] }),
        ...(imageUrls[1] && { imageUrl2: imageUrls[1] }),
        ...(imageUrls[2] && { imageUrl3: imageUrls[2] }),
        ...(imageUrls[3] && { imageUrl4: imageUrls[3] }),
        ...(imageUrls[4] && { imageUrl5: imageUrls[4] }),
        ...(imageUrls[5] && { imageUrl6: imageUrls[5] }),
      };
      
      console.log('[DEBUG] CarDeliveryHistory request:', requestData);
      
      const response = await carDeliveryHistoryApi.create(requestData);

      console.log('[DEBUG] CarDeliveryHistory full response:', JSON.stringify(response, null, 2));

      // Xử lý trường hợp response là empty object {} - có thể là success nhưng không có data
      if (response && typeof response === 'object' && !('success' in response) && Object.keys(response).length === 0) {
        // Nếu response rỗng nhưng không có error, coi như success
        console.log('[INFO] CarDeliveryHistory: Empty response treated as success');
        message.success('Xác nhận tình trạng xe thành công!');
        setDeliveryModalVisible(false);
        deliveryForm.resetFields();
        setDeliveryImageFileList([]);
        setSelectedOrderForAction(null);
        await loadOrders();
        return;
      }

      // Xử lý response có success property
      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          message.success('Xác nhận tình trạng xe thành công!');
          setDeliveryModalVisible(false);
          deliveryForm.resetFields();
          setDeliveryImageFileList([]);
          setSelectedOrderForAction(null);
          await loadOrders();
        } else {
          const errorMsg = response.error || (response as any).message || 'Giao xe thất bại';
          console.error('[ERROR] CarDeliveryHistory response:', response);
          console.error('[ERROR] Request data was:', requestData);
          message.error(`Giao xe thất bại: ${errorMsg}`);
        }
      } else {
        // Response không có format đúng, nhưng không có error property
        // Có thể là success nhưng format khác
        console.warn('[WARN] CarDeliveryHistory: Unexpected response format:', response);
        message.success('Xác nhận tình trạng xe thành công!');
        setDeliveryModalVisible(false);
        deliveryForm.resetFields();
        setDeliveryImageFileList([]);
        setSelectedOrderForAction(null);
        await loadOrders();
      }
    } catch (error: any) {
      console.error('Delivery error:', error);
      const errorMsg = error?.message || error?.error || 'Có lỗi xảy ra khi giao xe';
      message.error(`Giao xe thất bại: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý trả xe
  const handleReturn = async (values: any) => {
    if (!selectedOrderForAction) return;

    try {
      setLoading(true);
      
      // Upload ảnh lên Cloudinary (tối đa 6 ảnh)
      const imageUrls: string[] = [];
      const maxImages = Math.min(returnImageFileList.length, 6);
      
      for (let i = 0; i < maxImages; i++) {
        const file = returnImageFileList[i];
        if (file.originFileObj) {
          try {
            const formData = new FormData();
            formData.append('file', file.originFileObj);
            formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: 'POST',
              body: formData,
            });
            const uploadData = await uploadResponse.json();
            if (uploadData.secure_url) {
              imageUrls.push(uploadData.secure_url);
            }
          } catch (uploadError) {
            console.error(`Error uploading return image ${i + 1}:`, uploadError);
            message.warning(`Không thể upload ảnh ${i + 1}`);
          }
        }
      }

      // Gọi API với đầy đủ thông tin
      const response = await carReturnHistoryApi.create({
        odometerEnd: Number(values.odometerEnd),
        batteryLevelEnd: Number(values.batteryLevelEnd),
        vehicleConditionEnd: values.vehicleConditionEnd || '',
        imageUrl: imageUrls[0] || undefined,
        imageUrl2: imageUrls[1] || undefined,
        imageUrl3: imageUrls[2] || undefined,
        imageUrl4: imageUrls[3] || undefined,
        imageUrl5: imageUrls[4] || undefined,
        imageUrl6: imageUrls[5] || undefined,
        orderId: selectedOrderForAction.id,
      });

      if (response.success) {
        message.success('Nhận lại xe thành công! Đơn hàng đã chuyển sang trạng thái đã trả xe.');
        setReturnModalVisible(false);
        returnForm.resetFields();
        setReturnImageFileList([]);
        setSelectedOrderForAction(null);
        await loadOrders();
      } else {
        message.error(response.error || 'Trả xe thất bại');
      }
    } catch (error) {
      console.error('Return error:', error);
      message.error('Có lỗi xảy ra khi trả xe');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận tiền cọc (có thể không dùng nữa, vì đã chuyển sang xác nhận thế chấp với upload hình)
  // Giữ lại để tương thích nếu có chỗ khác dùng
  const handleConfirmDeposit = async (orderId: number, billingImageUrl?: string) => {
    try {
      setLoading(true);
      // Nếu không có billingImageUrl, yêu cầu upload hình
      if (!billingImageUrl) {
        message.warning('Vui lòng upload hình ảnh hóa đơn trước khi xác nhận');
        return;
      }
      const response = await paymentApi.confirmDepositPayment(orderId, billingImageUrl);
      
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

  // Xác nhận thế chấp (từ CheckedIn) - mở modal upload hình trước
  const handleConfirmDepositCollateral = (order: OrderWithDetails) => {
    setSelectedOrderForAction(order);
    setPaymentMethod('cash'); // Reset về tiền mặt mặc định
    setDepositReceiptImageFileList([]); // Reset file list
    setDepositReceiptModalVisible(true);
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
        
        // Sau khi cập nhật tổng tiền thành công, tự động chuyển status sang "Chờ thanh toán"
        try {
          const confirmResponse = await rentalOrderApi.confirmTotal(selectedOrder.id);
          if (confirmResponse.success) {
            message.success('Đơn hàng đã chuyển sang trạng thái "Chờ thanh toán"');
          } else {
            console.warn('Không thể tự động chuyển status:', confirmResponse.error);
          }
        } catch (confirmError) {
          console.error('Error confirming total:', confirmError);
          // Không hiển thị lỗi cho user vì cập nhật tổng tiền đã thành công
        }
        
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
      
      // Gọi ConfirmTotal trực tiếp - backend sẽ tự động xử lý chuyển status
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

  // Xác nhận thanh toán - mở modal upload hóa đơn
  const handleConfirmPayment = (order: OrderWithDetails) => {
    setSelectedOrderForAction(order);
    setPaymentMethodForPayment('cash'); // Reset về tiền mặt mặc định
    setPaymentReceiptImageFileList([]); // Reset file list
    setPaymentReceiptModalVisible(true);
  };

  // Hiển thị modal xác thực giấy tờ
  const showDocumentVerificationModal = (order: OrderWithDetails) => {
    setSelectedOrderForDocument(order);
    setDocumentModalVisible(true);
  };

  // Xác thực GPLX
  const handleApproveLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 1);
      if (response.success) {
        const order = selectedOrderForDocument;
        if (order) {
          const citizenId = order.citizenIdDoc;
          if (citizenId && (citizenId.status === '1' || citizenId.status === 'Approved')) {
            message.success('Xác thực GPLX thành công. Email đã được gửi (cả 2 giấy tờ đã được xác nhận).');
          } else {
            message.success('Xác thực GPLX thành công. Vui lòng xác nhận thêm CCCD.');
          }
        }
        await loadOrders();
        setDocumentModalVisible(false);
      } else {
        message.error(response.error || 'Không thể xác thực GPLX');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi xác thực');
    } finally {
      setProcessingId(null);
    }
  };

  // Từ chối GPLX
  const handleRejectLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 2);
      if (response.success) {
        message.success('Đã từ chối GPLX');
        await loadOrders();
        setDocumentModalVisible(false);
      } else {
        message.error(response.error || 'Không thể từ chối GPLX');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessingId(null);
    }
  };

  // Xác thực CCCD
  const handleApproveCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 1);
      if (response.success) {
        const order = selectedOrderForDocument;
        if (order) {
          const license = order.driverLicense;
          if (license && (license.status === '1' || license.status === 'Approved')) {
            message.success('Xác thực CCCD thành công. Email đã được gửi (cả 2 giấy tờ đã được xác nhận).');
          } else {
            message.success('Xác thực CCCD thành công. Vui lòng xác nhận thêm GPLX.');
          }
        }
        await loadOrders();
        setDocumentModalVisible(false);
      } else {
        message.error(response.error || 'Không thể xác thực CCCD');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi xác thực');
    } finally {
      setProcessingId(null);
    }
  };

  // Từ chối CCCD
  const handleRejectCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 2);
      if (response.success) {
        message.success('Đã từ chối CCCD');
        await loadOrders();
        setDocumentModalVisible(false);
      } else {
        message.error(response.error || 'Không thể từ chối CCCD');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessingId(null);
    }
  };

  // Cập nhật GPLX
  const handleUpdateLicense = async (values: any) => {
    if (!selectedLicense?.id) return;
    
    try {
      setLoading(true);
      // Upload ảnh lên Cloudinary nếu có file mới
      let imageUrl = selectedLicense.imageUrl;
      let imageUrl2 = selectedLicense.imageUrl2;
      
      // Xử lý upload ảnh mặt trước
      if (licenseImageFileList.length > 0 && licenseImageFileList[0].originFileObj) {
        const formData = new FormData();
        formData.append('file', licenseImageFileList[0].originFileObj);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.secure_url) {
          imageUrl = uploadData.secure_url;
        }
      }
      
      // Xử lý upload ảnh mặt sau
      if (licenseImage2FileList.length > 0 && licenseImage2FileList[0].originFileObj) {
        const formData = new FormData();
        formData.append('file', licenseImage2FileList[0].originFileObj);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.secure_url) {
          imageUrl2 = uploadData.secure_url;
        }
      }
      
      const response = await driverLicenseApi.update({
        id: selectedLicense.id,
        name: values.name,
        licenseNumber: values.licenseNumber,
        imageUrl: imageUrl || '',
        imageUrl2: imageUrl2 || '',
        rentalOrderId: selectedLicense.rentalOrderId,
      });
      
      if (response.success) {
        message.success('Cập nhật giấy phép lái xe thành công!');
        setUpdateLicenseModalVisible(false);
        updateLicenseForm.resetFields();
        setLicenseImageFileList([]);
        setLicenseImage2FileList([]);
        await loadOrders();
        if (selectedOrderForDocument) {
          // Reload selected order
          const updatedOrders = await rentalOrderApi.getAll();
          if (updatedOrders.success && updatedOrders.data) {
            const ordersData = Array.isArray(updatedOrders.data)
              ? updatedOrders.data
              : (updatedOrders.data as any)?.$values || [];
            const updatedOrder = ordersData.find((o: RentalOrderData) => o.id === selectedOrderForDocument.id);
            if (updatedOrder) {
              // Reload full order details
              await loadOrders();
            }
          }
        }
      } else {
        message.error(response.error || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Update license error:', error);
      message.error('Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật CCCD
  const handleUpdateCitizenId = async (values: any) => {
    if (!selectedCitizenId?.id) return;
    
    try {
      setLoading(true);
      // Upload ảnh lên Cloudinary nếu có file mới
      let imageUrl = selectedCitizenId.imageUrl;
      let imageUrl2 = selectedCitizenId.imageUrl2;
      
      // Xử lý upload ảnh mặt trước
      if (citizenIdImageFileList.length > 0 && citizenIdImageFileList[0].originFileObj) {
        const formData = new FormData();
        formData.append('file', citizenIdImageFileList[0].originFileObj);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.secure_url) {
          imageUrl = uploadData.secure_url;
        }
      }
      
      // Xử lý upload ảnh mặt sau
      if (citizenIdImage2FileList.length > 0 && citizenIdImage2FileList[0].originFileObj) {
        const formData = new FormData();
        formData.append('file', citizenIdImage2FileList[0].originFileObj);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.secure_url) {
          imageUrl2 = uploadData.secure_url;
        }
      }
      
      const response = await citizenIdApi.update({
        id: selectedCitizenId.id,
        name: values.name,
        citizenIdNumber: values.citizenIdNumber,
        birthDate: values.birthDate,
        imageUrl: imageUrl || '',
        imageUrl2: imageUrl2 || '',
        rentalOrderId: selectedCitizenId.rentalOrderId,
      });
      
      if (response.success) {
        message.success('Cập nhật căn cước công dân thành công!');
        setUpdateCitizenIdModalVisible(false);
        updateCitizenIdForm.resetFields();
        setCitizenIdImageFileList([]);
        setCitizenIdImage2FileList([]);
        await loadOrders();
        if (selectedOrderForDocument) {
          // Reload selected order
          await loadOrders();
        }
      } else {
        message.error(response.error || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Update citizen ID error:', error);
      message.error('Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchText = search
        ? `${order.id} ${order.car?.name || ''} ${order.car?.model || ''} ${order.user?.fullName || ''} ${order.user?.email || ''} ${order.location?.name || ''} ${order.location?.address || ''}`
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
      key: "id",
      width: 100,
      fixed: 'left' as const,
      render: (_: any, record: OrderWithDetails) => (
        <span className="font-semibold text-blue-600">#{record.id}</span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: OrderWithDetails) => {
        const statusTag = getOrderStatusTag(record);
        
        // Kiểm tra nếu GPLX chưa được xác nhận
        // Status là number: 0 = Chờ xác thực, 1 = Đã xác thực, 2 = Đã từ chối
        const driverLicenseStatus = record.driverLicense?.status;
        const statusNum = typeof driverLicenseStatus === 'number' 
          ? driverLicenseStatus 
          : (driverLicenseStatus === '1' ? 1 : driverLicenseStatus === '0' ? 0 : driverLicenseStatus === '2' ? 2 : undefined);
        
        // Chưa xác nhận nếu không có GPLX hoặc status không phải 1 (đã xác thực)
        const isGPLXNotApproved = !record.driverLicense || statusNum !== 1;
        
        if (isGPLXNotApproved) {
          return (
            <Space direction="vertical" size={4}>
              {statusTag}
              <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                Chưa xác nhận GPLX
              </Tag>
            </Space>
          );
        }
        
        return statusTag;
      },
    },
    {
      title: "Ngày đặt",
      key: "orderDate",
      width: 150,
      render: (_: any, record: OrderWithDetails) => (
        <span className="text-sm">
          {formatVietnamTime(record.orderDate || record.createdAt)}
        </span>
      ),
    },
    {
      title: "Xe",
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
            {record.user.phone && (
              <div className="text-xs text-gray-500">{record.user.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Địa điểm nhận xe",
      key: "location",
      width: 200,
      render: (_: any, record: OrderWithDetails) => {
        if (!record.location) return '-';
        return (
          <div>
            <div className="font-medium text-sm">{record.location.name || 'Không xác định'}</div>
            {record.location.address && (
              <div className="text-xs text-gray-500">{record.location.address}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Tiền Giữ Chỗ",
      key: "bookingFee",
      width: 130,
      render: (_: any, record: OrderWithDetails) => {
        // Tiền giữ chỗ có thể là deposit ban đầu hoặc booking fee
        const bookingFee = record.deposit || 0;
        return (
          <span className="font-semibold text-blue-600">
            {bookingFee.toLocaleString("vi-VN")} ₫
          </span>
        );
      },
    },
    {
      title: "Tiền Cọc",
      key: "deposit",
      width: 130,
      render: (_: any, record: OrderWithDetails) => {
        const deposit = record.deposit || 0;
        return (
          <span className="font-semibold text-orange-600">
            {deposit.toLocaleString("vi-VN")} ₫
          </span>
        );
      },
    },
    {
      title: "Tiền Thuê",
      key: "total",
      width: 130,
      render: (_: any, record: OrderWithDetails) => {
        const total = record.total || record.subTotal || 0;
        return (
          <span className="font-semibold text-green-600">
            {total.toLocaleString("vi-VN")} ₫
          </span>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: OrderWithDetails) => {
        const statusNum = getStatusNumber(record.status);
        
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedOrder(record);
                setDetailModalVisible(true);
              }}
            >
              Chi tiết
            </Button>
            {(record.driverLicense || record.citizenIdDoc) && (
              <Button
                type="link"
                size="small"
                icon={<IdcardOutlined />}
                onClick={() => showDocumentVerificationModal(record)}
              >
                Giấy tờ
              </Button>
            )}
            {/* Nút Cập nhật tình trạng xe - chỉ hiển thị khi status là OrderDepositConfirmed (1) */}
            {statusNum === RentalOrderStatus.OrderDepositConfirmed && (
              <Button
                type="primary"
                size="small"
                icon={<CarOutlined />}
                onClick={() => {
                  setSelectedOrderForAction(record);
                  setDeliveryModalVisible(true);
                }}
              >
                Cập nhật tình trạng xe
              </Button>
            )}
            {/* Nút Xác nhận thế chấp - chỉ hiển thị khi status là CheckedIn (2) */}
            {statusNum === RentalOrderStatus.CheckedIn && (
              <Button
                type="primary"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => handleConfirmDepositCollateral(record)}
              >
                Xác nhận thế chấp
              </Button>
            )}
            {/* Nút Trả xe - chỉ hiển thị khi status là Renting (3) -> chuyển sang Returned (4) */}
            {statusNum === RentalOrderStatus.Renting && (
              <Button
                type="primary"
                size="small"
                icon={<CarOutlined />}
                onClick={() => handleStatusChange(record.id, RentalOrderStatus.Returned)}
              >
                Trả xe
              </Button>
            )}
            {/* Nút Hoàn thành - chỉ hiển thị khi status là PaymentPending (5) */}
            {statusNum === RentalOrderStatus.PaymentPending && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleStatusChange(record.id, RentalOrderStatus.Completed)}
              >
                Hoàn thành
              </Button>
            )}
            {/* Nút Hủy đơn - hiển thị khi có thể hủy */}
            {(statusNum === RentalOrderStatus.Pending ||
              statusNum === RentalOrderStatus.OrderDepositConfirmed ||
              statusNum === RentalOrderStatus.CheckedIn ||
              statusNum === RentalOrderStatus.PaymentPending) && (
              <Popconfirm
                title="Xác nhận hủy đơn"
                description="Bạn có chắc chắn muốn hủy đơn hàng này?"
                onConfirm={() => handleStatusChange(record.id, RentalOrderStatus.Cancelled)}
                okText="Hủy đơn"
                cancelText="Không"
              >
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                >
                  Hủy đơn
                </Button>
              </Popconfirm>
            )}
            {statusNum === RentalOrderStatus.Returned && (
              <>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setSelectedOrder(record);
                  setUpdateTotalModalVisible(true);
                }}
              >
                Cập nhật tổng
              </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleConfirmTotal(record.id)}
                >
                  Xác nhận Chi phí
                </Button>
              </>
            )}
            {statusNum === RentalOrderStatus.PaymentPending && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleConfirmPayment(record)}
              >
                Xác nhận TT
              </Button>
            )}
            {/* Nút Trả tiền thế chấp - chỉ hiển thị khi status là RefundDepositCar (6) */}
            {statusNum === RentalOrderStatus.RefundDepositCar && (
              <Button
                type="primary"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => {
                  setSelectedOrderForAction(record);
                  setPaymentMethodForRefund('cash');
                  setRefundDepositImageFileList([]);
                  refundDepositForm.resetFields();
                  setRefundDepositModalVisible(true);
                }}
              >
                Trả tiền thế chấp
              </Button>
            )}
            {/* Nút Xem lịch sử - chỉ hiển thị khi status là Completed (9) */}
            {statusNum === RentalOrderStatus.Completed && (
              <Button
                type="primary"
                size="small"
                icon={<FileTextOutlined />}
                onClick={async () => {
                  setSelectedOrder(record);
                  setHistoryModalVisible(true);
                  // Load lịch sử payments, delivery và return history
                  try {
                    setLoading(true);
                    const [paymentsResponse, deliveryResponse, returnResponse] = await Promise.all([
                      rentalOrderApi.getByOrderWithPayments(record.id),
                      carDeliveryHistoryApi.getByOrderId(record.id),
                      carReturnHistoryApi.getByOrderId(record.id)
                    ]);
                    
                    setOrderHistory({
                      deliveryHistory: deliveryResponse.success ? deliveryResponse.data : null,
                      returnHistory: returnResponse.success ? returnResponse.data : null,
                      payments: paymentsResponse.success && paymentsResponse.data?.payments?.$values 
                        ? paymentsResponse.data.payments.$values 
                        : []
                    });
                  } catch (error) {
                    console.error('Error loading order history:', error);
                    message.error('Không thể tải lịch sử đơn hàng');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Xem lịch sử
              </Button>
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
          placeholder="Tìm theo mã đơn, tên xe, người dùng, địa điểm..."
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
            { value: "1", label: "Đã xác nhận cọc đơn" },
            { value: "2", label: "Đã check-in" },
            { value: "3", label: "Đang thuê" },
            { value: "4", label: "Đã trả xe" },
            { value: "5", label: "Chờ thanh toán" },
            { value: "6", label: "Hoàn tiền cọc xe" },
            { value: "7", label: "Đã hủy" },
            { value: "8", label: "Hoàn tiền cọc đơn" },
            { value: "9", label: "Hoàn thành" },
          ]}
        />
      </Space>

      <Table<OrderWithDetails>
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} đơn hàng` }}
        scroll={{ x: 1800 }}
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

            <Card title={<><UserOutlined /> Thông tin khách hàng</>} size="small">
              {selectedOrder.user ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Họ tên">{selectedOrder.user.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>{selectedOrder.user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{selectedOrder.user.phone || '-'}</Descriptions.Item>
                  {selectedOrder.user.address && (
                    <Descriptions.Item label="Địa chỉ">{selectedOrder.user.address}</Descriptions.Item>
                  )}
                </Descriptions>
              ) : selectedOrder.userId ? (
                <div className="text-yellow-600">
                  <Alert
                    message="Đang tải thông tin người dùng..."
                    description={`User ID: ${selectedOrder.userId}`}
                    type="warning"
                    showIcon
                  />
                </div>
              ) : (
                <div className="text-gray-500">Không có thông tin người dùng</div>
              )}
            </Card>

            {/* <Card title={<><IdcardOutlined /> Trạng thái giấy tờ</>} size="small">
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
            </Card> */}

            <Card title="Chi tiết đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedOrder.phoneNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{formatVietnamTime(selectedOrder.orderDate || selectedOrder.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedOrder.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatVietnamTime(selectedOrder.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatVietnamTime(selectedOrder.expectedReturnTime)}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatVietnamTime(selectedOrder.actualReturnTime)}</Descriptions.Item>
                )}
                <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm nhận xe</>} span={2}>
                  {selectedOrder.location?.name || selectedOrder.location?.address || 'Không xác định'}
                  {selectedOrder.location?.address && selectedOrder.location?.name && (
                    <div className="text-sm text-gray-600 mt-1">{selectedOrder.location.address}</div>
                  )}
                </Descriptions.Item>
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

      {/* Document Verification Modal */}
      <Modal
        title={`Xác thực giấy tờ - Đơn hàng #${selectedOrderForDocument?.id}`}
        open={documentModalVisible}
        onCancel={() => {
          setDocumentModalVisible(false);
          setSelectedOrderForDocument(null);
        }}
        footer={null}
        width={900}
      >
        {selectedOrderForDocument && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Driver License Section */}
            {selectedOrderForDocument.driverLicense && (
              <Card title="Giấy phép lái xe" size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Họ tên">{selectedOrderForDocument.driverLicense.name}</Descriptions.Item>
                    <Descriptions.Item label="Số bằng lái">{selectedOrderForDocument.driverLicense.licenseNumber || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      {getDocumentStatusTag(selectedOrderForDocument.driverLicense.status)}
                    </Descriptions.Item>
                  </Descriptions>
                  {(selectedOrderForDocument.driverLicense.imageUrl || selectedOrderForDocument.driverLicense.imageUrl2) && (
                    <div>
                      <div className="font-medium mb-2">Ảnh giấy phép lái xe:</div>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {selectedOrderForDocument.driverLicense.imageUrl && (
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Mặt trước:</div>
                            <Image src={selectedOrderForDocument.driverLicense.imageUrl} alt="GPLX mặt trước" className="max-w-full" />
                          </div>
                        )}
                        {selectedOrderForDocument.driverLicense.imageUrl2 && (
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Mặt sau:</div>
                            <Image src={selectedOrderForDocument.driverLicense.imageUrl2} alt="GPLX mặt sau" className="max-w-full" />
                          </div>
                        )}
                      </Space>
                    </div>
                  )}
                  <Space>
                    {(!selectedOrderForDocument.driverLicense.status || 
                      selectedOrderForDocument.driverLicense.status === '0' || 
                      selectedOrderForDocument.driverLicense.status === 'Pending') && (
                      <>
                        <Button 
                          type="primary"
                          loading={processingId === selectedOrderForDocument.driverLicense.id}
                          onClick={() => selectedOrderForDocument.driverLicense?.id && handleApproveLicense(selectedOrderForDocument.driverLicense.id)}
                        >
                          Duyệt
                        </Button>
                        <Button 
                          danger
                          loading={processingId === selectedOrderForDocument.driverLicense.id}
                          onClick={() => selectedOrderForDocument.driverLicense?.id && handleRejectLicense(selectedOrderForDocument.driverLicense.id)}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    <Button 
                      icon={<EditOutlined />}
                      onClick={() => {
                        setSelectedLicense(selectedOrderForDocument.driverLicense!);
                        setLicenseImageFileList([]);
                        setLicenseImage2FileList([]);
                        updateLicenseForm.setFieldsValue({
                          name: selectedOrderForDocument.driverLicense!.name,
                          licenseNumber: selectedOrderForDocument.driverLicense!.licenseNumber,
                          imageUrl: selectedOrderForDocument.driverLicense!.imageUrl,
                          imageUrl2: selectedOrderForDocument.driverLicense!.imageUrl2,
                        });
                        setUpdateLicenseModalVisible(true);
                      }}
                    >
                      Cập nhật
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}

            {/* Citizen ID Section */}
            {selectedOrderForDocument.citizenIdDoc && (
              <Card title="Căn cước công dân" size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Họ tên">{selectedOrderForDocument.citizenIdDoc.name}</Descriptions.Item>
                    <Descriptions.Item label="Số CCCD">{selectedOrderForDocument.citizenIdDoc.citizenIdNumber}</Descriptions.Item>
                    <Descriptions.Item label="Ngày sinh">{selectedOrderForDocument.citizenIdDoc.birthDate || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      {getDocumentStatusTag(selectedOrderForDocument.citizenIdDoc.status)}
                    </Descriptions.Item>
                  </Descriptions>
                  {(selectedOrderForDocument.citizenIdDoc.imageUrl || selectedOrderForDocument.citizenIdDoc.imageUrl2) && (
                    <div>
                      <div className="font-medium mb-2">Ảnh căn cước công dân:</div>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {selectedOrderForDocument.citizenIdDoc.imageUrl && (
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Mặt trước:</div>
                            <Image src={selectedOrderForDocument.citizenIdDoc.imageUrl} alt="CCCD mặt trước" className="max-w-full" />
                          </div>
                        )}
                        {selectedOrderForDocument.citizenIdDoc.imageUrl2 && (
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Mặt sau:</div>
                            <Image src={selectedOrderForDocument.citizenIdDoc.imageUrl2} alt="CCCD mặt sau" className="max-w-full" />
                          </div>
                        )}
                      </Space>
                    </div>
                  )}
                  <Space>
                    {(!selectedOrderForDocument.citizenIdDoc.status || 
                      selectedOrderForDocument.citizenIdDoc.status === '0' || 
                      selectedOrderForDocument.citizenIdDoc.status === 'Pending') && (
                      <>
                        <Button 
                          type="primary"
                          loading={processingId === selectedOrderForDocument.citizenIdDoc.id}
                          onClick={() => selectedOrderForDocument.citizenIdDoc?.id && handleApproveCitizenId(selectedOrderForDocument.citizenIdDoc.id)}
                        >
                          Duyệt
                        </Button>
                        <Button 
                          danger
                          loading={processingId === selectedOrderForDocument.citizenIdDoc.id}
                          onClick={() => selectedOrderForDocument.citizenIdDoc?.id && handleRejectCitizenId(selectedOrderForDocument.citizenIdDoc.id)}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    <Button 
                      icon={<EditOutlined />}
                      onClick={() => {
                        setSelectedCitizenId(selectedOrderForDocument.citizenIdDoc!);
                        setCitizenIdImageFileList([]);
                        setCitizenIdImage2FileList([]);
                        updateCitizenIdForm.setFieldsValue({
                          name: selectedOrderForDocument.citizenIdDoc!.name,
                          citizenIdNumber: selectedOrderForDocument.citizenIdDoc!.citizenIdNumber,
                          birthDate: selectedOrderForDocument.citizenIdDoc!.birthDate,
                          imageUrl: selectedOrderForDocument.citizenIdDoc!.imageUrl,
                          imageUrl2: selectedOrderForDocument.citizenIdDoc!.imageUrl2,
                        });
                        setUpdateCitizenIdModalVisible(true);
                      }}
                    >
                      Cập nhật
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}

            {!selectedOrderForDocument.driverLicense && !selectedOrderForDocument.citizenIdDoc && (
              <div className="text-center text-gray-500 py-8">
                Chưa có giấy tờ nào được upload cho đơn hàng này
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Update License Modal */}
      <Modal
        title="Cập nhật Giấy phép lái xe"
        open={updateLicenseModalVisible}
        onCancel={() => {
          setUpdateLicenseModalVisible(false);
          updateLicenseForm.resetFields();
          setLicenseImageFileList([]);
          setLicenseImage2FileList([]);
          setSelectedLicense(null);
        }}
        footer={null}
        width={800}
      >
        {selectedLicense && (
          <Form
            form={updateLicenseForm}
            layout="vertical"
            onFinish={handleUpdateLicense}
          >
            <Form.Item
              label="Họ tên"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Số bằng lái"
              name="licenseNumber"
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ảnh mặt trước"
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={licenseImageFileList}
                onChange={({ fileList }) => setLicenseImageFileList(fileList)}
                onRemove={() => setLicenseImageFileList([])}
              >
                {licenseImageFileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
              {selectedLicense.imageUrl && licenseImageFileList.length === 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">Ảnh hiện tại:</div>
                  <Image src={selectedLicense.imageUrl} alt="GPLX mặt trước" width={200} />
                </div>
              )}
            </Form.Item>
            <Form.Item
              label="Ảnh mặt sau"
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={licenseImage2FileList}
                onChange={({ fileList }) => setLicenseImage2FileList(fileList)}
                onRemove={() => setLicenseImage2FileList([])}
              >
                {licenseImage2FileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
              {selectedLicense.imageUrl2 && licenseImage2FileList.length === 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">Ảnh hiện tại:</div>
                  <Image src={selectedLicense.imageUrl2} alt="GPLX mặt sau" width={200} />
                </div>
              )}
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setUpdateLicenseModalVisible(false);
                  updateLicenseForm.resetFields();
                }}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Cập nhật
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Update Citizen ID Modal */}
      <Modal
        title="Cập nhật Căn cước công dân"
        open={updateCitizenIdModalVisible}
        onCancel={() => {
          setUpdateCitizenIdModalVisible(false);
          updateCitizenIdForm.resetFields();
          setCitizenIdImageFileList([]);
          setCitizenIdImage2FileList([]);
          setSelectedCitizenId(null);
        }}
        footer={null}
        width={800}
      >
        {selectedCitizenId && (
          <Form
            form={updateCitizenIdForm}
            layout="vertical"
            onFinish={handleUpdateCitizenId}
          >
            <Form.Item
              label="Họ tên"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Số CCCD"
              name="citizenIdNumber"
              rules={[
                { required: true, message: 'Vui lòng nhập số CCCD' },
                { 
                  pattern: /^[0-9]{9,10}$/, 
                  message: "Số căn cước công dân phải có 9-10 chữ số" 
                }
              ]}
            >
              <Input placeholder="Nhập số CCCD (9-10 chữ số)" maxLength={10} />
            </Form.Item>
            <Form.Item
              label="Ngày sinh"
              name="birthDate"
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item
              label="Ảnh mặt trước"
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={citizenIdImageFileList}
                onChange={({ fileList }) => setCitizenIdImageFileList(fileList)}
                onRemove={() => setCitizenIdImageFileList([])}
              >
                {citizenIdImageFileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
              {selectedCitizenId.imageUrl && citizenIdImageFileList.length === 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">Ảnh hiện tại:</div>
                  <Image src={selectedCitizenId.imageUrl} alt="CCCD mặt trước" width={200} />
                </div>
              )}
            </Form.Item>
            <Form.Item
              label="Ảnh mặt sau"
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={citizenIdImage2FileList}
                onChange={({ fileList }) => setCitizenIdImage2FileList(fileList)}
                onRemove={() => setCitizenIdImage2FileList([])}
              >
                {citizenIdImage2FileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
              {selectedCitizenId.imageUrl2 && citizenIdImage2FileList.length === 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">Ảnh hiện tại:</div>
                  <Image src={selectedCitizenId.imageUrl2} alt="CCCD mặt sau" width={200} />
                </div>
              )}
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setUpdateCitizenIdModalVisible(false);
                  updateCitizenIdForm.resetFields();
                }}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Cập nhật
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Delivery Modal - Giao xe (Bắt đầu thuê) */}
      <Modal
        title="Giao xe - Bắt đầu thuê"
        open={deliveryModalVisible}
        onCancel={() => {
          setDeliveryModalVisible(false);
          deliveryForm.resetFields();
          setDeliveryImageFileList([]);
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={deliveryForm}
          layout="vertical"
          onFinish={handleDelivery}
        >
          <Form.Item label="Mã đơn hàng">
            <Input value={selectedOrderForAction?.id} disabled />
          </Form.Item>
          <Form.Item label="Xe">
            <Input value={selectedOrderForAction?.car?.name || '-'} disabled />
          </Form.Item>
          <Form.Item label="Khách hàng">
            <Input value={selectedOrderForAction?.user?.fullName || selectedOrderForAction?.user?.email || '-'} disabled />
          </Form.Item>
          <Form.Item
            label="Số km (Odometer)"
            name="odometerStart"
            rules={[{ required: true, message: 'Vui lòng nhập số km' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Nhập số km hiện tại"
            />
          </Form.Item>
          <Form.Item
            label="% Pin (Battery Level)"
            name="batteryLevelStart"
            rules={[{ required: true, message: 'Vui lòng nhập % pin' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                placeholder="Nhập % pin"
              />
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0 11px', 
                background: '#fafafa', 
                border: '1px solid #d9d9d9',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0'
              }}>%</span>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            label="Tình trạng xe"
            name="vehicleConditionStart"
            rules={[{ required: true, message: 'Vui lòng nhập tình trạng xe' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Mô tả tình trạng xe: đèn, gương, lốp, nội thất..."
            />
          </Form.Item>
          <Form.Item
            label="Ảnh tình trạng xe (tối đa 6 ảnh)"
            help="Chụp ảnh tình trạng xe khi giao: mặt ngoài, nội thất, vết xước, hư hỏng (nếu có)"
          >
            <Upload
              beforeUpload={() => false}
              maxCount={6}
              multiple
              listType="picture-card"
              fileList={deliveryImageFileList}
              onChange={({ fileList }) => setDeliveryImageFileList(fileList)}
              onRemove={(file) => {
                const newList = deliveryImageFileList.filter(item => item.uid !== file.uid);
                setDeliveryImageFileList(newList);
              }}
            >
              {deliveryImageFileList.length < 6 && (
                <div>
                  <div>+ Upload</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {deliveryImageFileList.length}/6
                  </div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận giao xe
              </Button>
              <Button onClick={() => {
                setDeliveryModalVisible(false);
                deliveryForm.resetFields();
                setDeliveryImageFileList([]);
                setSelectedOrderForAction(null);
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Return Modal - Trả xe */}
      <Modal
        title="Nhận lại xe"
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          returnForm.resetFields();
          setReturnImageFileList([]);
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={returnForm}
          layout="vertical"
          onFinish={handleReturn}
        >
          <Form.Item label="Mã đơn hàng">
            <Input value={selectedOrderForAction?.id} disabled />
          </Form.Item>
          <Form.Item label="Xe">
            <Input value={selectedOrderForAction?.car?.name || '-'} disabled />
          </Form.Item>
          <Form.Item
            label="Số km (Odometer)"
            name="odometerEnd"
            rules={[{ required: true, message: 'Vui lòng nhập số km' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Nhập số km khi trả xe"
            />
          </Form.Item>
          <Form.Item
            label="% Pin (Battery Level)"
            name="batteryLevelEnd"
            rules={[{ required: true, message: 'Vui lòng nhập % pin' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                placeholder="Nhập % pin khi trả xe"
              />
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0 11px', 
                background: '#fafafa', 
                border: '1px solid #d9d9d9',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0'
              }}>%</span>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            label="Tình trạng xe"
            name="vehicleConditionEnd"
            rules={[{ required: true, message: 'Vui lòng nhập tình trạng xe' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Mô tả tình trạng xe khi trả: hư hỏng, vết xước, phụ kiện..."
            />
          </Form.Item>
          <Form.Item
            label="Ảnh tình trạng xe (tối đa 6 ảnh)"
            help="Chụp ảnh tình trạng xe khi trả: mặt ngoài, nội thất, vết xước, hư hỏng (nếu có)"
          >
            <Upload
              beforeUpload={() => false}
              maxCount={6}
              multiple
              listType="picture-card"
              fileList={returnImageFileList}
              onChange={({ fileList }) => setReturnImageFileList(fileList)}
              onRemove={(file) => {
                const newList = returnImageFileList.filter(item => item.uid !== file.uid);
                setReturnImageFileList(newList);
              }}
            >
              {returnImageFileList.length < 6 && (
                <div>
                  <div>+ Upload</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {returnImageFileList.length}/6
                  </div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận nhận lại xe
              </Button>
              <Button onClick={() => {
                setReturnModalVisible(false);
                returnForm.resetFields();
                setReturnImageFileList([]);
                setSelectedOrderForAction(null);
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Deposit Receipt Modal - Upload hình ảnh hóa đơn thế chấp */}
      <Modal
        title="Upload hình ảnh hóa đơn thế chấp"
        open={depositReceiptModalVisible}
        onCancel={() => {
          setDepositReceiptModalVisible(false);
          setDepositReceiptImageFileList([]);
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          layout="vertical"
          onFinish={async () => {
            if (!selectedOrderForAction) return;
            
            try {
              setLoading(true);
              
              let billingImageUrl: string | null = null;
              
              // Nếu chọn chuyển khoản, cần upload ảnh
              if (paymentMethod === 'bank_transfer') {
                if (depositReceiptImageFileList.length === 0) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }

                const file = depositReceiptImageFileList[0];
                if (!file.originFileObj) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }
              
                // Upload ảnh lên Cloudinary
                try {
                message.loading({ content: 'Đang upload hình ảnh lên Cloudinary...', key: 'upload' });
                
                const formData = new FormData();
                formData.append('file', file.originFileObj);
                formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
                
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
                if (!cloudName || cloudName === 'your-cloud-name') {
                  message.error({ content: 'Chưa cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', key: 'upload' });
                  return;
                }
                
                const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                  method: 'POST',
                  body: formData,
                });
                
                if (!uploadResponse.ok) {
                  const errorText = await uploadResponse.text();
                  console.error('Cloudinary upload error:', errorText);
                  message.error({ content: `Lỗi upload: ${uploadResponse.status} ${uploadResponse.statusText}`, key: 'upload' });
                  return;
                }
                
                const uploadData = await uploadResponse.json();
                if (uploadData.secure_url) {
                  billingImageUrl = uploadData.secure_url;
                  message.success({ content: 'Upload hình ảnh thành công!', key: 'upload' });
                } else if (uploadData.error) {
                  message.error({ content: `Lỗi Cloudinary: ${uploadData.error.message || uploadData.error}`, key: 'upload' });
                  return;
                } else {
                  message.error({ content: 'Không thể lấy URL hình ảnh từ Cloudinary', key: 'upload' });
                  return;
                }
              } catch (uploadError: any) {
                console.error('Error uploading receipt image to Cloudinary:', uploadError);
                message.error({ 
                  content: `Không thể upload hình ảnh: ${uploadError.message || 'Lỗi không xác định'}`, 
                  key: 'upload' 
                });
                return;
              }
              }

              // Nếu chuyển khoản nhưng không có billingImageUrl thì báo lỗi
              if (paymentMethod === 'bank_transfer' && !billingImageUrl) {
                message.error('Không thể lấy URL hình ảnh chứng từ chuyển khoản');
                return;
              }

              // Gọi API ConfirmDepositPayment với rentalOrderId và billingImageUrl
              // Nếu tiền mặt thì billingImageUrl có thể là null hoặc empty string
              try {
                const response = await paymentApi.confirmDepositPayment(
                  selectedOrderForAction.id,
                  billingImageUrl || '' // Nếu tiền mặt thì gửi empty string
                );

                if (response.success) {
                  const successMsg = paymentMethod === 'bank_transfer' 
                    ? 'Xác nhận thế chấp thành công! Đã upload hình ảnh chứng từ chuyển khoản.'
                    : 'Xác nhận thế chấp thành công! (Thanh toán bằng tiền mặt)';
                  message.success(successMsg);
                  setDepositReceiptModalVisible(false);
                  setDepositReceiptImageFileList([]);
                  setPaymentMethod('cash');
                  setSelectedOrderForAction(null);
                  await loadOrders();
                } else {
                  message.error(response.error || 'Xác nhận thế chấp thất bại');
                }
              } catch (apiError) {
                console.error('Confirm deposit payment error:', apiError);
                message.error('Có lỗi xảy ra khi xác nhận thế chấp');
              }
            } catch (error) {
              console.error('Upload receipt error:', error);
              message.error('Có lỗi xảy ra khi upload hình ảnh hóa đơn');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item label="Mã đơn hàng">
            <Input value={selectedOrderForAction?.id} disabled />
          </Form.Item>
          <Form.Item label="Khách hàng">
            <Input value={selectedOrderForAction?.user?.fullName || selectedOrderForAction?.user?.email || '-'} disabled />
          </Form.Item>
          <Form.Item
            label="Phương thức thanh toán"
            rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
          >
            <Radio.Group 
              value={paymentMethod} 
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                // Reset file list khi đổi phương thức
                if (e.target.value === 'cash') {
                  setDepositReceiptImageFileList([]);
                }
              }}
            >
              <Radio value="cash">Tiền mặt</Radio>
              <Radio value="bank_transfer">Chuyển khoản</Radio>
            </Radio.Group>
          </Form.Item>
          {paymentMethod === 'bank_transfer' && (
            <Form.Item
              label="Hình ảnh chứng từ chuyển khoản"
              help="Upload hình ảnh chứng từ chuyển khoản đã được xác nhận"
              rules={[{ required: true, message: 'Vui lòng upload hình ảnh chứng từ chuyển khoản' }]}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={depositReceiptImageFileList}
                onChange={({ fileList }) => setDepositReceiptImageFileList(fileList)}
                onRemove={() => setDepositReceiptImageFileList([])}
              >
                {depositReceiptImageFileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
    </div>
                )}
              </Upload>
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận
              </Button>
              <Button onClick={() => {
                setDepositReceiptModalVisible(false);
                setDepositReceiptImageFileList([]);
                setPaymentMethod('cash');
                setSelectedOrderForAction(null);
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment Receipt Modal - Upload hình ảnh hóa đơn thanh toán */}
      <Modal
        title="Upload hình ảnh hóa đơn thanh toán"
        open={paymentReceiptModalVisible}
        onCancel={() => {
          setPaymentReceiptModalVisible(false);
          setPaymentReceiptImageFileList([]);
          setPaymentMethodForPayment('cash');
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          layout="vertical"
          onFinish={async () => {
            if (!selectedOrderForAction) return;
            
            try {
              setLoading(true);
              
              let billingImageUrl: string | null = null;
              
              // Nếu chọn chuyển khoản, cần upload ảnh
              if (paymentMethodForPayment === 'bank_transfer') {
                if (paymentReceiptImageFileList.length === 0) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }

                const file = paymentReceiptImageFileList[0];
                if (!file.originFileObj) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }
              
                // Upload ảnh lên Cloudinary
                try {
                  message.loading({ content: 'Đang upload hình ảnh lên Cloudinary...', key: 'upload-payment' });
                  
                  const formData = new FormData();
                  formData.append('file', file.originFileObj);
                  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
                  
                  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
                  if (!cloudName || cloudName === 'your-cloud-name') {
                    message.error({ content: 'Chưa cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', key: 'upload-payment' });
                    return;
                  }
                  
                  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error('Cloudinary upload error:', errorText);
                    message.error({ content: `Lỗi upload: ${uploadResponse.status} ${uploadResponse.statusText}`, key: 'upload-payment' });
                    return;
                  }
                  
                  const uploadData = await uploadResponse.json();
                  if (uploadData.secure_url) {
                    billingImageUrl = uploadData.secure_url;
                    message.success({ content: 'Upload hình ảnh thành công!', key: 'upload-payment' });
                  } else if (uploadData.error) {
                    message.error({ content: `Lỗi Cloudinary: ${uploadData.error.message || uploadData.error}`, key: 'upload-payment' });
                    return;
                  } else {
                    message.error({ content: 'Không thể lấy URL hình ảnh từ Cloudinary', key: 'upload-payment' });
                    return;
                  }
                } catch (uploadError: any) {
                  console.error('Error uploading payment receipt image to Cloudinary:', uploadError);
                  message.error({ 
                    content: `Không thể upload hình ảnh: ${uploadError.message || 'Lỗi không xác định'}`, 
                    key: 'upload-payment' 
                  });
                  return;
                }
              }

              // Nếu chuyển khoản nhưng không có billingImageUrl thì báo lỗi
              if (paymentMethodForPayment === 'bank_transfer' && !billingImageUrl) {
                message.error('Không thể lấy URL hình ảnh chứng từ chuyển khoản');
                return;
              }

              // Gọi API confirmOrderPayment với rentalOrderId và billingImageUrl
              try {
                const response = await rentalOrderApi.confirmOrderPayment(
                  selectedOrderForAction.id,
                  billingImageUrl || '' // Nếu tiền mặt thì gửi empty string
                );

                if (response.success) {
                  const successMsg = paymentMethodForPayment === 'bank_transfer' 
                    ? 'Xác nhận thanh toán thành công! Đã upload hình ảnh chứng từ chuyển khoản.'
                    : 'Xác nhận thanh toán thành công! (Thanh toán bằng tiền mặt)';
                  message.success(successMsg);
                  setPaymentReceiptModalVisible(false);
                  setPaymentReceiptImageFileList([]);
                  setPaymentMethodForPayment('cash');
                  setSelectedOrderForAction(null);
                  await loadOrders();
                } else {
                  message.error(response.error || 'Xác nhận thanh toán thất bại');
                }
              } catch (apiError) {
                console.error('Confirm order payment error:', apiError);
                message.error('Có lỗi xảy ra khi xác nhận thanh toán');
              }
            } catch (error) {
              console.error('Upload payment receipt error:', error);
              message.error('Có lỗi xảy ra khi upload hình ảnh hóa đơn thanh toán');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item label="Mã đơn hàng">
            <Input value={selectedOrderForAction?.id} disabled />
          </Form.Item>
          <Form.Item label="Khách hàng">
            <Input value={selectedOrderForAction?.user?.fullName || selectedOrderForAction?.user?.email || '-'} disabled />
          </Form.Item>
          <Form.Item
            label="Phương thức thanh toán"
            rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
          >
            <Radio.Group 
              value={paymentMethodForPayment} 
              onChange={(e) => {
                setPaymentMethodForPayment(e.target.value);
                // Reset file list khi đổi phương thức
                if (e.target.value === 'cash') {
                  setPaymentReceiptImageFileList([]);
                }
              }}
            >
              <Radio value="cash">Tiền mặt</Radio>
              <Radio value="bank_transfer">Chuyển khoản</Radio>
            </Radio.Group>
          </Form.Item>
          {paymentMethodForPayment === 'bank_transfer' && (
            <Form.Item
              label="Hình ảnh chứng từ chuyển khoản"
              help="Upload hình ảnh chứng từ chuyển khoản đã được xác nhận"
              rules={[{ required: true, message: 'Vui lòng upload hình ảnh chứng từ chuyển khoản' }]}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={paymentReceiptImageFileList}
                onChange={({ fileList }) => setPaymentReceiptImageFileList(fileList)}
                onRemove={() => setPaymentReceiptImageFileList([])}
              >
                {paymentReceiptImageFileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận
              </Button>
              <Button onClick={() => {
                setPaymentReceiptModalVisible(false);
                setPaymentReceiptImageFileList([]);
                setPaymentMethodForPayment('cash');
                setSelectedOrderForAction(null);
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Refund Deposit Modal - Upload hình ảnh hóa đơn trả tiền thế chấp */}
      <Modal
        title="Trả tiền thế chấp"
        open={refundDepositModalVisible}
        onCancel={() => {
          setRefundDepositModalVisible(false);
          setRefundDepositImageFileList([]);
          setPaymentMethodForRefund('cash');
          refundDepositForm.resetFields();
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={refundDepositForm}
          layout="vertical"
          onFinish={async () => {
            if (!selectedOrderForAction) return;
            
            try {
              setLoading(true);
              
              let billingImageUrl: string | null = null;
              
              // Nếu chọn chuyển khoản, cần upload ảnh
              if (paymentMethodForRefund === 'bank_transfer') {
                if (refundDepositImageFileList.length === 0) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }

                const file = refundDepositImageFileList[0];
                if (!file.originFileObj) {
                  message.warning('Vui lòng upload hình ảnh chứng từ chuyển khoản');
                  return;
                }
              
                // Upload ảnh lên Cloudinary
                try {
                  message.loading({ content: 'Đang upload hình ảnh lên Cloudinary...', key: 'upload-refund' });
                  
                  const formData = new FormData();
                  formData.append('file', file.originFileObj);
                  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars');
                  
                  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
                  if (!cloudName || cloudName === 'your-cloud-name') {
                    message.error({ content: 'Chưa cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', key: 'upload-refund' });
                    return;
                  }
                  
                  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error('Cloudinary upload error:', errorText);
                    message.error({ content: `Lỗi upload: ${uploadResponse.status} ${uploadResponse.statusText}`, key: 'upload-refund' });
                    return;
                  }
                  
                  const uploadData = await uploadResponse.json();
                  if (uploadData.secure_url) {
                    billingImageUrl = uploadData.secure_url;
                    message.success({ content: 'Upload hình ảnh thành công!', key: 'upload-refund' });
                  } else if (uploadData.error) {
                    message.error({ content: `Lỗi Cloudinary: ${uploadData.error.message || uploadData.error}`, key: 'upload-refund' });
                    return;
                  } else {
                    message.error({ content: 'Không thể lấy URL hình ảnh từ Cloudinary', key: 'upload-refund' });
                    return;
                  }
                } catch (uploadError: any) {
                  console.error('Error uploading refund receipt image to Cloudinary:', uploadError);
                  message.error({ 
                    content: `Không thể upload hình ảnh: ${uploadError.message || 'Lỗi không xác định'}`, 
                    key: 'upload-refund' 
                  });
                  return;
                }
              }

              // Nếu chuyển khoản nhưng không có billingImageUrl thì báo lỗi
              if (paymentMethodForRefund === 'bank_transfer' && !billingImageUrl) {
                message.error('Không thể lấy URL hình ảnh chứng từ chuyển khoản');
                return;
              }

              // Lấy note từ form
              const note = refundDepositForm.getFieldValue('note') || '';

              // Gọi API ConfirmRefundDepositCarPayment với rentalOrderId, billingImageUrl và note
              try {
                const response = await paymentApi.confirmRefundDepositCarPayment(
                  selectedOrderForAction.id,
                  billingImageUrl || '', // Nếu tiền mặt thì gửi empty string
                  note
                );

                if (response.success) {
                  const successMsg = paymentMethodForRefund === 'bank_transfer' 
                    ? 'Trả tiền thế chấp thành công! Đã upload hình ảnh chứng từ chuyển khoản.'
                    : 'Trả tiền thế chấp thành công! (Thanh toán bằng tiền mặt)';
                  message.success(successMsg);
                  setRefundDepositModalVisible(false);
                  setRefundDepositImageFileList([]);
                  setPaymentMethodForRefund('cash');
                  refundDepositForm.resetFields();
                  setSelectedOrderForAction(null);
                  await loadOrders();
                } else {
                  message.error(response.error || 'Trả tiền thế chấp thất bại');
                }
              } catch (apiError) {
                console.error('Confirm refund deposit car payment error:', apiError);
                message.error('Có lỗi xảy ra khi trả tiền thế chấp');
              }
            } catch (error) {
              console.error('Upload refund receipt error:', error);
              message.error('Có lỗi xảy ra khi upload hình ảnh hóa đơn trả tiền thế chấp');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item label="Mã đơn hàng">
            <Input value={selectedOrderForAction?.id} disabled />
          </Form.Item>
          <Form.Item label="Khách hàng">
            <Input value={selectedOrderForAction?.user?.fullName || selectedOrderForAction?.user?.email || '-'} disabled />
          </Form.Item>
          <Form.Item
            label="Phương thức thanh toán"
            rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
          >
            <Radio.Group 
              value={paymentMethodForRefund} 
              onChange={(e) => {
                setPaymentMethodForRefund(e.target.value);
                // Reset file list khi đổi phương thức
                if (e.target.value === 'cash') {
                  setRefundDepositImageFileList([]);
                }
              }}
            >
              <Radio value="cash">Tiền mặt</Radio>
              <Radio value="bank_transfer">Chuyển khoản</Radio>
            </Radio.Group>
          </Form.Item>
          {paymentMethodForRefund === 'bank_transfer' && (
            <Form.Item
              label="Hình ảnh chứng từ chuyển khoản"
              help="Upload hình ảnh chứng từ chuyển khoản đã được xác nhận"
              rules={[{ required: true, message: 'Vui lòng upload hình ảnh chứng từ chuyển khoản' }]}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                listType="picture-card"
                fileList={refundDepositImageFileList}
                onChange={({ fileList }) => setRefundDepositImageFileList(fileList)}
                onRemove={() => setRefundDepositImageFileList([])}
              >
                {refundDepositImageFileList.length < 1 && (
                  <div>
                    <div>+ Upload</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          )}
          <Form.Item
            label="Ghi chú"
            name="note"
          >
            <Input.TextArea
              rows={4}
              placeholder="Nhập ghi chú về việc trả tiền thế chấp (nếu có)"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận
              </Button>
              <Button onClick={() => {
                setRefundDepositModalVisible(false);
                setRefundDepositImageFileList([]);
                setPaymentMethodForRefund('cash');
                refundDepositForm.resetFields();
                setSelectedOrderForAction(null);
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* History Modal - Xem lịch sử đơn hàng */}
      {selectedOrder && (
        <Modal
          title={
            <Space>
              <FileTextOutlined /> Lịch sử đơn hàng #{selectedOrder.id}
            </Space>
          }
          open={historyModalVisible}
          onCancel={() => {
            setHistoryModalVisible(false);
            setOrderHistory(null);
            setSelectedOrder(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setHistoryModalVisible(false);
              setOrderHistory(null);
              setSelectedOrder(null);
            }}>
              Đóng
            </Button>
          ]}
          width={1000}
        >
          <div className="space-y-4">
            {/* Thông tin đơn hàng */}
            <Card title="Thông tin đơn hàng" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng">#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{getOrderStatusTag(selectedOrder)}</Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">{formatVietnamTime(selectedOrder.orderDate || selectedOrder.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatVietnamTime(selectedOrder.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatVietnamTime(selectedOrder.expectedReturnTime)}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatVietnamTime(selectedOrder.actualReturnTime)}</Descriptions.Item>
                )}
                {selectedOrder.car && (
                  <>
                    <Descriptions.Item label="Xe">{selectedOrder.car.name} - {selectedOrder.car.model}</Descriptions.Item>
                    <Descriptions.Item label="Giá/ngày">{selectedOrder.car.rentPricePerDay?.toLocaleString('vi-VN')} VNĐ</Descriptions.Item>
                  </>
                )}
                {selectedOrder.user && (
                  <>
                    <Descriptions.Item label="Khách hàng">{selectedOrder.user.fullName || selectedOrder.user.email}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selectedOrder.user.email}</Descriptions.Item>
                  </>
                )}
                {selectedOrder.location && (
                  <Descriptions.Item label="Địa điểm nhận xe" span={2}>
                    {selectedOrder.location.name} - {selectedOrder.location.address}
                  </Descriptions.Item>
                )}
                {selectedOrder.subTotal && (
                  <Descriptions.Item label="Tổng phụ">
                    {selectedOrder.subTotal.toLocaleString('vi-VN')} VNĐ
                  </Descriptions.Item>
                )}
                {selectedOrder.deposit && (
                  <Descriptions.Item label="Tiền cọc">
                    {selectedOrder.deposit.toLocaleString('vi-VN')} VNĐ
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
              </Descriptions>
            </Card>

            {/* Lịch sử thanh toán */}
            {orderHistory?.payments && orderHistory.payments.length > 0 && (
              <Card title="Lịch sử thanh toán" size="small">
                <Table
                  dataSource={orderHistory.payments}
                  rowKey="paymentId"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Loại thanh toán',
                      dataIndex: 'paymentType',
                      key: 'paymentType',
                      render: (text: string) => {
                        const typeMap: Record<string, string> = {
                          'OrderDeposit': 'Tiền giữ chỗ',
                          'CarDeposit': 'Cọc xe',
                          'RentalFee': 'Tiền thuê',
                          'RefundDepositCar': 'Hoàn cọc xe',
                          'RefundDepositOrder': 'Hoàn cọc đơn',
                        };
                        return typeMap[text] || text;
                      }
                    },
                    {
                      title: 'Số tiền',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount: number) => (
                        <span className="font-semibold">
                          {amount?.toLocaleString('vi-VN')} VNĐ
                        </span>
                      )
                    },
                    {
                      title: 'Phương thức',
                      dataIndex: 'paymentMethod',
                      key: 'paymentMethod',
                    },
                    {
                      title: 'Ngày thanh toán',
                      dataIndex: 'paymentDate',
                      key: 'paymentDate',
                      render: (date: string) => formatVietnamTime(date)
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => {
                        const statusMap: Record<string, { text: string; color: string }> = {
                          'Pending': { text: 'Chờ xử lý', color: 'orange' },
                          'Completed': { text: 'Hoàn thành', color: 'green' },
                          'Failed': { text: 'Thất bại', color: 'red' },
                        };
                        const config = statusMap[status] || { text: status, color: 'default' };
                        return <Tag color={config.color}>{config.text}</Tag>;
                      }
                    },
                  ]}
                />
              </Card>
            )}

            {/* Hình ảnh từ delivery và return history */}
            <Card title="Hình ảnh" size="small">
              <div className="space-y-4">
                {/* Hình ảnh giao xe */}
                <div>
                  <h4 className="font-semibold mb-2">Hình ảnh khi giao xe</h4>
                  {orderHistory?.deliveryHistory ? (() => {
                    const delivery = orderHistory.deliveryHistory;
                    // Xử lý cả camelCase và PascalCase
                    const odometerStart = delivery.odometerStart || delivery.OdometerStart || '-';
                    const batteryLevelStart = delivery.batteryLevelStart || delivery.BatteryLevelStart || '-';
                    const vehicleConditionStart = delivery.vehicleConditionStart || delivery.VehicleConditionStart || '-';
                    const images = [
                      delivery.imageUrl || delivery.ImageUrl,
                      delivery.imageUrl2 || delivery.ImageUrl2,
                      delivery.imageUrl3 || delivery.ImageUrl3,
                      delivery.imageUrl4 || delivery.ImageUrl4,
                      delivery.imageUrl5 || delivery.ImageUrl5,
                      delivery.imageUrl6 || delivery.ImageUrl6,
                    ].filter(Boolean);
                    
                    return (
                      <div>
                        <div className="mb-2 text-sm text-gray-600">
                          <div>Số km: {odometerStart} km</div>
                          <div>% Pin: {batteryLevelStart}%</div>
                          <div>Tình trạng: {vehicleConditionStart}</div>
                        </div>
                        {images.length > 0 ? (
                          <Space wrap>
                            {images.map((img, index) => (
                              <Image
                                key={index}
                                src={img}
                                alt={`Giao xe ${index + 1}`}
                                width={150}
                                height={100}
                                style={{ objectFit: 'cover', borderRadius: 8 }}
                              />
                            ))}
                          </Space>
                        ) : (
                          <div className="text-gray-500 text-sm">Không có hình ảnh</div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="text-gray-500 text-sm">Chưa có lịch sử giao xe</div>
                  )}
                </div>
                
                {/* Hình ảnh trả xe */}
                <div>
                  <h4 className="font-semibold mb-2">Hình ảnh khi trả xe</h4>
                  {orderHistory?.returnHistory ? (() => {
                    const returnHistory = orderHistory.returnHistory;
                    // Xử lý cả camelCase và PascalCase
                    const odometerEnd = returnHistory.odometerEnd || returnHistory.OdometerEnd || '-';
                    const batteryLevelEnd = returnHistory.batteryLevelEnd || returnHistory.BatteryLevelEnd || '-';
                    const vehicleConditionEnd = returnHistory.vehicleConditionEnd || returnHistory.VehicleConditionEnd || '-';
                    const images = [
                      returnHistory.imageUrl || returnHistory.ImageUrl,
                      returnHistory.imageUrl2 || returnHistory.ImageUrl2,
                      returnHistory.imageUrl3 || returnHistory.ImageUrl3,
                      returnHistory.imageUrl4 || returnHistory.ImageUrl4,
                      returnHistory.imageUrl5 || returnHistory.ImageUrl5,
                      returnHistory.imageUrl6 || returnHistory.ImageUrl6,
                    ].filter(Boolean);
                    
                    return (
                      <div>
                        <div className="mb-2 text-sm text-gray-600">
                          <div>Số km: {odometerEnd} km</div>
                          <div>% Pin: {batteryLevelEnd}%</div>
                          <div>Tình trạng: {vehicleConditionEnd}</div>
                        </div>
                        {images.length > 0 ? (
                          <Space wrap>
                            {images.map((img, index) => (
                              <Image
                                key={index}
                                src={img}
                                alt={`Trả xe ${index + 1}`}
                                width={150}
                                height={100}
                                style={{ objectFit: 'cover', borderRadius: 8 }}
                              />
                            ))}
                          </Space>
                        ) : (
                          <div className="text-gray-500 text-sm">Không có hình ảnh</div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="text-gray-500 text-sm">Chưa có lịch sử trả xe</div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </Modal>
      )}
    </div>
  );
}
