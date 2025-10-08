import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CarCard from "@/components/CarCard";
import Footer from "@/components/Footer";
import { cars } from "@/data/cars";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />
      
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4">
        <HeroSection />
        
        {/* Danh sách xe */}
        <section id="cars" className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8 mb-16">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}