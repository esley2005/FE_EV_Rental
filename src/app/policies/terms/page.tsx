"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Tabs } from "antd";
import { ShieldCheck, FileText, InfoCircle } from "lucide-react";

const { TabPane } = Tabs;

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ẢNH BANNER ĐẦU TRANG */}
      <div className="relative w-full h-60 md:h-72 rounded-xl overflow-hidden mb-10">
        <Image
          src="/ev-2-edit.min_.jpg"
          alt="Chính sách & Quy định - EV Rental"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <h1 className="text-white text-2xl md:text-4xl font-bold">
            Chính sách & Quy định
          </h1>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
        <Card className="p-6 shadow-sm border border-gray-200">
          <Tabs defaultActiveKey="1" size="large">
            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Chính sách bảo mật
                </span>
              }
              key="1"
            >
              <Section
                title="1. Giới thiệu"
                content="EV Rental cam kết bảo vệ thông tin cá nhân của người dùng theo quy định pháp luật Việt Nam. Chúng tôi chỉ thu thập và sử dụng thông tin khi thật sự cần thiết để cung cấp dịch vụ tốt nhất."
              />
              <Section
                title="2. Thu thập dữ liệu cá nhân"
                content="EV Rental thu thập thông tin khi bạn đăng ký tài khoản, đặt xe hoặc liên hệ với bộ phận hỗ trợ. Thông tin có thể bao gồm tên, email, số điện thoại và thông tin thanh toán."
              />
              <Section
                title="3. Mục đích sử dụng"
                content="Dữ liệu của bạn được sử dụng để xác minh danh tính, cung cấp dịch vụ thuê xe, xử lý thanh toán và hỗ trợ khách hàng."
              />
              <Section
                title="4. Bảo mật và lưu trữ"
                content="EV Rental áp dụng các biện pháp kỹ thuật và quản lý để đảm bảo thông tin được bảo vệ an toàn khỏi truy cập trái phép, mất mát hoặc lạm dụng."
              />
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Quy chế hoạt động
                </span>
              }
              key="2"
            >
              <Section
                title="I. Mục tiêu"
                content="Đảm bảo hoạt động minh bạch, công bằng và an toàn giữa chủ xe và khách thuê trên nền tảng EV Rental."
              />
              <Section
                title="II. Quyền và nghĩa vụ"
                content="Các bên tham gia có quyền và nghĩa vụ rõ ràng: chủ xe cung cấp xe đạt chuẩn; khách thuê sử dụng đúng mục đích và tuân thủ quy định; EV Rental chịu trách nhiệm trung gian và hỗ trợ kỹ thuật."
              />
              <Section
                title="III. Giải quyết tranh chấp"
                content="Mọi khiếu nại hoặc tranh chấp được EV Rental tiếp nhận qua email và hotline, xử lý công khai, minh bạch và đúng pháp luật."
              />
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <InfoCircle className="w-4 h-4" /> Liên hệ hỗ trợ
                </span>
              }
              key="3"
            >
              <div className="text-gray-700 space-y-3">
                <p>
                  <strong>Email:</strong> support@evrental.vn
                </p>
                <p>
                  <strong>Hotline:</strong> 1900 6868
                </p>
                <p>
                  <strong>Địa chỉ:</strong> EV Rental Việt Nam, Quận 7, TP.HCM
                </p>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 leading-relaxed">{content}</p>
    </div>
  );
}
