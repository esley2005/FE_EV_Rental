"use client";

import Image from "next/image";
import { Card, Tabs } from "antd";
import { ShieldCheck, FileText, Info } from "lucide-react";
import Header from "@/components/Header";

const { TabPane } = Tabs;

export default function PolicyPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
      {/* 🖼️ BANNER */}
      <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
        <Image
          src="/ev-2-edit.min_.jpg"
          alt="Chính sách & Quy định - EV Rental"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
          <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
            Chính sách & Quy định
          </h1>
        </div>
      </div>

      {/* 📄 NỘI DUNG */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
        <Card
         
          className="shadow-lg rounded-2xl overflow-hidden bg-white"
        >
          <Tabs
            defaultActiveKey="1"
            size="large"
            tabBarGutter={40}
            animated={{ inkBar: true, tabPane: true }}
          >
            {/* CHÍNH SÁCH BẢO MẬT */}
            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Chính sách bảo mật
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

          

          </Tabs>
        </Card>
      </div>
      </div>
    </>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
        {title}
      </h2>
      <p className="text-gray-600 leading-relaxed">{content}</p>
    </div>
  );
}
