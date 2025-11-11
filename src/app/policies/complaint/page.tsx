"use client";

import Image from "next/image";
import { Card } from "antd";
import Header from "@/components/Header";

export default function ComplaintPolicyPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Chính sách giải quyết khiếu nại - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Chính sách giải quyết khiếu nại
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Section
              title="1. Mục đích"
              content="Chính sách này được thiết lập nhằm đảm bảo quyền lợi hợp pháp của khách hàng, chủ xe và các bên liên quan trong quá trình sử dụng dịch vụ của EV Rental. Chúng tôi cam kết tiếp nhận, xử lý và giải quyết khiếu nại một cách công bằng, minh bạch và đúng pháp luật."
            />
            <Section
              title="2. Phạm vi áp dụng"
              content="Chính sách giải quyết khiếu nại được áp dụng đối với tất cả người dùng, đối tác và khách hàng sử dụng nền tảng EV Rental trên toàn quốc, bao gồm dịch vụ thuê xe, thanh toán, hoàn tiền và hỗ trợ kỹ thuật."
            />
            <Section
              title="3. Tiếp nhận khiếu nại"
              content="Người dùng có thể gửi khiếu nại qua các kênh chính thức của EV Rental:
              • Email: support@evrental.vn
              • Hotline: 1900 123 456
              • Trực tiếp tại văn phòng: EV Rental Việt Nam, Quận 7, TP.HCM.
              Khi gửi khiếu nại, vui lòng cung cấp thông tin chi tiết gồm: họ tên, số điện thoại, nội dung khiếu nại, bằng chứng liên quan và yêu cầu xử lý."
            />
            <Section
              title="4. Quy trình xử lý"
              content="(1) Xác nhận tiếp nhận khiếu nại trong vòng 24 giờ kể từ khi nhận được thông tin. 
              (2) Bộ phận Chăm sóc khách hàng tiến hành kiểm tra, xác minh nội dung và chuyển đến bộ phận liên quan.
              (3) EV Rental phản hồi kết quả xử lý cho khách hàng trong thời hạn tối đa 7 ngày làm việc kể từ ngày tiếp nhận.
              Trường hợp vụ việc phức tạp cần thêm thời gian xác minh, EV Rental sẽ thông báo lý do và gia hạn xử lý phù hợp."
            />
            <Section
              title="5. Hình thức giải quyết"
              content="EV Rental ưu tiên giải quyết khiếu nại thông qua thương lượng và hòa giải. Trong trường hợp hai bên không đạt được thỏa thuận, vụ việc sẽ được chuyển đến cơ quan có thẩm quyền theo quy định pháp luật Việt Nam."
            />
            <Section
              title="6. Bảo mật thông tin khiếu nại"
              content="Mọi thông tin, tài liệu, bằng chứng liên quan đến khiếu nại của khách hàng được EV Rental bảo mật tuyệt đối và chỉ sử dụng cho mục đích xử lý khiếu nại."
            />
            <Section
              title="7. Trách nhiệm thực hiện"
              content="Bộ phận Chăm sóc khách hàng và Ban điều hành EV Rental chịu trách nhiệm theo dõi, giám sát và đảm bảo việc thực thi chính sách giải quyết khiếu nại đúng quy định và kịp thời."
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
