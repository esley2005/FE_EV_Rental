"use client";

import Image from "next/image";
import { Card } from "antd";
import Header from "@/components/Header";

export default function HuongDanDatXePage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Hướng dẫn đặt xe - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Hướng dẫn đặt xe
            </h1>
          </div>
        </div>

        {/* 📘 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              title="1. Giới thiệu"
              content="EV Rental mang đến giải pháp thuê xe điện nhanh chóng, an toàn và tiện lợi. Trang này hướng dẫn chi tiết các bước để bạn đặt xe dễ dàng trên nền tảng của chúng tôi."
            />

            <Section
              title="2. Bước 1: Đăng ký hoặc đăng nhập tài khoản"
              content={`• Nếu bạn chưa có tài khoản, chọn “Đăng ký” và điền đầy đủ thông tin cá nhân: họ tên, email, số điện thoại và mật khẩu.\n
• Nếu đã có tài khoản, chọn “Đăng nhập” để truy cập hệ thống.\n
⚠️ Bạn cần đăng nhập trước khi thực hiện đặt xe.`}
            />

            <Section
              title="3. Bước 2: Tìm kiếm xe phù hợp"
              content={`• Nhập địa điểm nhận xe, ngày và giờ nhận - trả xe.\n
• Hệ thống sẽ hiển thị danh sách các xe có sẵn.\n
• Bạn có thể dùng bộ lọc theo giá, loại xe, thương hiệu, hoặc khoảng cách để chọn xe phù hợp.`}
            />

            <Section
              title="4. Bước 3: Xem chi tiết và chọn xe"
              content={`• Nhấn vào xe bạn muốn thuê để xem thông tin chi tiết: giá thuê, số ghế, loại xe, tình trạng, và hình ảnh.\n
• Đọc kỹ mô tả, chính sách hủy, và yêu cầu từ chủ xe.\n
• Nếu đồng ý, chọn nút “Đặt xe ngay”.`}
            />

            <Section
              title="5. Bước 4: Xác nhận thông tin đặt xe"
              content={`• Kiểm tra lại thông tin đặt xe gồm: thời gian thuê, địa điểm nhận xe, giá thuê và phí dịch vụ.\n
• Nhập ghi chú (nếu có) hoặc mã khuyến mãi để áp dụng ưu đãi.\n
• Nhấn “Tiếp tục” để chuyển sang bước thanh toán.`}
            />

            <Section
              title="6. Bước 5: Thanh toán"
              content={`• EV Rental hỗ trợ nhiều hình thức thanh toán an toàn:\n
- Thẻ ngân hàng nội địa (ATM, Napas)\n
- Thẻ quốc tế (Visa, MasterCard)\n
- Ví điện tử (MoMo, ZaloPay)\n
• Sau khi thanh toán thành công, hệ thống sẽ gửi email xác nhận và thông tin liên hệ của chủ xe.`}
            />

            <Section
              title="7. Bước 6: Nhận xe và bắt đầu hành trình"
              content={`• Đến địa điểm nhận xe đúng giờ đã hẹn.\n
• Kiểm tra xe trước khi nhận (ngoại thất, nội thất, nhiên liệu, pin,...).\n
• Hai bên xác nhận bàn giao xe bằng biên bản điện tử hoặc giấy tờ được hệ thống cung cấp.`}
            />

            <Section
              title="8. Bước 7: Trả xe"
              content={`• Trả xe đúng thời gian và địa điểm đã thỏa thuận.\n
• Kiểm tra lại tình trạng xe cùng chủ xe.\n
• Hệ thống sẽ gửi biên nhận và đánh giá sau khi hoàn tất.`}
            />

            <Section
              title="9. Lưu ý quan trọng"
              content={`✔️ Giữ liên lạc với chủ xe qua hệ thống EV Rental để đảm bảo an toàn.\n
✔️ Không giao dịch hoặc thanh toán ngoài hệ thống.\n
✔️ Mọi vấn đề phát sinh (chậm giờ, sự cố kỹ thuật, tranh chấp) cần báo ngay đến EV Rental để được hỗ trợ kịp thời.`}
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
      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}
