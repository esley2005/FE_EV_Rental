"use client";

import { useState } from 'react';
import { bookingsApi, type BookingData } from '@/services/api';

export function useBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = async (bookingData: BookingData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await bookingsApi.create(bookingData);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message
        };
      } else {
        setError(response.error || 'Failed to create booking');
        return {
          success: false,
          error: response.error
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createBooking,
    loading,
    error,
    clearError: () => setError(null)
  };
}

