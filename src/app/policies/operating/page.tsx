"use client";

import Image from "next/image";
import { Card } from "antd";
import Header from "@/components/Header";

export default function RegulationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Quy chế hoạt động - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Quy chế hoạt động
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              title="1. Mục đích và phạm vi hoạt động"
              content="EV Rental hoạt động trong lĩnh vực cho thuê xe điện tự lái, hướng đến việc mang lại trải nghiệm di chuyển xanh, tiết kiệm và thuận tiện cho người dùng trên toàn quốc."
            />
            <Section
              title="2. Quy định về người thuê xe"
              content="Người thuê xe phải có giấy phép lái xe hợp lệ, tuân thủ các điều khoản trong hợp đồng thuê và chịu trách nhiệm về xe trong thời gian thuê."
            />
            <Section
              title="3. Quy trình thuê xe"
              content="Khách hàng có thể đặt xe thông qua website hoặc ứng dụng EV Rental. Sau khi xác nhận thông tin, hợp đồng sẽ được ký điện tử và xe được bàn giao tại điểm đã thỏa thuận."
            />
            <Section
              title="4. Nghĩa vụ và quyền lợi"
              content="EV Rental cam kết đảm bảo tình trạng kỹ thuật của xe trước khi bàn giao. Người thuê xe có quyền phản hồi và yêu cầu hỗ trợ trong quá trình sử dụng."
            />
            <Section
              title="5. Chính sách xử lý vi phạm"
              content="Mọi hành vi vi phạm hợp đồng như trả xe trễ, gây hư hại hoặc sử dụng sai mục đích đều sẽ bị xử lý theo quy định của công ty và pháp luật Việt Nam."
            />
            <Section
              title="6. Liên hệ hỗ trợ"
              content="Mọi thắc mắc hoặc yêu cầu hỗ trợ, vui lòng liên hệ bộ phận chăm sóc khách hàng EV Rental qua email support@evrental.vn hoặc hotline 1900-123-456."
            />
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
