"use client";

import Image from "next/image";
import { Card } from "antd";
import {
  CreditCardOutlined,
  WalletOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import Header from "@/components/Header";

export default function PaymentGuidePage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Hướng dẫn thanh toán - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Hướng dẫn thanh toán
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              icon={<CreditCardOutlined className="text-blue-500 text-xl" />}
              title="1. Phương thức thanh toán"
              content={`EV Rental hỗ trợ nhiều hình thức thanh toán để mang lại sự thuận tiện tối đa cho khách hàng:
              
• 💳 Thanh toán trực tuyến qua thẻ (Visa, MasterCard, JCB)
• 🏦 Chuyển khoản ngân hàng
• 💵 Thanh toán tiền mặt khi nhận xe
              
Tùy vào khu vực và loại xe, một số phương thức có thể không khả dụng.`}
            />

            <Section
              icon={<WalletOutlined className="text-green-600 text-xl" />}
              title="2. Quy trình thanh toán online"
              content={`1️⃣ Chọn xe và thời gian thuê mong muốn  
2️⃣ Xác nhận đơn hàng và chọn hình thức thanh toán  
3️⃣ Nhập thông tin thẻ hoặc ví điện tử  
4️⃣ Hệ thống sẽ xác thực giao dịch và gửi thông báo xác nhận qua email/SMS.  
              
👉 Lưu ý: EV Rental sử dụng cổng thanh toán bảo mật SSL để đảm bảo an toàn tuyệt đối cho thông tin người dùng.`}
            />

            <Section
              icon={<FileTextOutlined className="text-orange-500 text-xl" />}
              title="3. Xác nhận thanh toán & hoá đơn"
              content={`Sau khi thanh toán thành công, bạn sẽ nhận được:  
              
• Email xác nhận chi tiết đơn hàng  
• Mã đặt xe và thông tin giao nhận xe  
• Hoá đơn điện tử (khi yêu cầu)  

Nếu không nhận được xác nhận sau 10 phút, vui lòng liên hệ bộ phận hỗ trợ qua hotline hoặc trang Liên hệ.`}
            />

            <Section
              icon={<CheckCircleOutlined className="text-indigo-500 text-xl" />}
              title="4. Chính sách hoàn tiền"
              content={`EV Rental hỗ trợ hoàn tiền trong các trường hợp huỷ đơn theo chính sách quy định:  
              
• Huỷ trước 48h: hoàn 100%  
• Huỷ trước 24h: hoàn 50%  
• Huỷ dưới 24h: không hoàn tiền  

Tiền hoàn sẽ được xử lý trong 3–7 ngày làm việc tuỳ theo ngân hàng hoặc cổng thanh toán.`}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  content,
}: {
  icon?: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">
          {title}
        </h2>
      </div>
      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}
