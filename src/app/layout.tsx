import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "EV Rental - Thuê xe điện thông minh",
  description: "Dịch vụ thuê xe điện hiện đại, thân thiện môi trường",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
