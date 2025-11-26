// app/contact/page.tsx
//Trang Liên Hệ 
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function ContactPage() {
  return (
    <div className="w-screen min-h-screen m-0 p-0 bg-white text-black overflow-x-hidden">
      <Header />

      {/* Tiêu đề */}
      <main className="w-full px-4 md:px-8 py-10 bg-white pt-28">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-bold text-black">Liên hệ với EV Rental</h1>
          <p className="text-gray-700 text-lg">
            Liên hệ trực tiếp với chúng tôi nếu bạn có bất kỳ thắc mắc nào.
          </p>
        </div>

        {/* Thông tin liên hệ */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-black">Thông tin liên hệ</h2>

            <div className="space-y-4 text-gray-800">
              <div className="flex items-start gap-3">
                <strong className="text-gray-900 min-w-[100px]">Địa chỉ:</strong>
                <p>Lô E2a-7, Đường D1, Khu Công nghệ cao, Phường Tăng Nhơn Phú, TPHCM</p>
              </div>
              
              <div className="flex items-center gap-3">
                <strong className="text-gray-900 min-w-[100px]">Điện thoại:</strong>
                <a href="tel:19001218" className="text-blue-600 hover:underline">
                  1900 1218
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <strong className="text-gray-900 min-w-[100px]">Email:</strong>
                <a href="mailto:evrental@gmail.com" className="text-blue-600 hover:underline">
                  evrental@gmail.com
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <strong className="text-gray-900 min-w-[100px]">Giờ làm việc:</strong>
                <p>8:00 – 20:00 (Thứ 2 – Chủ nhật)</p>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden shadow-md mt-6">
              <iframe
                src="https://www.google.com/maps?q=FPT%20University%20Ho%20Chi%20Minh%20City%20-%20Khu%20Cong%20nghe%20cao%20TP.HCM&output=embed"
                width="100%"
                height="400"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
