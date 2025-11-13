"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Search } from "lucide-react";
import { DatePicker, Select, message } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import dayjs, { Dayjs } from "dayjs";
import { rentalLocationApi } from "@/services/api";
import type { RentalLocationData } from "@/services/api";
import { motion } from "framer-motion";

const { RangePicker } = DatePicker;

type RentalType = "self-drive" | "with-driver" | "long-term";

export default function HeroSection() {
  const router = useRouter();
  const [rentalType, setRentalType] = useState<RentalType>("self-drive");
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().add(1, "day").hour(21).minute(0),
    dayjs().add(2, "day").hour(20).minute(0)
  ]);

  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await rentalLocationApi.getAll();
      
      if (response.success && response.data) {
        // Xử lý nhiều format: trực tiếp array, { $values: [...] }, hoặc { data: { $values: [...] } }
        const raw: unknown = response.data;
        let locationsData: RentalLocationData[] = [];
        
        if (Array.isArray(raw)) {
          locationsData = raw;
        } else if (typeof raw === 'object' && raw !== null) {
          const rawObj = raw as Record<string, unknown>;
          // Check for $values
          if ('$values' in rawObj && Array.isArray(rawObj.$values)) {
            locationsData = rawObj.$values as RentalLocationData[];
          }
          // Check for data.$values
          else if ('data' in rawObj && typeof rawObj.data === 'object' && rawObj.data !== null) {
            const dataObj = rawObj.data as Record<string, unknown>;
            if ('$values' in dataObj && Array.isArray(dataObj.$values)) {
              locationsData = dataObj.$values as RentalLocationData[];
            } else if (Array.isArray(rawObj.data)) {
              locationsData = rawObj.data as RentalLocationData[];
            }
          }
        }
        
        // Filter chỉ lấy địa điểm active
        const activeLocations = locationsData.filter((loc: RentalLocationData) => loc.isActive !== false);
        setLocations(activeLocations);
        
        // Set default location là địa điểm đầu tiên
        if (activeLocations.length > 0 && !selectedLocationId) {
          setSelectedLocationId(activeLocations[0].id);
        }
      }
    } catch (error) {
      console.error('Load locations error:', error);
      message.error('Không thể tải danh sách địa điểm');
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    if (!selectedLocationId) {
      message.warning('Vui lòng chọn địa điểm');
      return;
    }

    // Chuyển đến trang tìm kiếm với các tham số
    const params = new URLSearchParams();
    
    // Thêm locationId và location info
    const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
    if (selectedLocation) {
      params.set("locationId", selectedLocationId.toString());
      params.set("location", selectedLocation.name);
      if (selectedLocation.address) {
        params.set("locationAddress", selectedLocation.address);
      }
    }
    
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.set("startDate", dateRange[0].format("YYYY-MM-DD HH:mm"));
      params.set("endDate", dateRange[1].format("YYYY-MM-DD HH:mm"));
    }
    params.set("type", rentalType);
    
    // Chuyển đến trang cars/all với filters
    router.push(`/cars/all?${params.toString()}`);
  };

  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    // Không cho chọn ngày trong quá khứ
    return current && current < dayjs().startOf("day");
  };

  return (
    <div className="relative w-full min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Image với overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070&auto=format&fit=crop')",
          // Có thể thay bằng ảnh local: backgroundImage: "url('/hero-bg.jpg')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Text Overlay */}
        <motion.div 
          className="text-center mb-8 lg:mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1 
            className="text-4xl sm:text-4xl lg:text-3.5xl font-bold text-white mb-4 drop-shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            EV Rental - Người Bạn Trên Mọi Hành Trình
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl lg:text-2xl text-white/90 drop-shadow-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Trải nghiệm sự khác biệt từ hơn{" "}
            <motion.span 
              className="text-blue-400 font-semibold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10,
                delay: 0.6 
              }}
            >
              1000
            </motion.span>{" "}
            xe điện đời mới khắp Việt Nam
          </motion.p>
        </motion.div>

        {/* Search Form */}
        <motion.div 
          className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <motion.button
              onClick={() => setRentalType("self-drive")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                rentalType === "self-drive"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Car />
              <span>Xe tự lái</span>
            </motion.button>
            <motion.button
              onClick={() => setRentalType("with-driver")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                rentalType === "with-driver"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Car />
              <span>Xe có tài xế</span>
            </motion.button>

          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Location Select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="mr-1 inline-block" size={16} /> Địa điểm thuê xe
              </label>
              <Select
                size="large"
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                placeholder="Chọn địa điểm thuê xe"
                className="w-full location-select"
                loading={loadingLocations}
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label?.toString() || '';
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
                optionFilterProp="label"
                optionLabelProp="children"
              >
                {locations.map((location) => (
                  <Select.Option
                    key={location.id}
                    value={location.id}
                    label={`${location.name} - ${location.address}`}
                  >
                    <div className="flex flex-col leading-tight">
                      <span className="text-base font-medium text-gray-900">
                        {location.name}
                      </span>
                      {location.address && (
                        <span className="text-xs text-gray-500">{location.address}</span>
                      )}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Date Range Picker */}
            {/* <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian thuê
              </label>
              <RangePicker
                size="large"
                showTime={{
                  format: "HH:mm",
                  defaultValue: [dayjs().hour(21).minute(0), dayjs().add(1, "day").hour(20).minute(0)],
                }}
                format="HH:mm, DD/MM/YYYY"
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                disabledDate={disabledDate}
                className="w-full time-range-picker"
                placeholder={["Thời gian bắt đầu", "Thời gian kết thúc"]}
              />
            </div> */}
          </div>

          {/* Search Button */}
          <motion.button
            onClick={handleSearch}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Search />
            </motion.div>
            <span>Tìm Xe</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
