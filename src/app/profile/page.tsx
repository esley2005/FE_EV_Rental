"use client";

import React, { useEffect, useState } from "react";
import {
  Layout,
  Form,
  Input,
  Button,
  Tabs,
  Card,
  Upload,
  message,
  notification,
} from "antd";
import {
  UserOutlined,
  HomeOutlined,
  HeartOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import Header from "@/components/Header";

const { Sider, Content } = Layout;
const { TabPane } = Tabs;

export default function ProfilePage() {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gplxUrl, setGplxUrl] = useState<string | null>(null);
  const [cccdUrl, setCccdUrl] = useState<string | null>(null);

  useEffect(() => {
    // Giả lập fetch dữ liệu hồ sơ
    setLoading(true);
    setTimeout(() => {
      form.setFieldsValue({
        name: "Nguyễn Văn A",
        phone: "0901234567",
        email: "vana@example.com",
      });
      setAvatarUrl("/images/avatar-default.png");
      setLoading(false);
    }, 1000);
  }, [form]);

  const handleUpdate = () => {
    message.success("Cập nhật thông tin thành công!");
  };

  const handleUpload = (type: "gplx" | "cccd", info: any) => {
    if (info.file.status === "done") {
      message.success(`${info.file.name} tải lên thành công.`);
      const imageUrl = URL.createObjectURL(info.file.originFileObj);
      if (type === "gplx") setGplxUrl(imageUrl);
      if (type === "cccd") setCccdUrl(imageUrl);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
  <Header colorScheme="black" />

      {/* BODY */}
      <Layout className="pt-24">
        {/* SIDEBAR */}
        <Sider
          width={240}
          theme="light"
          style={{
            background: "#fff",
            borderRight: "1px solid #f0f0f0",
          }}
        >
          <div style={{ padding: "24px" }}>
            <h2 className="text-xl font-bold mb-4">Thông Tin Cá Nhân</h2>
            <Form layout="vertical">
              <Form.Item>
                <Button
                  type="text"
                  block
                  icon={<UserOutlined />}
                  className="text-left"
                  style={{ color: "#1677ff" }}
                >
                  Tài khoản của tôi
                </Button>
              </Form.Item>
              <Form.Item>
                <Button
                  type="text"
                  block
                  icon={<HomeOutlined />}
                  className="text-left text-gray-700 hover:text-black"
                >
                  Quản lý cho thuê
                </Button>
              </Form.Item>
              <Form.Item>
                <Button
                  type="text"
                  block
                  icon={<HeartOutlined />}
                  className="text-left text-gray-700 hover:text-black"
                >
                  Xe yêu thích
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Sider>

        {/* MAIN CONTENT */}
        <Content
          style={{
            padding: "24px",
            background: "#f9fafb",
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {/* THÔNG TIN CÁ NHÂN */}
            <Card title="Hồ sơ cá nhân" loading={loading} className="mb-6">
              <div className="flex items-start gap-6">
                <div>
                  <Image
                    src={avatarUrl || "/images/avatar-default.png"}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                  />
                </div>
                <Form
                  form={form}
                  layout="vertical"
                  className="flex-1"
                  onFinish={handleUpdate}
                >
                  <Form.Item label="Họ tên" name="name">
                    <Input placeholder="Nhập họ tên" />
                  </Form.Item>
                  <Form.Item label="Số điện thoại" name="phone">
                    <Input placeholder="Nhập số điện thoại" />
                  </Form.Item>
                  <Form.Item label="Email" name="email">
                    <Input placeholder="Nhập email" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    Cập nhật thông tin
                  </Button>
                </Form>
              </div>
            </Card>

            {/* TABS: Lịch sử / Giấy tờ */}
            <Tabs defaultActiveKey="1">
              <TabPane tab="Lịch sử giao dịch" key="1">
                <Card>
                  <p>Hiển thị danh sách giao dịch của người dùng...</p>
                </Card>
              </TabPane>
              <TabPane tab="Giấy tờ cá nhân" key="2">
                <Card title="Hình ảnh giấy tờ">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* GPLX */}
                    <div className="flex flex-col items-center">
                      <Upload
                        name="gplx"
                        showUploadList={false}
                        onChange={(info) => handleUpload("gplx", info)}
                      >
                        <Button icon={<UploadOutlined />}>Tải GPLX</Button>
                      </Upload>
                      {gplxUrl && (
                        <Image
                          src={gplxUrl}
                          alt="GPLX"
                          width={240}
                          height={160}
                          className="rounded-lg mt-3 object-cover"
                        />
                      )}
                    </div>

                    {/* CCCD */}
                    <div className="flex flex-col items-center">
                      <Upload
                        name="cccd"
                        showUploadList={false}
                        onChange={(info) => handleUpload("cccd", info)}
                      >
                        <Button icon={<UploadOutlined />}>Tải CCCD</Button>
                      </Upload>
                      {cccdUrl && (
                        <Image
                          src={cccdUrl}
                          alt="CCCD"
                          width={240}
                          height={160}
                          className="rounded-lg mt-3 object-cover"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </TabPane>
            </Tabs>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
