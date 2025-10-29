// CarsGrid component - chỉ lo layout grid
import CarCard from '@/components/CarCard';
import { Car } from '@/types/car';

interface CarsGridProps {
  cars: Car[];
  className?: string;
}

export default function CarsGrid({ cars, className = '' }: CarsGridProps) {
  if (cars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không có xe nào để hiển thị.</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 ${className}`}>
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
