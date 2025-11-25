"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
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
  Space,
  Tag,
  Upload,
  message,
} from "antd";
import { authApi, driverLicenseApi } from "@/services/api";
import type { User, UpdateProfileData, ChangePasswordData, DriverLicenseData } from "@/services/api";
import dayjs from "dayjs";

const { Content } = Layout;

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [api, contextHolder] = antdNotification.useNotification();
  
  // Get active tab from query param
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam === 'gplx' ? '3' : '1');

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
  
  // GPLX status từ DB: null = chưa có, 0 = đã up (Pending), 1 = đã xác thực (Approved), 2 = bị từ chối (Rejected)
  const [licenseStatus, setLicenseStatus] = useState<number | null>(null);

  // GPLX upload states
  const [licenseImageFront, setLicenseImageFront] = useState<string | null>(null);
  const [licenseImageBack, setLicenseImageBack] = useState<string | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [licenseId, setLicenseId] = useState<number | null>(null);
  const [licenseForm] = Form.useForm();

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
          // Lấy số điện thoại từ nhiều nguồn có thể
          const phoneValue = (userData as any).PhoneNumber || (userData as any).phoneNumber || userData.phone || "";
          profileForm.setFieldsValue({
            fullName: userData.fullName,
            email: userData.email,
            phone: phoneValue,
          });
        }

        const response = await authApi.getProfile();
        if (response.success && 'data' in response && response.data) {
          setUser(response.data);
          // Lấy số điện thoại từ nhiều nguồn có thể
          const phoneValue = (response.data as any).PhoneNumber || (response.data as any).phoneNumber || response.data.phone || "";
          profileForm.setFieldsValue({
            fullName: response.data.fullName,
            email: response.data.email,
            phone: phoneValue,
          });
          localStorage.setItem("user", JSON.stringify(response.data));

          // tải xác thực căn cước công dân
          if (response.data.citizenIdStatus !== undefined) {
            setCitizenIdVerified(response.data.citizenIdStatus === 1);
          }

          // Load GPLX từ DB theo userId
          const userId = response.data.id;
          if (userId) {
            try {
              const licenseResponse = await driverLicenseApi.getByUserId(userId);
              if (licenseResponse.success && licenseResponse.data) {
                const licenseData = licenseResponse.data as any;
                setHasLicense(true);
                if (licenseData.id) setLicenseId(licenseData.id);
                licenseForm.setFieldsValue({
                  licenseName: licenseData.name,
                  licenseNumber: licenseData.licenseNumber || "",
                });
                if (licenseData.imageUrl) setLicenseImageFront(licenseData.imageUrl);
                if (licenseData.imageUrl2) setLicenseImageBack(licenseData.imageUrl2);
                
                // Lấy status từ DB GPLX
                // Status: 0 = Pending (đã up), 1 = Approved (đã xác thực), 2 = Rejected (bị từ chối)
                let statusValue: number | null = null;
                if (licenseData.status !== undefined) {
                  const status = licenseData.status;
                  // Convert string to number nếu cần
                  if (typeof status === 'string') {
                    if (status === "Pending" || status === "0") statusValue = 0;
                    else if (status === "Approved" || status === "1") statusValue = 1;
                    else if (status === "Rejected" || status === "2") statusValue = 2;
                  } else if (typeof status === 'number') {
                    statusValue = status;
                  }
                }
                
                setLicenseStatus(statusValue);
                // Cập nhật licenseVerified cho backward compatibility
                setLicenseVerified(statusValue === 1);
              } else {
                // Không có GPLX trong DB
                setLicenseStatus(null);
                setHasLicense(false);
                setLicenseVerified(null);
              }
            } catch (e) {
              console.log("No existing GPLX found in DB:", e);
              setLicenseStatus(null);
              setHasLicense(false);
              setLicenseVerified(null);
            }
          }
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };

    loadUserProfile();
  }, [router, api, profileForm]);

  // Helper function to reload license status từ DB
  const reloadLicenseStatus = async () => {
    try {
      if (!user?.id) return;
      
      // Reload GPLX từ DB theo userId
      const licenseResponse = await driverLicenseApi.getByUserId(user.id);
      if (licenseResponse.success && licenseResponse.data) {
        const licenseData = licenseResponse.data as any;
        if (licenseData.id) setLicenseId(licenseData.id);
        
        // Lấy status từ DB GPLX
        let statusValue: number | null = null;
        if (licenseData.status !== undefined) {
          const status = licenseData.status;
          if (typeof status === 'string') {
            if (status === "Pending" || status === "0") statusValue = 0;
            else if (status === "Approved" || status === "1") statusValue = 1;
            else if (status === "Rejected" || status === "2") statusValue = 2;
          } else if (typeof status === 'number') {
            statusValue = status;
          }
        }
        
        setLicenseStatus(statusValue);
        setLicenseVerified(statusValue === 1);
        setHasLicense(true);
      } else {
        // Không có GPLX trong DB
        setLicenseStatus(null);
        setHasLicense(false);
        setLicenseVerified(null);
      }
    } catch (error) {
      console.error("Error reloading license status:", error);
      setLicenseStatus(null);
      setHasLicense(false);
      setLicenseVerified(null);
    }
  };

  const handleUpdateProfile = async (values: { fullName: string; phone?: string }) => {
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

      // Lấy số điện thoại từ user state (vì trường phone đã bị disabled)
      const existingPhone = (user as any).PhoneNumber || (user as any).phoneNumber || user.phone || "";
      
      const updateData: UpdateProfileData = {
        fullName: trimmedFullName,
        phone: existingPhone,
        userId: user?.id, // Truyền userId từ user state
      };

      const response = await authApi.updateProfile(updateData);

      if (response.success) {
        // Cập nhật user state và localStorage
        const updatedUser = response.data || user;
        if (updatedUser) {
          updatedUser.fullName = trimmedFullName;
          setUser({ ...updatedUser });
          localStorage.setItem("user", JSON.stringify(updatedUser));
          
          // Cập nhật form values
          const phoneValue = updateData.phone || (updatedUser as any).PhoneNumber || (updatedUser as any).phoneNumber || updatedUser.phone || "";
          profileForm.setFieldsValue({
            fullName: trimmedFullName,
            email: updatedUser.email || user?.email,
            phone: phoneValue,
          });
        }

        api.success({
          message: "Cập nhật thành công!",
          description: "Tên của bạn đã được cập nhật.",
          placement: "topRight",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        });

        setEditing(false);
      } else {
        api.error({
          message: "Cập nhật thất bại",
          description: response.error || "Không thể cập nhật thông tin!",
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
      setTimeout(() => {
        api.success({
          message: 'Upload ảnh thành công!',
          description: 'Ảnh đã được tải lên Cloudinary.',
          placement: 'topRight',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        });
      }, 0);
      onSuccess(imageUrl);
    } catch (error) {
      setTimeout(() => {
        api.error({
          message: 'Upload ảnh thất bại!',
          description: error instanceof Error ? error.message : 'Vui lòng kiểm tra config Cloudinary và thử lại.',
          placement: 'topRight',
        });
      }, 0);
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

    if (!user?.id) {
      message.error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    setLicenseUploading(true);
    try {
      const licenseData: DriverLicenseData = {
        name: values.licenseName,
        licenseNumber: values.licenseNumber || '',
        imageUrl: licenseImageFront, // Mặt trước
        imageUrl2: licenseImageBack, // Mặt sau
        userId: user.id, // Required by backend
        rentalOrderId: 0, // Upload chung, không cần đơn hàng cụ thể
      };

      const response = hasLicense && licenseId !== null
        ? await driverLicenseApi.update({ ...licenseData, id: licenseId })
        : await driverLicenseApi.upload(licenseData);

      if (response.success) {
        setLicenseVerified(false); // Will be verified by admin
        setHasLicense(true);
        
        // Reload license status sau khi upload thành công
        await reloadLicenseStatus();
        
        setTimeout(() => {
          api.success({
            message: "Gửi GPLX thành công",
            description: "Yêu cầu xác thực GPLX đã được gửi, admin sẽ kiểm tra.",
            placement: "topRight",
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          });
        }, 0);
      } else {
        setTimeout(() => {
          api.error({
            message: "Tải GPLX thất bại",
            description: response.error || "Không thể tải lên giấy phép lái xe.",
            placement: "topRight",
            icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
          });
        }, 0);
      }
    } catch (e) {
      setTimeout(() => {
        api.error({ 
          message: "Tải GPLX thất bại",
          description: "Có lỗi xảy ra khi tải lên giấy phép lái xe.",
          placement: "topRight",
          icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        });
      }, 0);
    } finally {
      setLicenseUploading(false);
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
                        {/* small status tag - license verification state từ DB */}
                        {licenseStatus === 1 && <Tag color="success">GPLX: Đã xác thực</Tag>}
                        {licenseStatus === 0 && <Tag color="warning">GPLX: Đã up</Tag>}
                        {licenseStatus === 2 && <Tag color="error">GPLX: Bị từ chối</Tag>}
                        {licenseStatus === null && <Tag color="default">GPLX: Chưa gửi</Tag>}
                        
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
                activeKey={activeTab}
                onChange={setActiveTab}
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
                                {(user as any).PhoneNumber || (user as any).phoneNumber || user.phone || "Chưa cập nhật"}
                              </Descriptions.Item>
                            </Descriptions>
                            <Button
                              type="primary"
                              icon={<EditOutlined />}
                              onClick={() => {
                                // Đảm bảo form được set lại giá trị khi vào chế độ edit
                                const phoneValue = (user as any).PhoneNumber || (user as any).phoneNumber || user.phone || "";
                                profileForm.setFieldsValue({
                                  fullName: user.fullName,
                                  email: user.email,
                                  phone: phoneValue,
                                });
                                setEditing(true);
                              }}
                              className="mt-4 bg-blue-600 hover:bg-blue-700"
                            >
                              Chỉnh sửa thông tin
                            </Button>
                          </>
                        ) : (
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
                            {user.id !== 3 && (
                              <Form.Item label="Email" name="email">
                                <Input size="large" prefix={<MailOutlined />} disabled />
                              </Form.Item>
                            )}
                            <Form.Item 
                              label="Số điện thoại" 
                              name="phone"
                            >
                              <Input 
                                size="large" 
                                prefix={<PhoneOutlined />} 
                                placeholder="Nhập số điện thoại" 
                                disabled
                              />
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
                  {
                    key: "3",
                    label: (
                      <span>
                        <IdcardOutlined /> Giấy phép lái xe
                      </span>
                    ),
                    children: (
                      <div>
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Lưu ý:</strong> Vui lòng tải lên cả 2 mặt (mặt trước và mặt sau) của giấy phép lái xe.
                          </p>
                          <p className="text-xs text-gray-600">
                            Ảnh phải rõ ràng, đầy đủ thông tin và không bị mờ.
                          </p>
                        </div>

                        <Form form={licenseForm} layout="vertical" onFinish={handleSubmitLicense}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Upload mặt trước */}
                            <Form.Item label="Mặt trước GPLX" required>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                {licenseImageFront ? (
                                  <div className="relative">
                                    <img 
                                      src={licenseImageFront} 
                                      alt="GPLX mặt trước" 
                                      className="w-full h-48 object-contain rounded-lg mb-2" 
                                    />
                                    <Button
                                      type="link"
                                      danger
                                      onClick={() => setLicenseImageFront(null)}
                                      className="absolute top-0 right-0"
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                ) : (
                                  <Upload
                                    showUploadList={false}
                                    customRequest={(options) => handleLicenseImageUpload(options, 'front')}
                                    accept="image/*"
                                  >
                                    <Button icon={<UploadOutlined />} loading={licenseUploading}>
                                      Tải lên mặt trước
                                    </Button>
                                  </Upload>
                                )}
                              </div>
                            </Form.Item>

                            {/* Upload mặt sau */}
                            <Form.Item label="Mặt sau GPLX" required>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                {licenseImageBack ? (
                                  <div className="relative">
                                    <img 
                                      src={licenseImageBack} 
                                      alt="GPLX mặt sau" 
                                      className="w-full h-48 object-contain rounded-lg mb-2" 
                                    />
                                    <Button
                                      type="link"
                                      danger
                                      onClick={() => setLicenseImageBack(null)}
                                      className="absolute top-0 right-0"
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                ) : (
                                  <Upload
                                    showUploadList={false}
                                    customRequest={(options) => handleLicenseImageUpload(options, 'back')}
                                    accept="image/*"
                                  >
                                    <Button icon={<UploadOutlined />} loading={licenseUploading}>
                                      Tải lên mặt sau
                                    </Button>
                                  </Upload>
                                )}
                              </div>
                            </Form.Item>
                          </div>

                          <Form.Item 
                            label="Họ và tên (trên GPLX)" 
                            name="licenseName" 
                            rules={[{ required: true, message: "Nhập họ tên trên GPLX" }]}
                          >
                            <Input size="large" placeholder="Nhập họ và tên như trên GPLX" />
                          </Form.Item>

                          <Form.Item 
                            label="Số GPLX" 
                            name="licenseNumber"
                          >
                            <Input size="large" placeholder="Nhập số giấy phép lái xe (nếu có)" />
                          </Form.Item>

                          <Space>
                            <Button 
                              type="primary" 
                              htmlType="submit" 
                              icon={<SaveOutlined />} 
                              loading={licenseUploading}
                              className="bg-blue-600"
                            >
                              {hasLicense ? "Cập nhật GPLX" : "Gửi GPLX"}
                            </Button>
                            <Button 
                              onClick={() => {
                                setLicenseImageFront(null);
                                setLicenseImageBack(null);
                                licenseForm.resetFields();
                              }}
                            >
                              Hủy
                            </Button>
                          </Space>
                        </Form>
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