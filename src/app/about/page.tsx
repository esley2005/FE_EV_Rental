import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";


// Đây Là trang giao diện giới thiệu của EV Rental
// sử dụng components Header và Footer


export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-medium">
      <Header />

      <main className="flex-1 pt-15">
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Về EV Rental</h1>
              <p className="text-gray-600 leading-relaxed">
                EV Rental là nền tảng cho thuê xe ô tô điện, mang đến trải nghiệm lái xanh, an toàn và tiện lợi.
                Chúng tôi cung cấp đa dạng mẫu xe điện, dịch vụ hỗ trợ tài xế, và các gói bảo dưỡng đáng tin cậy.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-4 bg-gray-100 rounded-lg border">
                  <h3 className="font-bold text-gray-900">Mạng lưới rộng</h3>
                  <p className="text-sm text-gray-500">Trạm sạc và điểm nhận/trả trên toàn thành phố.</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border">
                  <h3 className="font-bold text-gray-900">Giá minh bạch</h3>
                  <p className="text-sm text-gray-500">Hiển thị giá rõ ràng, không phí ẩn.</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border">
                  <h3 className="font-bold text-gray-900">Hỗ trợ 24/7</h3>
                  <p className="text-sm text-gray-500">Đội ngũ hỗ trợ luôn sẵn sàng.</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border">
                  <h3 className="font-bold text-gray-900">Lựa chọn tài xế</h3>
                  <p className="text-sm text-gray-500">Thuê kèm tài xế hoặc tự lái theo nhu cầu.</p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-lg overflow-hidden shadow-sm">
              <Image src="/ev-2-edit.min_.jpg" alt="EV fleet" width={900} height={560} className="w-full h-auto object-cover" />
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 text-blue-600">Tại sao chọn chúng tôi</h2>
          <p className="text-gray-600 mt-2">Sự an toàn, tiện lợi và cam kết về trải nghiệm khách hàng là trọng tâm của EV Rental.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
              <h4 className="font-bold text-gray-900 text-blue-600">Xe mới, sạch</h4>
              <p className="text-sm text-gray-500 mt-2">Bảo dưỡng định kỳ, nội thất sạch sẽ, pin khỏe.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
              <h4 className="font-bold text-gray-900 text-blue-600">Thanh toán linh hoạt</h4>
              <p className="text-sm text-gray-500 mt-2">Nhiều phương thức thanh toán, hỗ trợ hóa đơn điện tử.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
              <h4 className="font-bold text-gray-900 text-blue-600">An toàn & bảo hiểm</h4>
              <p className="text-sm text-gray-500 mt-2">Gói bảo hiểm tiêu chuẩn cho mọi chuyến đi.</p>
            </div>
          </div>
        </section>

        <section className="bg-white border-t">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <h3 className="text-2xl font-bold text-gray-900">Đội ngũ của chúng tôi</h3>
            <p className="text-gray-600 mt-2">Một đội ngũ nhỏ, giàu kinh nghiệm trong ngành ô tô và dịch vụ khách hàng.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <div className="h-24 w-24 mx-auto rounded-full bg-gray-200 mb-4" />
                <h4 className="font-bold text-gray-900">Nguyễn Văn A</h4>
                <p className="text-sm text-gray-500">CEO & Co-founder</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <div className="h-24 w-24 mx-auto rounded-full bg-gray-200 mb-4" />
                <h4 className="font-bold text-gray-900">Trần Thị B</h4>
                <p className="text-sm text-gray-500">Head of Operations</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <div className="h-24 w-24 mx-auto rounded-full bg-gray-200 mb-4" />
                <h4 className="font-bold text-gray-900">Lê Văn C</h4>
                <p className="text-sm text-gray-500">Head of Support</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
