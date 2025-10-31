"use client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
<<<<<<< Updated upstream
import CarsSection from "@/components/home/CarsSection";
=======
import CarCardComp from "@/components/CarCard";
>>>>>>> Stashed changes
import Footer from "@/components/Footer";

export default function Home() {
<<<<<<< Updated upstream
=======
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopRented = async () => {
      try {
  // Lấy top xe thuê nhiều (3 xe)
  const response = await carsApi.getTopRented(3);

        if (response.success && response.data) {
          // Backend C# có thể trả về { "$values": [...] } hoặc array trực tiếp
          const carsData = (response.data as any)?.$values || response.data;

          // Lọc xe active và chưa xóa (phòng trường hợp API trả cả xe không active)
          const topCars = Array.isArray(carsData)
            ? carsData.filter((car: Car) => car.isActive && !car.isDeleted)
            : [];

          if (topCars.length > 0) {
            setCars(topCars);
            return; // đã có data top rented
          }
        }

        // Fallback: nếu API top rented lỗi hoặc rỗng, lấy tất cả xe và hiển thị 3 xe đầu
        const allRes = await carsApi.getAll();
        if (allRes.success && allRes.data) {
          const allData = (allRes.data as any)?.$values || allRes.data;
          const active = Array.isArray(allData)
            ? allData.filter((car: Car) => car.isActive && !car.isDeleted)
            : [];
          setCars(active.slice(0, 3));
        }
      } catch (err) {
        console.error("❌ Lỗi tải top xe thuê nhiều:", err);
        // Fallback trong catch
        try {
          const allRes = await carsApi.getAll();
          if (allRes.success && allRes.data) {
            const allData = (allRes.data as any)?.$values || allRes.data;
            const active = Array.isArray(allData)
              ? allData.filter((car: Car) => car.isActive && !car.isDeleted)
              : [];
            setCars(active.slice(0, 3));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    loadTopRented();
  }, []);

>>>>>>> Stashed changes
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pt-20">
        <HeroSection />
<<<<<<< Updated upstream
        <CarsSection />
=======

        <section className="w-full max-w-6xl mb-16">
          <div className="flex items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              Xe điện được thuê nhiều
            </h2>
          </div>
          
          <div 
            id="cars"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
          >
            {loading ? (
              <p className="text-center text-gray-500 col-span-full">
                Đang tải danh sách xe...
              </p>
            ) : cars.length === 0 ? (
              <p className="text-center text-gray-500 col-span-full">
                Không có xe nào.
              </p>
            ) : (
              cars.map((car) => <CarCardComp key={car.id} car={car} />)
            )}
          </div>
        </section>
>>>>>>> Stashed changes
      </main>

      <Footer />
    </div>
  );
}
