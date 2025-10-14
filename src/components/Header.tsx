import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between items-center px-8 py-6 bg-white shadow-md">
      {/* ✅ Logo - bấm để quay về trang chủ */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
        <Image src="/logo_ev.png" alt="EV Rent" width={60} height={60} />
        <span className="text-2xl font-bold text-blue-700">EV Rent</span>
      </Link>

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
