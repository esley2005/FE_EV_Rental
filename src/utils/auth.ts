// Auth utilities
export const authUtils = {
  // Kiểm tra xem user đã đăng nhập chưa
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },

  // Lấy token hiện tại
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;

    try {
      return JSON.parse(userStr);
    } catch (err) {
      console.error('❌ Lỗi parse user từ localStorage:', err, userStr);
      return null;
    }
  },

  // Đăng xuất
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },

  // Kiểm tra role (case-insensitive)
  hasRole: (role: string): boolean => {
    const user = authUtils.getCurrentUser();
    return user?.role?.toLowerCase() === role.toLowerCase();
  },

  // Kiểm tra có phải admin không
  isAdmin: (): boolean => authUtils.hasRole('admin'),

  // Kiểm tra có phải staff không
  isStaff: (): boolean => authUtils.hasRole('staff'),

  // Kiểm tra có phải customer không
  isCustomer: (): boolean => authUtils.hasRole('customer'),
};
