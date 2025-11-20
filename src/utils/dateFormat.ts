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
    let date: dayjs.Dayjs;
    
    // Kiểm tra xem date string có phải UTC không
    const isUTC = dateStr.includes("Z") || dateStr.includes("+00:00");
    const isISOWithoutTZ = dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/);
    
    if (isUTC || isISOWithoutTZ) {
      // Backend trả về UTC, cần convert sang UTC+7
      // Parse UTC string và extract components
      let cleanDateStr = dateStr;
      if (dateStr.includes("Z")) {
        cleanDateStr = dateStr.replace("Z", "");
      } else if (dateStr.includes("+00:00")) {
        cleanDateStr = dateStr.replace("+00:00", "");
      }
      
      // Parse ISO string để lấy components
      const match = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        // Parse UTC components
        let utcHour = parseInt(hour, 10);
        let utcMinute = parseInt(minute, 10);
        let utcDay = parseInt(day, 10);
        let utcMonth = parseInt(month, 10) - 1; // month is 0-indexed in Date
        let utcYear = parseInt(year, 10);
        
        // Thêm 7 giờ để convert sang UTC+7
        utcHour += VIETNAM_UTC_OFFSET;
        
        // Xử lý overflow (nếu giờ >= 24, chuyển sang ngày hôm sau)
        if (utcHour >= 24) {
          utcHour -= 24;
          utcDay += 1;
        }
        
        // Tạo date object với UTC+7 time
        // Sử dụng Date constructor với local time (không phải UTC) để format đúng
        date = dayjs(new Date(utcYear, utcMonth, utcDay, utcHour, utcMinute, parseInt(second || "0", 10)));
      } else {
        // Fallback: dùng cách cũ với timestamp
        const utcTimestamp = new Date(dateStr.includes("Z") ? dateStr : dateStr + "Z").getTime();
        const vietnamTimestamp = utcTimestamp + (VIETNAM_UTC_OFFSET * 60 * 60 * 1000);
        date = dayjs(vietnamTimestamp);
      }
    } 
    // Nếu đã có timezone khác (ví dụ: +07:00), dayjs sẽ tự động parse đúng
    else if (dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      // Có timezone indicator, dayjs sẽ parse đúng
      date = dayjs(dateStr);
    }
    // Nếu không có timezone info, giả định đã là local time (UTC+7)
    else {
      // Parse như local time (có thể backend đã trả về local time rồi)
      date = dayjs(dateStr);
    }
    
    return date.format(format);
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

