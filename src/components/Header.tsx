import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between items-center px-3 py-2 bg-white shadow-md ">
      {/* ✅ Logo - bấm để quay về trang chủ */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-x-10">
        <Image src="/logo_ev.png" alt="EV Rent" width={60} height={60} />
      </Link>

     <nav className="flex items-center gap-8 text-sm font-medium -translate-x-45">
        <Link href="/" className="hover:text-[#FF4D00] transition">Trang chủ</Link>
        <Link href="/about" className="hover:text-[#FF4D00] transition">Giới thiệu</Link>
        <div className="relative group">
          <button className="hover:text-[#FF4D00] transition">Dịch vụ ▾</button>
          {/* Dropdown menu */}
          <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg py-2 min-w-[150px]">
            <Link href="/services/rental" className="block px-4 py-2 hover:bg-gray-100">Thuê xe</Link>
            <Link href="/services/maintenance" className="block px-4 py-2 hover:bg-gray-100">Bảo dưỡng</Link>
          </div>
        </div>
        <Link href="/contact" className="hover:text-[#FF4D00] transition">Liên hệ</Link>
      </nav>

      {/* Menu điều hướng */}
      <nav className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50 transition"
        >
          Đăng nhập
        </Link>


        <Link
          href="/register"
          className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Đăng ký
        </Link>
      </nav>
    </header>
  );
}
