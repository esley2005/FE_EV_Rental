"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CarOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Card,
  Input,
  Button,
  notification as antdNotification,
  Form,
  Space,
  Upload,
  message,
  Tag,
  DatePicker,
  Select,
  Image,
  Descriptions,
} from "antd";
import { authApi, driverLicenseApi, citizenIdApi, rentalOrderApi, carsApi } from "@/services/api";
import type { User, DriverLicenseData, CitizenIdData, RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";
import dayjs from "dayjs";

const { Content } = Layout;

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [api, contextHolder] = antdNotification.useNotification();

  const [user, setUser] = useState<User | null>(null);
  const [licenseForm] = Form.useForm();
  const [citizenIdForm] = Form.useForm();

  // Order and Car states
  const [orders, setOrders] = useState<(RentalOrderData & { car?: Car })[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // GPLX states - 2 mặt
  const [licenseImageFront, setLicenseImageFront] = useState<string | null>(null);
  const [licenseImageBack, setLicenseImageBack] = useState<string | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState<boolean | null>(null);
  const [hasLicense, setHasLicense] = useState(false);
  const [licenseId, setLicenseId] = useState<number | null>(null);

  // CCCD states - 2 mặt
  const [citizenIdImageFront, setCitizenIdImageFront] = useState<string | null>(null);
  const [citizenIdImageBack, setCitizenIdImageBack] = useState<string | null>(null);
  const [citizenIdUploading, setCitizenIdUploading] = useState(false);
  const [citizenIdVerified, setCitizenIdVerified] = useState<boolean | null>(null);
  const [hasCitizenId, setHasCitizenId] = useState(false);
  const [citizenIdDocId, setCitizenIdDocId] = useState<number | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setTimeout(() => {
            api.warning({
              message: "Chưa đăng nhập",
              description: "Vui lòng đăng nhập để xem thông tin tài khoản!",
              placement: "topRight",
              icon: <WarningOutlined style={{ color: "#faad14" }} />,
            });
          }, 0);
          router.push("/login");
          return;
        }

        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        }

        const response = await authApi.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));

          // Load driver license status
          if (response.data.driverLicenseStatus !== undefined) {
            setLicenseVerified(response.data.driverLicenseStatus === 1);
            setHasLicense(true);
          }

          // Load citizen ID status
          if (response.data.citizenIdStatus !== undefined) {
            setCitizenIdVerified(response.data.citizenIdStatus === 1);
            setHasCitizenId(true);
          }

          // Load existing documents if any
          try {
            const licenseResponse = await driverLicenseApi.getCurrent();
            if (licenseResponse.success && licenseResponse.data) {
              const licenseData = licenseResponse.data as any;
              setHasLicense(true);
              if (licenseData.id) setLicenseId(licenseData.id);
              licenseForm.setFieldsValue({
                licenseName: licenseData.name,
                licenseNumber: licenseData.licenseNumber || "",
              });
              // Load imageUrl và imageUrl2 từ backend
              if (licenseData.imageUrl) {
                setLicenseImageFront(licenseData.imageUrl);
              }
              if (licenseData.imageUrl2) {
                setLicenseImageBack(licenseData.imageUrl2);
              }
            }
          } catch (error) {
            console.log("No existing driver license found");
          }

          try {
            const citizenIdResponse = await citizenIdApi.getCurrent();
            if (citizenIdResponse.success && citizenIdResponse.data) {
              const citizenData = citizenIdResponse.data as any;
              setHasCitizenId(true);
              if (citizenData.id) setCitizenIdDocId(citizenData.id);
              citizenIdForm.setFieldsValue({
                citizenName: citizenData.name,
                citizenIdNumber: citizenData.citizenIdNumber,
                citizenBirthDate: citizenData.birthDate ? dayjs(citizenData.birthDate) : null,
              });
              // Load imageUrl và imageUrl2 từ backend
              if (citizenData.imageUrl) {
                setCitizenIdImageFront(citizenData.imageUrl);
              }
              if (citizenData.imageUrl2) {
                setCitizenIdImageBack(citizenData.imageUrl2);
              }
            }
          } catch (error) {
            console.log("No existing citizen ID found");
          }
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };

    loadUserProfile();
  }, [router, api, licenseForm, citizenIdForm]);

  // Load orders and car info
  useEffect(() => {
    const loadOrders = async () => {
      const userId = user?.id || user?.userId;
      if (!userId || typeof userId !== 'number' || isNaN(userId)) return;
      
      setLoadingOrders(true);
      try {
        const ordersResponse = await rentalOrderApi.getByUserId(userId);
        if (ordersResponse.success && ordersResponse.data) {
          const ordersData = Array.isArray(ordersResponse.data)
            ? ordersResponse.data
            : (ordersResponse.data as any)?.$values || [];
          
          // Load car info for each order
          const ordersWithCars = await Promise.all(
            ordersData.map(async (order: RentalOrderData) => {
              try {
                const carResponse = await carsApi.getById(order.carId.toString());
                if (carResponse.success && carResponse.data) {
                  return { ...order, car: carResponse.data };
                }
              } catch (error) {
                console.error(`Error loading car for order ${order.id}:`, error);
              }
              return order;
            })
          );
          
          setOrders(ordersWithCars);
        }
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrders();
  }, [user]);

  // Load orderId from URL query params
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam && orderIdParam !== 'undefined' && orderIdParam !== 'null') {
      const orderId = parseInt(orderIdParam);
      if (!isNaN(orderId) && orderId > 0) {
        setSelectedOrderId(orderId);
        // Clean URL nếu có orderId=undefined
        if (orderIdParam === 'undefined') {
          router.replace('/profile/documents');
        }
      }
    }
  }, [searchParams, router]);

  // Update selected car when order changes
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (selectedOrder?.car) {
        setSelectedCar(selectedOrder.car);
      } else {
        setSelectedCar(null);
      }
    } else {
      setSelectedCar(null);
    }
  }, [selectedOrderId, orders]);

  // ================== Upload to Cloudinary ==================
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

  // ================== GPLX upload logic ==================
  const handleLicenseImageUpload = async (options: any, side: 'front' | 'back') => {
    const { file, onSuccess, onError } = options;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!');
      onError(new Error('Invalid file type'));
      return;
    }
    
    // Validate file size (max 5MB)
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
      api.success({
        message: 'Upload ảnh thành công!',
        description: 'Ảnh đã được tải lên Cloudinary.',
        placement: 'topRight',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
      onSuccess(imageUrl);
    } catch (error) {
      api.error({
        message: 'Upload ảnh thất bại!',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra config Cloudinary và thử lại.',
        placement: 'topRight',
      });
      onError(error);
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleSubmitLicense = async (values: any) => {
    console.log('handleSubmitLicense called with values:', values);
    console.log('licenseImageFront:', licenseImageFront);
    console.log('licenseImageBack:', licenseImageBack);
    console.log('selectedOrderId:', selectedOrderId);
    console.log('user?.id:', user?.id);
    
    if (!licenseImageFront || !licenseImageBack) {
      message.error("Vui lòng tải lên cả 2 mặt của giấy phép lái xe.");
      return;
    }

    if (!selectedOrderId) {
      message.error("Vui lòng chọn đơn hàng thuê xe.");
      return;
    }

    // Lấy userId từ nhiều nguồn có thể
    let userId: number | null = null;
    
    // Thử từ user object
    if (user) {
      userId = (user as any).id || (user as any).userId || (user as any).Id || (user as any).UserId;
    }
    
    // Nếu không có, thử lấy từ localStorage
    if (!userId || userId === 0) {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (userStr) {
          const userData = JSON.parse(userStr);
          userId = userData.id || userData.userId || userData.Id || userData.UserId;
        }
      } catch (e) {
        console.error('[handleSubmitLicense] Error parsing user from localStorage:', e);
      }
    }
    
    console.log('[handleSubmitLicense] Final userId:', userId);
    
    if (!userId || userId === 0) {
      message.error("Không tìm thấy User ID. Vui lòng đăng nhập lại.");
      console.error('[handleSubmitLicense] Invalid userId:', userId);
      return;
    }

    setLicenseUploading(true);
    try {
      console.log('Starting API call...');

      // Request body theo đúng curl command: chỉ có name, licenseNumber, imageUrl, imageUrl2, userId
      const licenseData: DriverLicenseData = {
        name: values.licenseName,
        licenseNumber: values.licenseNumber || '',
        imageUrl: licenseImageFront, // Mặt trước
        imageUrl2: licenseImageBack, // Mặt sau
        userId: userId, // Required by backend - phải có giá trị hợp lệ
        // Không gửi rentalOrderId theo curl command
      };

      // Luôn gọi API Create, backend sẽ tự xử lý create hoặc update nếu đã tồn tại
      console.log('Calling API with licenseData:', licenseData);
      const response = await driverLicenseApi.upload(licenseData);
      console.log('API response:', response);

      if (response.success) {
        setLicenseVerified(false); // Will be verified by admin
        setHasLicense(true);
        api.success({
          message: "Gửi GPLX thành công",
          description: "Yêu cầu xác thực GPLX đã được gửi, admin sẽ kiểm tra.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
      } else {
        api.error({
          message: "Tải GPLX thất bại",
          description: response.error || "Không thể tải lên giấy phép lái xe.",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (e) {
      console.error('Error in handleSubmitLicense:', e);
      api.error({ 
        message: "Tải GPLX thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra khi tải lên giấy phép lái xe.",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLicenseUploading(false);
    }
  };

  // ================== CCCD upload logic ==================
  const handleCitizenIdImageUpload = async (options: any, side: 'front' | 'back') => {
    const { file, onSuccess, onError } = options;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!');
      onError(new Error('Invalid file type'));
      return;
    }
    
    // Validate file size (max 5MB)
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
      api.success({
        message: 'Upload ảnh thành công!',
        description: 'Ảnh đã được tải lên Cloudinary.',
        placement: 'topRight',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
      onSuccess(imageUrl);
    } catch (error) {
      api.error({
        message: 'Upload ảnh thất bại!',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra config Cloudinary và thử lại.',
        placement: 'topRight',
      });
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

    if (!selectedOrderId) {
      message.error("Vui lòng chọn đơn hàng thuê xe.");
      return;
    }

    setCitizenIdUploading(true);
    try {
      // Sử dụng selectedOrderId đã chọn
      const citizenIdData: CitizenIdData = {
        name: values.citizenName,
        citizenIdNumber: values.citizenIdNumber,
        birthDate: values.citizenBirthDate ? values.citizenBirthDate.format("YYYY-MM-DD") : "",
        imageUrl: citizenIdImageFront, // Mặt trước
        imageUrl2: citizenIdImageBack, // Mặt sau
        rentalOrderId: selectedOrderId, // Sử dụng order đã chọn
      };

      const response = hasCitizenId && citizenIdDocId !== null
        ? await citizenIdApi.update({ ...citizenIdData, id: citizenIdDocId })
        : await citizenIdApi.upload(citizenIdData);

      if (response.success) {
        setCitizenIdVerified(false); // Will be verified by admin
        setHasCitizenId(true);
        api.success({
          message: "Gửi CCCD thành công",
          description: "Yêu cầu xác thực CCCD đã được gửi, admin sẽ kiểm tra.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
      } else {
        api.error({
          message: "Tải CCCD thất bại",
          description: response.error || "Không thể tải lên căn cước công dân.",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (e) {
      api.error({ 
        message: "Tải CCCD thất bại",
        description: "Có lỗi xảy ra khi tải lên căn cước công dân.",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setCitizenIdUploading(false);
    }
  };

  // ================== RENDER ==================
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen bg-gray-50 text-gray-900">
      {contextHolder}

      <div className="flex mt-20">
        {/* Main Content */}
        <Content style={{ margin: "24px auto", padding: "24px", width: "100%", maxWidth: 1000 }}>
          {/* Back Button */}
          {/* <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/profile")}
            className="mb-4"
          >
            Quay lại trang cá nhân
          </Button> */}

          <h1 className="text-3xl font-bold mb-6">Upload Giấy Tờ</h1>

          {/* === SELECT ORDER CARD === */}
          <div style={{ width: "100%", marginBottom: 18 }}>
            <Card title={<><CarOutlined /> Chọn đơn hàng thuê xe</>} className="shadow-lg rounded-xl">
              <Form.Item label="Đơn hàng" required>
                <Select
                  placeholder="Chọn đơn hàng thuê xe"
                  value={selectedOrderId}
                  onChange={(value) => setSelectedOrderId(value)}
                  loading={loadingOrders}
                  style={{ width: "100%" }}
                  size="large"
                >
                  {orders.map((order) => (
                    <Select.Option key={order.id} value={order.id}>
                      {order.car
                        ? `${order.car.name} - Đơn hàng #${order.id} `
                        : `Đơn hàng #${order.id} `}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedCar && (
                <Card className="mt-4" style={{ backgroundColor: "#f9fafb" }}>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <Image
                        src={selectedCar.imageUrl}
                        alt={selectedCar.name}
                        width={200}
                        height={150}
                        style={{ objectFit: "cover", borderRadius: 8 }}
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ddd' width='200' height='150'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{selectedCar.name}</h3>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Model">{selectedCar.model}</Descriptions.Item>
                        <Descriptions.Item label="Số chỗ ngồi">{selectedCar.seats}</Descriptions.Item>
                        <Descriptions.Item label="Loại pin">{selectedCar.batteryType}</Descriptions.Item>
                        <Descriptions.Item label="Giá thuê/ngày">
                          {selectedCar.rentPricePerDay?.toLocaleString("vi-VN")} VNĐ
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                  </div>
                </Card>
              )}

              {!selectedOrderId && orders.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-4 text-yellow-700 text-sm">
                  <strong>Lưu ý:</strong> Vui lòng chọn đơn hàng thuê xe để upload giấy tờ.
                </div>
              )}

              {orders.length === 0 && !loadingOrders && (
                <div className="bg-gray-50 border border-gray-200 p-3 rounded mt-4 text-gray-600 text-sm">
                  Bạn chưa có đơn hàng nào. Vui lòng đặt thuê xe trước.
                </div>
              )}
            </Card>
          </div>

          {/* === GPLX CARD === */}
          <div style={{ width: "100%", marginBottom: 18 }}>
            <Card title={<><IdcardOutlined /> Giấy phép lái xe</>} className="shadow-lg rounded-xl">
              <div className="mb-3">
                <Tag color={licenseVerified === true ? "success" : licenseVerified === false ? "error" : "default"}>
                  {licenseVerified === true ? "Đã xác thực" : licenseVerified === false ? "Chưa xác thực" : "Chưa gửi"}
                </Tag>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded mb-4 text-blue-700 text-sm">
                <strong>Lưu ý:</strong> Vui lòng tải lên cả 2 mặt (mặt trước và mặt sau) của giấy phép lái xe. 
                Mỗi lần thuê xe sẽ yêu cầu upload lại giấy tờ mới.
              </div>

              <Form form={licenseForm} layout="vertical" onFinish={handleSubmitLicense}>
                {!selectedOrderId && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded mb-4 text-red-700 text-sm">
                    <strong>Chú ý:</strong> Vui lòng chọn đơn hàng thuê xe ở trên trước khi upload giấy tờ.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Upload mặt trước */}
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

                  {/* Upload mặt sau */}
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

                {/* Info fields */}
                <Form.Item label="Họ và tên (trên GPLX)" name="licenseName" rules={[{ required: true, message: "Nhập họ tên trên GPLX" }]}>
                  <Input placeholder="Nhập đầy đủ họ tên" />
                </Form.Item>

                <Form.Item label="Số bằng lái xe" name="licenseNumber">
                  <Input placeholder="Nhập số bằng lái xe" />
                </Form.Item>

                <div className="flex gap-3 mt-4">
                  <Button type="default" onClick={() => { 
                    licenseForm.resetFields(); 
                    setLicenseImageFront(null); 
                    setLicenseImageBack(null); 
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={licenseUploading} 
                    className="bg-green-600"
                    disabled={!selectedOrderId}
                    onClick={() => {
                      console.log('Submit button clicked');
                      console.log('Form values:', licenseForm.getFieldsValue());
                    }}
                  >
                    {hasLicense ? "Cập nhật" : "Gửi xác thực"}
                  </Button>
                </div>
              </Form>
            </Card>
          </div>

          {/* === CCCD CARD === */}
          <div style={{ width: "100%" }}>
            <Card title={<><IdcardOutlined /> Căn cước công dân</>} className="shadow-lg rounded-xl">
              <div className="mb-3">
                <Tag color={citizenIdVerified === true ? "success" : citizenIdVerified === false ? "error" : "default"}>
                  {citizenIdVerified === true ? "Đã xác thực" : citizenIdVerified === false ? "Chưa xác thực" : "Chưa gửi"}
                </Tag>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded mb-4 text-blue-700 text-sm">
                <strong>Lưu ý:</strong> Vui lòng tải lên cả 2 mặt (mặt trước và mặt sau) của căn cước công dân. 
                Mỗi lần thuê xe sẽ yêu cầu upload lại giấy tờ mới.
              </div>

              <Form form={citizenIdForm} layout="vertical" onFinish={handleSubmitCitizenId}>
                {!selectedOrderId && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded mb-4 text-red-700 text-sm">
                    <strong>Chú ý:</strong> Vui lòng chọn đơn hàng thuê xe ở trên trước khi upload giấy tờ.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Upload mặt trước */}
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

                  {/* Upload mặt sau */}
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

                {/* Info fields */}
                <Form.Item label="Họ và tên (trên CCCD)" name="citizenName" rules={[{ required: true, message: "Nhập họ tên trên CCCD" }]}>
                  <Input placeholder="Nhập đầy đủ họ tên" />
                </Form.Item>

                <Form.Item label="Số căn cước công dân" name="citizenIdNumber" rules={[{ required: true, message: "Nhập số căn cước công dân" }]}>
                  <Input placeholder="Nhập số CCCD" />
                </Form.Item>

                <Form.Item 
                  label="Ngày sinh (trên CCCD)" 
                  name="citizenBirthDate" 
                  rules={[
                    { required: true, message: "Chọn ngày sinh" },
                    {
                      validator: (_, value) => {
                        if (!value) {
                          return Promise.resolve();
                        }
                        const birthDate = dayjs(value);
                        const today = dayjs();
                        const age = today.diff(birthDate, 'year');
                        
                        if (age < 18) {
                          return Promise.reject(new Error("Bạn phải đủ 18 tuổi trở lên để thuê xe!"));
                        }
                        
                        // Kiểm tra ngày sinh không được trong tương lai
                        if (birthDate.isAfter(today)) {
                          return Promise.reject(new Error("Ngày sinh không được trong tương lai!"));
                        }
                        
                        // Kiểm tra ngày sinh không quá cũ (ví dụ: hơn 100 năm)
                        if (age > 100) {
                          return Promise.reject(new Error("Ngày sinh không hợp lệ!"));
                        }
                        
                        return Promise.resolve();
                      }
                    }
                  ]}
                  help="Bạn phải đủ 18 tuổi trở lên để thuê xe"
                >
                  <DatePicker 
                    className="w-full" 
                    format="DD/MM/YYYY" 
                    placeholder="Chọn ngày sinh"
                    disabledDate={(current) => {
                      // Chỉ disable các ngày trong tương lai, không chặn ngày khiến tuổi < 18
                      // Validation tuổi sẽ được kiểm tra sau khi chọn (trong validator)
                      if (current && current > dayjs().endOf('day')) {
                        return true;
                      }
                      // Không disable các ngày khiến tuổi < 18, để người dùng có thể chọn
                      // Validation sẽ hiển thị lỗi sau khi chọn nếu tuổi < 18
                      return false;
                    }}
                  />
                </Form.Item>

                <div className="flex gap-3 mt-4">
                  <Button type="default" onClick={() => { 
                    citizenIdForm.resetFields(); 
                    setCitizenIdImageFront(null); 
                    setCitizenIdImageBack(null); 
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={citizenIdUploading} 
                    className="bg-green-600"
                    disabled={!selectedOrderId}
                  >
                    {hasCitizenId ? "Cập nhật" : "Gửi xác thực"}
                  </Button>
                </div>
              </Form>
            </Card>
          </div>
        </Content>
      </div>
    </Layout>
  );
}

