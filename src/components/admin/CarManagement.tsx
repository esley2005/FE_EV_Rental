"use client";

// @ts-ignore - React types are defined in global.d.ts
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  Tag,
  notification as antdNotification,
  Popconfirm,
  Upload,
  Image
} from "antd";
import { Plus, Edit, Trash2, CheckCircle, Upload as UploadIcon, Car as CarIcon, MapPin } from "lucide-react";
import { carsApi, rentalLocationApi, rentalOrderApi, authApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalLocationData, RentalOrderData, User } from "@/services/api";
import type { UploadRequestOption as RcCustomRequestOptions } from "rc-upload/lib/interface";
import { getValidImageUrl } from "@/utils/imageUtils";
import dayjs from "dayjs";

type DotNetList<T> = {
  $values?: T[];
  data?: T[] | { $values?: T[] };
};

type RawCarRentalLocation = {
  rentalLocationId?: number;
  RentalLocationId?: number;
  locationId?: number;
  LocationId?: number;
  rentalLocation?: RawRentalLocation | null;
  RentalLocation?: RawRentalLocation | null;
  id?: number;
  Id?: number;
  isActive?: boolean | number;
  IsActive?: boolean | number;
  isDeleted?: boolean | number;
  IsDeleted?: boolean | number;
};

type RawRentalLocation = {
  id?: number;
  Id?: number;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  isActive?: boolean | number;
  IsActive?: boolean | number;
  isDeleted?: boolean | number;
  IsDeleted?: boolean | number;
};

function normalizeDotNetList<T>(input: unknown): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as T[];
  if (typeof input === "object") {
    const obj = input as DotNetList<T>;
    if (Array.isArray(obj.$values)) return obj.$values;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (obj.data && typeof obj.data === "object" && Array.isArray(obj.data.$values)) {
      return obj.data.$values;
    }
  }
  return [];
}

function extractIdFromData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as { id?: number; Id?: number; carId?: number; CarId?: number };
  return obj.id ?? obj.Id ?? obj.carId ?? obj.CarId ?? null;
}

type CarFormValues = {
  name: string;
  model: string;
  seats: number;
  sizeType: string;
  trunkCapacity: number;
  batteryType: string;
  batteryDuration: number;
  depositOrderAmount: number;
  depositCarAmount: number;
  rentPricePerDay: number;
  rentPricePer4Hour: number;
  rentPricePer8Hour: number;
  rentPricePerDayWithDriver: number;
  rentPricePer4HourWithDriver: number;
  rentPricePer8HourWithDriver: number;
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  isActive: boolean;
  rentalLocationId?: number;
};

interface CarManagementProps {
  staffMode?: boolean; // Nếu true, ẩn nút thêm mới và xóa
}

export default function CarManagement({ staffMode = false }: CarManagementProps) {
  const [api, contextHolder] = antdNotification.useNotification();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [form] = Form.useForm<CarFormValues>();
  const [uploading, setUploading] = useState(false);
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  // State để lưu đơn hàng và users (chỉ dùng khi staffMode)
  const [rentalOrders, setRentalOrders] = useState<RentalOrderData[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadCars();
    // Luôn load rental locations để admin có thể set location
    loadRentalLocations();
    // Nếu staffMode, load đơn hàng và users để hiển thị tên khách hàng
    if (staffMode) {
      loadRentalOrdersAndUsers();
    }
  }, [staffMode]);

  const loadCars = async () => {
    setLoading(true);
    try {
      const response = await carsApi.getAll();
      if (response.success && response.data) {
        const carsList = normalizeDotNetList<Car>(response.data);
        const fallbackList = Array.isArray(response.data) ? (response.data as Car[]) : [];
        const listToUse = carsList.length > 0 ? carsList : fallbackList;
        // Filter out deleted cars
        const activeCars = listToUse.filter((car) => !car.isDeleted);
        
        // Mỗi xe chỉ có 1 rentalLocationId trực tiếp, không cần fetch carRentalLocationApi
        // Nếu cần hiển thị tên location, có thể load thông tin location sau
        setCars(activeCars);
      }
    } catch (error) {
      console.error('Load cars error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRentalLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await rentalLocationApi.getAll();
      if (response.success && response.data) {
        const locationsData = normalizeDotNetList<RentalLocationData>(response.data);
        const activeLocations = locationsData.filter((loc) => loc.isActive !== false);
        setRentalLocations(activeLocations);
      }
    } catch (error) {
      console.error('Load rental locations error:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Load đơn hàng và users để hiển thị tên khách hàng (chỉ khi staffMode)
  const loadRentalOrdersAndUsers = async () => {
    try {
      const [ordersResponse, usersResponse] = await Promise.all([
        rentalOrderApi.getAll(),
        authApi.getAllUsers(),
      ]);

      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = normalizeDotNetList<RentalOrderData>(ordersResponse.data);
        setRentalOrders(ordersData);
      }

      if (usersResponse.success && usersResponse.data) {
        const usersData = normalizeDotNetList<User>(usersResponse.data);
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Load rental orders and users error:', error);
    }
  };

  const extractRentalLocationId = (car: Car | null): number | undefined => {
    if (!car) return undefined;
    
    // Lấy rentalLocationId trực tiếp từ Car object
    const locationId = (car as any).rentalLocationId ?? (car as any).RentalLocationId;
    if (locationId !== undefined && locationId !== null) {
      return Number(locationId);
    }
    
    // Fallback: nếu vẫn có carRentalLocations (backward compatibility)
    const carLocations = (car as unknown as { carRentalLocations?: unknown })?.carRentalLocations;
    if (carLocations) {
      const locationsList = normalizeDotNetList<RawCarRentalLocation>(carLocations);
      if (locationsList.length > 0) {
        const firstLocation = locationsList[0];
        const id = firstLocation.rentalLocationId ?? firstLocation.RentalLocationId ?? firstLocation.locationId ?? firstLocation.LocationId;
        if (id !== undefined && id !== null) {
          return Number(id);
        }
      }
    }
    
    return undefined;
  };

  const handleAdd = () => {
    setEditingCar(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      depositOrderAmount: 0,
      depositCarAmount: 0,
      rentPricePer4Hour: 0,
      rentPricePer8Hour: 0,
      rentPricePer4HourWithDriver: 0,
      rentPricePer8HourWithDriver: 0,
      rentalLocationId: rentalLocations.length > 0 ? rentalLocations[0].id : undefined
    });
    setModalOpen(true);
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    
    // Extract location từ car object (đã được load trong loadCars)
    const locationId = extractRentalLocationId(car);
    
    form.setFieldsValue({
      name: car.name ?? "",
      model: car.model ?? "",
      seats: car.seats,
      sizeType: car.sizeType ?? "",
      trunkCapacity: car.trunkCapacity,
      batteryType: car.batteryType ?? "",
      batteryDuration: car.batteryDuration,
      depositOrderAmount: car.depositOrderAmount ?? 0,
      depositCarAmount: car.depositCarAmount ?? 0,
      rentPricePerDay: car.rentPricePerDay,
      rentPricePer4Hour: car.rentPricePer4Hour ?? 0,
      rentPricePer8Hour: car.rentPricePer8Hour ?? 0,
      rentPricePerDayWithDriver: car.rentPricePerDayWithDriver,
      rentPricePer4HourWithDriver: car.rentPricePer4HourWithDriver ?? 0,
      rentPricePer8HourWithDriver: car.rentPricePer8HourWithDriver ?? 0,
      imageUrl: car.imageUrl,
      imageUrl2: car.imageUrl2 ?? undefined,
      imageUrl3: car.imageUrl3 ?? undefined,
      isActive: car.isActive,
      rentalLocationId: locationId,
    });
    setModalOpen(true);
  };

  const handleStatusChange = async (carId: number, newIsActive: boolean) => {
    setLoading(true);
    try {
      // Tìm xe trong danh sách hiện tại
      const currentCar = cars.find((car: Car) => car.id === carId);
      if (!currentCar) {
        api.error({
          message: 'Lỗi',
          description: 'Không tìm thấy thông tin xe!',
          placement: 'topRight',
        });
        setLoading(false);
        return;
      }

      // isActive trực tiếp quyết định trạng thái sẵn sàng
      const isActive = newIsActive;
      const isDeleted = false;

      // Gửi đầy đủ thông tin xe với IsActive và IsDeleted mới (backend yêu cầu tất cả trường bắt buộc)
      const carDataPascal: Record<string, unknown> = {
        Id: carId,
        Name: currentCar.name || '',
        Model: currentCar.model || '',
        Seats: currentCar.seats || 5,
        SizeType: currentCar.sizeType || '',
        TrunkCapacity: currentCar.trunkCapacity || 0,
        BatteryType: currentCar.batteryType || '',
        BatteryDuration: currentCar.batteryDuration || 0,
        DepositOrderAmount: currentCar.depositOrderAmount || 0,
        DepositCarAmount: currentCar.depositCarAmount || 0,
        RentPricePerDay: currentCar.rentPricePerDay || 0,
        RentPricePer4Hour: currentCar.rentPricePer4Hour || 0,
        RentPricePer8Hour: currentCar.rentPricePer8Hour || 0,
        RentPricePerDayWithDriver: currentCar.rentPricePerDayWithDriver || 0,
        RentPricePer4HourWithDriver: currentCar.rentPricePer4HourWithDriver || 0,
        RentPricePer8HourWithDriver: currentCar.rentPricePer8HourWithDriver || 0,
        ImageUrl: currentCar.imageUrl || '',
        ImageUrl2: currentCar.imageUrl2 || '',
        ImageUrl3: currentCar.imageUrl3 || '',
        IsActive: isActive,
        IsDeleted: isDeleted,
        CarRentalLocations: [],
        RentalOrders: [],
        CreatedAt: currentCar.createdAt || new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      const response = await carsApi.update(carId, carDataPascal as Partial<Car>);

      if (response.success) {
        // Cập nhật state ngay lập tức để UI phản ánh thay đổi
        setCars((prevCars: Car[]) => 
          prevCars.map((car: Car) => 
            car.id === carId ? { ...car, isActive, isDeleted } : car
          )
        );
        
        api.success({
          message: 'Cập nhật trạng thái thành công!',
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
        });
        
        // Reload để đảm bảo đồng bộ với server
        loadCars();
      } else {
        api.error({
          message: 'Lỗi',
          description: response.error || 'Không thể cập nhật trạng thái!',
          placement: 'topRight',
        });
      }
    } catch (error) {
      console.error('IsActive update error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể cập nhật trạng thái!',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAllCars = async () => {
    setLoading(true);
    try {
      // Lấy tất cả xe (bao gồm cả inactive)
      const response = await carsApi.getAll();
      if (!response.success || !response.data) {
        api.error({
          message: 'Lỗi',
          description: 'Không thể lấy danh sách xe!',
          placement: 'topRight',
        });
        setLoading(false);
        return;
      }

      // Normalize data
      const raw = response.data as any;
      const data = raw?.data ?? raw;
      const values = data?.$values ?? data?.data?.$values;
      const allCars = Array.isArray(data)
        ? data
        : Array.isArray(values)
          ? values
          : Array.isArray(raw)
            ? raw
            : [];

      // Lọc các xe chưa active hoặc đã bị deleted
      const carsToActivate = allCars.filter((car: Car) => !car.isActive || car.isDeleted);

      if (carsToActivate.length === 0) {
        api.success({
          message: 'Thông báo',
          description: 'Tất cả xe đã được active!',
          placement: 'topRight',
        });
        setLoading(false);
        return;
      }

      // Active từng xe
      let successCount = 0;
      let failCount = 0;

      for (const car of carsToActivate) {
        try {
          const carDataPascal: Record<string, unknown> = {
            Id: car.id,
            Name: car.name || '',
            Model: car.model || '',
            Seats: car.seats || 5,
            SizeType: car.sizeType || '',
            TrunkCapacity: car.trunkCapacity || 0,
            BatteryType: car.batteryType || '',
            BatteryDuration: car.batteryDuration || 0,
            DepositOrderAmount: car.depositOrderAmount || 0,
            DepositCarAmount: car.depositCarAmount || 0,
            RentPricePerDay: car.rentPricePerDay || 0,
            RentPricePer4Hour: car.rentPricePer4Hour || 0,
            RentPricePer8Hour: car.rentPricePer8Hour || 0,
            RentPricePerDayWithDriver: car.rentPricePerDayWithDriver || 0,
            RentPricePer4HourWithDriver: car.rentPricePer4HourWithDriver || 0,
            RentPricePer8HourWithDriver: car.rentPricePer8HourWithDriver || 0,
            ImageUrl: car.imageUrl || '',
            ImageUrl2: car.imageUrl2 || '',
            ImageUrl3: car.imageUrl3 || '',
            IsActive: true,
            IsDeleted: false,
            CarRentalLocations: [],
            RentalOrders: [],
            CreatedAt: car.createdAt || new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
          };

          const updateResponse = await carsApi.update(car.id, carDataPascal as Partial<Car>);
          if (updateResponse.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`[CarManagement] Failed to activate car ${car.id}:`, error);
          failCount++;
        }
      }

      // Reload danh sách xe
      await loadCars();

      if (failCount === 0) {
        api.success({
          message: 'Thành công!',
          description: `Đã active ${successCount} xe thành công!`,
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
        });
      } else {
        api.warning({
          message: 'Hoàn thành',
          description: `Đã active ${successCount} xe. ${failCount} xe gặp lỗi.`,
          placement: 'topRight',
        });
      }
    } catch (error) {
      console.error('[CarManagement] Activate all cars error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể active tất cả xe!',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    console.log('[CarManagement] Deleting car with ID:', id);
    try {
      const response = await carsApi.delete(id);
      console.log('[CarManagement] Delete response:', response);

      if (response.success) {
        api.success({
          message: 'Xóa xe thành công!',
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
        });
        // Reload danh sách xe
        await loadCars();
      } else {
        console.error('[CarManagement] Delete failed:', response.error);
        api.error({
          message: 'Xóa xe thất bại',
          description: response.error,
          placement: 'topRight',
        });
      }
    } catch (error) {
      console.error('[CarManagement] Delete error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể xóa xe!',
        placement: 'topRight',
      });
    }
  };

  const handleUploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // Lấy Cloudinary config từ env
    // @ts-ignore - process.env is available in Next.js
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    // @ts-ignore - process.env is available in Next.js
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars';

    // Unsigned Upload: Chỉ cần upload_preset (đơn giản, recommended)
    formData.append('upload_preset', uploadPreset);

    // Optional: Thêm folder để tổ chức ảnh
    // formData.append('folder', 'ev-rental/cars');

    // Optional: Signed Upload (bảo mật cao hơn - cần API key & signature)
    // const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    // if (apiKey) {
    //   formData.append('api_key', apiKey);
    //   // Cần generate signature từ backend để bảo mật API_SECRET
    // }

    try {
      console.log('[Upload] Cloudinary config:', { cloudName, uploadPreset });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      console.log('[Upload] Cloudinary response:', data);

      if (!response.ok) {
        // Log chi tiết lỗi từ Cloudinary
        console.error('[Upload] Cloudinary error details:', {
          status: response.status,
          error: data.error,
          message: data.error?.message
        });

        const errorMsg = data.error?.message || `Upload failed with status: ${response.status}`;
        throw new Error(errorMsg);
      }

      if (data.secure_url) {
        console.log('[Upload] Image uploaded successfully to Cloudinary:', data.secure_url);
        return data.secure_url;
      }
      throw new Error('No secure_url in response');
    } catch (error) {
      console.error('[Upload] Cloudinary upload failed:', error);
      throw error;
    }
  };

  const handleImageUpload = async (options: RcCustomRequestOptions, fieldName: string = 'imageUrl') => {
    const { file, onSuccess, onError } = options;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileObj = file as File;
    if (!allowedTypes.includes(fileObj.type)) {
      api.error({
        message: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!',
        placement: 'topRight',
      });
      onError?.(new Error('Invalid file type'));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileObj.size > maxSize) {
      api.error({
        message: 'Lỗi',
        description: 'Kích thước file không được vượt quá 5MB!',
        placement: 'topRight',
      });
      onError?.(new Error('File too large'));
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await handleUploadToCloudinary(fileObj);
      form.setFieldsValue({ [fieldName]: imageUrl } as Partial<CarFormValues>);
      api.success({
        message: 'Upload ảnh thành công!',
        description: 'Ảnh đã được tải lên Cloudinary và link đã được cập nhật.',
        placement: 'topRight',
        icon: <CheckCircle color="#52c41a" />,
      });
      onSuccess?.(imageUrl);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload ảnh thất bại');
      api.error({
        message: 'Upload ảnh thất bại!',
        description: err.message || 'Vui lòng kiểm tra config Cloudinary và thử lại.',
        placement: 'topRight',
      });
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: CarFormValues) => {
    setLoading(true);
    try {
      // Nếu là staff mode, chỉ gửi trường IsActive và IsDeleted
      const carDataPascal: Record<string, unknown> = staffMode
        ? {
            ...(editingCar ? { Id: editingCar.id } : {}),
            IsActive: values.isActive !== undefined ? values.isActive : true,
            IsDeleted: false,
          }
        : {
            // Khi update có thể cần Id
            ...(editingCar ? { Id: editingCar.id } : {}),
            Model: values.model,
            Name: values.name,
            Seats: values.seats,
            SizeType: values.sizeType,
            TrunkCapacity: values.trunkCapacity,
            BatteryType: values.batteryType,
            BatteryDuration: values.batteryDuration,
            DepositOrderAmount: values.depositOrderAmount || 0,
            DepositCarAmount: values.depositCarAmount || 0,
            RentPricePerDay: values.rentPricePerDay,
            RentPricePer4Hour: values.rentPricePer4Hour || 0,
            RentPricePer8Hour: values.rentPricePer8Hour || 0,
            RentPricePerDayWithDriver: values.rentPricePerDayWithDriver,
            RentPricePer4HourWithDriver: values.rentPricePer4HourWithDriver || 0,
            RentPricePer8HourWithDriver: values.rentPricePer8HourWithDriver || 0,
            ImageUrl: values.imageUrl,
            ImageUrl2: values.imageUrl2 || null,
            ImageUrl3: values.imageUrl3 || null,
            IsActive: values.isActive !== undefined ? values.isActive : true,
            IsDeleted: false,
            RentalLocationId: values.rentalLocationId || null,
            CarRentalLocations: [],
            RentalOrders: [],
            CreatedAt: editingCar ? editingCar.createdAt : new Date().toISOString(),
            UpdatedAt: editingCar ? new Date().toISOString() : null,
          };

      let response: Awaited<ReturnType<typeof carsApi.create>>;
      if (editingCar) {
        // Update với payload PascalCase (ép kiểu any để vượt qua excess property check)
        response = await carsApi.update(editingCar.id, carDataPascal as Partial<Car>);
      } else {
        // Tạo mới
        response = await carsApi.create(carDataPascal as Partial<Car>);
      }

      if (response.success) {
        // rentalLocationId đã được gửi trực tiếp trong carDataPascal, không cần xử lý thêm

        api.success({
          message: staffMode 
            ? 'Cập nhật trạng thái xe thành công!' 
            : (editingCar ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!'),
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
        });
        setModalOpen(false);
        loadCars();
        form.resetFields();
      } else {
        api.error({
          message: 'Lỗi',
          description: response.error || 'Không thể lưu thông tin xe!',
          placement: 'topRight',
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể lưu thông tin xe!',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 80,
      render: (url: string, record: Car) => (
        <img
          src={getValidImageUrl(url)}
          alt={record.name}
          className="w-16 h-16 object-cover rounded"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            (e.target as HTMLImageElement).src = '/logo_ev.png';
          }}
        />
      ),
    },
    {
      title: 'Tên xe',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Car, b: Car) => a.name.localeCompare(b.name),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Loại xe',
      dataIndex: 'sizeType',
      key: 'sizeType',
    },
    {
      title: 'Số chỗ',
      dataIndex: 'seats',
      key: 'seats',
      width: 80,
    },
    {
      title: 'Giá/ngày',
      dataIndex: 'rentPricePerDay',
      key: 'rentPricePerDay',
      render: (price: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 150,
      render: (isActive: boolean, record: Car) => {
        if (staffMode) {
          return (
            <Select
              value={isActive ? true : false}
              onChange={async (value: boolean) => {
                await handleStatusChange(record.id, value);
              }}
              style={{ width: '100%' }}
              size="small"
            >
              {/* @ts-ignore - Select.Option is valid JSX */}
              <Select.Option value={true}>Sẵn sàng</Select.Option>
              {/* @ts-ignore - Select.Option is valid JSX */}
              <Select.Option value={false}>Hết xe</Select.Option>
            </Select>
          );
        }
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Sẵn sàng' : 'Hết xe'}
          </Tag>
        );
      },
    },
    {
      title: 'Kích hoạt',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'blue' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Địa điểm',
      key: 'locations',
      width: 280,
      render: (_value: unknown, record: Car) => {
        // Ưu tiên: Lấy rentalLocation object trực tiếp từ Car (nếu API trả về nested object)
        const nestedLocation = (record as any).rentalLocation ?? (record as any).RentalLocation;
        
        if (nestedLocation && nestedLocation.id && nestedLocation.name) {
          // Có nested location object, dùng trực tiếp
          const locationName = nestedLocation.name || nestedLocation.Name || '';
          const locationAddress = nestedLocation.address || nestedLocation.Address || '';
          
          return (
            <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 max-w-[250px]">
              <MapPin size={12} className="flex-shrink-0 text-blue-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                {locationName && (
                  <div className="text-xs font-medium text-gray-800 leading-tight">{locationName}</div>
                )}
                {locationAddress && (
                  <div className="text-xs text-gray-600 leading-tight mt-0.5">{locationAddress}</div>
                )}
              </div>
            </div>
          );
        }
        
        // Fallback: Lấy rentalLocationId và tìm trong rentalLocations state
        const locationId = (record as any).rentalLocationId ?? (record as any).RentalLocationId;
        
        if (!locationId || locationId === 0) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        // Tìm location từ rentalLocations state
        const foundLocation = rentalLocations.find((l: RentalLocationData) => l.id === locationId || l.id === Number(locationId));
        
        if (!foundLocation) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">ID: {locationId}</span>
            </Tag>
          );
        }

        const locationName = foundLocation.name || '';
        const locationAddress = foundLocation.address || '';

        return (
          <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 max-w-[250px]">
            <MapPin size={12} className="flex-shrink-0 text-blue-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              {locationName && (
                <div className="text-xs font-medium text-gray-800 leading-tight">{locationName}</div>
              )}
              {locationAddress && (
                <div className="text-xs text-gray-600 leading-tight mt-0.5">{locationAddress}</div>
              )}
            </div>
          </div>
        );
      },
    },
    // Cột "Khách hàng" chỉ hiển thị khi staffMode
    ...(staffMode ? [
      {
        title: 'Khách hàng',
        key: 'customer',
        width: 150,
        render: (_value: unknown, record: Car) => {
          // Tìm đơn hàng đã thanh toán (status >= OrderDepositConfirmed) cho xe này
          const activeOrder = rentalOrders.find((order) => {
            // Đơn hàng phải thuộc xe này
            if (order.carId !== record.id) return false;
            
            // Đơn hàng phải đã được xác nhận cọc hoặc đang thuê (đã thanh toán)
            // Status: 1 = OrderDepositConfirmed, 2 = CheckedIn, 3 = Renting, 4 = Returned, 5 = PaymentPending, 9 = Completed
            const statusValue = order.status ?? (order as any).Status ?? 0;
            const status = typeof statusValue === 'string' ? parseInt(statusValue, 10) : Number(statusValue);
            return status >= 1 && status !== 7; // >= 1 và không phải Cancelled (7)
          });

          if (!activeOrder) {
            return <span className="text-gray-400">Chưa có đơn</span>;
          }

          // Tìm user từ userId
          const customer = users.find((u) => u.id === activeOrder.userId);
          if (customer) {
            return (
              <div className="text-sm font-medium text-gray-800">
                {customer.fullName || customer.email || `User #${customer.id}`}
              </div>
            );
          }

          return <span className="text-gray-400">Chưa có đơn</span>;
        },
      },
      {
        title: 'Thời gian thuê',
        key: 'rentalTime',
        width: 180,
        render: (_value: unknown, record: Car) => {
          // Tìm đơn hàng đang active cho xe này
          const activeOrder = rentalOrders.find((order) => {
            if (order.carId !== record.id) return false;
            const statusValue = order.status ?? (order as any).Status ?? 0;
            const status = typeof statusValue === 'string' ? parseInt(statusValue, 10) : Number(statusValue);
            return status >= 1 && status !== 7;
          });

          if (!activeOrder) {
            return <span className="text-gray-400">Chưa cập nhật</span>;
          }

          // Hiển thị thời gian thuê: từ pickupTime đến expectedReturnTime
          const pickupTime = activeOrder.pickupTime;
          const expectedReturnTime = activeOrder.expectedReturnTime;
          
          if (pickupTime && expectedReturnTime) {
            try {
              const pickup = dayjs(pickupTime);
              const returnTime = dayjs(expectedReturnTime);
              return (
                <div className="text-xs">
                  <div>{pickup.format('DD/MM/YYYY HH:mm')}</div>
                  <div className="text-gray-500">→ {returnTime.format('DD/MM/YYYY HH:mm')}</div>
                </div>
              );
            } catch {
              return <span className="text-gray-400">Chưa cập nhật</span>;
            }
          }

          return <span className="text-gray-400">Chưa cập nhật</span>;
        },
      },
      {
        title: 'Thanh toán',
        key: 'payment',
        width: 120,
        render: (_value: unknown, record: Car) => {
          // Tìm đơn hàng đã thanh toán cho xe này
          const activeOrder = rentalOrders.find((order) => {
            if (order.carId !== record.id) return false;
            const statusValue = order.status ?? (order as any).Status ?? 0;
            const status = typeof statusValue === 'string' ? parseInt(statusValue, 10) : Number(statusValue);
            return status >= 1 && status !== 7;
          });

          if (!activeOrder) {
            return <span className="text-gray-400">Chưa có đơn</span>;
          }

          // Kiểm tra xem đã thanh toán chưa (status >= OrderDepositConfirmed = 1)
          const statusValue = activeOrder.status ?? (activeOrder as any).Status ?? 0;
          const status = typeof statusValue === 'string' ? parseInt(statusValue, 10) : Number(statusValue);
          
          if (status >= 1) {
            return <Tag color="green">Đã thanh toán</Tag>;
          }

          return <span className="text-gray-400">Chưa có đơn</span>;
        },
      },
    ] : []),
    ...(staffMode ? [] : [
      {
        title: 'Thao tác',
        key: 'action',
        width: 150,
        render: (_value: unknown, record: Car) => (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<Edit />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xóa xe này?"
              description="Bạn có chắc chắn muốn xóa xe này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger size="small" icon={<Trash2 />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space> 
        ),
      }
    ]),
  ];

  return (
    <>
      {contextHolder}
      {/* @ts-ignore - Card component from antd is valid JSX */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CarIcon /> Quản lý xe
          </div>
        }
        extra={
          !staffMode ? (
            <Space>
              <Button
                type="default"
                icon={<CheckCircle />}
                onClick={handleActivateAllCars}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Active tất cả xe
              </Button>
              <Button
                type="primary"
                icon={<Plus />}
                onClick={handleAdd}
                className="bg-blue-600"
              >
                Thêm xe mới
              </Button>
            </Space>
          ) : null
        }
      >
        <Table
          columns={columns}
          dataSource={cars}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total: number) => `Tổng ${total} xe`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingCar ? 'Cập nhật thông tin xe' : 'Thêm xe mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Tên xe"
              name="name"
              rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập tên xe!' }]}
            >
              <Input placeholder="VinFast VF 8" disabled={staffMode} />
            </Form.Item>

            <Form.Item
              label="Model"
              name="model"
              rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập model!' }]}
            >
              <Input placeholder="VF 8 Plus" disabled={staffMode} />
            </Form.Item>

            <Form.Item
              label="Số chỗ ngồi"
              name="seats"
              rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập số chỗ!' }]}
            >
              <InputNumber min={2} max={9} className="w-full" disabled={staffMode} />
            </Form.Item>

            <Form.Item
              label="Loại xe"
              name="sizeType"
              rules={staffMode ? [] : [{ required: true, message: 'Vui lòng chọn loại xe!' }]}
            >
              <Select placeholder="Chọn loại xe" disabled={staffMode}>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="mini">Mini</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="coupé">Coupé</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="crossover">Crossover</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="compact">Compact</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="sedan">Sedan</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="suv">SUV</Select.Option>
                {/* @ts-ignore - Select.Option is valid JSX */}
                <Select.Option value="mpv">MPV</Select.Option>
              </Select>
            </Form.Item>


            <Form.Item
              label="Dung tích cốp (lít)"
              name="trunkCapacity"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 40, 300, 500"
            >
              <InputNumber min={0} max={2000} className="w-full" disabled={staffMode} />
            </Form.Item>

            <Form.Item
              label="Loại pin"
              name="batteryType"
              rules={staffMode ? [] : [{ required: true, message: 'Vui lòng chọn loại pin!' }]}
            >
              <Select placeholder="Chọn loại pin" disabled={staffMode}>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="LFP">LFP</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="NMC">NMC</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="NCA">NCA</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="LTO">LTO</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="Na‑Ion">Na‑Ion</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="Lead‑Acid">Lead‑Acid</Select.Option>
                {/* @ts-ignore - Select.Option from antd is valid JSX */}
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>


            <Form.Item
              label="Quãng đường (km)"
              name="batteryDuration"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 300, 400, 500 km"
            >
              <InputNumber min={0} max={2000} className="w-full" disabled={staffMode} />
            </Form.Item>

            <Form.Item
              label="Giá thuê/ngày (VND)"
              name="rentPricePerDay"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 900000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/4 giờ (VND)"
              name="rentPricePer4Hour"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 500000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/8 giờ (VND)"
              name="rentPricePer8Hour"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 800000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/ngày (có tài xế)"
              name="rentPricePerDayWithDriver"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 1200000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/4 giờ (có tài xế)"
              name="rentPricePer4HourWithDriver"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 600000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/8 giờ (có tài xế)"
              name="rentPricePer8HourWithDriver"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 1000000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Tiền đặt cọc đơn hàng (VND)"
              name="depositOrderAmount"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 1000000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Tiền đặt cọc xe (VND)"
              name="depositCarAmount"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 5000000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value: string | number | undefined) => `${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Địa điểm cho thuê"
              name="rentalLocationId"
              rules={staffMode ? [] : [{ required: false, message: 'Vui lòng chọn địa điểm!' }]}
            >
              <Select
                placeholder="Chọn địa điểm cho thuê xe"
                loading={loadingLocations}
                optionFilterProp="label"
                showSearch
                allowClear
                disabled={staffMode}
                filterOption={(input: string, option: any) => {
                  const label = option?.label?.toString() || '';
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {rentalLocations.map((location: RentalLocationData) => (
                  /* @ts-ignore - Select.Option from antd is valid JSX */
                  <Select.Option
                    key={location.id}
                    value={location.id}
                    label={`${location.name} - ${location.address}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{location.name}</span>
                      <span className="text-xs text-gray-500">{location.address}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Ảnh chính */}
          <Form.Item
            label="URL ảnh xe chính (bắt buộc)"
            name="imageUrl"
            rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
              disabled={staffMode}
            />
          </Form.Item>

          {/* Preview ảnh chính */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl !== currentValues.imageUrl}>
            {({ getFieldValue }: { getFieldValue: (name: string) => any }) => {
              const imageUrl = getFieldValue('imageUrl');
              return imageUrl ? (
                <Form.Item label="Xem trước ảnh chính">
                  {/* @ts-ignore - Image component from antd is valid JSX */}
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={200}
                    height={150}
                    style={{ objectFit: 'cover', borderRadius: '8px' }}
                    fallback="https://via.placeholder.com/200x150?text=Invalid+Image"
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {!staffMode && (
            <Form.Item label="Hoặc upload ảnh chính từ máy">
              <Upload
                customRequest={(options: RcCustomRequestOptions) => handleImageUpload(options, 'imageUrl')}
                showUploadList={false}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                maxCount={1}
                capture={false}
              >
                <Button
                  icon={<UploadIcon />}
                  loading={uploading}
                  type="dashed"
                  block
                >
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh chính từ máy tính'}
                </Button>
              </Upload>
            </Form.Item>
          )}

          {/* Ảnh phụ 1 */}
          <Form.Item
            label="URL ảnh xe phụ 1 (bắt buộc)"
            name="imageUrl2"
            rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
              disabled={staffMode}
            />
          </Form.Item>

          {/* Preview ảnh phụ 1 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl2 !== currentValues.imageUrl2}>
            {({ getFieldValue }: { getFieldValue: (name: string) => any }) => {
              const imageUrl2 = getFieldValue('imageUrl2');
              return imageUrl2 ? (
                <Form.Item label="Xem trước ảnh phụ 1">
                  {/* @ts-ignore - Image component from antd is valid JSX */}
                  <Image
                    src={imageUrl2}
                    alt="Preview 2"
                    width={200}
                    height={150}
                    style={{ objectFit: 'cover', borderRadius: '8px' }}
                    fallback="https://via.placeholder.com/200x150?text=Invalid+Image"
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {!staffMode && (
            <Form.Item label="Hoặc upload ảnh phụ 1 từ máy">
              <Upload
                customRequest={(options: RcCustomRequestOptions) => handleImageUpload(options, 'imageUrl2')}
                showUploadList={false}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                maxCount={1}
                capture={false}
              >
                <Button
                  icon={<UploadIcon />}
                  loading={uploading}
                  type="dashed"
                  block
                >
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh phụ 1 từ máy tính'}
                </Button>
              </Upload>
            </Form.Item>
          )}

          {/* Ảnh phụ 2 */}
          <Form.Item
            label="URL ảnh xe phụ 2 (bắt buộc)"
            name="imageUrl3"
            rules={staffMode ? [] : [{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
              disabled={staffMode}
            />
          </Form.Item>

          {/* Preview ảnh phụ 2 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl3 !== currentValues.imageUrl3}>
            {({ getFieldValue }: { getFieldValue: (name: string) => any }) => {
              const imageUrl3 = getFieldValue('imageUrl3');
              return imageUrl3 ? (
                <Form.Item label="Xem trước ảnh phụ 2">
                  {/* @ts-ignore - Image component from antd is valid JSX */}
                  <Image
                    src={imageUrl3}
                    alt="Preview 3"
                    width={200}
                    height={150}
                    style={{ objectFit: 'cover', borderRadius: '8px' }}
                    fallback="https://via.placeholder.com/200x150?text=Invalid+Image"
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {!staffMode && (
            <Form.Item label="Hoặc upload ảnh phụ 2 từ máy">
              <Upload
                customRequest={(options: RcCustomRequestOptions) => handleImageUpload(options, 'imageUrl3')}
                showUploadList={false}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                maxCount={1}
                capture={false}
              >
                <Button
                  icon={<UploadIcon />}
                  loading={uploading}
                  type="dashed"
                  block
                >
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh phụ 2 từ máy tính'}
                </Button>
              </Upload>
              <p className="text-xs text-gray-500 mt-2">
                ✓ Chấp nhận: JPG, PNG, GIF, WEBP<br />
                ✓ Kích thước tối đa: 5MB<br />
                ✓ Ảnh sẽ được lưu trên Cloudinary (CDN tốc độ cao)
              </p>
            </Form.Item>
          )}

          <Form.Item
            label="Kích hoạt"
            name="isActive"
            valuePropName="checked"
          >
            <Switch disabled={staffMode} />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} className="bg-blue-600">
                {editingCar ? 'Cập nhật' : 'Thêm xe'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

