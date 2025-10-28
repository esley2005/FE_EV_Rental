# Hướng dẫn khắc phục lỗi API

## Vấn đề hiện tại
Ứng dụng đang gặp lỗi "Failed to parse JSON for non-OK response" khi gọi API. Điều này thường xảy ra khi:

1. **API server không chạy** hoặc không thể kết nối được
2. **URL API không đúng** 
3. **CORS issues** hoặc server trả về error page HTML

## Cách khắc phục

### 1. Kiểm tra API Server
Đảm bảo API server đang chạy trên port 7200:
```bash
# Kiểm tra xem có process nào đang chạy trên port 7200 không
netstat -an | findstr :7200
```

### 2. Cấu hình Environment Variables
Tạo file `.env.local` trong thư mục gốc của project:
```env
NEXT_PUBLIC_API_URL=https://localhost:7200/api
```

### 3. Kiểm tra CORS Configuration
Đảm bảo API server có cấu hình CORS cho phép frontend kết nối:
```csharp
// Trong Program.cs hoặc Startup.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### 4. Test API Connection
Sử dụng tool test API đã được tích hợp:
```typescript
import { testApiConnection } from '@/utils/apiTest';

// Test kết nối API
const result = await testApiConnection();
console.log(result);
```

## Tính năng Fallback
Ứng dụng đã được cải thiện với các tính năng sau:

### 1. Error Handling Tốt Hơn
- Không còn crash app khi API lỗi
- Hiển thị thông báo lỗi thân thiện với người dùng
- Có nút "Thử lại" để reload trang

### 2. Mock Data Demo
- Khi API không khả dụng, app sẽ hiển thị mock data
- Người dùng vẫn có thể xem demo các tính năng
- Thông báo rõ ràng về việc đang sử dụng dữ liệu demo

### 3. Loading States
- Spinner loading khi đang tải dữ liệu
- UI responsive và user-friendly

## Debug Steps

1. **Mở Developer Tools** (F12)
2. **Kiểm tra Console** để xem log chi tiết
3. **Kiểm tra Network tab** để xem request/response
4. **Kiểm tra API URL** trong environment variables

## Các lỗi thường gặp

### "API server không khả dụng"
- Kiểm tra API server có đang chạy không
- Kiểm tra URL API có đúng không
- Kiểm tra firewall/antivirus có block không

### "CORS error"
- Cấu hình CORS trên API server
- Đảm bảo frontend và backend cùng domain hoặc đã config CORS

### "404 Not Found"
- Kiểm tra endpoint API có tồn tại không
- Kiểm tra route configuration

## Liên hệ hỗ trợ
Nếu vẫn gặp vấn đề, hãy:
1. Chụp screenshot lỗi
2. Copy log từ Console
3. Liên hệ team backend để kiểm tra API server

