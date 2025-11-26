#  EV Rental - Electric Vehicle Rental System - GROUP 5

Hệ thống cho thuê xe điện hiện đại với Next.js 15, TypeScript, và Ant Design.

##  Công nghệ sử dụng

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Ant Design 5.x
- **Styling**: Tailwind CSS
- **Backend API**: ASP.NET Core (C#)
- **Image Storage**: Cloudinary CDN
- **Authentication**: JWT


##  Features Highlight

### Image Upload với Cloudinary
- Auto resize & optimize
- CDN global delivery
- Image transformations
- Free tier: 25GB storage

###  Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Staff, Customer)
- Protected routes
- Auto token refresh

###  Responsive Design
- Mobile-first approach
- Tailwind CSS utilities
- Ant Design responsive components

###  Performance
- Next.js 15 App Router
- Server-side rendering (SSR)
- Static site generation (SSG)
- Image optimization

##  Troubleshooting

### API Connection Issues
```bash
# Kiểm tra backend đang chạy
# Mở: https://localhost:7200/swagger

# Kiểm tra CORS settings trong backend
# Kiểm tra .env.local có đúng API URL không
```

### Cloudinary Upload Fails
 Xem chi tiết trong [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md)

## Support

Nếu gặp vấn đề, vui lòng tạo issue hoặc liên hệ team.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
