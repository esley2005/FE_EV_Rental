"use client";

import React, { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { Spin, message, notification, Modal, Button } from "antd";
import { StarOutlined, ShareAltOutlined, HeartOutlined, SafetyOutlined, EnvironmentOutlined, QuestionCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import { carsApi, authApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { User } from "@/services/api";
import { authUtils } from "@/utils/auth";
import {
  MapPin,
  Bluetooth,
  Camera,
  Video,
  Navigation,
  Cog,
  Wind,
  Usb,
  Monitor,
  Snowflake,
  Sun,
  Speaker,
  Lightbulb,
  Armchair,
  AlertTriangle,
} from "lucide-react";

//1
// params.id chính là số ID của xe trong đường dẫn (VD: /cars/5 → id = "5")
interface CarDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CarDetailPage({ params }: CarDetailPageProps) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  //2
  // car: xe hiện tại
  // otherCars: các xe khác để hiển thị bên dưới
  // loading: hiển thị vòng xoay loading khi chờ API

  const [car, setCar] = useState<Car | null>(null);
  const [otherCars, setOtherCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  // Debug: Log khi otherCars thay đổi
  useEffect(() => {
    console.log('[Car Detail] otherCars state updated:', otherCars);
    console.log('[Car Detail] otherCars length:', otherCars.length);
  }, [otherCars]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [documentType, setDocumentType] = useState<'id' | 'passport'>('id');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [documentWarningModal, setDocumentWarningModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: '', content: '' });
  //3
  //  → Gọi API /api/Car để lấy tất cả xe
  // → Lọc ra những xe còn hoạt động (isActive && !isDeleted)
  // → Tìm xe có ID đúng với URL
  // → Nếu có → hiển thị
  // → Nếu không → notFound() (404)
  useEffect(() => {
    const loadCar = async () => {
      try {
        const carId = parseInt(resolvedParams.id);
        if (isNaN(carId)) {
          notFound();
          return;
        }

        // Lấy tất cả xe để tìm xe hiện tại và xe khác
        const response = await carsApi.getAll();
        
        console.log('[Car Detail] API Response:', response);
        console.log('[Car Detail] Response.data:', response.data);

        if (response.success && response.data) {
          // Xử lý nhiều định dạng response từ backend
          const raw = response.data as any;
          const data = raw?.data ?? raw; // supports { isSuccess, data } or direct array
          const values = data?.$values ?? data?.data?.$values; // supports .data.$values
          const carsData = Array.isArray(data)
            ? data
            : Array.isArray(values)
            ? values
            : Array.isArray(raw)
            ? raw
            : [];
          
          console.log('[Car Detail] carsData after processing:', carsData);
          console.log('[Car Detail] carsData is array:', Array.isArray(carsData));
          
          // Lọc xe active và chưa xóa
          const activeCars = Array.isArray(carsData)
            ? carsData.filter((c: Car) => c && c.isActive && !c.isDeleted)
            : [];
          
          console.log('[Car Detail] activeCars:', activeCars);
          console.log('[Car Detail] activeCars length:', activeCars.length);

          // Tìm xe hiện tại
          const currentCar = activeCars.find((c: Car) => c.id === carId);

          if (!currentCar) {
            console.error('[Car Detail] Car not found with id:', carId);
            notFound();
            return;
          }

          console.log('[Car Detail] Current car found:', currentCar);
          setCar(currentCar);
          
          // Lọc các xe khác (không phải xe hiện tại) và lấy 3 xe đầu tiên
          const otherCarsList = activeCars
            .filter((c: Car) => c && c.id !== carId)
            .slice(0, 3);
          
          console.log('[Car Detail] otherCarsList:', otherCarsList);
          console.log('[Car Detail] otherCarsList length:', otherCarsList.length);
          
          setOtherCars(otherCarsList);
        } else {
          console.error('[Car Detail] API failed or no data:', response);
          setOtherCars([]);
        }
      } catch (error) {
        console.error('Load car error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCar();
  }, [resolvedParams.id]);

  // Load user profile để kiểm tra status
  useEffect(() => {
    const loadUserProfile = async () => {
      // Nếu đã có user trong localStorage, sử dụng luôn
      const localUser = authUtils.getCurrentUser();
      if (localUser) {
        setUser(localUser);
        // Vẫn gọi API để lấy thông tin mới nhất (bao gồm status)
        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
            // Cập nhật lại localStorage_
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('Load user profile error:', error);
        }
      } else if (authUtils.isAuthenticated()) {
        // Có token nhưng chưa có user trong localStorage, gọi API
        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('Load user profile error:', error);
        }
      }
    };

    loadUserProfile();
  }, []);

  //4 
  //Hiện thị khi đang load 
  //Dùng spinner từ thư viện Ant Design
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" tip="Đang tải thông tin xe..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!car) {
    notFound();
    return null;
  }
  // → Định dạng tiền VND:
  // 1500000 → 1.500.000 ₫
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Mở modal đặt xe (không kiểm tra giấy tờ trước, sẽ upload sau khi tạo đơn hàng)
  const handleBookingClick = () => {
    // Kiểm tra authentication trước
    if (!authUtils.isAuthenticated()) {
      message.warning('Vui lòng đăng nhập để thuê xe');
      router.push('/login');
      return;
    }

    // Mở modal luôn - giấy tờ sẽ được yêu cầu upload sau khi tạo đơn hàng
    setIsBookingModalOpen(true);
  };

  //5
  // Ảnh
  // Tên, Model
  // Thông số (loại, số chỗ, dung tích cốp, pin, v.v.)
  // Giá thuê (ngày, giờ, có tài xế)
  // Nút "Thuê xe ngay"
  // Nút Gọi tư vấn / Chat hỗ trợ
  // Phần "Xe khác" (hiển thị 3 xe ngẫu nhiên khác)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/#cars" className="hover:text-blue-600">
                Xe điện
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900">{car.name}</li>
          </ol>
        </nav>

        {/* Hình ảnh xe - Gallery với 3 ảnh */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ảnh chính - chiếm 2 cột */}
            <div 
              className="md:col-span-2 cursor-pointer group relative overflow-hidden rounded-lg"
              onClick={() => {
                setSelectedImageIndex(0);
                setIsImageModalOpen(true);
              }}
            >
              <img
                src={car.imageUrl || '/logo_ev.png'}
                alt={car.name}
                className="w-full h-full md:h-96 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_ev.png';
                }}
              />
              {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3">
                  <Camera className="w-6 h-6 text-gray-800" />
                </div>
              </div> */}
            </div>
            
            {/* Ảnh phụ 1 và 2 - chia đều chiều cao */}
            <div className="grid grid-cols-1 gap-4 h-full md:h-96">
              {car.imageUrl2 ? (
                <div 
                  className="flex-1 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedImageIndex(1);
                    setIsImageModalOpen(true);
                  }}
                >
                  <img
                    src={car.imageUrl2}
                    alt={`${car.name} - Ảnh 2`}
                    className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                  {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-2">
                      <Camera className="w-5 h-5 text-gray-800" />
                    </div>
                  </div> */}
                </div>
              ) : (
                <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Chưa có ảnh 2</span>
                </div>
              )}
              {car.imageUrl3 ? (
                <div 
                  className="flex-1 cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => {
                    setSelectedImageIndex(2);
                    setIsImageModalOpen(true);
                  }}
                >
                  <img
                    src={car.imageUrl3}
                    alt={`${car.name} - Ảnh 3`}
                    className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_ev.png';
                    }}
                  />
                  {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-2">
                      <Camera className="w-5 h-5 text-gray-800" />
                    </div>
                  </div> */}
                </div>
              ) : (
                <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Chưa có ảnh 3</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal xem ảnh chi tiết */}
        <Modal
          open={isImageModalOpen}
          onCancel={() => setIsImageModalOpen(false)}
          footer={null}
          width="90vw"
          style={{ top: 20 }}
          centered
          className="image-viewer-modal"
        >
          <div className="flex flex-col items-center">
            {/* Ảnh lớn */}
            <div className="w-full flex justify-center mb-4">
              <img
                src={
                  selectedImageIndex === 0 ? (car.imageUrl || '/logo_ev.png') :
                  selectedImageIndex === 1 ? (car.imageUrl2 || '/logo_ev.png') :
                  (car.imageUrl3 || '/logo_ev.png')
                }
                alt={car.name}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_ev.png';
                }}
              />
            </div>
            
            {/* Thumbnail navigation */}
            <div className="flex gap-3 mt-4 justify-center">
              {car.imageUrl && (
                <img
                  src={car.imageUrl}
                  alt={`${car.name} - Ảnh 1`}
                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    selectedImageIndex === 0 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(0)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_ev.png';
                  }}
                />
              )}
              {car.imageUrl2 && (
                <img
                  src={car.imageUrl2}
                  alt={`${car.name} - Ảnh 2`}
                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    selectedImageIndex === 1 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(1)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_ev.png';
                  }}
                />
              )}
              {car.imageUrl3 && (
                <img
                  src={car.imageUrl3}
                  alt={`${car.name} - Ảnh 3`}
                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    selectedImageIndex === 2 ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(2)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_ev.png';
                  }}
                />
              )}
            </div>
          </div>
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Phần thông tin xe chính - Chiếm 2/3 cột */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {car.name} {car.model && car.model}
                  </h1>

                  {/* Rating và số chuyến */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      <StarOutlined className="text-yellow-400 text-lg" />
                      <span className="font-semibold text-gray-900">5.0</span>
                    </div>
                    <span className="text-sm text-gray-500">100+ chuyến</span>
                  </div>

                  {/* Location */}
                  <p className="text-sm text-gray-500 mb-4">
                    {car.carRentalLocations?.$values?.[0]?.address ||
                      car.carRentalLocations?.address ||
                      "Địa chỉ giao nhận xe sẽ được thông báo sau"}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm">
                      <SafetyOutlined className="text-white" />
                      <span>Miễn thế chấp</span>
                    </div>
                    {/* <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm">
                      <EnvironmentOutlined className="text-white" />
                      <span>Giao xe tận nơi</span>
                    </div> */}
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ShareAltOutlined className="text-gray-600 text-lg" />
                  </button>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <HeartOutlined className={`text-lg ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Đặc điểm (Features) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Đặc điểm</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* Truyền động */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Truyền động</p>
                  <p className="font-bold text-gray-900">Số tự động</p>
                </div>

                {/* Số ghế */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Số ghế</p>
                  <p className="font-bold text-gray-900">{car.seats} chỗ</p>
                </div>

                {/* Nhiên liệu */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Nhiên liệu</p>
                  <p className="font-bold text-gray-900">Điện</p>
                </div>

                {/* Tiêu hao */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Tiêu hao</p>
                  <p className="font-bold text-gray-900">{car.batteryDuration}km/100%</p>
                </div>
              </div>
            </div>

            {/* Mô tả (Description) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mô tả</h2>

              {/* Rental Policies */}
              <ul className="space-y-2 mb-4 text-gray-900">
                {/* <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Hoàn tiền đổ xăng dư.</span>
                </li> */}
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Miễn phí vượt dưới 1h.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Miễn phí vượt dưới 10Km.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-600">•</span>
                  <span>Sử dụng miễn phí: Nước, Đồ ăn vặt, Khăn giấy có trong gói EV CARKIT khi thuê xe</span>
                </li>
              </ul>

              {/* Car Description */}
              <div className="mb-3">
                <p className="text-gray-900 leading-relaxed">
                  {showFullDescription ? (
                    <>
                      Xe {car.sizeType} {car.seats} chỗ với thiết kế mạnh mẽ và tính năng linh hoạt,
                      phù hợp cho gia đình. Xe điện thân thiện với môi trường, tiết kiệm điện và
                      vận hành êm ái. Quãng đường lên tới {car.batteryDuration}km, đáp ứng nhu cầu di chuyển
                      hàng ngày của bạn. Dung tích cốp {car.trunkCapacity}L rộng rãi, đủ không gian cho hành lý.
                    </>
                  ) : (
                    <>
                      Xe {car.sizeType} {car.seats} chỗ với thiết kế mạnh mẽ và tính năng linh hoạt,
                      phù hợp cho gia đình...
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
              </button>
            </div>

            {/* Các tiện nghi khác (Other Amenities) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Các tiện nghi khác</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[
                  { name: "Bản đồ", icon: <MapPin size={20} /> },
                  { name: "Bluetooth", icon: <Bluetooth size={20} /> },
                  { name: "Camera 360", icon: <Camera size={20} /> },
                  { name: "Camera hành trình", icon: <Video size={20} /> },
                  { name: "Định vị GPS", icon: <Navigation size={20} /> },
                  { name: "Lốp dự phòng", icon: <Cog size={20} /> },
                  { name: "Túi khí an toàn", icon: <Wind size={20} /> },
                  { name: "Kết nối USB", icon: <Usb size={20} /> },
                  { name: "Màn hình cảm ứng", icon: <Monitor size={20} /> },
                  { name: "Điều hòa", icon: <Snowflake size={20} /> },
                  { name: "Cửa sổ trời", icon: <Sun size={20} /> },
                  { name: "Hệ thống âm thanh", icon: <Speaker size={20} /> },
                  { name: "Đèn LED", icon: <Lightbulb size={20} /> },
                  { name: "Ghế da", icon: <Armchair size={20} /> },
                  { name: "Cảnh báo va chạm", icon: <AlertTriangle size={20} /> },
                ].map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-900">
                    <span className="text-lg">{amenity.icon}</span>
                    <span className="text-sm">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Giấy tờ thuê xe (Rental Documents) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">Giấy tờ thuê xe</h2>
                <QuestionCircleOutlined className="text-gray-400 cursor-help" />
              </div>
              <p className="text-sm text-gray-500 mb-4">Chọn 1 trong 2 hình thức</p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 "
                >

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">GPLX (đối chiếu) & CCCD (đối chiếu VNeID)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3"
                >

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">GPLX (đối chiếu) & Passport (giữ lại)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Tài sản thế chấp (Collateral) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Tài sản thế chấp</h2>
                <QuestionCircleOutlined className="text-gray-400 cursor-help" />
              </div>

              <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-900 text-sm">
                  Không yêu cầu khách thuê thế chấp Tiền mặt hoặc Xe máy
                </p>
              </div>
            </div>

            {/* Phụ phí có thể phát sinh (Additional Fees) Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-blue-600 mb-4">Phụ phí có thể phát sinh</h2>
              <div className="space-y-4">
                {/* Phí vượt giới hạn */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <InfoCircleOutlined className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí vượt giới hạn</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh nếu lộ trình di chuyển vượt quá 350km khi thuê xe 1 ngày
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">3.000₫/km</span>
                    </div>
                  </div>
                </div>

                {/* Phí quá giờ */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <InfoCircleOutlined className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí quá giờ</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh nếu hoàn trả xe trễ giờ. Trường hợp trễ quá 5 giờ, phụ phí thêm 1 ngày thuê
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">70.000₫/giờ</span>
                    </div>
                  </div>
                </div>

                {/* Phí vệ sinh */}
                <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <InfoCircleOutlined className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí vệ sinh</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh khi xe hoàn trả không đảm bảo vệ sinh (nhiều vết bẩn, bùn cát, sình lầy...)
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">70.000₫</span>
                    </div>
                  </div>
                </div>

                {/* Phí khử mùi */}
                <div className="flex items-start gap-3 p-3">
                  <InfoCircleOutlined className="text-blue-500 text-lg mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">Phí khử mùi</h3>
                        <p className="text-sm text-gray-600">
                          Phụ phí phát sinh khi xe hoàn trả bị ám mùi khó chịu (mùi thuốc lá, thực phẩm nặng mùi...)
                        </p>
                      </div>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">500.000₫</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phần booking panel - Chiếm 1/3 cột */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg shadow-lg p-6 sticky top-8 z-10 self-start">
              {/* Status và giá */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="line-through text-gray-500">752K</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">-21%</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(car.rentPricePerDay / 1000)}K/ngày
                </p>
              </div>

              {/* Status */}
              <div className={`text-center p-3 rounded-lg mb-6 ${car.status === 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                <span className="font-semibold text-gray-900">
                  {car.status === 0 ? 'Xe đang có sẵn' : 'Hết xe'}
                </span>
              </div>

              {/* Booking Button */}
              <button
                onClick={handleBookingClick}
                disabled={car.status !== 0}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-colors mb-5  ${car.status === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-900 cursor-not-allowed'
                  }`}
              >
                {car.status === 0 ? '+ CHỌN THUÊ' : 'Xe đã hết'}
              </button>

              {/* Quick Info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-900">Loại xe</span>
                  <span className="font-semibold text-gray-900">{car.sizeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số chỗ</span>
                  <span className="font-semibold text-gray-900">{car.seats} chỗ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quãng đường</span>
                  <span className="font-semibold text-gray-900">{car.batteryDuration} km</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  📞 Gọi tư vấn
                </button>
                <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  💬 Chat hỗ trợ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thông số kỹ thuật */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Thông số kỹ thuật
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Model</span>
                <span className="font-semibold text-gray-900">{car.model}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại xe</span>
                <span className="font-semibold text-gray-900">{car.sizeType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Số chỗ ngồi</span>
                <span className="font-semibold text-gray-900">{car.seats} chỗ</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Dung tích cốp</span>
                <span className="font-semibold text-gray-900">{car.trunkCapacity} lít</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loại pin</span>
                <span className="font-semibold text-gray-900">{car.batteryType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Quãng đường</span>
                <span className="font-semibold text-gray-900">{car.batteryDuration} km</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Động cơ</span>
                <span className="font-semibold text-gray-900">Điện 100%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Năng lượng</span>
                <span className="font-semibold text-gray-900">Xe điện</span>
              </div>
            </div>
          </div>
        </div>

        {/* Xe khác */}
        {otherCars.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Xe điện khác</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCars.map((otherCar) => (
                <Link key={otherCar.id} href={`/cars/${otherCar.id}`}>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                    <img
                      src={otherCar.imageUrl || '/logo_ev.png'}
                      alt={otherCar.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_ev.png';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">
                        {otherCar.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {otherCar.sizeType} • {otherCar.batteryDuration} km
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-semibold">
                          {formatCurrency(otherCar.rentPricePerDay)}/ngày
                        </span>
                        <span className="text-blue-600 hover:text-blue-700">
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Xe điện khác</h2>
            <p className="text-gray-500 text-center py-8">
              Hiện chưa có xe khác để hiển thị
            </p>
          </div>
        )}
      </main>

      <Footer />
      {/* 6 */}
      {/* → Khi bấm “Thuê xe ngay” sẽ mở BookingModal
→ BookingModal sẽ thực hiện việc gửi request thuê xe đến backend (thường là /api/RentalOrder/Create hoặc tương tự). */}

      <BookingModal
        car={car}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      {/* Modal cảnh báo thiếu giấy tờ */}
      <Modal
        title={documentWarningModal.title}
        open={documentWarningModal.visible}
        onCancel={() => setDocumentWarningModal({ ...documentWarningModal, visible: false })}
        footer={[
          <Button
            key="cancel"
            onClick={() => setDocumentWarningModal({ ...documentWarningModal, visible: false })}
          >
            Đóng
          </Button>,
          <Button
            key="update"
            type="primary"
            onClick={() => {
              setDocumentWarningModal({ ...documentWarningModal, visible: false });
              router.push('/profile');
            }}
            className="bg-blue-800 hover:bg-blue-700"
          >
            Cập nhật
          </Button>,
        ]}
        centered
      >
        <div className="py-4">
          <p className="text-gray-700 mb-4">{documentWarningModal.content}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-orange-800">
              <strong>Lưu ý:</strong> Bạn cần cập nhật và xác thực giấy tờ trong trang cá nhân trước khi có thể thuê xe.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// [User mở /cars/5]
//         ↓
// Next.js gọi → CarDetailPage
//         ↓
// useEffect → gọi carsApi.getAll()
//         ↓
// carsApi dùng axiosClient → gọi API thật
//         ↓
// Backend ASP.NET trả JSON (Swagger định nghĩa)
//         ↓
// FE hiển thị dữ liệu (ảnh, giá, thông số, …)