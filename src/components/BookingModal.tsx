"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Car } from "@/types/car";
import { rentalOrderApi, rentalLocationApi, driverLicenseApi, citizenIdApi, authApi, carsApi } from "@/services/api";
import type { CreateRentalOrderData, RentalLocationData, User, DriverLicenseData, CitizenIdData } from "@/services/api";
import { Form, Input, DatePicker, Select, Switch, Button, message, notification, Upload, Modal, ConfigProvider, Checkbox } from "antd";
import { CheckCircle, XCircle, Upload as UploadIcon, IdCard, MapPin, Phone, Calendar, MapPin as MapPinIcon, User as UserIcon, Sparkles, X } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import { authUtils } from "@/utils/auth";
import { geocodeAddress } from "@/utils/geocode";
import CarMap from "@/components/CarMap";
import Link from "next/link";


const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface BookingModalProps {
  car: Car;
  carAddress?: string | null;
  carCoords?: { lat: number; lng: number } | null;
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

    // Lấy userId từ localStorage
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      message.error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      return;
    }
    const userData = JSON.parse(userStr);
    const userId = userData.id || userData.userId;
    if (!userId) {
      message.error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    setLicenseUploading(true);
    try {
      const licenseData: DriverLicenseData = {
        name: values.licenseName,
        licenseNumber: values.licenseNumber || '',
        imageUrl: licenseImageFront,
        imageUrl2: licenseImageBack,
        userId: userId, // Required by backend
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
          icon: <CheckCircle color="#52c41a" />,
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
          icon: <XCircle color="#ff4d4f" />,
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
        icon: <XCircle color="#ff4d4f" />,
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
          icon: <CheckCircle color="#52c41a" />,
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
          icon: <XCircle color="#ff4d4f" />,
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
        icon: <XCircle color="#ff4d4f" />,
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
            icon={<IdCard size={16} />}
          >
            Giấy phép lái xe {licenseDone && <CheckCircle className="ml-2 text-green-500" />}
          </Button>
          <Button
            type={activeTab === 'citizenId' ? 'primary' : 'default'}
            onClick={() => setActiveTab('citizenId')}
            icon={<IdCard size={16} />}
          >
            Căn cước công dân {citizenIdDone && <CheckCircle className="ml-2 text-green-500" />}
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
                        <UploadIcon style={{ fontSize: 24 }} />
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
                        <UploadIcon style={{ fontSize: 24 }} />
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
                        <UploadIcon style={{ fontSize: 24 }} />
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
                        <UploadIcon style={{ fontSize: 24 }} />
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
            <Form.Item 
              label="Số căn cước công dân" 
              name="citizenIdNumber" 
              rules={[
                { required: true, message: "Nhập số căn cước công dân" },
                { 
                  pattern: /^[0-9]{9,10}$/, 
                  message: "Số căn cước công dân phải có 9-10 chữ số" 
                }
              ]}
            >
              <Input placeholder="Nhập số CCCD (9-10 chữ số)" maxLength={10} />
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

export default function BookingModal({ car, carAddress: initialCarAddress, carCoords: initialCarCoords, isOpen, onClose }: BookingModalProps) {
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
  const [carCoords, setCarCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [carAddress, setCarAddress] = useState<string | null>(null);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [loadingCarLocation, setLoadingCarLocation] = useState(false);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set()); // Lưu các ngày đã được đặt (format: YYYY-MM-DD)

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
      setCarCoords(null);
      setCarAddress(null);
      setSelectedLocationCoords(null);
      setSelectedLocationId(null);
      form.resetFields();
    }
  }, [isOpen, form]);

  // Helper: Parse coordinates từ string
  const parseCoordinates = (coordsString: string | null | undefined): { lat: number; lng: number } | null => {
    if (!coordsString || typeof coordsString !== 'string') return null;
    try {
      const parts = coordsString.trim().split(/[,\s]+/);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.error('Parse coordinates error:', error);
    }
    return null;
  };

  // Helper: Lấy địa chỉ và tọa độ từ car
  const getCarLocation = async (carData: any): Promise<{ address: string | null; coords: { lat: number; lng: number } | null }> => {
    try {
      const rl = carData?.carRentalLocations;
      if (!rl) return { address: null, coords: null };

      const list = Array.isArray(rl) ? rl : rl.$values || [];
      if (!Array.isArray(list) || list.length === 0) return { address: null, coords: null };

      const active = list.find((l: any) => (l?.isActive ?? l?.IsActive) && !(l?.isDeleted ?? l?.IsDeleted)) || list[0];
      
      const address = active?.address ?? active?.Address ?? active?.rentalLocation?.address ?? active?.rentalLocation?.Address;
      const addressStr = typeof address === 'string' && address.trim() ? address.trim() : null;

      let coords: { lat: number; lng: number } | null = null;
      const coordsString = active?.coordinates ?? active?.Coordinates ?? active?.rentalLocation?.coordinates ?? active?.rentalLocation?.Coordinates;
      if (coordsString) {
        coords = parseCoordinates(coordsString);
      }

      if (!coords && addressStr) {
        coords = await geocodeAddress(addressStr);
      }

      return { address: addressStr, coords };
    } catch (error) {
      console.error('Get car location error:', error);
      return { address: null, coords: null };
    }
  };

  // Load user, rental locations và car location
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
          // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
          const raw = locationsResponse.data as any;
          let locations: RentalLocationData[] = [];
          
          if (Array.isArray(raw)) {
            // Format: [...]
            locations = raw;
          } else if (Array.isArray(raw.$values)) {
            // Format: { $values: [...] }
            locations = raw.$values;
          } else if (raw.data && Array.isArray(raw.data.$values)) {
            // Format: { data: { $values: [...] } }
            locations = raw.data.$values;
          } else if (raw.data && Array.isArray(raw.data)) {
            // Format: { data: [...] }
            locations = raw.data;
          }
          
          console.log('[BookingModal] Processed locations:', locations);
          const activeLocations = locations.filter((loc: any) => loc.isActive !== false);
          setRentalLocations(activeLocations);
          
          if (activeLocations.length === 0) {
            message.warning("Không có địa điểm cho thuê nào khả dụng.");
          }
        } else {
          message.error("Không thể tải danh sách địa điểm. Vui lòng thử lại sau.");
        }

        // Load car location (vị trí xe)
        // Nếu đã có từ props, sử dụng luôn (tránh fetch lại)
        if (initialCarAddress) {
          setCarAddress(initialCarAddress);
        }
        if (initialCarCoords) {
          setCarCoords(initialCarCoords);
        }

        // Nếu chưa có, mới fetch
        if (!initialCarAddress || !initialCarCoords) {
          setLoadingCarLocation(true);
          try {
            let carWithLocation = car;
            // Nếu không có carRentalLocations, gọi getById để lấy đầy đủ
            if (!car.carRentalLocations || 
                (Array.isArray(car.carRentalLocations) && car.carRentalLocations.length === 0) ||
                (car.carRentalLocations.$values && car.carRentalLocations.$values.length === 0)) {
              const detailResponse = await carsApi.getById(String(car.id));
              if (detailResponse.success && detailResponse.data) {
                carWithLocation = detailResponse.data;
              }
            }

            const location = await getCarLocation(carWithLocation);
            if (location.address && !initialCarAddress) {
              setCarAddress(location.address);
            }
            if (location.coords && !initialCarCoords) {
              setCarCoords(location.coords);
            }
          } catch (error) {
            console.error('Load car location error:', error);
          } finally {
            setLoadingCarLocation(false);
          }
        }

        // Load các đơn hàng đã xác nhận và đang thuê cho xe này
        try {
          const ordersResponse = await rentalOrderApi.getAll();
          if (ordersResponse.success && ordersResponse.data) {
            const orders = Array.isArray(ordersResponse.data)
              ? ordersResponse.data
              : (ordersResponse.data as any)?.$values || [];
            
            console.log('[BookingModal] Total orders loaded:', orders.length);
            console.log('[BookingModal] Current car.id:', car.id, 'type:', typeof car.id);
            
            // Lọc các đơn hàng của xe này và có status đã xác nhận/đang thuê
            // Status: OrderDepositConfirmed (1), CheckedIn (2), Renting (3)
            const activeOrders = orders.filter((order: any) => {
              // Lấy carId từ nhiều nguồn có thể
              const orderCarId = order.carId ?? order.CarId ?? order.car?.id ?? order.Car?.Id;
              const carIdNum = typeof orderCarId === 'number' ? orderCarId : Number(orderCarId);
              const currentCarIdNum = typeof car.id === 'number' ? car.id : Number(car.id);
              
              // Lấy status và convert sang number
              const status = order.status ?? order.Status;
              let statusNum = 0;
              if (typeof status === 'number') {
                statusNum = status;
              } else if (typeof status === 'string') {
                // Thử parse string status
                const statusLower = status.toLowerCase();
                if (statusLower === 'orderdepositconfirmed' || status === '1') statusNum = 1;
                else if (statusLower === 'checkedin' || status === '2') statusNum = 2;
                else if (statusLower === 'renting' || status === '3') statusNum = 3;
                else {
                  // Thử parse số từ string
                  const parsed = parseInt(status);
                  if (!isNaN(parsed)) statusNum = parsed;
                }
              }
              
              const isMatch = carIdNum === currentCarIdNum && (statusNum === 1 || statusNum === 2 || statusNum === 3);
              
              if (isMatch) {
                console.log('[BookingModal] Found active order:', {
                  orderId: order.id,
                  carId: carIdNum,
                  status: status,
                  statusNum: statusNum,
                  pickupTime: order.pickupTime,
                  expectedReturnTime: order.expectedReturnTime
                });
              }
              
              return isMatch;
            });

            console.log('[BookingModal] Active orders for this car:', activeOrders.length);

            // Tạo Set các ngày đã được đặt (chỉ tính ngày, không tính giờ)
            // Format từ DB: 2025-11-26 22:00:00.0000000
            // Sử dụng dayjs trực tiếp để parse và lấy YYYY-MM-DD
            const datesSet = new Set<string>();
            activeOrders.forEach((order: any) => {
              const pickupTime = order.pickupTime ?? order.PickupTime;
              const expectedReturnTime = order.expectedReturnTime ?? order.ExpectedReturnTime;
              
              if (pickupTime && expectedReturnTime) {
                try {
                  // Parse trực tiếp từ format: 2025-11-26 22:00:00.0000000
                  const pickupDate = dayjs(pickupTime);
                  const returnDate = dayjs(expectedReturnTime);
                  
                  if (pickupDate.isValid() && returnDate.isValid()) {
                    // Lấy tất cả các ngày trong khoảng thời gian thuê (chỉ tính ngày, không tính giờ)
                    let currentDate = pickupDate.startOf('day');
                    const endDate = returnDate.startOf('day');
                    
                    while (currentDate.isSameOrBefore(endDate, 'day')) {
                      const dateStr = currentDate.format('YYYY-MM-DD');
                      datesSet.add(dateStr);
                      currentDate = currentDate.add(1, 'day');
                    }
                  }
                } catch (error) {
                  console.error('[BookingModal] Error processing dates:', error);
                }
              }
            });
            
            setBookedDates(datesSet);
          }
        } catch (error) {
          console.error('[BookingModal] Load booked dates error:', error);
        }
      } catch (error) {
        console.error("Load data error:", error);
        message.error("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
      }
    };

    loadData();
  }, [isOpen, form, car]);

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error("Vui lòng đăng nhập để đặt xe!");
      return;
    }

    setLoading(true);
    try {
      const [pickupTime, expectedReturnTime] = values.dateRange;
      
<<<<<<< HEAD
      // Đảm bảo userId là number
      const userId = Number(user.id || user.userId);
      if (!userId || isNaN(userId)) {
        message.error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }
      
      // Đảm bảo carId là number
      const carIdNum = Number(car.id);
      if (!carIdNum || isNaN(carIdNum)) {
        message.error("Thông tin xe không hợp lệ.");
        setLoading(false);
        return;
      }
=======
      // Format thời gian theo local time (không convert sang UTC)
      // Format: YYYY-MM-DDTHH:mm:ss (local time, không có Z)
      const formatLocalTime = (date: Dayjs) => {
        const year = date.year();
        const month = String(date.month() + 1).padStart(2, '0');
        const day = String(date.date()).padStart(2, '0');
        const hours = String(date.hour()).padStart(2, '0');
        const minutes = String(date.minute()).padStart(2, '0');
        const seconds = String(date.second()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
>>>>>>> origin/tiger_fix_7
      
      const orderData: CreateRentalOrderData = {
        phoneNumber: values.phoneNumber,
        pickupTime: formatLocalTime(pickupTime),
        expectedReturnTime: formatLocalTime(expectedReturnTime),
        withDriver: values.withDriver || false,
        userId: userId,
        carId: carIdNum,
        rentalLocationId: values.rentalLocationId,
      };

      console.log('[BookingModal] Creating order with data:', {
        ...orderData,
        userId: userId,
        carId: carIdNum,
        user: { id: user.id, userId: user.userId, email: user.email }
      });

      const response = await rentalOrderApi.create(orderData);
      
      console.log('[BookingModal] API response:', response);

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
          icon: <CheckCircle color="#52c41a" />,
        });
        message.success("Đơn hàng đã được tạo thành công!");
      } else {
        // Thông báo thất bại
        api.error({
          message: "❌ Tạo đơn hàng thất bại",
          description: response.error || "Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin và thử lại!",
          placement: "topRight",
          duration: 5,
          icon: <XCircle color="#ff4d4f" />,
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
  icon: <XCircle color="#ff4d4f" />,
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
      description: `Đơn hàng của bạn đã được tạo và giấy tờ đã được cập nhật. Nhân viên sẽ xác thực và liên hệ với bạn sớm nhất.`,
      placement: "topRight",
      duration: 6,
  icon: <CheckCircle color="#52c41a" />,
    });
    message.success("Đơn hàng đã được tạo và giấy tờ đã được cập nhật thành công!");
  };

  if (!isOpen) return null;

  return (
    <ConfigProvider>
      {contextHolder}
      {/* Backdrop với blur effect */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300"
        onClick={onClose}
      >
        {/* Modal Container với gradient và shadow */}
        <div 
          className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden relative shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header với gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyMCIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Đặt xe {car.name}</h2>
                  <p className="text-blue-100 text-sm mt-1">Hoàn tất thông tin để đặt xe</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content với scroll */}
          <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
            <div className="p-6 md:p-8">
              {/* Car Info Card với premium design */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-6 border border-slate-200/50 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative flex items-center gap-6">
                  <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-white/50">
                    <img
                      src={car.imageUrl || '/logo_ev.png'}
                      alt={car.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_ev.png';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-2xl text-gray-900">{car.name}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {car.seats} chỗ
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{car.model || 'Xe điện cao cấp'}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {car.rentPricePerDay ? `${car.rentPricePerDay.toLocaleString('vi-VN')}` : 'Liên hệ'}
                      </span>
                      {car.rentPricePerDay && (
                        <span className="text-gray-500 font-medium">VNĐ/ngày</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-5">
              <Form.Item
                label={
                  <span className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Phone className="w-4 h-4 text-blue-600" />
                    Số điện thoại
                  </span>
                }
                name="phoneNumber"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
              >
                <Input 
                  placeholder="Nhập số điện thoại" 
                  size="large"
                  className="rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                  prefix={<Phone className="w-4 h-4 text-gray-400" />}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Thời gian thuê xe
                  </span>
                }
                name="dateRange"
                rules={[{ required: true, message: "Vui lòng chọn thời gian thuê xe" }]}
              >
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  size="large"
                  className="w-full rounded-lg"
                  placeholder={["Thời gian nhận xe", "Thời gian trả xe"]}
                  getPopupContainer={(trigger) => document.body}
                  popupStyle={{ zIndex: 10001 }}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const dateStr = current.format('YYYY-MM-DD');
                    return bookedDates.has(dateStr);
                  }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="flex items-center gap-2 text-gray-700 font-semibold">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                    Địa điểm nhận xe
                  </span>
                }
                name="rentalLocationId"
                rules={[{ required: true, message: "Vui lòng chọn địa điểm nhận xe" }]}
              >
                <Select 
                  placeholder="Chọn địa điểm nhận xe"
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  className="rounded-lg"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                  getPopupContainer={(trigger) => document.body}
                  dropdownStyle={{ zIndex: 10001 }}
                  onChange={(value) => {
                    setSelectedLocationId(value);
                    // Lấy tọa độ của địa điểm được chọn
                    const selectedLocation = rentalLocations.find(loc => loc.id === value);
                    if (selectedLocation?.coordinates) {
                      const coords = parseCoordinates(selectedLocation.coordinates);
                      setSelectedLocationCoords(coords);
                    } else if (selectedLocation?.address) {
                      // Geocode từ address nếu không có coordinates
                      geocodeAddress(selectedLocation.address).then(coords => {
                        setSelectedLocationCoords(coords);
                      });
                    } else {
                      setSelectedLocationCoords(null);
                    }
                  }}
                >
                  {rentalLocations.map((location) => (
                    <Select.Option key={location.id} value={location.id}>
                      {location.name} - {location.address}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Hiển thị vị trí xe và bản đồ */}
              {(carCoords || carAddress) && (
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-5 mb-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="text-white w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-1">Vị trí xe hiện tại</p>
                        <p className="text-sm text-gray-700">{carAddress || "Đang tải địa chỉ..."}</p>
                      </div>
                    </div>
                  </div>
                  {carCoords && (
                    <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                      <CarMap
                        cars={[{
                          ...car,
                          coords: carCoords,
                          primaryAddress: carAddress || undefined
                        }]}
                        center={[carCoords.lat, carCoords.lng]}
                        zoom={14}
                        height={280}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Hiển thị bản đồ khi đã chọn địa điểm nhận xe */}
              {selectedLocationId && selectedLocationCoords && (
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl p-5 mb-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="text-white w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-1">Địa điểm nhận xe đã chọn</p>
                        <p className="text-sm text-gray-700">
                          {rentalLocations.find(loc => loc.id === selectedLocationId)?.name} - {rentalLocations.find(loc => loc.id === selectedLocationId)?.address}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                    <CarMap
                      cars={[{
                        id: 0,
                        name: 'Địa điểm nhận xe',
                        coords: selectedLocationCoords,
                        primaryAddress: rentalLocations.find(loc => loc.id === selectedLocationId)?.address || undefined
                      } as any]}
                      center={[selectedLocationCoords.lat, selectedLocationCoords.lng]}
                      zoom={14}
                      height={280}
                    />
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl p-5 border border-slate-200/50">
                <Form.Item
                  label={
                    <span className="flex items-center gap-2 text-gray-700 font-semibold">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      Thuê kèm tài xế
                    </span>
                  }
                  name="withDriver"
                  valuePropName="checked"
                >
                  <Switch 
                    className="bg-gray-300"
                    checkedChildren="Có"
                    unCheckedChildren="Không"
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="agreeTerms"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(new Error('Vui lòng đồng ý với điều khoản thuê xe để tiếp tục')),
                  },
                ]}
              >
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <Checkbox className="text-gray-700">
                    Tôi đã đọc và đồng ý với{' '}
                    <Link 
                      href="/guides/rental-terms" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      điều khoản thuê xe
                    </Link>
                  </Checkbox>
                </div>
              </Form.Item>

              {!orderCreated ? (
                <div className="flex gap-4 pt-2">
                  <Button
                    onClick={onClose}
                    size="large"
                    className="flex-1 h-12 rounded-xl border-2 border-gray-300 hover:border-gray-400 font-semibold transition-all"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl font-semibold transition-all transform hover:scale-[1.02]"
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận đặt xe'}
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <div className="mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <CheckCircle className="text-white w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-green-800 font-bold text-xl block">
                          Đơn hàng đã được tạo thành công!
                        </span>
                        <p className="text-green-600 text-sm mt-1">
                          Vui lòng cập nhật giấy tờ để hoàn tất đơn hàng.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        onClose();
                        router.push('/profile/documents');
                        message.info("Đang chuyển đến trang hồ sơ để cập nhật giấy tờ...");
                      }}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl font-semibold transition-all"
                      icon={<IdCard size={18} />}
                    >
                      Cập nhật giấy phép
                    </Button>
                  </div>
                  <Button
                    onClick={onClose}
                    size="large"
                    className="w-full h-12 rounded-xl border-2 border-gray-300 hover:border-gray-400 font-semibold transition-all"
                  >
                    Đóng
                  </Button>
                </div>
              )}
            </Form>
            </div>
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
