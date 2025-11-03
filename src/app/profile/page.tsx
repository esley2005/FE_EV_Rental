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
import { authApi } from "@/services/api";
import type { User, UpdateProfileData, ChangePasswordData } from "@/services/api";
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

  // GPLX preview + file store
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState<boolean | null>(null); // null = unknown, true/false = trạng thái

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
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };

    loadUserProfile();
  }, [router, api, profileForm]);

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

  // ================== GPLX upload logic (mock) ==================
  // We'll preview image locally (DataURL) and mock "upload" when submitting GPLX form.
  const beforeUploadLicense = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("Chỉ được tải ảnh GPLX (jpg/png).");
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLicenseImage(e.target?.result as string);
    reader.readAsDataURL(file);
    // prevent auto upload by returning false
    return false;
  };

  const handleSubmitLicense = async (values: any) => {
    // mock uploading
    setLicenseUploading(true);
    try {
      // here you would call your upload API and send licenseImage + values
      await new Promise((res) => setTimeout(res, 900)); // mock delay

      setLicenseVerified(false); // mock: set not verified yet
      api.success({
        message: "Gửi GPLX thành công",
        description: "Yêu cầu xác thực GPLX đã được gửi, admin sẽ kiểm tra.",
        placement: "topRight",
      });
      console.log("GPLX payload:", values, licenseImage);
    } catch (e) {
      api.error({ message: "Tải GPLX thất bại", placement: "topRight" });
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

                    <div className="ml-auto">
                      {/* small status tag - license verification state */}
                      {licenseVerified === true && <Tag color="success">GPLX: Đã xác thực</Tag>}
                      {licenseVerified === false && <Tag color="error">GPLX: Chưa xác thực</Tag>}
                      {licenseVerified === null && <Tag color="default">GPLX: Chưa gửi</Tag>}
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
          <div style={{ width: "100%", maxWidth: 1000 }}>
            <Card title={<><IdcardOutlined /> Giấy phép lái xe</>} className="shadow-lg rounded-xl">
              <div className="mb-3">
                <Tag color="red">{licenseVerified === false ? "Chưa xác thực" : licenseVerified === true ? "Đã xác thực" : "Chưa gửi"}</Tag>
                <div className="text-sm text-gray-500 inline-block ml-3">For international driving permit</div>
              </div>

              <div className="bg-red-50 border border-red-100 p-3 rounded mb-4 text-red-700 text-sm">
                Lưu ý: để tránh phát sinh vấn đề trong quá trình thuê xe, người đặt xe trên Miato (đã xác thực GPLX)
                ĐỒNG THỜI phải là người nhận xe.
              </div>

              <Form form={licenseForm} layout="vertical" onFinish={handleSubmitLicense}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Upload area */}
                  <div>
                    <Form.Item label="Hình ảnh GPLX (mặt trước / sau)">
                      <Upload
                        listType="picture-card"
                        showUploadList={false}
                        beforeUpload={beforeUploadLicense}
                      >
                        {licenseImage ? (
                          <img src={licenseImage} alt="GPLX" style={{ width: '100%', borderRadius: 8 }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <UploadOutlined style={{ fontSize: 24 }} />
                            <div className="text-sm text-gray-500">Kéo thả hoặc bấm để tải lên</div>
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
                  </div>

                  {/* Info fields */}
                  <div>
                    <Form.Item label="Số GPLX" name="licenseNumber" rules={[{ required: true, message: "Nhập số GPLX" }]}>
                      <Input placeholder="Nhập số GPLX đã cấp" />
                    </Form.Item>

                    <Form.Item label="Họ và tên (trên GPLX)" name="licenseName" rules={[{ required: true, message: "Nhập họ tên trên GPLX" }]}>
                      <Input placeholder="Nhập đầy đủ họ tên" />
                    </Form.Item>

                    <Form.Item label="Ngày sinh (trên GPLX)" name="licenseDOB" rules={[{ required: true, message: "Chọn ngày sinh" }]}>
                      <DatePicker className="w-full" format="DD/MM/YYYY" />
                    </Form.Item>

                    <div className="flex gap-3 mt-2">
                      <Button type="default" onClick={() => { licenseForm.resetFields(); setLicenseImage(null); }}>
                        Hủy
                      </Button>
                      <Button type="primary" htmlType="submit" loading={licenseUploading} className="bg-green-600">
                        Cập nhật
                      </Button>
                    </div>
                  </div>
                </div>
              </Form>
            </Card>
          </div>
        </Content>
      </div>
    </Layout>
  );
}
