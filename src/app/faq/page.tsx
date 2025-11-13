"use client";

import Image from "next/image";
import { Card, Collapse } from "antd";
import {
  QuestionCircleOutlined,
  CarOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import Header from "@/components/Header";

const { Panel } = Collapse;

export default function FAQPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* 🖼️ BANNER */}
        <div className="relative w-full h-60 md:h-72 overflow-hidden mb-10 rounded-2xl shadow-md">
          <Image
            src="/ev-2-edit.min_.jpg"
            alt="Câu hỏi thường gặp - EV Rental"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
              Câu hỏi thường gặp
            </h1>
          </div>
        </div>

        {/* 📄 NỘI DUNG */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
          <Card className="shadow-lg rounded-2xl overflow-hidden bg-white p-6 md:p-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <QuestionCircleOutlined className="text-blue-500" />
              Các câu hỏi phổ biến
            </h2>

            <Collapse accordion expandIconPosition="end" className="faq-collapse">
              <Panel
                header={
                  <span className="flex items-center gap-2">
                    <CarOutlined className="text-blue-500" />
                    Làm thế nào để đặt xe trên EV Rental?
                  </span>
                }
                key="1"
              >
                <p className="text-gray-700 leading-relaxed">
                  Để đặt xe, bạn cần đăng nhập tài khoản EV Rental → chọn xe phù hợp
                  → chọn thời gian thuê → nhấn "Đặt xe" và hoàn tất thanh toán.
                  Sau khi đặt thành công, hệ thống sẽ gửi email xác nhận và chi tiết
                  giao xe cho bạn.
                </p>
              </Panel>

              <Panel
                header={
                  <span className="flex items-center gap-2">
                    <CreditCardOutlined className="text-green-500" />
                    EV Rental chấp nhận những hình thức thanh toán nào?
                  </span>
                }
                key="2"
              >
                <p className="text-gray-700 leading-relaxed">
                  Bạn có thể thanh toán bằng thẻ Visa, MasterCard, JCB, ví điện tử,
                  hoặc chuyển khoản ngân hàng.  
                  Ngoài ra, một số khu vực hỗ trợ thanh toán tiền mặt khi nhận xe.
                </p>
              </Panel>

              <Panel
                header={
                  <span className="flex items-center gap-2">
                    <ClockCircleOutlined className="text-orange-500" />
                    Nếu đến trễ giờ nhận xe thì sao?
                  </span>
                }
                key="3"
              >
                <p className="text-gray-700 leading-relaxed">
                  Nếu bạn đến trễ, vui lòng thông báo trước cho chủ xe hoặc trung tâm
                  hỗ trợ của EV Rental.  
                  Nếu quá 1 giờ không liên hệ, hệ thống có thể tự động hủy đơn và áp dụng phí theo quy định.
                </p>
              </Panel>

              <Panel
                header={
                  <span className="flex items-center gap-2">
                    <FileProtectOutlined className="text-indigo-500" />
                    EV Rental bảo vệ thông tin cá nhân như thế nào?
                  </span>
                }
                key="4"
              >
                <p className="text-gray-700 leading-relaxed">
                  EV Rental tuân thủ chính sách bảo mật nghiêm ngặt, sử dụng công nghệ
                  mã hóa SSL để bảo vệ toàn bộ thông tin thanh toán và cá nhân của người dùng.
                  Dữ liệu chỉ được lưu trữ và sử dụng theo đúng mục đích đã thông báo.
                </p>
              </Panel>
            </Collapse>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        .faq-collapse .ant-collapse-header {
          font-weight: 500;
          color: #1f2937;
          font-size: 16px;
        }
        .faq-collapse .ant-collapse-item {
          border-bottom: 1px solid #f0f0f0;
        }
      `}</style>
    </>
  );
}
