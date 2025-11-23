"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import CarsSection from "@/components/home/CarsSection";
import Footer from "@/components/Footer";
import ChatBox from "@/components/chat/ChatBox";
import { authUtils } from "@/utils/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra nếu user là admin hoặc staff thì redirect về trang quản lý
    if (authUtils.isAuthenticated()) {
      if (authUtils.isAdmin()) {
        router.replace("/admin");
        return;
      }
      if (authUtils.isStaff()) {
        router.replace("/staff");
        return;
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col">

        <HeroSection />
        

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CarsSection />
          </div>
        </div>
        
        {/* About Section */}
        {/* <AboutSection /> */}
      </main>

      <Footer />


      <ChatBox  />
    </div>
  );
}
