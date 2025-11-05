"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ArrowLeftOutlined,
  HeartOutlined,
  UploadOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Card,
  Input,
  Button,
  notification as antdNotification,
  Tabs,
  Avatar,
  Descriptions,
  Form,
  DatePicker,
  Space,
  Upload,
  message,
  Tag,
} from "antd";
import { authApi, driverLicenseApi, citizenIdApi } from "@/services/api";
import type { User, UpdateProfileData, ChangePasswordData, DriverLicenseData, CitizenIdData } from "@/services/api";
import dayjs from "dayjs";

const { Content } = Layout;

export default function ProfilePage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [licenseForm] = Form.useForm();
  const [citizenIdForm] = Form.useForm();

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

  // ================== KEEP your existing data-loading logic ==================
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
          profileForm.setFieldsValue({
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone || "",
            address: userData.address || "",
            dateOfBirth: userData.dateOfBirth ? dayjs(userData.dateOfBirth) : null,
          });
        }

        const response = await authApi.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
          profileForm.setFieldsValue({
            fullName: response.data.fullName,
            email: response.data.email,
            phone: response.data.phone || "",
            address: response.data.address || "",
            dateOfBirth: response.data.dateOfBirth ? dayjs(response.data.dateOfBirth) : null,
          });
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
  }, [router, api, profileForm, licenseForm, citizenIdForm]);

  // ================== KEEP your existing handlers ==================
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      const updateData: UpdateProfileData = {
        fullName: values.fullName,
        phone: values.phone,
        address: values.address,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
      };

      const response = await authApi.updateProfile(updateData);

      if (response.success) {
        api.success({
          message: "Cập nhật thành công!",
          description: "Thông tin tài khoản đã được cập nhật.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });

        if (response.data) {
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        }
        setEditing(false);
      } else {
        api.error({
          message: "Cập nhật thất bại",
          description: response.error || "Không thể cập nhật thông tin!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Update profile error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể cập nhật thông tin. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: ChangePasswordData) => {
    setLoading(true);
    try {
      const response = await authApi.changePassword(values);

      if (response.success) {
        api.success({
          message: "Đổi mật khẩu thành công!",
          description: "Mật khẩu của bạn đã được cập nhật.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
        password_form_reset();
      } else {
        api.error({
          message: "Đổi mật khẩu thất bại",
          description: response.error || "Mật khẩu cũ không đúng hoặc có lỗi xảy ra!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error) {
      console.error("Change password error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể đổi mật khẩu. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // helper because passwordForm is declared above
  const password_form_reset = () => passwordForm.resetFields();

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
    if (!licenseImageFront || !licenseImageBack) {
      message.error("Vui lòng tải lên cả 2 mặt của giấy phép lái xe.");
      return;
    }

    setLicenseUploading(true);
    try {
      // Gửi ImageUrl và ImageUrl2 riêng biệt (theo backend)
      // Mỗi lần thuê xe sẽ upload lại giấy tờ với RentalOrderId mới
      const licenseData: DriverLicenseData = {
        name: values.licenseName,
        licenseNumber: values.licenseNumber || '',
        imageUrl: licenseImageFront, // Mặt trước
        imageUrl2: licenseImageBack, // Mặt sau
        rentalOrderId: 0, // 0 = chưa có đơn thuê, sẽ được gán khi đặt xe
      };

      const response = hasLicense && licenseId !== null
        ? await driverLicenseApi.update({ ...licenseData, id: licenseId })
        : await driverLicenseApi.upload(licenseData);

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
      api.error({ 
        message: "Tải GPLX thất bại",
        description: "Có lỗi xảy ra khi tải lên giấy phép lái xe.",
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

    setCitizenIdUploading(true);
    try {
      // Gửi ImageUrl và ImageUrl2 riêng biệt (theo backend)
      // Mỗi lần thuê xe sẽ upload lại giấy tờ với RentalOrderId mới
      const citizenIdData: CitizenIdData = {
        name: values.citizenName,
        citizenIdNumber: values.citizenIdNumber,
        birthDate: values.citizenBirthDate ? values.citizenBirthDate.format("YYYY-MM-DD") : "",
        imageUrl: citizenIdImageFront, // Mặt trước
        imageUrl2: citizenIdImageBack, // Mặt sau
        rentalOrderId: 0, // 0 = chưa có đơn thuê, sẽ được gán khi đặt xe
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
        {/* Sidebar (kept simple) */}
        <aside className="w-64 bg-white border-r shadow-sm p-6 h-[calc(100vh-80px)] fixed left-0 top-20">
          <h2 className="text-2xl font-bold mb-4">Xin chào bạn!</h2>
          <nav className="flex flex-col space-y-2">
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-green-600 bg-green-50 font-medium">
              <UserOutlined />
              <span>Tài khoản của tôi</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">
              <HomeOutlined />
              <span>Quản lý cho thuê</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">
              <HeartOutlined />
              <span>Xe yêu thích</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <Content style={{ marginLeft: "17rem", padding: "24px", width: "100%" }}>
          {/* === SUMMARY CARD (avatar, name, email, small meta) === */}
          <div style={{ width: "100%", maxWidth: 1000, marginBottom: 18 }}>
            <Card className="shadow-lg rounded-xl">
              <div className="flex items-start gap-6">
                <div>
                  <Avatar
                    size={96}
                    icon={<UserOutlined />}
                    src={user.avatar}
                    className="border"
                  />
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{user.fullName}</h2>
                  <p className="text-gray-600 mb-2">{user.email}</p>

                  <div className="flex gap-4 items-center">
                    <div>
                      <div className="text-sm text-gray-500">Tham gia</div>
                      <div className="font-medium">{dayjs(user.createdAt).format("DD/MM/YYYY")}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">Điểm</div>
                      <div className="font-medium">0 điểm</div>
                    </div>

                    <div className="ml-auto flex gap-2">
                      {/* small status tag - license verification state */}
                      {licenseVerified === true && <Tag color="success">GPLX: Đã xác thực</Tag>}
                      {licenseVerified === false && <Tag color="error">GPLX: Chưa xác thực</Tag>}
                      {licenseVerified === null && <Tag color="default">GPLX: Chưa gửi</Tag>}
                      
                      {/* Citizen ID status */}
                      {citizenIdVerified === true && <Tag color="success">CCCD: Đã xác thực</Tag>}
                      {citizenIdVerified === false && <Tag color="error">CCCD: Chưa xác thực</Tag>}
                      {citizenIdVerified === null && <Tag color="default">CCCD: Chưa gửi</Tag>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* === TABS (Thông tin cá nhân + Đổi mật khẩu) === */}
          <div style={{ width: "100%", maxWidth: 1000, marginBottom: 18 }}>
            <Card className="shadow-lg rounded-xl">
              <Tabs
                defaultActiveKey="1"
                items={[
                  {
                    key: "1",
                    label: (
                      <span>
                        <UserOutlined /> Thông tin cá nhân
                      </span>
                    ),
                    children: (
                      <div>
                        {!editing ? (
                          <>
                            <Descriptions column={1} bordered>
                              <Descriptions.Item label="Họ và tên">{user.fullName}</Descriptions.Item>
                              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                              <Descriptions.Item label="Số điện thoại">
                                {user.phone || "Chưa cập nhật"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Địa chỉ">
                                {user.address || "Chưa cập nhật"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ngày sinh">
                                {user.dateOfBirth ? dayjs(user.dateOfBirth).format("DD/MM/YYYY") : "Chưa cập nhật"}
                              </Descriptions.Item>
                            </Descriptions>
                            <Button
                              type="primary"
                              icon={<EditOutlined />}
                              onClick={() => setEditing(true)}
                              className="mt-4 bg-blue-600 hover:bg-blue-700"
                            >
                              Chỉnh sửa thông tin
                            </Button>
                          </>
                        ) : (
                          <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                            <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true }]}>
                              <Input size="large" prefix={<UserOutlined />} />
                            </Form.Item>
                            <Form.Item label="Email" name="email">
                              <Input size="large" prefix={<MailOutlined />} disabled />
                            </Form.Item>
                            <Form.Item label="Số điện thoại" name="phone">
                              <Input size="large" prefix={<PhoneOutlined />} />
                            </Form.Item>
                            <Form.Item label="Địa chỉ" name="address">
                              <Input.TextArea rows={2} />
                            </Form.Item>
                            <Form.Item label="Ngày sinh" name="dateOfBirth">
                              <DatePicker size="large" className="w-full" format="DD/MM/YYYY" />
                            </Form.Item>
                            <Space>
                              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} className="bg-blue-600">
                                Lưu thay đổi
                              </Button>
                              <Button icon={<CloseOutlined />} onClick={() => { setEditing(false); profileForm.resetFields(); }}>
                                Hủy
                              </Button>
                            </Space>
                          </Form>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "2",
                    label: (
                      <span>
                        <LockOutlined /> Đổi mật khẩu
                      </span>
                    ),
                    children: (
                      <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                        <Form.Item label="Mật khẩu hiện tại" name="oldPassword" rules={[{ required: true }]}>
                          <Input.Password size="large" prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, min: 6 }]}>
                          <Input.Password size="large" prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item
                          label="Xác nhận mật khẩu mới"
                          name="confirmPassword"
                          dependencies={["newPassword"]}
                          rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                                return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                              },
                            }),
                          ]}
                        >
                          <Input.Password size="large" prefix={<LockOutlined />} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} className="bg-blue-600">
                          Đổi mật khẩu
                        </Button>
                      </Form>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          {/* === GPLX CARD (separate, under tabs) === */}
          <div style={{ width: "100%", maxWidth: 1000, marginBottom: 18 }}>
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
                  <Button type="primary" htmlType="submit" loading={licenseUploading} className="bg-green-600">
                    {hasLicense ? "Cập nhật" : "Gửi xác thực"}
                  </Button>
                </div>
              </Form>
            </Card>
          </div>

          {/* === CCCD CARD === */}
          <div style={{ width: "100%", maxWidth: 1000 }}>
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

                <Form.Item label="Ngày sinh (trên CCCD)" name="citizenBirthDate" rules={[{ required: true, message: "Chọn ngày sinh" }]}>
                  <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
                </Form.Item>

                <div className="flex gap-3 mt-4">
                  <Button type="default" onClick={() => { 
                    citizenIdForm.resetFields(); 
                    setCitizenIdImageFront(null); 
                    setCitizenIdImageBack(null); 
                  }}>
                    Hủy
                  </Button>
                  <Button type="primary" htmlType="submit" loading={citizenIdUploading} className="bg-green-600">
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
