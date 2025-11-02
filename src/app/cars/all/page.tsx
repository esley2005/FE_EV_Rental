"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  CarOutlined,
  SearchOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DollarOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import { 
  Card,
  Input,
  Button,
  Select,
  Pagination,
  Empty,
  Spin,
  notification as antdNotification,
  Tag
} from "antd";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";

export default function AllCarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [api, contextHolder] = antdNotification.useNotification();
  
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    // Lấy params từ URL và cập nhật state
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page) {
      setPageIndex(parseInt(page) - 1);
    } else {
      setPageIndex(0);
    }
    
    if (search) {
      setKeyword(search);
      setSearchInput(search);
    } else {
      setKeyword("");
      setSearchInput("");
    }
  }, [searchParams]);

  useEffect(() => {
    // Tải lại danh sách xe khi pageIndex hoặc keyword thay đổi
    loadCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, keyword]);

  const loadCars = async () => {
    setLoading(true);
    try {
      const response = await carsApi.getAll();

      if (response.success && response.data) {
        // Backend C# có thể trả về { "$values": [...] } hoặc array trực tiếp
        const allCars = (response.data as any)?.$values || response.data || [];
        
        // Lọc xe active và chưa xóa
        let activeCars = Array.isArray(allCars) 
          ? allCars.filter((car: Car) => car.isActive && !car.isDeleted)
          : [];

        // Tìm kiếm theo keyword nếu có
        if (keyword && keyword.trim()) {
          const searchTerm = keyword.toLowerCase().trim();
          activeCars = activeCars.filter((car: Car) => 
            car.name?.toLowerCase().includes(searchTerm) ||
            car.model?.toLowerCase().includes(searchTerm) ||
            car.sizeType?.toLowerCase().includes(searchTerm)
          );
        }

        // Lưu tổng số xe (trước khi phân trang)
        setTotalCount(activeCars.length);

        // Phân trang phía client
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCars = activeCars.slice(startIndex, endIndex);
        
        setCars(paginatedCars);
      } else {
        api.error({
          message: 'Lỗi tải dữ liệu',
          description: response.error || 'Không thể tải danh sách xe!',
          placement: 'topRight',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        });
      }
    } catch (error) {
      console.error('Load cars error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể kết nối đến máy chủ!',
        placement: 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setKeyword(searchInput);
    setPageIndex(0);
    
    // Update URL
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    params.set('page', '1');
    router.push(`/cars/all?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    setPageIndex(page - 1);
    
    // Update URL
    const params = new URLSearchParams();
    if (keyword) params.set('search', keyword);
    params.set('page', page.toString());
    router.push(`/cars/all?${params.toString()}`);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const getStatusTag = (status: number) => {
    return status === 0 ? (
      <Tag color="green">Sẵn sàng</Tag>
    ) : (
      <Tag color="red">Hết xe</Tag>
    );
  };

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/">
                  <Button type="link" className="p-0">
                    ← Trang chủ
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <CarOutlined /> Danh sách xe
                </h1>
              </div>
              <div className="text-sm text-gray-600">
                Tổng: <strong>{totalCount}</strong> xe
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search & Filter */}
          <Card className="mb-6 shadow-md">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  size="large"
                  placeholder="Tìm kiếm theo tên xe, model..."
                  prefix={<SearchOutlined />}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                className="bg-blue-600"
              >
                Tìm kiếm
              </Button>
            </div>
          </Card>

          {/* Cars Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" tip="Đang tải danh sách xe..." />
            </div>
          ) : cars.length === 0 ? (
            <Card className="shadow-md">
              <Empty
                description={
                  keyword 
                    ? `Không tìm thấy xe phù hợp với "${keyword}"`
                    : "Chưa có xe nào trong hệ thống"
                }
              >
                {keyword && (
                  <Button 
                    type="primary" 
                    onClick={() => {
                      setKeyword("");
                      setSearchInput("");
                      router.push('/cars/all');
                    }}
                    className="bg-blue-600"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car) => (
                  <Card
                    key={car.id}
                    hoverable
                    className="shadow-md overflow-hidden"
                    cover={
                      <div className="h-48 bg-gray-100 relative">
                        <img
                          src={car.imageUrl || '/logo_ev.png'}
                          alt={car.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo_ev.png';
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          {getStatusTag(car.status)}
                        </div>
                      </div>
                    }
                    onClick={() => router.push(`/cars/${car.id}`)}
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {car.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{car.model}</p>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TeamOutlined className="text-blue-600" />
                          <span>{car.seats} chỗ</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <ThunderboltOutlined className="text-yellow-600" />
                          <span>{car.batteryDuration} km</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {car.sizeType}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500">Giá thuê/ngày</div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(car.rentPricePerDay)}
                            </div>
                          </div>
                          <Button 
                            type="primary" 
                            size="small"
                            className="bg-blue-600"
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    current={pageIndex + 1}
                    pageSize={pageSize}
                    total={totalCount}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total) => `Tổng ${total} xe`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

