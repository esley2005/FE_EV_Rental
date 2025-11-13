"use client";

import Image from "next/image";
import { Card } from "antd";
import Header from "@/components/Header";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Chính sách bảo mật - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Chính sách bảo mật
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              title="1. Mục đích thu thập thông tin"
              content="EV Rental thu thập thông tin cá nhân của khách hàng nhằm phục vụ quá trình đăng ký, xác thực người dùng và cung cấp dịch vụ thuê xe một cách an toàn, thuận tiện và hiệu quả nhất."
            />
            <Section
              title="2. Phạm vi thu thập thông tin"
              content="Các thông tin có thể được thu thập bao gồm họ tên, địa chỉ email, số điện thoại, thông tin giấy phép lái xe, và phương thức thanh toán. Việc cung cấp thông tin là tự nguyện, tuy nhiên có thể ảnh hưởng đến việc sử dụng dịch vụ nếu không đầy đủ."
            />
            <Section
              title="3. Mục đích sử dụng thông tin"
              content="Thông tin người dùng được sử dụng để xác minh tài khoản, quản lý đơn thuê xe, hỗ trợ khách hàng, cải thiện dịch vụ và đảm bảo quyền lợi hợp pháp của người thuê và EV Rental."
            />
            <Section
              title="4. Thời gian lưu trữ thông tin"
              content="Thông tin cá nhân của người dùng được lưu trữ trong hệ thống EV Rental trong suốt thời gian người dùng có tài khoản hoạt động hoặc theo quy định của pháp luật Việt Nam."
            />
            <Section
              title="5. Cam kết bảo mật thông tin"
              content="EV Rental áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ thông tin người dùng khỏi truy cập trái phép, tiết lộ hoặc mất mát dữ liệu. Mọi thông tin cá nhân chỉ được sử dụng nội bộ và không chia sẻ cho bên thứ ba nếu không có sự đồng ý của người dùng."
            />
            <Section
              title="6. Quyền của người dùng"
              content="Người dùng có quyền kiểm tra, cập nhật, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân của mình bằng cách liên hệ với bộ phận hỗ trợ EV Rental."
            />
            <Section
              title="7. Thông tin liên hệ"
              content="Nếu bạn có bất kỳ thắc mắc nào liên quan đến Chính sách bảo mật, vui lòng liên hệ EV Rental qua email: support@evrental.vn hoặc hotline: 1900-123-456."
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
