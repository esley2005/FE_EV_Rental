"use client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CarsSection from "@/components/home/CarsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pt-20">
        <HeroSection />
        <CarsSection />
      </main>

      <Footer />
    </div>
  );
}
