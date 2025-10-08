// truyền dữ liệu từ data test lên component
export interface Car {
  id: string;
  name: string;
  image: string;
  type: string;
  range: string;
  seats: string;
  storage: string;
  price: string;
  href: string;
  // Thông tin chi tiết
  description: string;
  features: string[];
  specifications: {
    engine: string;
    battery: string;
    chargingTime: string;
    topSpeed: string;
    acceleration: string;
  };
  images: string[];
}
