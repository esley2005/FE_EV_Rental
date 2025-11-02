"use client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CarsSection from "@/components/home/CarsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Hero Section với ảnh nền và form tìm kiếm */}
        <HeroSection />
        
        {/* Cars Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CarsSection />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
