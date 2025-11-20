import dayjs from "dayjs";

// Timezone Việt Nam (UTC+7)
const VIETNAM_UTC_OFFSET = 7; // UTC+7 (giờ)

/**
 * Format ngày giờ với timezone Việt Nam (UTC+7)
 * Backend thường trả về UTC, cần convert sang UTC+7
 * @param dateStr - ISO date string từ backend (thường là UTC)
 * @param format - Format string (mặc định: 'DD/MM/YYYY HH:mm')
 * @returns Formatted date string
 */
export const formatDateTime = (dateStr?: string | null, format: string = "DD/MM/YYYY HH:mm"): string => {
  if (!dateStr) return "-";
  
  try {
    // Debug: log date string để kiểm tra format
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatDateTime] Input:', dateStr);
    }
    
    let date: dayjs.Dayjs;
    
    // Kiểm tra xem date string có phải UTC không
    const isUTC = dateStr.includes("Z") || dateStr.includes("+00:00");
    const isISOWithoutTZ = dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/);
    
    if (isUTC || isISOWithoutTZ) {
      // Backend trả về UTC, cần convert sang UTC+7
      // Parse UTC string và lấy UTC timestamp trực tiếp
      let utcTimestamp: number;
      
      if (dateStr.includes("Z")) {
        // Parse UTC string (ví dụ: "2025-01-15T10:30:00Z")
        // new Date() với "Z" sẽ parse đúng UTC, getTime() trả về UTC timestamp
        utcTimestamp = new Date(dateStr).getTime();
      } else if (dateStr.includes("+00:00")) {
        // Parse UTC string với +00:00
        utcTimestamp = new Date(dateStr).getTime();
      } else {
        // ISO format không có timezone, giả định là UTC
        utcTimestamp = new Date(dateStr + "Z").getTime();
      }
      
      // Thêm 7 giờ (7 * 60 * 60 * 1000 milliseconds) để convert sang UTC+7
      const vietnamTimestamp = utcTimestamp + (VIETNAM_UTC_OFFSET * 60 * 60 * 1000);
      
      // Tạo dayjs object từ timestamp
      // Timestamp là absolute value, không phụ thuộc timezone
      // Khi format, dayjs sẽ format theo local timezone của browser
      // Vì chúng ta đã thêm 7 giờ vào UTC timestamp, nên cần format như UTC+7
      // Nhưng dayjs không có timezone plugin, nên sẽ format theo local timezone
      // Giải pháp: tạo Date object từ timestamp và format
      date = dayjs(new Date(vietnamTimestamp));
    } 
    // Nếu đã có timezone khác (ví dụ: +07:00), dayjs sẽ tự động parse đúng
    else if (dateStr.includes("+") || dateStr.includes("-", 10)) {
      // Có timezone indicator, dayjs sẽ parse đúng
      date = dayjs(dateStr);
    }
    // Nếu không có timezone info, giả định đã là local time (hoặc UTC+7)
    else {
      // Parse như local time (có thể backend đã trả về local time rồi)
      date = dayjs(dateStr);
    }
    
    const result = date.format(format);
    
    // Debug: log kết quả
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatDateTime] Output:', result, '| Original UTC:', dateStr.includes("Z") || dateStr.includes("+00:00") || isISOWithoutTZ);
    }
    
    return result;
  } catch (error) {
    console.error("Error formatting date:", error, dateStr);
    // Fallback: sử dụng format đơn giản với local timezone
    try {
      return dayjs(dateStr).format(format);
    } catch {
      return "-";
    }
  }
};

/**
 * Format chỉ ngày (không có giờ)
 * @param dateStr - ISO date string từ backend
 * @returns Formatted date string (DD/MM/YYYY)
 */
export const formatDateOnly = (dateStr?: string | null): string => {
  return formatDateTime(dateStr, "DD/MM/YYYY");
};

/**
 * Format chỉ giờ (không có ngày)
 * @param dateStr - ISO date string từ backend
 * @returns Formatted time string (HH:mm)
 */
export const formatTimeOnly = (dateStr?: string | null): string => {
  return formatDateTime(dateStr, "HH:mm");
};

/**
 * Format ngày giờ đầy đủ với giây
 * @param dateStr - ISO date string từ backend
 * @returns Formatted date string (DD/MM/YYYY HH:mm:ss)
 */
export const formatDateTimeWithSeconds = (dateStr?: string | null): string => {
  return formatDateTime(dateStr, "DD/MM/YYYY HH:mm:ss");
};

