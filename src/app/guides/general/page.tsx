"use client";

import Image from "next/image";
import { Card } from "antd";
import { Mail, Phone, MapPin } from "lucide-react";
import Header from "@/components/Header";

export default function HuongDanChungPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Hướng dẫn chung - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Hướng dẫn chung
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              title="1. Giới thiệu"
              content="Trang này cung cấp các hướng dẫn cơ bản giúp người dùng hiểu rõ quy trình sử dụng dịch vụ EV Rental — từ khâu đăng ký tài khoản, tìm kiếm xe, đặt xe cho đến hoàn tất thanh toán."
            />

            <Section
              title="2. Đăng ký và đăng nhập tài khoản"
              content={`• Người dùng cần có tài khoản để thuê hoặc cho thuê xe.\n
1. Truy cập trang chủ EV Rental.\n
2. Chọn “Đăng ký” → Nhập thông tin cá nhân (họ tên, email, số điện thoại, mật khẩu).\n
3. Xác minh tài khoản qua email hoặc OTP.\n
4. Sau khi đăng ký, bạn có thể đăng nhập và bắt đầu sử dụng dịch vụ.`}
            />

            <Section
              title="3. Tìm kiếm và đặt xe"
              content={`• Nhập địa điểm, thời gian nhận và trả xe vào thanh tìm kiếm.\n
• Hệ thống hiển thị danh sách xe khả dụng kèm giá và đánh giá.\n
• Chọn xe phù hợp → Nhấn “Đặt xe” → Kiểm tra thông tin và xác nhận.\n
• Sau khi đặt thành công, bạn sẽ nhận được email xác nhận.`}
            />

            <Section
              title="4. Thanh toán và xác nhận"
              content={`• EV Rental hỗ trợ nhiều hình thức thanh toán an toàn: thẻ ngân hàng, ví điện tử, hoặc tiền mặt khi nhận xe.\n
• Mọi giao dịch đều được mã hóa và lưu trữ bảo mật.\n
• Hóa đơn điện tử sẽ được gửi về email đã đăng ký.`}
            />

            <Section
              title="5. Hủy hoặc thay đổi đơn đặt xe"
              content={`• Người dùng có thể hủy hoặc thay đổi đơn đặt xe trong phần “Đơn của tôi”.\n
• Phí hủy phụ thuộc vào thời điểm và quy định của từng chủ xe.\n
• Nếu gặp sự cố, hãy liên hệ bộ phận hỗ trợ để được xử lý nhanh chóng.`}
            />

            <Section
              title="6. Liên hệ hỗ trợ"
              content={
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="text-blue-600" />
                    <span>Email: support@evrental.vn</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="text-blue-600" />
                    <span>Hotline: 1900 000</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="text-blue-600" />
                    <span>Văn phòng: Lô E2a-7, Đường D1, Khu Công nghệ cao, Phường Tăng Nhơn Phú, TPHCM</span>
                  </div>
                </div>
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}

import type { ReactNode } from "react";

function Section({ title, content }: { title: string; content: ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
        {title}
      </h2>
      {typeof content === "string" ? (
        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{content}</p>
      ) : (
        <div className="text-gray-700 leading-relaxed">{content}</div>
      )}
    </div>
  );
}
