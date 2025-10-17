// 📁 src/pages/TestAPI.tsx
import React, { useEffect } from "react";
import { getUsers } from "@/services/userService";

export default function TestAPI() {
  useEffect(() => {
    getUsers()
      .then((users) => console.log("✅ API connected:", users))
      .catch((err) => console.error("❌ API failed:", err));
  }, []);

  return <div>🔍 Kiểm tra kết nối API... Mở Console để xem kết quả.</div>;
}
