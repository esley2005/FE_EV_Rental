// CarsGrid component - horizontal scroll layout
"use client";
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
    <div className={`relative ${className}`}>
      {/* Horizontal scroll container */}
      <div 
        className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        }}
      >
        <div className="flex gap-3 sm:gap-4 min-w-max px-2 sm:px-0">
          {cars.map((car) => (
            <div 
              key={car.id} 
              className="flex-shrink-0 w-[280px] sm:w-[290px]"
            >
              <CarCard car={car} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
