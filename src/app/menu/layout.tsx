"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 pt-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}
