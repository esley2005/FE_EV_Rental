"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}
