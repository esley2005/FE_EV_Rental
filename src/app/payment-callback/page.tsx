"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to MoMo callback page
    const momoCallbackUrl = "/checkout/payment-callback-momo?partnerCode=MOMOR3MB20251110&orderId=5&requestId=4caf8c75-f269-4b64-80c0-55e6fdbd979f&amount=2000&orderInfo=Thanh+toan+giu+don%21&orderType=momo_wallet&transId=108736866756&resultCode=0&message=Thành+công.&payType=qr&responseTime=1764186661427&extraData=&signature=bd8452b72146849af7071769b621ddee1414c0dbac12f0792eaf422e5befc71e";
    router.replace(momoCallbackUrl);
  }, [router]);
    

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Đang chuyển hướng đến trang thanh toán...</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

