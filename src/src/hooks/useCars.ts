"use client";

import { useState, useEffect } from 'react';
import { carsApi } from '@/services/api';
import type { Car } from '@/types/car';

// Hook để lấy danh sách tất cả xe
export function useCars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCars() {
      try {
        setLoading(true);
        const response = await carsApi.getAll();
        
        if (response.success && response.data) {
          setCars(response.data);
          setError(null);
        } else {
          setError(response.error || 'Failed to fetch cars');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchCars();
  }, []);

  const refetch = async () => {
    setLoading(true);
    const response = await carsApi.getAll();
    if (response.success && response.data) {
      setCars(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch cars');
    }
    setLoading(false);
  };

  return { cars, loading, error, refetch };
}

// Hook để lấy thông tin 1 xe
export function useCar(id: string) {
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCar() {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await carsApi.getById(id);
        
        if (response.success && response.data) {
          setCar(response.data);
          setError(null);
        } else {
          setError(response.error || 'Car not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchCar();
  }, [id]);

  const refetch = async () => {
    if (!id) return;
    
    setLoading(true);
    const response = await carsApi.getById(id);
    if (response.success && response.data) {
      setCar(response.data);
      setError(null);
    } else {
      setError(response.error || 'Car not found');
    }
    setLoading(false);
  };

  return { car, loading, error, refetch };
}

