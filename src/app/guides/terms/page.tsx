"use client";

import Image from "next/image";
import { Card, Alert } from "antd";
import { InfoCircleOutlined, FileTextOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import Header from "@/components/Header";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Điều khoản cầm giấy tờ - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Điều khoản cầm giấy tờ
            </h1>
          </div>
        </div>

        {/* 📘 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Alert
              message="Thông tin quan trọng"
              description="Khi thuê xe tại EV Rental, khách hàng cần cầm theo giấy tờ tùy thân để đối chiếu và hoàn tất thủ tục nhận xe."
              type="info"
              icon={<InfoCircleOutlined />}
              className="mb-6"
            />

            <Section
              title="1. Giấy tờ cần thiết khi nhận xe"
              content={`Khi đến địa điểm thuê xe để nhận xe, khách hàng cần mang theo các giấy tờ sau:

• Giấy phép lái xe (GPLX) còn hiệu lực:
  - GPLX phải còn thời hạn sử dụng
  - GPLX phải phù hợp với loại xe thuê (B1, B2, C, D...)
  - GPLX phải là bản gốc hoặc bản sao có công chứng

• Chứng minh nhân dân (CCCD) hoặc Căn cước công dân:
  - CCCD/CCCD phải còn hiệu lực
  - Thông tin trên CCCD phải khớp với thông tin đăng ký tài khoản
  - Có thể sử dụng VNeID để đối chiếu

• Hoặc Passport (đối với người nước ngoài):
  - Passport phải còn hiệu lực
  - Passport sẽ được giữ lại tại điểm thuê xe cho đến khi trả xe`}
            />

            <Section
              title="2. Quy trình đối chiếu giấy tờ"
              content={`Khi đến nhận xe, nhân viên EV Rental sẽ thực hiện các bước sau:

1. Đối chiếu thông tin trên giấy tờ với thông tin đã đăng ký trên hệ thống
2. Kiểm tra tính hợp lệ của giấy tờ (thời hạn, hình ảnh, thông tin cá nhân)
3. Chụp ảnh lưu trữ giấy tờ (nếu cần) để đảm bảo an toàn
4. Xác nhận và hoàn tất thủ tục nhận xe`}
            />

            <Section
              title="3. Lưu ý về giấy tờ"
              content={`⚠️ QUAN TRỌNG:

• Giấy tờ phải là bản gốc hoặc bản sao có công chứng
• Không chấp nhận giấy tờ đã hết hạn, bị rách, mờ hoặc không rõ ràng
• Thông tin trên giấy tờ phải khớp hoàn toàn với thông tin đăng ký tài khoản
• Trường hợp thông tin không khớp, khách hàng cần cập nhật lại thông tin trên hệ thống hoặc liên hệ bộ phận hỗ trợ

• Đối với Passport: Passport sẽ được giữ lại tại điểm thuê xe và chỉ được trả lại khi khách hàng hoàn trả xe đúng thời hạn và trong tình trạng tốt`}
            />

            <Section
              title="4. Trường hợp không có giấy tờ"
              content={`Nếu khách hàng không mang theo đầy đủ giấy tờ khi đến nhận xe:

• Đơn hàng sẽ bị hủy và không được hoàn tiền
• Khách hàng cần đặt lại đơn hàng mới sau khi đã chuẩn bị đầy đủ giấy tờ
• Vui lòng liên hệ bộ phận hỗ trợ trước khi đến nhận xe nếu có vấn đề về giấy tờ`}
            />

            <Section
              title="5. Bảo mật thông tin giấy tờ"
              content={`EV Rental cam kết:

• Bảo mật tuyệt đối thông tin giấy tờ của khách hàng
• Chỉ sử dụng thông tin giấy tờ cho mục đích xác minh và quản lý đơn hàng
• Không chia sẻ thông tin giấy tờ cho bên thứ ba mà không có sự đồng ý của khách hàng
• Tuân thủ các quy định về bảo vệ dữ liệu cá nhân theo pháp luật Việt Nam`}
            />

            <Section
              title="6. Liên hệ hỗ trợ"
              content={`Nếu bạn có bất kỳ thắc mắc nào về điều khoản cầm giấy tờ, vui lòng liên hệ:

• Hotline: 1900-0000
• Email: support@evrental.com
• Chat trực tuyến trên website
• Đến trực tiếp tại các điểm thuê xe của EV Rental`}
            />

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircleOutlined className="text-blue-600 text-xl mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Tóm tắt</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    <li>Mang theo GPLX và CCCD/CCCD hoặc Passport khi đến nhận xe</li>
                    <li>Giấy tờ phải còn hiệu lực và thông tin khớp với đăng ký</li>
                    <li>Passport sẽ được giữ lại cho đến khi trả xe</li>
                    <li>Không có giấy tờ = không thể nhận xe và đơn hàng sẽ bị hủy</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/my-bookings">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Quay lại đơn hàng của tôi
                </button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <FileTextOutlined className="text-blue-600" />
        {title}
      </h2>
      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}

