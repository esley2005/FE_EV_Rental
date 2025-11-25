"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import CarsSection from "@/components/home/CarsSection";
import Footer from "@/components/Footer";
import ChatBox from "@/components/chat/ChatBox";
import { authUtils } from "@/utils/auth";
import { Alert, Button } from "antd";
import { StarOutlined, ShoppingOutlined } from "@ant-design/icons";
import { rentalOrderApi, feedbackApi, authApi } from "@/services/api";
import type { RentalOrderData, User } from "@/services/api";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [unratedOrders, setUnratedOrders] = useState<RentalOrderData[]>([]);
  const [loadingUnrated, setLoadingUnrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Kiểm tra nếu user là admin hoặc staff thì redirect về trang quản lý
    if (authUtils.isAuthenticated()) {
      if (authUtils.isAdmin()) {
        router.replace("/admin");
        return;
      }
      if (authUtils.isStaff()) {
        router.replace("/staff");
        return;
      }
      // Load user và check unrated orders
      loadUserAndCheckUnratedOrders();
    }
  }, [router]);

  const loadUserAndCheckUnratedOrders = async () => {
    try {
      setLoadingUnrated(true);
      
      // Load user
      const userResponse = await authApi.getProfile();
      if (userResponse.success && 'data' in userResponse && userResponse.data) {
        const userData = userResponse.data;
        setUser(userData);
        const userId = userData.id || userData.userId;
        
        if (userId && typeof userId === 'number' && !isNaN(userId)) {
          // Load bookings
          const ordersResponse = await rentalOrderApi.getByUserId(userId);
          if (ordersResponse.success && ordersResponse.data) {
            const orders = Array.isArray(ordersResponse.data)
              ? ordersResponse.data
              : (ordersResponse.data as any)?.$values || [];
            
            // Filter completed orders
            const completedOrders = orders.filter((order: RentalOrderData) => {
              const status = order.status;
              if (typeof status === 'number') {
                return status === 8; // 8 = completed
              }
              const statusStr = String(status).toLowerCase();
              return statusStr.includes('completed') || statusStr.includes('hoàn thành');
            });

            // Check which orders don't have feedback
            const ordersWithoutFeedback: RentalOrderData[] = [];
            for (const order of completedOrders) {
              try {
                const feedbackResponse = await feedbackApi.getByRentalOrderId(order.id);
                const feedbacks = feedbackResponse.success && feedbackResponse.data
                  ? (Array.isArray(feedbackResponse.data) ? feedbackResponse.data : [])
                  : [];
                
                if (feedbacks.length === 0) {
                  ordersWithoutFeedback.push(order);
                }
              } catch (error) {
                console.error(`Error checking feedback for order ${order.id}:`, error);
                // If error, assume no feedback
                ordersWithoutFeedback.push(order);
              }
            }

            setUnratedOrders(ordersWithoutFeedback);
          }
        }
      }
    } catch (error) {
      console.error('Error loading unrated orders:', error);
    } finally {
      setLoadingUnrated(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Unrated Orders Reminder */}
        {!loadingUnrated && unratedOrders.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4 w-full">
            <Alert
              message={
                <div className="flex items-center gap-2">
                  <StarOutlined className="text-yellow-500" />
                  <span className="font-semibold">
                    Bạn có {unratedOrders.length} đơn hàng chưa đánh giá
                  </span>
                </div>
              }
              description={
                <div className="mt-2">
                  <p className="mb-2">
                    Hãy chia sẻ trải nghiệm của bạn về {unratedOrders.length === 1 ? 'đơn hàng' : 'các đơn hàng'} đã hoàn thành để giúp chúng tôi cải thiện dịch vụ tốt hơn.
                  </p>
                  <Link href="/my-bookings">
                    <Button
                      type="primary"
                      icon={<ShoppingOutlined />}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Đánh giá ngay
                    </Button>
                  </Link>
                </div>
              }
              type="warning"
              showIcon
              closable
              className="mb-4"
            />
          </div>
        )}

        <HeroSection />
        

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CarsSection />
          </div>
        </div>
        
        {/* About Section */}
        {/* <AboutSection /> */}
      </main>

      <Footer />


      <ChatBox  />
    </div>
  );
}
