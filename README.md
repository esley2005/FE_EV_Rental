# 🚗 EV Rental - Electric Vehicle Rental System

Hệ thống cho thuê xe điện hiện đại với Next.js 15, TypeScript, và Ant Design.

## 🚀 Tính năng

### Khách hàng (Customer)
- 🔍 Xem danh sách xe điện có sẵn
- 📱 Xem chi tiết thông tin xe (pin, số ghế, giá thuê...)
- 🎫 Đặt xe online
- 👤 Quản lý thông tin cá nhân
- 📋 Xem lịch sử đơn hàng

### Nhân viên (Staff)
- 🚙 Quản lý xe tại điểm (CRUD)
- 📸 Upload ảnh xe lên Cloudinary
- 📊 Xem thống kê
- ✅ Xử lý giao/nhận xe

### Quản trị viên (Admin)
- 👥 Quản lý toàn bộ hệ thống
- 🏢 Quản lý đội xe & điểm thuê
- 📈 Dashboard và báo cáo tổng quan
- ⚙️ Cấu hình hệ thống

## 🛠️ Công nghệ sử dụng

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Ant Design 5.x
- **Styling**: Tailwind CSS
- **Backend API**: ASP.NET Core (C#)
- **Image Storage**: Cloudinary CDN
- **Authentication**: JWT

## 📦 Cài đặt

### 1. Clone project

```bash
git clone <repository-url>
cd FE_EV_Rental
```

### 2. Install dependencies

```bash
npm install
```

### 3. Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục root:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://localhost:7200/api

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

📖 **Chi tiết cấu hình Cloudinary**: Xem file [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md)

### 4. Run development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

## 👥 Demo Accounts

```bash
# Admin
Email: admin@evr.com
Password: Admin@123

# Staff
Email: staff@evr.com
Password: Staff@123

# Customer
Email: customer@evr.com
Password: Customer@123
```

## 📁 Cấu trúc Project

```
FE_EV_Rental/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Auth pages (login, register, forgot-password)
│   │   ├── admin/          # Admin dashboard
│   │   ├── staff/          # Staff dashboard
│   │   ├── cars/           # Car listing & detail pages
│   │   ├── profile/        # User profile management
│   │   └── my-bookings/    # User booking history
│   ├── components/         # Reusable React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── CarCard.tsx     # Car display card
│   │   ├── Header.tsx      # Navigation header
│   │   └── ...
│   ├── services/           # API service layer
│   │   └── api.ts          # Centralized API calls
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets
├── CLOUDINARY_SETUP.md    # Cloudinary configuration guide
└── README.md              # This file
```

## 🎨 Features Highlight

### 🖼️ Image Upload với Cloudinary
- Auto resize & optimize
- CDN global delivery
- Image transformations
- Free tier: 25GB storage

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Staff, Customer)
- Protected routes
- Auto token refresh

### 📱 Responsive Design
- Mobile-first approach
- Tailwind CSS utilities
- Ant Design responsive components

### 🚀 Performance
- Next.js 15 App Router
- Server-side rendering (SSR)
- Static site generation (SSG)
- Image optimization

## 🐛 Troubleshooting

### API Connection Issues
```bash
# Kiểm tra backend đang chạy
# Mở: https://localhost:7200/swagger

# Kiểm tra CORS settings trong backend
# Kiểm tra .env.local có đúng API URL không
```

### Cloudinary Upload Fails
📖 Xem chi tiết trong [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md)

## 📞 Support

Nếu gặp vấn đề, vui lòng tạo issue hoặc liên hệ team.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
