// app/contact/page.tsx

"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="w-screen min-h-screen m-0 p-0 bg-white text-black overflow-x-hidden">
      <Header />

      {/* Tiêu đề */}
      <main className="w-full px-4 md:px-8 py-10 bg-white pt-28">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-bold text-black">Liên hệ với EV Rental</h1>
          <p className="text-gray-700 text-lg">
            Hãy để lại thông tin hoặc liên hệ trực tiếp với chúng tôi nếu bạn có bất kỳ thắc mắc nào.
          </p>
        </div>

        {/* Thông tin liên hệ + form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Thông tin */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-black">Thông tin liên hệ</h2>

            <div className="space-y-3 text-gray-800">
              <p><strong>Địa chỉ:</strong> 123 Đường Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh</p>
              <p>
                <strong>Điện thoại:</strong>{" "}
                <a href="tel:0901234567" className="text-blue-600 hover:underline">
                  090 123 4567
                </a>
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:contact@evrental.vn" className="text-blue-600 hover:underline">
                  contact@evrental.vn
                </a>
              </p>
              <p><strong>Giờ làm việc:</strong> 8:00 – 20:00 (Thứ 2 – Chủ nhật)</p>
            </div>

            <div className="rounded-lg overflow-hidden shadow-md mt-6">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.455334739747!2d106.68218837480455!3d10.77601975918862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f43e640f21d%3A0x1e45a82baf2f77c!2zTmfDom4gVmFuIMSQLCBDw7RuZyBTxqFuLCBRdeG6rW4gNSwgVGjDoG5oIHBo4buRIFThu6sgSG_Fhu68Yw!5e0!3m2!1svi!2s!4v1702908400000"
                width="100%"
                height="300"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          {/* Form liên hệ */}
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl space-y-5">
            <h2 className="text-2xl font-semibold text-black mb-2">Gửi tin nhắn cho chúng tôi</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ và tên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập nội dung bạn muốn gửi..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Gửi liên hệ
            </button>

            {status && <p className="text-green-600 text-sm mt-3 text-center">{status}</p>}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
