# 🖼️ Hướng dẫn cấu hình Cloudinary

## Bước 1: Tạo tài khoản Cloudinary

1. Truy cập: https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí (Free tier: 25GB storage, 25GB bandwidth/tháng)
3. Xác nhận email

## Bước 2: Lấy thông tin Cloud Name

1. Đăng nhập vào Cloudinary Console: https://cloudinary.com/console
2. Tại trang Dashboard, bạn sẽ thấy:
   - **Cloud name**: `dxxxxx` (copy giá trị này)
   - **API Key**: `123456789`
   - **API Secret**: `xxxxx`

## Bước 3: Tạo Upload Preset (Unsigned)

1. Trong Cloudinary Console, vào **Settings** (⚙️ góc trên bên phải)
2. Chọn tab **Upload**
3. Scroll xuống **Upload presets**
4. Click **Add upload preset**
5. Cấu hình:
   - **Preset name**: `ev_rental_cars` (hoặc tên bạn muốn)
   - **Signing Mode**: Chọn **Unsigned** ⚠️ (quan trọng!)
   - **Folder**: `ev-rental/cars` (optional - để tổ chức ảnh)
   - **Access mode**: `public`
6. Click **Save**

## Bước 4: Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục root của project:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://localhost:7200/api

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxxxxx
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ev_rental_cars
```

**Thay thế:**
- `dxxxxx` → Cloud name của bạn
- `ev_rental_cars` → Upload preset name bạn đã tạo

## Bước 5: Restart Dev Server

```bash
# Dừng server (Ctrl+C)
npm run dev
```

## ✅ Kiểm tra hoạt động

1. Đăng nhập vào Admin/Staff
2. Vào **Quản lý xe** → Click **Thêm xe mới**
3. Click **"Chọn ảnh từ máy tính"**
4. Upload một ảnh test
5. Nếu thành công, bạn sẽ thấy:
   - Thông báo "Upload ảnh thành công!"
   - URL ảnh được tự động điền vào field "URL ảnh xe"
   - Preview ảnh hiển thị

## 🎯 Lợi ích của Cloudinary

- ✅ **CDN toàn cầu**: Tốc độ load ảnh nhanh
- ✅ **Tự động tối ưu**: Auto resize, compress, format conversion
- ✅ **Transformation**: Có thể crop, resize ảnh bằng URL
- ✅ **Free tier**: 25GB storage + 25GB bandwidth/tháng
- ✅ **Backup tự động**: Không lo mất ảnh

## 🔧 Troubleshooting

### Lỗi "Upload failed with status: 400"
- ✔️ Kiểm tra Upload Preset đã set **Signing Mode = Unsigned**
- ✔️ Kiểm tra Cloud Name đúng chưa

### Lỗi "Upload failed with status: 401"
- ✔️ Cloud Name sai hoặc Upload Preset name sai

### Ảnh upload lên nhưng không hiển thị
- ✔️ Kiểm tra **Access mode** của preset phải là **public**
- ✔️ Reload trang và thử lại

## 📚 Tài liệu tham khảo

- Cloudinary Upload API: https://cloudinary.com/documentation/upload_images
- Upload Presets: https://cloudinary.com/documentation/upload_presets
- Image Transformations: https://cloudinary.com/documentation/image_transformations

