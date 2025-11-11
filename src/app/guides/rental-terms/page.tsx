"use client";

import Image from "next/image";
import { Card, Alert } from "antd";
import { FileTextOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined } from "@ant-design/icons";
import Header from "@/components/Header";
import Link from "next/link";

export default function RentalTermsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Điều khoản thuê xe - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Điều khoản thuê xe
            </h1>
          </div>
        </div>

        {/* 📘 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <Alert
              message="Thông tin quan trọng"
              description="Vui lòng đọc kỹ các điều khoản và điều kiện thuê xe trước khi đặt xe. Bằng việc đặt xe, bạn đồng ý với tất cả các điều khoản dưới đây."
              type="info"
              icon={<InfoCircleOutlined />}
              className="mb-6"
            />

            <Section
              title="1. Điều kiện thuê xe"
              content={`• Khách hàng phải từ 18 tuổi trở lên và có giấy phép lái xe hợp lệ
• Giấy phép lái xe phải còn hiệu lực và phù hợp với loại xe thuê
• Khách hàng phải có chứng minh nhân dân (CCCD) hoặc căn cước công dân còn hiệu lực
• Khách hàng phải có tài khoản đã được xác thực trên hệ thống EV Rental
• Khách hàng phải thanh toán đầy đủ phí thuê xe và các khoản phí phát sinh (nếu có)`}
            />

            <Section
              title="2. Quy trình đặt xe"
              content={`• Khách hàng chọn xe, thời gian và địa điểm thuê xe trên website
• Điền đầy đủ thông tin cá nhân và thông tin đặt xe
• Thanh toán phí thuê xe (có thể thanh toán tại điểm thuê xe hoặc online)
• Upload giấy tờ tùy thân (GPLX và CCCD) lên hệ thống
• Chờ admin xác thực giấy tờ và xác nhận đơn hàng
• Đến địa điểm thuê xe đúng giờ để nhận xe`}
            />

            <Section
              title="3. Trách nhiệm của khách hàng"
              content={`• Sử dụng xe đúng mục đích và tuân thủ luật giao thông
• Bảo quản xe cẩn thận, không làm hư hỏng xe
• Trả xe đúng thời gian đã thỏa thuận
• Thanh toán đầy đủ các khoản phí phát sinh (nếu có)
• Báo ngay cho EV Rental nếu xe gặp sự cố hoặc tai nạn
• Không cho người khác lái xe nếu không được phép
• Không sử dụng xe để vận chuyển hàng cấm, chất cấm
• Không sử dụng xe khi đã uống rượu bia hoặc sử dụng chất kích thích`}
            />

            <Section
              title="4. Phí thuê xe và thanh toán"
              content={`• Phí thuê xe được tính theo ngày hoặc giờ tùy theo gói dịch vụ
• Phí thuê xe có thể thay đổi tùy theo loại xe, thời điểm và thời gian thuê
• Khách hàng có thể thanh toán bằng tiền mặt tại điểm thuê hoặc chuyển khoản online
• Phí đặt cọc (nếu có) sẽ được hoàn trả sau khi trả xe và kiểm tra xe không có hư hỏng
• Các khoản phí phát sinh (phí vượt quãng đường, phí quá giờ, phí vệ sinh...) sẽ được tính thêm`}
            />

            <Section
              title="5. Bảo hiểm và trách nhiệm"
              content={`• Xe đã được bảo hiểm theo quy định của pháp luật
• Khách hàng chịu trách nhiệm về mọi thiệt hại do lỗi của mình gây ra
• Trong trường hợp tai nạn, khách hàng phải báo ngay cho EV Rental và cơ quan chức năng
• Khách hàng phải bồi thường thiệt hại nếu xe bị hư hỏng do lỗi của khách hàng
• EV Rental không chịu trách nhiệm về tài sản cá nhân của khách hàng để trong xe`}
            />

            <Section
              title="6. Hủy đơn hàng và hoàn tiền"
              content={`• Khách hàng có thể hủy đơn hàng trước thời gian nhận xe
• Phí hủy đơn hàng (nếu có) sẽ được tính theo chính sách của EV Rental
• Hoàn tiền sẽ được thực hiện trong vòng 5-7 ngày làm việc sau khi hủy đơn hàng
• Đơn hàng đã được xác nhận và thanh toán sẽ không được hủy miễn phí`}
            />

            <Section
              title="7. Vi phạm và xử lý"
              content={`• Nếu khách hàng vi phạm điều khoản, EV Rental có quyền từ chối cho thuê xe
• Khách hàng phải chịu trách nhiệm pháp lý nếu vi phạm luật giao thông
• EV Rental có quyền thu hồi xe nếu phát hiện khách hàng vi phạm điều khoản
• Mọi tranh chấp sẽ được giải quyết theo pháp luật Việt Nam`}
            />

            <Section
              title="8. Quyền lợi của khách hàng"
              content={`• Được sử dụng xe trong thời gian đã thỏa thuận
• Được hỗ trợ 24/7 từ đội ngũ chăm sóc khách hàng của EV Rental
• Được đổi xe nếu xe gặp sự cố kỹ thuật (nếu có xe thay thế)
• Được hưởng các chương trình khuyến mãi và ưu đãi của EV Rental`}
            />

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircleOutlined className="text-blue-600 text-xl mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Lưu ý quan trọng</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    <li>Vui lòng đọc kỹ tất cả điều khoản trước khi đặt xe</li>
                    <li>Bằng việc đặt xe, bạn xác nhận đã đọc và đồng ý với tất cả điều khoản trên</li>
                    <li>Nếu có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ của EV Rental</li>
                    <li>EV Rental có quyền cập nhật điều khoản và sẽ thông báo trước cho khách hàng</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center space-x-4">
              <Link href="/guides/terms">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Xem điều khoản cầm giấy tờ
                </button>
              </Link>
              <button 
                onClick={() => window.close()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng cửa sổ
              </button>
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

