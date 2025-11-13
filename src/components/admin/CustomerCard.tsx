"use client";

import { Card, Button, Tag, Space } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@/services/api";

export default function CustomerCard({ customer }: { customer: User }) {
  const router = useRouter();

  return (
    <Card
      hoverable
      className="rounded-xl shadow-sm"
      cover={
        <div className="bg-gray-100 flex items-center justify-center h-48">
          {customer.avatar ? (
            <Image
              alt={customer.fullName || "Customer"}
              src={customer.avatar}
              width={400}
              height={200}
              className="w-full h-full object-cover rounded-t-xl"
            />
          ) : (
            <UserOutlined style={{ fontSize: 64, color: "#bfbfbf" }} />
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{customer.fullName || "Chưa cập nhật"}</h3>
        <Space direction="vertical" size="small" className="w-full">
          <div>
            <MailOutlined className="mr-2" />
            <span>{customer.email}</span>
          </div>
          {customer.phone && (
            <div>
              <PhoneOutlined className="mr-2" />
              <span>{customer.phone}</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {customer.isEmailConfirmed ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Email đã xác thực
              </Tag>
            ) : (
              <Tag color="warning">Email chưa xác thực</Tag>
            )}
            {customer.isActive !== false ? (
              <Tag color="success">Đang hoạt động</Tag>
            ) : (
              <Tag color="error">Đã khóa</Tag>
            )}
          </div>
        </Space>
        <Button
          type="primary"
          className="mt-2 w-full"
          onClick={() => router.push(`/admin/customers/${customer.id}`)}
        >
          Xem chi tiết
        </Button>
      </div>
    </Card>
  );
}
