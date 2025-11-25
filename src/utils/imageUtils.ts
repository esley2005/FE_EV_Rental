/**
 * Kiểm tra và filter các URL ảnh không hợp lệ (example.com, placeholder, etc.)
 * @param imageUrl - URL ảnh cần kiểm tra
 * @param fallback - URL fallback nếu ảnh không hợp lệ
 * @returns URL hợp lệ hoặc fallback
 */
export function getValidImageUrl(imageUrl: string | null | undefined, fallback: string = '/logo_ev.png'): string {
  if (!imageUrl) {
    return fallback;
  }

  // Loại bỏ các URL không hợp lệ
  const invalidPatterns = [
    'example.com',
    'placeholder.com',
    'via.placeholder.com',
    'placehold.it',
    'dummyimage.com',
    'http://',
    'https://example',
  ];

  const lowerUrl = imageUrl.toLowerCase().trim();
  
  // Kiểm tra nếu URL chứa pattern không hợp lệ
  for (const pattern of invalidPatterns) {
    if (lowerUrl.includes(pattern)) {
      return fallback;
    }
  }

  // Kiểm tra nếu URL rỗng hoặc chỉ có khoảng trắng
  if (!imageUrl.trim()) {
    return fallback;
  }

  return imageUrl;
}

/**
 * Kiểm tra xem URL có phải là URL hợp lệ không
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  const invalidPatterns = [
    'example.com',
    'placeholder.com',
    'via.placeholder.com',
    'placehold.it',
    'dummyimage.com',
  ];

  const lowerUrl = url.toLowerCase().trim();
  return !invalidPatterns.some(pattern => lowerUrl.includes(pattern));
}

