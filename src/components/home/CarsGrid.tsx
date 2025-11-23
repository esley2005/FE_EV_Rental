// CarsGrid component - carousel with infinite loop
"use client";
import { useState } from 'react';
import CarCard from '@/components/CarCard';
import { Car } from '@/types/car';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CarsGridProps {
  cars: Car[];
  className?: string;
}

export default function CarsGrid({ cars, className = '' }: CarsGridProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  if (cars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không có xe nào để hiển thị.</p>
      </div>
    );
  }

  const handlePrevious = () => {
    setDirection('right');
    setCurrentIndex((prev) => (prev === 0 ? cars.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection('left');
    setCurrentIndex((prev) => (prev === cars.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 'left' : 'right');
    setCurrentIndex(index);
  };

  const getPreviousIndex = () => (currentIndex === 0 ? cars.length - 1 : currentIndex - 1);
  const getNextIndex = () => (currentIndex === cars.length - 1 ? 0 : currentIndex + 1);

  // Animation transition mượt mà
  const transition = {
    type: "spring",
    stiffness: 400,
    damping: 35,
    mass: 0.8,
  };

  return (
    <div className={`relative py-8 ${className}`}>
      {/* Carousel Container */}
      <div className="relative overflow-visible px-20">
        <div className="flex items-center justify-center gap-4 relative">
          {/* Previous Card (Left) - Peek */}
          {cars.length > 1 && (
            <motion.div 
              className="flex-shrink-0 w-[280px]"
              layout
              layoutId={`car-${getPreviousIndex()}`}
              animate={{
                scale: 0.9,
                opacity: 0.7,
              }}
              transition={transition}
            >
              <CarCard car={cars[getPreviousIndex()]} />
            </motion.div>
          )}

          {/* Current Card (Center) - Main */}
          <motion.div 
            className="flex-shrink-0 w-[380px] z-10"
            layout
            layoutId={`car-${currentIndex}`}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={transition}
            onAnimationComplete={() => setDirection(null)}
          >
            <CarCard car={cars[currentIndex]} />
          </motion.div>

          {/* Next Card (Right) - Peek */}
          {cars.length > 1 && (
            <motion.div 
              className="flex-shrink-0 w-[280px]"
              layout
              layoutId={`car-${getNextIndex()}`}
              animate={{
                scale: 0.9,
                opacity: 0.7,
              }}
              transition={transition}
            >
              <CarCard car={cars[getNextIndex()]} />
            </motion.div>
          )}

          {/* Navigation Buttons - Outside cards */}
          {cars.length > 1 && (
            <>
              {/* Left Arrow Button */}
              <button
                onClick={handlePrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:scale-110 active:scale-95"
                aria-label="Previous car"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900 font-bold" strokeWidth={2.5} />
              </button>

              {/* Right Arrow Button */}
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:scale-110 active:scale-95"
                aria-label="Next car"
              >
                <ChevronRight className="w-6 h-6 text-gray-900 font-bold" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {cars.length > 1 && (
          <div className="flex justify-center items-center gap-2.5 mt-8">
            {cars.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-blue-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400 w-2'
                } h-2 hover:scale-110 active:scale-95`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
