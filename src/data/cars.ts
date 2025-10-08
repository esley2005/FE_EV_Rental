import { Car } from "@/types/car";
// data test
export const cars: Car[] = [
  {
    id: "vf3",
    name: "VinFast VF 3",
    image: "/xe_vf3.png",
    type: "Minicar",
    range: "150km/sạc",
    seats: "4 chỗ",
    storage: "250L",
    price: "500.000đ/ngày",
    href: "/cars/vf3",
    description: "VinFast VF 3 là mẫu xe điện mini thông minh, phù hợp cho việc di chuyển trong thành phố. Thiết kế nhỏ gọn nhưng đầy đủ tiện nghi hiện đại.",
    features: [
      "Hệ thống giải trí thông minh",
      "Kết nối smartphone",
      "Camera lùi",
      "Cảm biến đỗ xe",
      "Điều hòa tự động",
      "Sạc không dây"
    ],
    specifications: {
      engine: "Motor điện 43kW",
      battery: "Pin LFP 18.64 kWh",
      chargingTime: "5.5 giờ (AC), 36 phút (DC)",
      topSpeed: "100 km/h",
      acceleration: "9.8s (0-100km/h)"
    },
    images: ["/xe_vf3.png", "/xe_vf3_interior.jpg", "/xe_vf3_side.jpg"]
  },
  {
    id: "vf6",
    name: "VinFast VF 6",
    image: "/xe_vf6.png",
    type: "SUV",
    range: "280km/sạc",
    seats: "5 chỗ",
    storage: "400L",
    price: "700.000đ/ngày",
    href: "/cars/vf6",
    description: "VinFast VF 6 là SUV điện cao cấp với thiết kế hiện đại và công nghệ tiên tiến. Phù hợp cho gia đình và những chuyến đi dài.",
    features: [
      "Hệ thống lái bán tự động",
      "Màn hình cảm ứng 12.9 inch",
      "Hệ thống âm thanh cao cấp",
      "Sạc nhanh DC",
      "Hệ thống an toàn ADAS",
      "Kết nối 5G",
      "Cửa sổ trời toàn cảnh"
    ],
    specifications: {
      engine: "Motor điện 150kW",
      battery: "Pin LFP 59.6 kWh",
      chargingTime: "7 giờ (AC), 31 phút (DC)",
      topSpeed: "160 km/h",
      acceleration: "8.5s (0-100km/h)"
    },
    images: ["/xe_vf6.png", "/xe_vf6_interior.jpg", "/xe_vf6_trunk.jpg"]
  },
  {
    id: "byd",
    name: "BYD Atto 3",
    image: "/xe_byd.png",
    type: "Sedan",
    range: "320km/sạc",
    seats: "5 chỗ",
    storage: "450L",
    price: "900.000đ/ngày",
    href: "/cars/byd",
    description: "BYD Atto 3 là sedan điện hạng trung với công nghệ pin Blade tiên tiến và thiết kế thể thao. Mang lại trải nghiệm lái xe êm ái và tiết kiệm.",
    features: [
      "Công nghệ pin Blade an toàn",
      "Hệ thống DiLink thông minh",
      "Màn hình xoay 12.8 inch",
      "Hệ thống âm thanh Dynaudio",
      "Sạc V2L (Vehicle to Load)",
      "Hệ thống kiểm soát khí hậu tự động",
      "Cảm biến 360 độ"
    ],
    specifications: {
      engine: "Motor điện 150kW",
      battery: "Pin LFP Blade 60.48 kWh",
      chargingTime: "6.5 giờ (AC), 29 phút (DC)",
      topSpeed: "160 km/h",
      acceleration: "7.3s (0-100km/h)"
    },
    images: ["/xe_byd.png", "/xe_byd_dashboard.jpg", "/xe_byd_charging.jpg"]
  }
];
