// Booking API - tách riêng domain booking
import { httpClient } from './httpClient';

export interface BookingData {
  carId: string;
  fullName: string;
  phone: string;
  email?: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  notes?: string;
}

export interface Booking extends BookingData {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalDays: number;
  createdAt: string;
}

export const bookingsApi = {
  // Tạo booking mới
  create: (bookingData: BookingData) =>
    httpClient<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  // Lấy danh sách bookings
  getAll: (filters?: { status?: string; carId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.carId) params.append('carId', filters.carId);
    
    const query = params.toString();
    return httpClient<Booking[]>(`/bookings${query ? `?${query}` : ''}`);
  },

  // Lấy đơn hàng của user hiện tại
  getMyBookings: (filters?: { status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return httpClient<Booking[]>(`/bookings/my-bookings${query ? `?${query}` : ''}`);
  },

  // Lấy chi tiết booking theo ID
  getById: (id: string) =>
    httpClient<Booking>(`/bookings/${id}`),

  // Hủy booking
  cancel: (id: string, reason?: string) =>
    httpClient<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
