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
} from "antd";
import { authApi } from "@/services/api";
import type { User, UpdateProfileData, ChangePasswordData } from "@/services/api";
import dayjs from "dayjs";

const { Header, Content } = Layout;

export default function ProfilePage() {
  const router = useRouter();
  const [api, contextHolder] = antdNotification.useNotification();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // ✅ Lấy thông tin người dùng
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

  // ✅ Cập nhật hồ sơ
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

  // ✅ Đổi mật khẩu
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
        passwordForm.resetFields();
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
    <Layout className="min-h-screen bg-gray-50">
      {contextHolder}

      {/* ✅ Phần nội dung, chừa khoảng top cho header */}
      <Content
        style={{
          marginTop: 80,
          padding: "24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 900 }}>
          <Card className="shadow-lg rounded-xl">
            {/* Thông tin user */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <Avatar
                size={80}
                icon={<UserOutlined />}
                className="bg-gradient-to-br from-blue-500 to-blue-600"
                src={user.avatar}
              />
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-0">{user.fullName}</h2>
                <p className="text-gray-600">{user.email}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {user.role === "Admin"
                    ? "Admin"
                    : user.role === "Staff"
                    ? "Staff"
                    : "Khách hàng"}
                </span>
              </div>
            </div>

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
                            <Descriptions.Item label={<><UserOutlined /> Họ và tên</>}>
                              {user.fullName}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><MailOutlined /> Email</>}>
                              {user.email}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>
                              {user.phone || "Chưa cập nhật"}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><HomeOutlined /> Địa chỉ</>}>
                              {user.address || "Chưa cập nhật"}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><CalendarOutlined /> Ngày sinh</>}>
                              {user.dateOfBirth
                                ? dayjs(user.dateOfBirth).format("DD/MM/YYYY")
                                : "Chưa cập nhật"}
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
                        <Form
                          form={profileForm}
                          layout="vertical"
                          onFinish={handleUpdateProfile}
                        >
                          <Form.Item
                            label="Họ và tên"
                            name="fullName"
                            rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                          >
                            <Input size="large" prefix={<UserOutlined />} />
                          </Form.Item>

                          <Form.Item label="Email" name="email">
                            <Input size="large" prefix={<MailOutlined />} disabled />
                          </Form.Item>

                          <Form.Item label="Số điện thoại" name="phone">
                            <Input size="large" prefix={<PhoneOutlined />} />
                          </Form.Item>

                          <Form.Item label="Địa chỉ" name="address">
                            <Input.TextArea rows={3} />
                          </Form.Item>

                          <Form.Item label="Ngày sinh" name="dateOfBirth">
                            <DatePicker
                              size="large"
                              className="w-full"
                              format="DD/MM/YYYY"
                              placeholder="Chọn ngày sinh"
                            />
                          </Form.Item>

                          <Space>
                            <Button
                              type="primary"
                              htmlType="submit"
                              icon={<SaveOutlined />}
                              loading={loading}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Lưu thay đổi
                            </Button>
                            <Button
                              icon={<CloseOutlined />}
                              onClick={() => {
                                setEditing(false);
                                profileForm.resetFields();
                              }}
                            >
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
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      onFinish={handleChangePassword}
                    >
                      <Form.Item
                        label="Mật khẩu hiện tại"
                        name="oldPassword"
                        rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }]}
                      >
                        <Input.Password size="large" prefix={<LockOutlined />} />
                      </Form.Item>

                      <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                          { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                          { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" },
                        ]}
                      >
                        <Input.Password size="large" prefix={<LockOutlined />} />
                      </Form.Item>

                      <Form.Item
                        label="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        dependencies={["newPassword"]}
                        rules={[
                          { required: true, message: "Vui lòng xác nhận mật khẩu!" },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue("newPassword") === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                            },
                          }),
                        ]}
                      >
                        <Input.Password size="large" prefix={<LockOutlined />} />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Đổi mật khẩu
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
