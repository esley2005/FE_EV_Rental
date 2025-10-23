import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="text-center max-w-xl">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-4 mt-10">
        Thuê xe điện dễ dàng, nhanh chóng
      </h1>
      <p className="text-lg text-blue-700 mb-6">
        Đăng ký tài khoản để trải nghiệm dịch vụ thuê xe điện hiện đại, an toàn và tiện lợi.
      </p>
      <Link href="/menu" className="inline-block">
        <button className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold text-lg shadow hover:bg-blue-700 transition">
          Xem Thêm Xe
        </button>
      </Link>
    </div>
  );
}
