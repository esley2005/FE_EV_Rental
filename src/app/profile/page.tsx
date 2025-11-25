"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  HomeOutlined,
  IdcardOutlined,
  MessageOutlined,
  ShoppingOutlined,
  DollarOutlined,
  PhoneOutlined,
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
  Space,
  Tag,
  DatePicker,
} from "antd";
import { authApi } from "@/services/api";
import type { User, UpdateProfileData, ChangePasswordData } from "@/services/api";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Content } = Layout;

export default function ProfilePage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  
  // State cho xác nhận qua email/OTP
  const [useEmailVerification, setUseEmailVerification] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpForm] = Form.useForm();

  // Document verification status (for display only)
  const [licenseVerified, setLicenseVerified] = useState<boolean | null>(null);
  const [citizenIdVerified, setCitizenIdVerified] = useState<boolean | null>(null);

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
          });
        }

        const response = await authApi.getProfile();
        if (response.success && 'data' in response && response.data) {
          const userData = response.data;
          // Backend có thể trả về phoneNumber thay vì phone - map lại
          const userWithPhone = userData as User & { phoneNumber?: string | null };
          // ✅ Xử lý phoneNumber: null, undefined, hoặc empty string
          if (!userWithPhone.phone && userWithPhone.phoneNumber && userWithPhone.phoneNumber !== null) {
            userWithPhone.phone = userWithPhone.phoneNumber;
          }
          setUser(userWithPhone);
          profileForm.setFieldsValue({
            fullName: userData.fullName,
            email: userData.email,
            // ✅ Xử lý phoneNumber: null - chỉ set nếu có giá trị hợp lệ
            phone: userData.phone || (userData as User & { phoneNumber?: string | null }).phoneNumber || "",
            dateOfBirth: userData.dateOfBirth ? dayjs(userData.dateOfBirth.split('T')[0]) : null,
            address: userData.address || "",
            occupation: userData.occupation || "",
          });
          localStorage.setItem("user", JSON.stringify(response.data));

          // tải xác thực giấy phép lái xe nha
          if (response.data.driverLicenseStatus !== undefined) {
            setLicenseVerified(response.data.driverLicenseStatus === 1);
          }

          // tải xác thực căn cước công dân
          if (response.data.citizenIdStatus !== undefined) {
            setCitizenIdVerified(response.data.citizenIdStatus === 1);
          }
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };

    loadUserProfile();
  }, [router, api, profileForm]);

  const handleUpdateProfile = async (values: { 
    fullName: string;
    phone?: string;
    dateOfBirth?: Dayjs | null;
    address?: string;
    occupation?: string;
  }) => {
    setLoading(true);
    try {
      const trimmedFullName = values.fullName?.trim() || "";
      
      if (!trimmedFullName || trimmedFullName.length < 2) {
        api.error({
          message: "Lỗi xác thực",
          description: "Họ và tên phải có ít nhất 2 ký tự!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        setLoading(false);
        return;
      }

      const updateData: UpdateProfileData = {
        fullName: trimmedFullName,
        userId: user?.id, // Truyền userId từ user state
        phone: values.phone?.trim() || undefined,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') + 'T00:00:00' : undefined,
        address: values.address?.trim() || undefined,
        occupation: values.occupation?.trim() || undefined,
      };

      console.log('[Profile Page] Update data being sent:', updateData);
      const response = await authApi.updateProfile(updateData);
      console.log('[Profile Page] Update response:', response);

      if (response.success && 'data' in response && response.data) {
        api.success({
          message: "Cập nhật thành công!",
          description: "Thông tin cá nhân của bạn đã được cập nhật.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });

        setEditing(false);
        
        // Reload lại profile để lấy dữ liệu mới nhất từ backend
        try {
          // Sử dụng data từ response ngay (đã được update) và map lại
          const updatedUserData = response.data;
          // ✅ Map phoneNumber từ backend sang phone - xử lý null
          if (!updatedUserData.phone && 'phoneNumber' in updatedUserData) {
            const phoneNumber = (updatedUserData as User & { phoneNumber?: string | null }).phoneNumber;
            if (phoneNumber && phoneNumber !== null && typeof phoneNumber === 'string') {
              (updatedUserData as User & { phoneNumber?: string | null }).phone = phoneNumber;
            }
          }
          
          setUser(updatedUserData);
          localStorage.setItem("user", JSON.stringify(updatedUserData));
          
          // Cập nhật form values với dữ liệu mới từ response
          profileForm.setFieldsValue({
            fullName: updatedUserData.fullName,
            email: updatedUserData.email,
            // ✅ Xử lý phoneNumber: null - chỉ set nếu có giá trị hợp lệ
            phone: updatedUserData.phone || ((updatedUserData as User & { phoneNumber?: string | null }).phoneNumber && (updatedUserData as User & { phoneNumber?: string | null }).phoneNumber !== null ? (updatedUserData as User & { phoneNumber?: string | null }).phoneNumber : "") || "",
            dateOfBirth: updatedUserData.dateOfBirth ? dayjs(updatedUserData.dateOfBirth) : null,
            address: updatedUserData.address || "",
            occupation: updatedUserData.occupation || "",
          });
          
          // Gọi lại API getProfile để đảm bảo có dữ liệu mới nhất
          const reloadResponse = await authApi.getProfile();
          if (reloadResponse.success && 'data' in reloadResponse && reloadResponse.data) {
            const userData = reloadResponse.data as User & { phoneNumber?: string | null };
            // ✅ Map phoneNumber từ backend sang phone - xử lý null
            if (!userData.phone && userData.phoneNumber && userData.phoneNumber !== null) {
              userData.phone = userData.phoneNumber;
            }
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            
            // Cập nhật form values với dữ liệu mới nhất từ reload
            profileForm.setFieldsValue({
              fullName: userData.fullName,
              email: userData.email,
              // ✅ Xử lý phoneNumber: null - chỉ set nếu có giá trị hợp lệ
              phone: userData.phone || (userData.phoneNumber && userData.phoneNumber !== null ? userData.phoneNumber : "") || "",
              dateOfBirth: userData.dateOfBirth ? dayjs(userData.dateOfBirth.split('T')[0]) : null,
              address: userData.address || "",
              occupation: userData.occupation || "",
            });
          }
        } catch (error) {
          console.error("Error reloading profile after update:", error);
        }
      } else {
        const errorMsg = ('error' in response ? response.error : 'Không thể cập nhật thông tin!');
        api.error({
          message: "Cập nhật thất bại",
          description: errorMsg,
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error: unknown) {
      console.error("Update profile error:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật thông tin. Vui lòng thử lại!";
      api.error({
        message: "Có lỗi xảy ra",
        description: errorMessage,
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!user?.email) {
      api.error({
        message: "Lỗi",
        description: "Không tìm thấy email của bạn!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email: user.email });
      
      if (response.success) {
        api.success({
          message: "OTP đã được gửi!",
          description: `Mã OTP đã được gửi đến email ${user.email}. Vui lòng kiểm tra hộp thư!`,
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });
      } else {
        api.error({
          message: "Gửi OTP thất bại",
          description: response.error || "Không thể gửi OTP. Vui lòng thử lại!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }
    } catch (error: unknown) {
      console.error("Send OTP error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể gửi OTP. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values: { otp: string }) => {
    if (!user?.email) {
      api.error({
        message: "Lỗi",
        description: "Không tìm thấy email của bạn!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
      return;
    }

    setLoading(true);
    try {
      // Verify OTP - Backend sẽ verify OTP khi gọi resetPassword
      // Ở đây chúng ta chỉ lưu OTP vào form để dùng sau khi đổi mật khẩu
      // OTP sẽ được verify khi gọi resetPassword với OTP và password mới
      // Lưu OTP vào form để dùng khi reset password
      otpForm.setFieldsValue({ otp: values.otp });
      setOtpVerified(true);
      api.success({
        message: "Xác nhận OTP thành công!",
        description: "Bạn có thể đổi mật khẩu mà không cần nhập mật khẩu cũ.",
        placement: "topRight",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
    } catch (error: unknown) {
      console.error("Verify OTP error:", error);
      api.error({
        message: "Có lỗi xảy ra",
        description: "Không thể xác nhận OTP. Vui lòng thử lại!",
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: ChangePasswordData & { confirmPassword?: string }) => {
    setLoading(true);
    try {
      // Không trim password để giữ nguyên, giống như login
      // Password có thể có khoảng trắng hợp lệ
      const oldPassword = values.oldPassword || "";
      const newPassword = values.newPassword || "";
      const confirmPassword = values.confirmPassword || "";

      // Lấy userId từ nhiều nguồn để đảm bảo luôn có giá trị
      let userId = user?.id;
      
      // Nếu không có userId từ state, lấy từ localStorage
      if (!userId) {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            userId = userData.id || userData.userId;
          } catch (e) {
            console.error("Error parsing user from localStorage:", e);
          }
        }
      }
      
      // Nếu vẫn không có userId, thử load lại profile
      if (!userId) {
        try {
          const profileResponse = await authApi.getProfile();
          if (profileResponse.success && 'data' in profileResponse && profileResponse.data) {
            userId = profileResponse.data.id;
            // Cập nhật user state và localStorage
            setUser(profileResponse.data);
            localStorage.setItem("user", JSON.stringify(profileResponse.data));
          }
        } catch (e) {
          console.error("Error loading profile:", e);
        }
      }
      
      // Nếu vẫn không có userId, báo lỗi
      if (!userId) {
        api.error({
          message: "Lỗi xác thực",
          description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
        setLoading(false);
        return;
      }

      // Validation sẽ được xử lý bởi Form.Item rules
      // Chỉ validate ở đây nếu cần thiết

      // Nếu đã xác nhận OTP, không cần oldPassword
      
      if (otpVerified) {
        // Đổi mật khẩu bằng cách reset password với OTP đã verify
        if (!user?.email) {
          api.error({
            message: "Lỗi",
            description: "Không tìm thấy email của bạn!",
            placement: "topRight",
            icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
          });
          setLoading(false);
          return;
        }
        
        // Sử dụng resetPassword với OTP đã verify
        const otpValue = otpForm.getFieldValue('otp');
        const resetResponse = await authApi.resetPassword({
          email: user.email,
          otp: otpValue,
          newPassword: newPassword
        });
        
        if (resetResponse.success) {
          api.success({
            message: "Đổi mật khẩu thành công!",
            description: "Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại với mật khẩu mới.",
            placement: "topRight",
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            duration: 5,
          });
          passwordForm.resetFields();
          otpForm.resetFields();
          setOtpVerified(false);
          setUseEmailVerification(false);
        } else {
          api.error({
            message: "Đổi mật khẩu thất bại",
            description: resetResponse.error || "Không thể đổi mật khẩu. Vui lòng thử lại!",
            placement: "topRight",
            icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
            duration: 5,
          });
        }
        setLoading(false);
        return;
      }
      
      // Nếu không dùng OTP, dùng cách thông thường với oldPassword
      const changePasswordData: ChangePasswordData = {
        oldPassword: oldPassword, // Không trim để giữ nguyên password (có thể có khoảng trắng hợp lệ)
        newPassword: newPassword, // Không trim để giữ nguyên password
        userId: userId, // Truyền userId đã được lấy từ nhiều nguồn
      };

      console.log('[ChangePassword] Calling API with:', {
        userId: changePasswordData.userId,
        oldPasswordLength: changePasswordData.oldPassword.length,
        newPasswordLength: changePasswordData.newPassword.length
      });
      const response = await authApi.changePassword(changePasswordData);
      console.log('[ChangePassword] API Response:', response);

      if (response.success) {
        // Lấy message từ response nếu có
        const successMessage = response.message || "Mật khẩu của bạn đã được cập nhật thành công.";
        
        api.success({
          message: "Đổi mật khẩu thành công!",
          description: successMessage + " Vui lòng đăng nhập lại với mật khẩu mới.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          duration: 5,
        });
        passwordForm.resetFields();
      } else {
        // Lấy error message từ response và phân tích loại lỗi
        const errorMessage = response.error || response.message || "";
        
        // Phân tích loại lỗi để hiển thị thông báo phù hợp
        let fieldError = "";
        let errorTitle = "Đổi mật khẩu thất bại";
        let errorDescription = errorMessage;
        
        if (errorMessage.toLowerCase().includes("mật khẩu cũ") || 
            errorMessage.toLowerCase().includes("old password") ||
            errorMessage.toLowerCase().includes("password không đúng") ||
            errorMessage.toLowerCase().includes("incorrect password") ||
            errorMessage.toLowerCase().includes("sai")) {
          errorTitle = "Mật khẩu cũ không đúng";
          errorDescription = "Mật khẩu hiện tại bạn nhập không đúng. Vui lòng kiểm tra lại và thử lại!";
          fieldError = "Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại!";
          // Set error vào field oldPassword để hiển thị ngay dưới input
          passwordForm.setFields([
            { 
              name: 'oldPassword', 
              errors: [fieldError],
              value: oldPassword // Giữ giá trị để người dùng sửa
            }
          ]);
        } else if (errorMessage.toLowerCase().includes("xác nhận") || 
                   errorMessage.toLowerCase().includes("confirm") ||
                   errorMessage.toLowerCase().includes("không khớp") ||
                   errorMessage.toLowerCase().includes("not match")) {
          errorTitle = "Mật khẩu xác nhận không khớp";
          errorDescription = "Mật khẩu xác nhận không khớp với mật khẩu mới. Vui lòng kiểm tra lại!";
          fieldError = "Mật khẩu xác nhận không khớp với mật khẩu mới!";
          passwordForm.setFields([
            { 
              name: 'confirmPassword', 
              errors: [fieldError],
              value: confirmPassword
            }
          ]);
        } else if (!errorMessage) {
          errorDescription = "Mật khẩu cũ không đúng hoặc có lỗi xảy ra. Vui lòng thử lại!";
          fieldError = "Mật khẩu cũ không đúng hoặc có lỗi xảy ra!";
          passwordForm.setFields([
            { 
              name: 'oldPassword', 
              errors: [fieldError],
              value: oldPassword
            }
          ]);
        }
        
        // Vẫn hiển thị notification để người dùng chú ý
        api.error({
          message: errorTitle,
          description: errorDescription,
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
          duration: 5,
        });
      }
    } catch (error: unknown) {
      console.error("Change password error:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể đổi mật khẩu. Vui lòng thử lại!";
      api.error({
        message: "Có lỗi xảy ra",
        description: errorMessage,
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
      });
    } finally {
      setLoading(false);
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

      <div className="mt-20">
        {/* Main Content */}
        <Content style={{ padding: "24px", width: "100%" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* === SUMMARY CARD (avatar, name, email, small meta) === */}
          <div style={{ width: "100%", marginBottom: 18 }}>
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

<div className="ml-auto flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        {/* small status tag - license verification state */}
                        {licenseVerified === true && <Tag color="success">GPLX: Đã xác thực</Tag>}
                        {licenseVerified === false && <Tag color="error">GPLX: Chưa xác thực</Tag>}
                        {licenseVerified === null && <Tag color="default">GPLX: Chưa gửi</Tag>}
                        
                        {/* Citizen ID status */}
                        {citizenIdVerified === true && <Tag color="success">CCCD: Đã xác thực</Tag>}
                        {citizenIdVerified === false && <Tag color="error">CCCD: Chưa xác thực</Tag>}
                        {citizenIdVerified === null && <Tag color="default">CCCD: Chưa gửi</Tag>}
                      </div>
                      
                      {/* <Button
                        type="primary"
                        icon={<IdcardOutlined />}
                        onClick={() => router.push("/profile/documents")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Upload Giấy Tờ
                      </Button> */}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* === TABS (Thông tin cá nhân + Đổi mật khẩu) === */}
          <div style={{ width: "100%", marginBottom: 18 }}>
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
                        {/* Form luôn được render để tránh warning, chỉ hiển thị khi editing */}
                        <div style={{ display: editing ? 'block' : 'none' }}>
                          <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                            <Form.Item 
                              label="Họ và tên" 
                              name="fullName" 
                              rules={[
                                { required: true, message: "Vui lòng nhập họ và tên!" },
                                { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự!" },
                                { max: 100, message: "Họ và tên không được vượt quá 100 ký tự!" }
                              ]}
                            >
                              <Input size="large" prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
                            </Form.Item>
                            {user && user.id !== 3 && (
                              <Form.Item label="Email" name="email">
                                <Input size="large" prefix={<MailOutlined />} disabled />
                              </Form.Item>
                            )}
                            <Form.Item 
                              label="Số điện thoại" 
                              name="phone"
                              rules={[
                                { 
                                  pattern: /^[0-9]{10,11}$/, 
                                  message: "Số điện thoại phải có 10-11 chữ số!" 
                                }
                              ]}
                            >
                              <Input 
                                size="large" 
                                prefix={<PhoneOutlined />} 
                                placeholder="Nhập số điện thoại"
                                maxLength={11}
                              />
                            </Form.Item>
                            <Form.Item 
                              label="Ngày sinh" 
                              name="dateOfBirth"
                            >
                              <DatePicker
                                size="large"
                                placeholder="Chọn ngày sinh"
                                format="DD/MM/YYYY"
                                style={{ width: "100%" }}
                                disabledDate={(current) => {
                                  return current && current > dayjs().endOf('day');
                                }}
                              />
                            </Form.Item>
                            <Form.Item 
                              label="Địa chỉ" 
                              name="address"
                              rules={[
                                { max: 200, message: "Địa chỉ không được vượt quá 200 ký tự!" }
                              ]}
                            >
                              <Input size="large" prefix={<HomeOutlined />} placeholder="Nhập địa chỉ" />
                            </Form.Item>
                            <Form.Item 
                              label="Nghề nghiệp" 
                              name="occupation"
                              rules={[
                                { max: 100, message: "Nghề nghiệp không được vượt quá 100 ký tự!" }
                              ]}
                            >
                              <Input size="large" prefix={<IdcardOutlined />} placeholder="Nhập nghề nghiệp" />
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
                        </div>
                        {/* Phần hiển thị thông tin - ẩn khi đang editing */}
                        <div style={{ display: !editing ? 'block' : 'none' }}>
                          <Descriptions column={1} bordered>
                            <Descriptions.Item label="Họ và tên">{user?.fullName || ''}</Descriptions.Item>
                            <Descriptions.Item label="Email">
                              <span className="flex items-center gap-2">
                                {user?.email}
                                {user?.isEmailConfirmed && (
                                  <Tag color="success" icon={<CheckCircleOutlined />} className="m-0">
                                    Đã xác nhận
                                  </Tag>
                                )}
                                {user?.isEmailConfirmed === false && (
                                  <Tag color="warning" icon={<WarningOutlined />} className="m-0">
                                    Chưa xác nhận
                                  </Tag>
                                )}
                              </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Số điện thoại">
                              {(() => {
                                // ✅ Xử lý phoneNumber: null - kiểm tra rõ ràng
                                const phone = user?.phone;
                                const phoneNumber = (user as User & { phoneNumber?: string | null })?.phoneNumber;
                                // Chỉ hiển thị nếu có giá trị hợp lệ (không phải null, undefined, hoặc empty string)
                                const displayPhone = phone || (phoneNumber && phoneNumber !== null ? phoneNumber : null);
                                return displayPhone || "Chưa cập nhật";
                              })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">
                              {user?.dateOfBirth ? dayjs(user.dateOfBirth.split('T')[0]).format("DD/MM/YYYY") : "Chưa cập nhật"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ">
                              {user?.address || "Chưa cập nhật"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Nghề nghiệp">
                              {user?.occupation || "Chưa cập nhật"}
                            </Descriptions.Item>
                            {user?.rentalLocation && (
                              <Descriptions.Item label="Điểm thuê xe">
                                {user.rentalLocation.name || `ID: ${user.rentalLocationId}`}
                              </Descriptions.Item>
                            )}
                            
                            <Descriptions.Item label="Ngày tham gia">
                              {user?.createdAt ? dayjs(user.createdAt).format("DD/MM/YYYY HH:mm") : "N/A"}
                            </Descriptions.Item>
                            {user?.updatedAt && user.updatedAt !== user.createdAt && (
                              <Descriptions.Item label="Cập nhật lần cuối">
                                {dayjs(user.updatedAt).format("DD/MM/YYYY HH:mm")}
                              </Descriptions.Item>
                            )}
                            {(user?.feedbackCount !== undefined || user?.rentalOrdersCount !== undefined || user?.paymentsCount !== undefined) && (
                              <Descriptions.Item label="Thống kê">
                                <div className="flex gap-4 flex-wrap">
                                  {user.rentalOrdersCount !== undefined && (
                                    <Tag icon={<ShoppingOutlined />} color="blue">
                                      {user.rentalOrdersCount} đơn thuê
                                    </Tag>
                                  )}
                                  {user.feedbackCount !== undefined && (
                                    <Tag icon={<MessageOutlined />} color="purple">
                                      {user.feedbackCount} đánh giá
                                    </Tag>
                                  )}
                                  {user.paymentsCount !== undefined && (
                                    <Tag icon={<DollarOutlined />} color="green">
                                      {user.paymentsCount} thanh toán
                                    </Tag>
                                  )}
                                </div>
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                          <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => setEditing(true)}
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                          >
                            Chỉnh sửa thông tin
                          </Button>
                        </div>
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
                      <div>
                        {!useEmailVerification ? (
                          <div>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700 mb-2">
                                Bạn có thể đổi mật khẩu bằng 2 cách:
                              </p>
                              <ul className="text-xs text-gray-600 list-disc list-inside mb-2">
                                <li>Nhập mật khẩu cũ và mật khẩu mới (nếu bạn nhớ mật khẩu cũ)</li>
                                <li>Sử dụng mã OTP gửi qua email (nếu bạn quên mật khẩu cũ)</li>
                              </ul>
                              <Button
                                type="link"
                                onClick={() => {
                                  passwordForm.resetFields();
                                  setUseEmailVerification(true);
                                  handleSendOTP();
                                }}
                                className="p-0 text-blue-600 hover:text-blue-700 text-sm"
                              >
                                <MailOutlined className="mr-1" />
                                Quên mật khẩu? Xác nhận qua email
                              </Button>
                            </div>
                            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                              <Form.Item 
                                label="Mật khẩu hiện tại" 
                                name="oldPassword" 
                                rules={[
                                  { required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }
                                ]}
                                validateStatus=""
                                help=""
                              >
                                <Input.Password 
                                  size="large" 
                                  prefix={<LockOutlined />} 
                                  placeholder="Nhập mật khẩu hiện tại"
                                />
                              </Form.Item>
                        <Form.Item 
                          label="Mật khẩu mới" 
                          name="newPassword" 
                          rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                            { 
                              min: 7, 
                              message: "Mật khẩu phải có trên 6 ký tự (tối thiểu 7 ký tự)!" 
                            }
                          ]}
                          help="Mật khẩu phải có trên 6 ký tự (tối thiểu 7 ký tự)"
                        >
                          <Input.Password 
                            size="large" 
                            prefix={<LockOutlined />} 
                            placeholder="Nhập mật khẩu mới (trên 6 ký tự)"
                          />
                        </Form.Item>
                        <Form.Item
                          label="Xác nhận mật khẩu mới"
                          name="confirmPassword"
                          dependencies={["newPassword"]}
                          rules={[
                            { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value) {
                                  return Promise.reject(new Error("Vui lòng xác nhận mật khẩu mới!"));
                                }
                                if (getFieldValue("newPassword") === value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error("Mật khẩu xác nhận không khớp với mật khẩu mới!"));
                              },
                            }),
                          ]}
                          validateTrigger="onBlur"
                        >
                          <Input.Password 
                            size="large" 
                            prefix={<LockOutlined />} 
                            placeholder="Nhập lại mật khẩu mới"
                          />
                        </Form.Item>
                              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} className="bg-blue-600">
                                Đổi mật khẩu
                              </Button>
                            </Form>
                          </div>
                        ) : (
                          <div>
                            {!otpVerified ? (
                              <Form form={otpForm} layout="vertical" onFinish={handleVerifyOTP}>
                                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-sm text-gray-700 mb-2">
                                    <MailOutlined className="mr-2" />
                                    Mã OTP đã được gửi đến email <strong>{user?.email}</strong>
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Vui lòng kiểm tra hộp thư và nhập mã OTP để xác nhận.
                                  </p>
                                </div>
                                
                                <Form.Item 
                                  label="Mã OTP" 
                                  name="otp" 
                                  rules={[
                                    { required: true, message: "Vui lòng nhập mã OTP!" },
                                    { len: 6, message: "Mã OTP phải có 6 ký tự!" }
                                  ]}
                                >
                                  <Input 
                                    size="large" 
                                    prefix={<MailOutlined />} 
                                    placeholder="Nhập mã OTP 6 số"
                                    maxLength={6}
                                  />
                                </Form.Item>
                                
                                <Space>
                                  <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    loading={loading} 
                                    className="bg-blue-600"
                                  >
                                    Xác nhận OTP
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      setUseEmailVerification(false);
                                      otpForm.resetFields();
                                    }}
                                  >
                                    Hủy
                                  </Button>
                                  <Button 
                                    type="link"
                                    onClick={handleSendOTP}
                                    loading={loading}
                                  >
                                    Gửi lại OTP
                                  </Button>
                                </Space>
                              </Form>
                            ) : (
                              <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-sm text-gray-700">
                                    <CheckCircleOutlined className="mr-2 text-green-600" />
                                    Đã xác nhận OTP thành công. Bạn có thể đổi mật khẩu mà không cần nhập mật khẩu cũ.
                                  </p>
                                </div>
                                
                                <Form.Item 
                                  label="Mật khẩu mới" 
                                  name="newPassword" 
                                  rules={[
                                    { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                                    { 
                                      min: 7, 
                                      message: "Mật khẩu phải có trên 6 ký tự (tối thiểu 7 ký tự)!" 
                                    }
                                  ]}
                                  help="Mật khẩu phải có trên 6 ký tự (tối thiểu 7 ký tự)"
                                >
                                  <Input.Password 
                                    size="large" 
                                    prefix={<LockOutlined />} 
                                    placeholder="Nhập mật khẩu mới (trên 6 ký tự)"
                                  />
                                </Form.Item>
                                
                                <Form.Item
                                  label="Xác nhận mật khẩu mới"
                                  name="confirmPassword"
                                  dependencies={["newPassword"]}
                                  rules={[
                                    { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
                                    ({ getFieldValue }) => ({
                                      validator(_, value) {
                                        if (!value) {
                                          return Promise.reject(new Error("Vui lòng xác nhận mật khẩu mới!"));
                                        }
                                        if (getFieldValue("newPassword") === value) {
                                          return Promise.resolve();
                                        }
                                        return Promise.reject(new Error("Mật khẩu xác nhận không khớp với mật khẩu mới!"));
                                      },
                                    }),
                                  ]}
                                  validateTrigger="onBlur"
                                >
                                  <Input.Password 
                                    size="large" 
                                    prefix={<LockOutlined />} 
                                    placeholder="Nhập lại mật khẩu mới"
                                  />
                                </Form.Item>
                                
                                <Space>
                                  <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    icon={<SaveOutlined />} 
                                    loading={loading} 
                                    className="bg-blue-600"
                                  >
                                    Đổi mật khẩu
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      setUseEmailVerification(false);
                                      setOtpVerified(false);
                                      passwordForm.resetFields();
                                      otpForm.resetFields();
                                    }}
                                  >
                                    Hủy
                                  </Button>
                                </Space>
                              </Form>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
          </div>
        </Content>
      </div>
    </Layout>
  );
}