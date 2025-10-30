import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚗</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Xe không tồn tại
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Rất tiếc, chúng tôi không thể tìm thấy thông tin xe bạn đang tìm kiếm.
          </p>
          <div className="space-y-4">
            <Link
              href="/#cars"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Xem tất cả xe điện
            </Link>
            <br />
            <Link
              href="/"
              className="inline-block text-blue-600 hover:text-blue-700 underline"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
