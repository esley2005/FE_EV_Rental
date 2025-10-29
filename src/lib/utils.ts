// Normalize C# array format utility
export function normalizeDotNetArray<T>(data: any): T[] {
  // Handle C# format: { $values: [...] }
  if (data && typeof data === 'object' && '$values' in data) {
    return Array.isArray(data.$values) ? data.$values : [];
  }
  
  // Handle direct array
  if (Array.isArray(data)) {
    return data;
  }
  
  // Handle single object -> wrap in array
  if (data && typeof data === 'object') {
    return [data];
  }
  
  return [];
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN');
}

// Constants
export const ROUTES = {
  HOME: '/',
  CARS_ALL: '/cars/all',
  CARS_DETAIL: '/cars/[id]',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  MY_BOOKINGS: '/my-bookings',
  ADMIN: '/admin',
  STAFF: '/staff'
} as const;

export const ROLES = {
  ADMIN: 'Admin',
  STAFF: 'Staff', 
  CUSTOMER: 'Customer'
} as const;

export const CAR_STATUS = {
  AVAILABLE: 1,
  RENTED: 2,
  MAINTENANCE: 3,
  UNAVAILABLE: 4
} as const;
