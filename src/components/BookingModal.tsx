"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";
import { rentalOrderApi, rentalLocationApi, driverLicenseApi, citizenIdApi, authApi } from "@/services/api";
import type { CreateRentalOrderData, RentalLocationData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import { Form, Input, DatePicker, Select, Switch, Button, message, notification, Upload, Modal, ConfigProvider } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, UploadOutlined, IdcardOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { authUtils } from "@/utils/auth";


const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface BookingModalProps {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentUploadModalProps {
  visible: boolean;
  rentalOrderId: number;
  onComplete: () => void;
  onCancel: () => void;
}

// Modal upload giấy tờ sau khi tạo đơn hàng
function DocumentUploadModal({ visible, rentalOrderId, onComplete, onCancel }: DocumentUploadModalProps) {
  const [api, contextHolder] = notification.useNotification({
    placement: 'topRight',
    top: 24,
    duration: 4,
  });
  const [licenseForm] = Form.useForm();
  const [citizenIdForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'license' | 'citizenId'>('license');
  
  // GPLX states
  const [licenseImageFront, setLicenseImageFront] = useState<string | null>(null);
  const [licenseImageBack, setLicenseImageBack] = useState<string | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  
  // CCCD states
  const [citizenIdImageFront, setCitizenIdImageFront] = useState<string | null>(null);
  const [citizenIdImageBack, setCitizenIdImageBack] = useState<string | null>(null);
  const [citizenIdUploading, setCitizenIdUploading] = useState(false);
  
  const [licenseDone, setLicenseDone] = useState(false);
  const [citizenIdDone, setCitizenIdDone] = useState(false);

  // Upload to Cloudinary
  const handleUploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars';
    
    formData.append('upload_preset', uploadPreset);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error?.message || `Upload failed with status: ${response.status}`;
        throw new Error(errorMsg);
      }
      
      if (data.secure_url) {
        return data.secure_url;
      }
      throw new Error('No secure_url in response');
    } catch (error) {
      console.error('[Upload] Cloudinary upload failed:', error);
      throw error;
    }
  };

  // License upload handlers
  const handleLicenseImageUpload = async (options: any, side: 'front' | 'back') => {
    const { file, onSuccess, onError } = options;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!');
      onError(new Error('Invalid file type'));
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      message.error('Kích thước file không được vượt quá 5MB!');
      onError(new Error('File too large'));
      return;
    }
    
    setLicenseUploading(true);
    
    try {
      const imageUrl = await handleUploadToCloudinary(file);
      if (side === 'front') {
        setLicenseImageFront(imageUrl);
      } else {
        setLicenseImageBack(imageUrl);
      }
      message.success('Upload ảnh thành công!');
      onSuccess(imageUrl);
    } catch (error) {
      message.error('Upload ảnh thất bại!');
      onError(error);
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleSubmitLicense = async (values: any) => {
    if (!licenseImageFront || !licenseImageBack) {
      message.error("Vui lòng tải lên cả 2 mặt của giấy phép lái xe.");
      return;
    }

    setLicenseUploading(true);
    try {
      const licenseData: DriverLicenseData = {
        name: values.licenseName,
        licenseNumber: values.licenseNumber || '',
        imageUrl: licenseImageFront,
        imageUrl2: licenseImageBack,
        rentalOrderId: rentalOrderId, // Sử dụng rentalOrderId từ đơn hàng
      };

      const response = await driverLicenseApi.upload(licenseData);

      if (response.success) {
        setLicenseDone(true);
        api.success({
          message: "✅ Gửi GPLX thành công!",
          description: "Giấy phép lái xe đã được gửi thành công. Vui lòng chuyển sang tab Căn cước công dân để tiếp tục.",
          placement: "topRight",
          duration: 4,
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        message.success("GPLX đã được gửi thành công!");
        // Chuyển sang tab CCCD
        setTimeout(() => {
          setActiveTab('citizenId');
        }, 500);
      } else {
        api.error({
          message: "❌ Tải GPLX thất bại",
          description: response.error || "Không thể tải lên giấy phép lái xe. Vui lòng kiểm tra lại thông tin và thử lại.",
          placement: "topRight",
          duration: 5,
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        message.error("Gửi GPLX thất bại!");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      api.error({ 
        message: "❌ Tải GPLX thất bại",
        description: `Lỗi: ${errorMsg}. Vui lòng thử lại sau.`,
        placement: "topRight",
        duration: 5,
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      message.error("Có lỗi xảy ra khi tải GPLX!");
    } finally {
      setLicenseUploading(false);
    }
  };

  // Citizen ID upload handlers
  const handleCitizenIdImageUpload = async (options: any, side: 'front' | 'back') => {
    const { file, onSuccess, onError } = options;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!');
      onError(new Error('Invalid file type'));
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      message.error('Kích thước file không được vượt quá 5MB!');
      onError(new Error('File too large'));
      return;
    }
    
    setCitizenIdUploading(true);
    
    try {
      const imageUrl = await handleUploadToCloudinary(file);
      if (side === 'front') {
        setCitizenIdImageFront(imageUrl);
      } else {
        setCitizenIdImageBack(imageUrl);
      }
      message.success('Upload ảnh thành công!');
      onSuccess(imageUrl);
    } catch (error) {
      message.error('Upload ảnh thất bại!');
      onError(error);
    } finally {
      setCitizenIdUploading(false);
    }
  };

  const handleSubmitCitizenId = async (values: any) => {
    if (!citizenIdImageFront || !citizenIdImageBack) {
      message.error("Vui lòng tải lên cả 2 mặt của căn cước công dân.");
      return;
    }

    setCitizenIdUploading(true);
    try {
      const citizenIdData: CitizenIdData = {
        name: values.citizenName,
        citizenIdNumber: values.citizenIdNumber,
        birthDate: values.citizenBirthDate ? values.citizenBirthDate.format("YYYY-MM-DD") : "",
        imageUrl: citizenIdImageFront,
        imageUrl2: citizenIdImageBack,
        rentalOrderId: rentalOrderId, // Sử dụng rentalOrderId từ đơn hàng
      };

      const response = await citizenIdApi.upload(citizenIdData);

      if (response.success) {
        setCitizenIdDone(true);
        api.success({
          message: "✅ Gửi CCCD thành công!",
          description: "Căn cước công dân đã được gửi thành công. Vui lòng đợi admin xác thực.",
          placement: "topRight",
          duration: 4,
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        message.success("CCCD đã được gửi thành công!");
        // Cả hai đã xong
        if (licenseDone) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } else {
        api.error({
          message: "❌ Tải CCCD thất bại",
          description: response.error || "Không thể tải lên căn cước công dân. Vui lòng kiểm tra lại thông tin và thử lại.",
          placement: "topRight",
          duration: 5,
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        message.error("Gửi CCCD thất bại!");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      api.error({ 
        message: "❌ Tải CCCD thất bại",
        description: `Lỗi: ${errorMsg}. Vui lòng thử lại sau.`,
        placement: "topRight",
        duration: 5,
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      message.error("Có lỗi xảy ra khi tải CCCD!");
    } finally {
      setCitizenIdUploading(false);
    }
  };

  const canComplete = licenseDone && citizenIdDone;

  console.log("DocumentUploadModal render - visible:", visible, "rentalOrderId:", rentalOrderId);

  return (
    <>
      {contextHolder}
      <Modal
        title="Cập nhật giấy tờ cho đơn hàng"
        open={visible}
        onCancel={canComplete ? onComplete : onCancel}
        footer={null}
        width={800}
        closable={!canComplete}
        maskClosable={false}
        zIndex={10002}
        maskStyle={{ zIndex: 10001 }}
        getContainer={() => document.body}
      >
        <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded text-blue-700 text-sm">
          <strong>Lưu ý:</strong> Vui lòng tải lên cả 2 mặt (mặt trước và mặt sau) của giấy phép lái xe và căn cước công dân.
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            type={activeTab === 'license' ? 'primary' : 'default'}
            onClick={() => setActiveTab('license')}
            icon={<IdcardOutlined />}
          >
            Giấy phép lái xe {licenseDone && <CheckCircleOutlined className="ml-2 text-green-500" />}
          </Button>
          <Button
            type={activeTab === 'citizenId' ? 'primary' : 'default'}
            onClick={() => setActiveTab('citizenId')}
            icon={<IdcardOutlined />}
          >
            Căn cước công dân {citizenIdDone && <CheckCircleOutlined className="ml-2 text-green-500" />}
          </Button>
        </div>

        {activeTab === 'license' && (
          <Form form={licenseForm} layout="vertical" onFinish={handleSubmitLicense}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <Form.Item label="Mặt trước GPLX" required>
                  <Upload
                    listType="picture-card"
                    showUploadList={false}
                    customRequest={(options) => handleLicenseImageUpload(options, 'front')}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  >
                    {licenseImageFront ? (
                      <img src={licenseImageFront} alt="GPLX mặt trước" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <UploadOutlined style={{ fontSize: 24 }} />
                        <div className="text-sm text-gray-500">Mặt trước</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </div>
              <div>
                <Form.Item label="Mặt sau GPLX" required>
                  <Upload
                    listType="picture-card"
                    showUploadList={false}
                    customRequest={(options) => handleLicenseImageUpload(options, 'back')}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  >
                    {licenseImageBack ? (
                      <img src={licenseImageBack} alt="GPLX mặt sau" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <UploadOutlined style={{ fontSize: 24 }} />
                        <div className="text-sm text-gray-500">Mặt sau</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </div>
            </div>
            <Form.Item label="Họ và tên (trên GPLX)" name="licenseName" rules={[{ required: true }]}>
              <Input placeholder="Nhập đầy đủ họ tên" />
            </Form.Item>
            <Form.Item label="Số bằng lái xe" name="licenseNumber">
              <Input placeholder="Nhập số bằng lái xe" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={licenseUploading} block>
              {licenseDone ? "Đã gửi" : "Gửi GPLX"}
            </Button>
          </Form>
        )}

        {activeTab === 'citizenId' && (
          <Form form={citizenIdForm} layout="vertical" onFinish={handleSubmitCitizenId}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <Form.Item label="Mặt trước CCCD" required>
                  <Upload
                    listType="picture-card"
                    showUploadList={false}
                    customRequest={(options) => handleCitizenIdImageUpload(options, 'front')}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  >
                    {citizenIdImageFront ? (
                      <img src={citizenIdImageFront} alt="CCCD mặt trước" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <UploadOutlined style={{ fontSize: 24 }} />
                        <div className="text-sm text-gray-500">Mặt trước</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </div>
              <div>
                <Form.Item label="Mặt sau CCCD" required>
                  <Upload
                    listType="picture-card"
                    showUploadList={false}
                    customRequest={(options) => handleCitizenIdImageUpload(options, 'back')}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  >
                    {citizenIdImageBack ? (
                      <img src={citizenIdImageBack} alt="CCCD mặt sau" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <UploadOutlined style={{ fontSize: 24 }} />
                        <div className="text-sm text-gray-500">Mặt sau</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </div>
            </div>
            <Form.Item label="Họ và tên (trên CCCD)" name="citizenName" rules={[{ required: true }]}>
              <Input placeholder="Nhập đầy đủ họ tên" />
            </Form.Item>
            <Form.Item label="Số căn cước công dân" name="citizenIdNumber" rules={[{ required: true }]}>
              <Input placeholder="Nhập số CCCD" />
            </Form.Item>
            <Form.Item label="Ngày sinh (trên CCCD)" name="citizenBirthDate" rules={[{ required: true }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={citizenIdUploading} block>
              {citizenIdDone ? "Đã gửi" : "Gửi CCCD"}
            </Button>
          </Form>
        )}

        {canComplete && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-700 font-semibold">✓ Đã hoàn tất upload giấy tờ!</p>
            <Button type="primary" block onClick={onComplete} className="mt-2">
              Hoàn tất
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function BookingModal({ car, isOpen, onClose }: BookingModalProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification({
    placement: 'topRight',
    top: 24,
    duration: 4,
  });
  const [loading, setLoading] = useState(false);
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [orderCreated, setOrderCreated] = useState(false); // Track xem đã tạo đơn hàng thành công chưa

  // Debug: Track state changes
  useEffect(() => {
    console.log("BookingModal state changed - showDocumentModal:", showDocumentModal, "createdOrderId:", createdOrderId);
  }, [showDocumentModal, createdOrderId]);

  // Reset state khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      // Reset khi đóng modal
      setOrderCreated(false);
      setCreatedOrderId(null);
      setShowDocumentModal(false);
      form.resetFields();
    }
  }, [isOpen, form]);

  // Load user và rental locations
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        // Load user
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          form.setFieldsValue({
            phoneNumber: userData.phone || "",
          });
        }

        // Load rental locations
        const locationsResponse = await rentalLocationApi.getAll();
        if (locationsResponse.success && locationsResponse.data) {
          const locations = Array.isArray(locationsResponse.data)
            ? locationsResponse.data
            : (locationsResponse.data as any)?.$values || [];
          const activeLocations = locations.filter((loc: any) => loc.isActive !== false);
          setRentalLocations(activeLocations);
          
          if (activeLocations.length === 0) {
            message.warning("Không có địa điểm cho thuê nào khả dụng.");
          }
        } else {
          message.error("Không thể tải danh sách địa điểm. Vui lòng thử lại sau.");
        }
      } catch (error) {
        console.error("Load data error:", error);
        message.error("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
      }
    };

    loadData();
  }, [isOpen, form]);

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error("Vui lòng đăng nhập để đặt xe!");
      return;
    }

    setLoading(true);
    try {
      const [pickupTime, expectedReturnTime] = values.dateRange;
      
      const orderData: CreateRentalOrderData = {
        phoneNumber: values.phoneNumber,
        pickupTime: pickupTime.toISOString(),
        expectedReturnTime: expectedReturnTime.toISOString(),
        withDriver: values.withDriver || false,
        userId: user.id,
        carId: car.id,
        rentalLocationId: values.rentalLocationId,
      };

      const response = await rentalOrderApi.create(orderData);

      if (response.success && response.data) {
        const orderId = (response.data as any).id || (response.data as any).Id;
        setCreatedOrderId(orderId);
        setOrderCreated(true); // Đánh dấu đã tạo đơn hàng thành công
        setShowDocumentModal(true);
        // Thông báo thành công
        api.success({
          message: "✅ Tạo đơn hàng thành công!",
          description: `Đơn hàng #${orderId} đã được tạo thành công. Vui lòng cập nhật giấy tờ để hoàn tất đơn hàng.`,
          placement: "topRight",
          duration: 5,
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        message.success("Đơn hàng đã được tạo thành công!");
      } else {
        // Thông báo thất bại
        api.error({
          message: "❌ Tạo đơn hàng thất bại",
          description: response.error || "Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin và thử lại!",
          placement: "topRight",
          duration: 5,
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        message.error("Tạo đơn hàng thất bại!");
      }
    } catch (error) {
      console.error("Create order error:", error);
      const errorMsg = error instanceof Error ? error.message : "Lỗi không xác định";
      api.error({
        message: "❌ Có lỗi xảy ra",
        description: `Không thể tạo đơn hàng. Lỗi: ${errorMsg}. Vui lòng thử lại sau!`,
        placement: "topRight",
        duration: 5,
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      message.error("Có lỗi xảy ra khi tạo đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentComplete = () => {
    setShowDocumentModal(false);
    const orderId = createdOrderId;
    setCreatedOrderId(null);
    form.resetFields();
    onClose();
    
    // Hiển thị thông báo thành công
    api.success({
      message: "🎉 Hoàn tất đặt xe thành công!",
      description: `Đơn hàng #${orderId} đã được tạo và giấy tờ đã được cập nhật. Admin sẽ xác thực và liên hệ với bạn sớm nhất.`,
      placement: "topRight",
      duration: 6,
      icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
    });
    message.success("Đơn hàng đã được tạo và giấy tờ đã được cập nhật thành công!");
  };

  if (!isOpen) return null;

  return (
    <ConfigProvider>
      {contextHolder}
      <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-[9999] p-4">4
        <div className="bg-gray-300 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Đặt xe {car.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={car.imageUrl || '/logo_ev.png'}
                    alt={car.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{car.name}</h3>
                  <p className="text-gray-600">{car.seats} chỗ</p>
                  <p className="text-blue-600 font-semibold text-lg">
                    {car.rentPricePerDay ? `${car.rentPricePerDay.toLocaleString('vi-VN')} VNĐ/ngày` : 'Liên hệ'}
                  </p>
                </div>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Số điện thoại"
                name="phoneNumber"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>

              <Form.Item
                label="Thời gian thuê xe"
                name="dateRange"
                rules={[{ required: true, message: "Vui lòng chọn thời gian thuê xe" }]}
              >
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder={["Thời gian nhận xe", "Thời gian trả xe"]}
                  getPopupContainer={(trigger) => document.body}
                  popupStyle={{ zIndex: 10001 }}
                />
              </Form.Item>

              <Form.Item
                label="Địa điểm nhận xe"
                name="rentalLocationId"
                rules={[{ required: true, message: "Vui lòng chọn địa điểm nhận xe" }]}
              >
                <Select 
                  placeholder="Chọn địa điểm nhận xe"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                  getPopupContainer={(trigger) => document.body}
                  dropdownStyle={{ zIndex: 10001 }}
                >
                  {rentalLocations.map((location) => (
                    <Select.Option key={location.id} value={location.id}>
                      {location.name} - {location.address}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Thuê kèm tài xế"
                name="withDriver"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              {!orderCreated ? (
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={onClose}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="flex-1 bg-blue-600"
                  >
                    Xác nhận đặt xe
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircleOutlined className="text-green-600 text-xl" />
                      <span className="text-green-700 font-semibold text-lg">
                        Đơn hàng đã được tạo thành công!
                      </span>
                    </div>
                    <p className="text-green-600 text-sm mb-4">
                      Vui lòng cập nhật giấy tờ để hoàn tất đơn hàng.
                    </p>
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        // Đóng modal booking trước
                        onClose();
                        // Chuyển đến trang profile
                        router.push('/profile/documents');
                        message.info("Đang chuyển đến trang hồ sơ để cập nhật giấy tờ...");
                      }}
                      className="w-full bg-blue-600"
                      icon={<IdcardOutlined />}
                    >
                      Cập nhật giấy phép
                    </Button>
                  </div>
                  <Button
                    onClick={onClose}
                    className="w-full"
                  >
                    Đóng
                  </Button>
                </div>
              )}
            </Form>
          </div>
        </div>
      </div>

      {showDocumentModal && createdOrderId && (
        <DocumentUploadModal
          visible={showDocumentModal}
          rentalOrderId={createdOrderId}
          onComplete={handleDocumentComplete}
          onCancel={() => {
            console.log("Cancel document modal");
            setShowDocumentModal(false);
            // Không set createdOrderId = null để giữ lại giá trị cho lần sau
          }}
        />
      )}
    </ConfigProvider>
  );
}
