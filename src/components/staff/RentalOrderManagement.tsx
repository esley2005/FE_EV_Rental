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
  Upload
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
  EditOutlined
} from "@ant-design/icons";
import { rentalOrderApi, carsApi, authApi, driverLicenseApi, citizenIdApi, paymentApi, carDeliveryHistoryApi, carReturnHistoryApi } from "@/services/api";
import type { RentalOrderData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";
import { formatDateTime } from "@/utils/dateFormat";

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
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Nếu chọn "Bắt đầu thuê" (Renting), mở modal nhập thông tin giao xe
    if (newStatus === RentalOrderStatus.Renting) {
      setSelectedOrderForAction(order);
      setDeliveryModalVisible(true);
      return;
    }

    // Nếu chọn "Trả xe" (Returned), mở modal nhập thông tin trả xe
    if (newStatus === RentalOrderStatus.Returned) {
      setSelectedOrderForAction(order);
      setReturnModalVisible(true);
      return;
    }

    // Nếu chọn "Hủy đơn" (Cancelled), sử dụng API cancelOrder
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

    // Các status khác thì cập nhật trực tiếp
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

  // Xử lý giao xe (Bắt đầu thuê)
  const handleDelivery = async (values: any) => {
    if (!selectedOrderForAction) return;

    try {
      setLoading(true);
      const response = await carDeliveryHistoryApi.create({
        deliveryDate: new Date().toISOString(),
        odometerStart: values.odometerStart,
        batteryLevelStart: values.batteryLevelStart,
        vehicleConditionStart: values.vehicleConditionStart || '',
        orderId: selectedOrderForAction.id,
      });

      if (response.success) {
        message.success('Giao xe thành công! Đơn hàng đã chuyển sang trạng thái đang thuê.');
        setDeliveryModalVisible(false);
        deliveryForm.resetFields();
        setSelectedOrderForAction(null);
        await loadOrders();
      } else {
        message.error(response.error || 'Giao xe thất bại');
      }
    } catch (error) {
      console.error('Delivery error:', error);
      message.error('Có lỗi xảy ra khi giao xe');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý trả xe
  const handleReturn = async (values: any) => {
    if (!selectedOrderForAction) return;

    try {
      setLoading(true);
      const response = await carReturnHistoryApi.create({
        returnDate: new Date().toISOString(),
        odometerEnd: values.odometerEnd,
        batteryLevelEnd: values.batteryLevelEnd,
        vehicleConditionEnd: values.vehicleConditionEnd || '',
        orderId: selectedOrderForAction.id,
      });

      if (response.success) {
        message.success('Nhận lại xe thành công! Đơn hàng đã chuyển sang trạng thái đã trả xe.');
        setReturnModalVisible(false);
        returnForm.resetFields();
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
  const handleConfirmTotal = async (orderId: number, currentStatus?: number) => {
    try {
      setLoading(true);
      
      // Gọi confirmTotal trực tiếp
      // Backend sẽ tự động xử lý chuyển status từ Returned sang PaymentPending nếu cần
      const response = await rentalOrderApi.confirmTotal(orderId);
      
      if (response.success) {
        message.success('Xác nhận tổng tiền thành công!');
        await loadOrders();
      } else {
        // Nếu lỗi do status, thử chuyển status trước (nếu backend hỗ trợ)
        if (response.error?.includes('trạng thái') && currentStatus === RentalOrderStatus.Returned) {
          message.warning('Vui lòng đợi backend cập nhật để hỗ trợ chuyển trạng thái tự động');
        }
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
        // Ẩn trạng thái giấy tờ nếu thuê xe có tài xế
        if (record.withDriver) {
          return <Tag color="blue">Có tài xế</Tag>;
        }
        
        const hasPendingDocs = 
          (record.driverLicense && (record.driverLicense.status === '0' || record.driverLicense.status === 'Pending')) ||
          (record.citizenIdDoc && (record.citizenIdDoc.status === '0' || record.citizenIdDoc.status === 'Pending'));
        
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">GPLX:</span> {getDocumentStatusTag(record.driverLicense?.status)}
            </div>
            <div>
              <IdcardOutlined className="mr-1" />
              <span className="text-xs">CCCD:</span> {getDocumentStatusTag(record.citizenIdDoc?.status)}
            </div>
            {hasPendingDocs && (
              <Button 
                type="primary" 
                size="small" 
                icon={<IdcardOutlined />}
                onClick={() => showDocumentVerificationModal(record)}
                block
              >
                Xác thực giấy tờ
              </Button>
            )}
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
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
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
                {(record.extraFee || record.damageFee) && (
                  <Popconfirm
                    title="Xác nhận tổng tiền (tạo payment record)?"
                    description="Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái 'Chờ thanh toán'"
                    onConfirm={() => handleConfirmTotal(record.id, currentStatus)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                  >
                    <Button size="small" type="default" block>
                      Xác nhận tổng tiền
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
            {currentStatus === RentalOrderStatus.PaymentPending && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Popconfirm
                  title="Xác nhận tổng tiền (tạo payment record)?"
                  onConfirm={() => handleConfirmTotal(record.id, currentStatus)}
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
        formatDateTime(record.pickupTime),
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
                <Descriptions.Item label="Ngày đặt">{formatDateTime(selectedOrder.orderDate || selectedOrder.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Có tài xế">
                  {selectedOrder.withDriver ? <Tag color="blue">Có</Tag> : <Tag color="default">Không</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhận xe">{formatDateTime(selectedOrder.pickupTime)}</Descriptions.Item>
                <Descriptions.Item label="Ngày trả xe (dự kiến)">{formatDateTime(selectedOrder.expectedReturnTime)}</Descriptions.Item>
                {selectedOrder.actualReturnTime && (
                  <Descriptions.Item label="Ngày trả xe (thực tế)">{formatDateTime(selectedOrder.actualReturnTime)}</Descriptions.Item>
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
        {selectedLicense ? (
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
        ) : (
          <div className="text-center py-4 text-gray-500">Đang tải thông tin...</div>
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
        {selectedCitizenId ? (
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
              rules={[{ required: true, message: 'Vui lòng nhập số CCCD' }]}
            >
              <Input />
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
        ) : (
          <div className="text-center py-4 text-gray-500">Đang tải thông tin...</div>
        )}
      </Modal>

      {/* Delivery Modal - Giao xe (Bắt đầu thuê) */}
      <Modal
        title="Giao xe - Bắt đầu thuê"
        open={deliveryModalVisible}
        onCancel={() => {
          setDeliveryModalVisible(false);
          deliveryForm.resetFields();
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={600}
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
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              addonAfter="%"
              placeholder="Nhập % pin"
            />
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận giao xe
              </Button>
              <Button onClick={() => {
                setDeliveryModalVisible(false);
                deliveryForm.resetFields();
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
          setSelectedOrderForAction(null);
        }}
        footer={null}
        width={600}
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
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              addonAfter="%"
              placeholder="Nhập % pin khi trả xe"
            />
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận nhận lại xe
              </Button>
              <Button onClick={() => {
                setReturnModalVisible(false);
                returnForm.resetFields();
                setSelectedOrderForAction(null);
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

