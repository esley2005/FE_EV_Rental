// CarsGrid component - horizontal scroll layout
"use client";
import CarCard from '@/components/CarCard';
import { Car } from '@/types/car';
import { motion } from 'framer-motion';

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
          {cars.map((car, index) => (
            <motion.div 
              key={car.id} 
              className="flex-shrink-0 w-[280px] sm:w-[290px]"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ y: -8 }}
            >
              <CarCard car={car} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
