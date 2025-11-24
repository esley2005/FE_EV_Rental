"use client";

import { useState, useEffect } from "react";
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
import { carsApi, rentalLocationApi, carRentalLocationApi } from "@/services/api";
import type { Car } from "@/types/car";
import type { RentalLocationData, CarRentalLocationData } from "@/services/api";
import type { UploadRequestOption as RcCustomRequestOptions } from "rc-upload/lib/interface";

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
  rentPricePerDay: number;
  rentPricePerHour: number;
  rentPricePerDayWithDriver: number;
  rentPricePerHourWithDriver: number;
  status: number;
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

  useEffect(() => {
    loadCars();
    loadRentalLocations();
  }, []);

  const loadCars = async () => {
    setLoading(true);
    try {
      const response = await carsApi.getAll();
      if (response.success && response.data) {
        const carsList = normalizeDotNetList<Car>(response.data);
        const fallbackList = Array.isArray(response.data) ? (response.data as Car[]) : [];
        const listToUse = carsList.length > 0 ? carsList : fallbackList;
        // Filter out deleted cars và normalize status
        const activeCars = listToUse
          .filter((car) => !car.isDeleted)
          .map((car) => ({
            ...car,
            status: typeof car.status === 'number' ? car.status : (car.status === 1 || car.status === '1' ? 1 : 0),
          }));
        
        // Fetch carRentalLocations cho tất cả xe để hiển thị location
        const carsWithLocations = await Promise.all(
          activeCars.map(async (car) => {
            try {
              // Nếu đã có carRentalLocations, không cần fetch lại
              const hasLocations = car.carRentalLocations && 
                (Array.isArray(car.carRentalLocations) || (car.carRentalLocations as any)?.$values);

              if (!hasLocations) {
                // Fetch carRentalLocations từ API - xử lý lỗi 404 gracefully
                try {
                  const locationResponse = await carRentalLocationApi.getByCarId(car.id);
                  if (locationResponse.success && locationResponse.data) {
                    const locationsData = Array.isArray(locationResponse.data)
                      ? locationResponse.data
                      : (locationResponse.data as any)?.$values || [];
                    return {
                      ...car,
                      carRentalLocations: locationsData
                    };
                  }
                } catch (locationError: any) {
                  // Bỏ qua lỗi 404 hoặc các lỗi khác, không log để tránh spam console
                  if (locationError?.status !== 404 && locationError?.response?.status !== 404) {
                    console.warn(`Failed to fetch locations for car ${car.id}:`, locationError);
                  }
                }
              }
              return car;
            } catch (error) {
              console.warn(`Failed to fetch locations for car ${car.id}:`, error);
              return car;
            }
          })
        );
        
        setCars(carsWithLocations);
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

  const extractRentalLocationId = (car: Car | null): number | undefined => {
    if (!car) return undefined;
    const carLocations = (car as unknown as { carRentalLocations?: unknown })?.carRentalLocations;
    if (!carLocations) return undefined;

    const locationsList = normalizeDotNetList<RawCarRentalLocation>(carLocations);
    if (locationsList.length === 0) return undefined;

    // Chỉ lấy location đầu tiên
    const firstLocation = locationsList[0];
    const locationInfo = firstLocation.rentalLocation ?? firstLocation.RentalLocation ?? firstLocation;

    const id =
      firstLocation.rentalLocationId ??
      firstLocation.RentalLocationId ??
      firstLocation.locationId ??
      firstLocation.LocationId ??
      locationInfo?.id ??
      locationInfo?.Id;

    return id !== undefined && id !== null ? Number(id) : undefined;
  };

  const handleAdd = () => {
    setEditingCar(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1, // Mặc định là "Sẵn sàng" (1) thay vì "Hết xe" (0)
      isActive: true,
      rentalLocationId: rentalLocations.length > 0 ? rentalLocations[0].id : undefined
    });
    setModalOpen(true);
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    
    // Tính giá giờ từ giá ngày nếu chưa có giá giờ
    const calculatedPricePerHour = car.rentPricePerHour 
      ? car.rentPricePerHour 
      : (car.rentPricePerDay ? Math.round(car.rentPricePerDay / 22) : 0);
    
    // Tự động tính giá có tài xế từ giá thường (× 1.4)
    const calculatedPricePerHourWithDriver = calculatedPricePerHour > 0
      ? Math.round(calculatedPricePerHour * 1.4)
      : (car.rentPricePerHourWithDriver || 0);
    
    const calculatedPricePerDayWithDriver = calculatedPricePerHourWithDriver > 0
      ? Math.round(calculatedPricePerHourWithDriver * 22)
      : (car.rentPricePerDayWithDriver || 0);
    
    form.setFieldsValue({
      name: car.name ?? "",
      model: car.model ?? "",
      seats: car.seats,
      sizeType: car.sizeType ?? "",
      trunkCapacity: car.trunkCapacity,
      batteryType: car.batteryType ?? "",
      batteryDuration: car.batteryDuration,
      rentPricePerDay: car.rentPricePerDay || (calculatedPricePerHour > 0 ? Math.round(calculatedPricePerHour * 22) : 0),
      rentPricePerHour: calculatedPricePerHour,
      rentPricePerDayWithDriver: calculatedPricePerDayWithDriver,
      rentPricePerHourWithDriver: calculatedPricePerHourWithDriver,
      status: car.status ?? 0, // Đảm bảo có giá trị mặc định
      imageUrl: car.imageUrl,
      imageUrl2: car.imageUrl2 ?? undefined,
      imageUrl3: car.imageUrl3 ?? undefined,
      isActive: car.isActive,
      rentalLocationId: extractRentalLocationId(car),
    });
    setModalOpen(true);
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
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
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
      // Tự động tính giá theo ngày từ giá giờ (giá giờ × 22)
      const calculatedPricePerDay = values.rentPricePerHour 
        ? Math.round(values.rentPricePerHour * 22) 
        : (values.rentPricePerDay || 0);
      
      // Tự động tính giá có tài xế = giá thường × 1.4 (tăng 40%)
      const calculatedPricePerHourWithDriver = values.rentPricePerHour
        ? Math.round(values.rentPricePerHour * 1.4)
        : (values.rentPricePerHourWithDriver || 0);
      
      const calculatedPricePerDayWithDriver = calculatedPricePerHourWithDriver > 0
        ? Math.round(calculatedPricePerHourWithDriver * 22)
        : (values.rentPricePerDayWithDriver || 0);

      // Map sang PascalCase để tương thích backend .NET (tránh lỗi 'rentPricePerDay is required')
      const carDataPascal: Record<string, unknown> = {
        // Khi update có thể cần Id
        ...(editingCar ? { Id: editingCar.id } : {}),
        Model: values.model,
        Name: values.name,
        Seats: values.seats,
        SizeType: values.sizeType,
        TrunkCapacity: values.trunkCapacity,
        BatteryType: values.batteryType,
        BatteryDuration: values.batteryDuration,
        RentPricePerDay: calculatedPricePerDay,
        RentPricePerHour: values.rentPricePerHour,
        RentPricePerDayWithDriver: calculatedPricePerDayWithDriver,
        RentPricePerHourWithDriver: calculatedPricePerHourWithDriver,
        ImageUrl: values.imageUrl,
        ImageUrl2: values.imageUrl2 || null,
        ImageUrl3: values.imageUrl3 || null,
        Status: Number(values.status), // Đảm bảo là number
        IsActive: values.isActive !== undefined ? values.isActive : true,
        IsDeleted: false,
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
        const carId = editingCar ? editingCar.id : extractIdFromData(response.data);
        const selectedLocationId: number | undefined = values.rentalLocationId;

        // Cập nhật ngay lập tức vào state với data từ form (không cần đợi fetch lại)
        if (editingCar && carId) {
          setCars((prevCars) => {
            return prevCars.map((car) => {
              if (car.id === carId) {
                return {
                  ...car,
                  status: Number(values.status), // Đảm bảo status được cập nhật ngay
                  name: values.name,
                  model: values.model,
                  seats: values.seats,
                  sizeType: values.sizeType,
                  trunkCapacity: values.trunkCapacity,
                  batteryType: values.batteryType,
                  batteryDuration: values.batteryDuration,
                  rentPricePerDay: values.rentPricePerDay,
                  rentPricePerHour: values.rentPricePerHour,
                  rentPricePerDayWithDriver: values.rentPricePerDayWithDriver,
                  rentPricePerHourWithDriver: values.rentPricePerHourWithDriver,
                  imageUrl: values.imageUrl,
                  imageUrl2: values.imageUrl2,
                  imageUrl3: values.imageUrl3,
                  isActive: values.isActive,
                };
              }
              return car;
            });
          });
        }

        if (carId) {
          // Lấy danh sách location hiện tại của xe
          let existingCarRentalLocations: CarRentalLocationData[] = [];
          if (editingCar) {
            try {
              const existingResponse = await carRentalLocationApi.getByCarId(carId);
              if (existingResponse.success && existingResponse.data) {
                existingCarRentalLocations = normalizeDotNetList<CarRentalLocationData>(existingResponse.data);
              }
            } catch (locationError: any) {
              // Bỏ qua lỗi 404, không log để tránh spam console
              if (locationError?.status !== 404 && locationError?.response?.status !== 404) {
                console.warn(`[CarManagement] Failed to fetch existing locations for car ${carId}:`, locationError);
              }
            }
          }

          const existingLocationId = existingCarRentalLocations.length > 0 
            ? existingCarRentalLocations[0].locationId 
            : undefined;

          // Nếu có location được chọn
          if (selectedLocationId !== undefined && selectedLocationId !== null) {
            // Nếu location đã thay đổi hoặc chưa có location
            if (existingLocationId !== selectedLocationId) {
              // Xóa tất cả location cũ (nếu có)
              if (existingCarRentalLocations.length > 0) {
                await Promise.all(
                  existingCarRentalLocations.map(async (item) => {
                    try {
                      if (item.id) {
                        await carRentalLocationApi.delete(item.id);
                      } else {
                        await carRentalLocationApi.deleteByCarAndLocation(carId, item.locationId);
                      }
                    } catch (deleteError) {
                      console.error(`[CarManagement] Failed to delete location ${item.locationId}:`, deleteError);
                    }
                  }),
                );
              }

              // Thêm location mới
              try {
                await carRentalLocationApi.create({
                  carId,
                  locationId: selectedLocationId,
                  quantity: 1,
                });
              } catch (locationError) {
                console.error(`[CarManagement] Failed to link car ${carId} with location ${selectedLocationId}:`, locationError);
              }
            }
          } else {
            // Nếu không chọn location, xóa tất cả location cũ
            if (existingCarRentalLocations.length > 0) {
              await Promise.all(
                existingCarRentalLocations.map(async (item) => {
                  try {
                    if (item.id) {
                      await carRentalLocationApi.delete(item.id);
                    } else {
                      await carRentalLocationApi.deleteByCarAndLocation(carId, item.locationId);
                    }
                  } catch (deleteError) {
                    console.error(`[CarManagement] Failed to delete location ${item.locationId}:`, deleteError);
                  }
                }),
              );
            }
          }
        }

        api.success({
          message: editingCar ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!',
          placement: 'topRight',
          icon: <CheckCircle color="#52c41a" />,
        });
        setModalOpen(false);
        setEditingCar(null);
        form.resetFields();
        // Reload danh sách để đồng bộ trạng thái từ server
        await loadCars();
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
      width: 60,
      render: (url: string, record: Car) => (
        <img
          src={url || '/logo_ev.png'}
          alt={record.name}
          className="w-12 h-12 object-cover rounded"
          onError={(e) => {
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
      width: 70,
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
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number | string | undefined) => {
        // Đảm bảo status là number
        const statusNum = typeof status === 'number' ? status : (status === 1 || status === '1' ? 1 : 0);
        return (
          <Tag color={statusNum === 1 ? 'green' : 'red'}>
            {statusNum === 1 ? 'Sẵn sàng' : 'Hết xe'}
          </Tag>
        );
      },
    },
    {
      title: 'Kích hoạt',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'blue' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Địa điểm',
      key: 'locations',
      width: 140,
      render: (_value: unknown, record: Car) => {
        const carLocations = (record as unknown as { carRentalLocations?: unknown })?.carRentalLocations;
        if (!carLocations) {
          return (
            <Tag color="default" className="text-xs m-0" style={{ margin: 0, padding: '2px 6px' }}>
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        const locationsList = normalizeDotNetList<RawCarRentalLocation>(carLocations);
        if (locationsList.length === 0) {
          return (
            <Tag color="default" className="text-xs m-0" style={{ margin: 0, padding: '2px 6px' }}>
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        // Chỉ lấy location đầu tiên
        const firstLocation = locationsList[0];
        const locationInfo = firstLocation.rentalLocation ?? firstLocation.RentalLocation;
        
        let locationName = '';
        let locationAddress = '';
        
        if (locationInfo) {
          locationName = locationInfo.name ?? locationInfo.Name ?? '';
          locationAddress = locationInfo.address ?? locationInfo.Address ?? '';
        } else {
          // Nếu không có locationInfo, tìm trong rentalLocations state
          const locationId = firstLocation.rentalLocationId ?? firstLocation.RentalLocationId ?? firstLocation.locationId ?? firstLocation.LocationId;
          if (locationId) {
            const foundLocation = rentalLocations.find(l => l.id === locationId);
            if (foundLocation) {
              locationName = foundLocation.name || '';
              locationAddress = foundLocation.address || '';
            }
          }
        }

        if (!locationName && !locationAddress) {
          return (
            <Tag color="default" className="text-xs m-0" style={{ margin: 0, padding: '2px 6px' }}>
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        return (
          <div className="flex items-center gap-0 bg-blue-50 border border-blue-200 rounded px-0.5 py-0 max-w-[150px]">
            <MapPin size={8} className="flex-shrink-0 text-blue-600" />
            <div className="flex-1 min-w-0">
              {locationName && (
                <div className="text-xs font-medium text-gray-800 leading-none">{locationName}</div>
              )}
              {locationAddress && (
                <div className="text-xs text-gray-600 leading-none">{locationAddress}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_value: unknown, record: Car) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEdit(record)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sửa
          </Button>
          {!staffMode && (
            <Popconfirm
              title="Xóa xe này?"
              description="Bạn có chắc chắn muốn xóa xe này? Hành động này không thể hoàn tác."
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger size="small" icon={<Trash2 size={14} />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space> 
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CarIcon /> Quản lý xe
          </div>
        }
        extra={
          !staffMode ? (
            <Button
              type="primary"
              icon={<Plus />}
              onClick={handleAdd}
              className="bg-blue-600"
              size="small"
            >
              Thêm xe mới
            </Button>
          ) : null
        }
        bodyStyle={{ padding: '12px' }}
      >
        <Table
          columns={columns}
          dataSource={cars}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} xe`,
            size: 'small',
          }}
          scroll={{ x: 1200 }}
          className="compact-table"
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
              rules={[{ required: true, message: 'Vui lòng nhập tên xe!' }]}
            >
              <Input placeholder="VinFast VF 8" />
            </Form.Item>

            <Form.Item
              label="Model"
              name="model"
              rules={[{ required: true, message: 'Vui lòng nhập model!' }]}
            >
              <Input placeholder="VF 8 Plus" />
            </Form.Item>

            <Form.Item
              label="Số chỗ ngồi"
              name="seats"
              rules={[{ required: true, message: 'Vui lòng nhập số chỗ!' }]}
            >
              <InputNumber min={2} max={9} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Loại xe"
              name="sizeType"
              rules={[{ required: true, message: 'Vui lòng chọn loại xe!' }]}
            >
              <Select placeholder="Chọn loại xe">
                <Select.Option value="mini">Mini</Select.Option>
                <Select.Option value="coupé">Coupé</Select.Option>
                <Select.Option value="crossover">Crossover</Select.Option>
                <Select.Option value="compact">Compact</Select.Option>
                <Select.Option value="sedan">Sedan</Select.Option>
                <Select.Option value="suv">SUV</Select.Option>
                <Select.Option value="mpv">MPV</Select.Option>
              </Select>
            </Form.Item>


            <Form.Item
              label="Dung tích cốp (lít)"
              name="trunkCapacity"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 40, 300, 500"
            >
              <InputNumber min={0} max={2000} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Loại pin"
              name="batteryType"
              rules={[{ required: true, message: 'Vui lòng chọn loại pin!' }]}
            >
              <Select placeholder="Chọn loại pin">
                <Select.Option value="LFP">LFP</Select.Option>
                <Select.Option value="NMC">NMC</Select.Option>
                <Select.Option value="NCA">NCA</Select.Option>
                <Select.Option value="LTO">LTO</Select.Option>
                <Select.Option value="Na‑Ion">Na‑Ion</Select.Option>
                <Select.Option value="Lead‑Acid">Lead‑Acid</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>


            <Form.Item
              label="Quãng đường (km)"
              name="batteryDuration"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 300, 400, 500 km"
            >
              <InputNumber min={0} max={2000} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (VND)"
              name="rentPricePerHour"
              rules={[{ required: true, message: 'Vui lòng nhập giá thuê/giờ!' }]}
              tooltip="Giá thuê/ngày tự động = giá/giờ × 22. Giá có tài xế tự động = giá thường × 1.4 (+40%)"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                onChange={(value) => {
                  // Tự động tính giá theo ngày = giá giờ × 22
                  if (value && typeof value === 'number') {
                    const calculatedDayPrice = Math.round(value * 22);
                    form.setFieldsValue({ rentPricePerDay: calculatedDayPrice });
                    
                    // Tự động tính giá có tài xế = giá thường × 1.4 (tăng 40%)
                    const priceWithDriver = Math.round(value * 1.4);
                    const dayPriceWithDriver = Math.round(priceWithDriver * 22);
                    form.setFieldsValue({ 
                      rentPricePerHourWithDriver: priceWithDriver,
                      rentPricePerDayWithDriver: dayPriceWithDriver
                    });
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/ngày (VND)"
              name="rentPricePerDay"
              tooltip="Tự động tính từ giá/giờ (giá/giờ × 22)"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (có tài xế) được +40%"
              name="rentPricePerHourWithDriver"
              tooltip="Tự động tính = giá thuê/giờ × 1.4 (tăng 40%)"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/ngày (có tài xế)"
              name="rentPricePerDayWithDriver"
              tooltip="Tự động tính từ giá/giờ (có tài xế) (giá/giờ × 22)"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </Form.Item>

            <Form.Item
              label="Trạng thái"
              name="status"
              initialValue={1}
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value={1}>Sẵn sàng</Select.Option>
                <Select.Option value={0}>Hết xe</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Địa điểm cho thuê"
              name="rentalLocationId"
              rules={[{ required: true, message: 'Vui lòng chọn địa điểm!' }]}
            >
              <Select
                placeholder="Chọn địa điểm cho thuê xe"
                loading={loadingLocations}
                optionFilterProp="label"
                showSearch
                allowClear
                filterOption={(input, option) => {
                  const label = option?.label?.toString() || '';
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {rentalLocations.map((location) => (
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
            rules={[{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
            />
          </Form.Item>

          {/* Preview ảnh chính */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl !== currentValues.imageUrl}>
            {({ getFieldValue }) => {
              const imageUrl = getFieldValue('imageUrl');
              return imageUrl ? (
                <Form.Item label="Xem trước ảnh chính">
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

          <Form.Item label="Hoặc upload ảnh chính từ máy">
            <Upload
              customRequest={(options) => handleImageUpload(options, 'imageUrl')}
              showUploadList={false}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              maxCount={1}
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

          {/* Ảnh phụ 1 */}
          <Form.Item
            label="URL ảnh xe phụ 1 (bắt buộc)"
            name="imageUrl2"
            rules={[{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
            />
          </Form.Item>

          {/* Preview ảnh phụ 1 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl2 !== currentValues.imageUrl2}>
            {({ getFieldValue }) => {
              const imageUrl2 = getFieldValue('imageUrl2');
              return imageUrl2 ? (
                <Form.Item label="Xem trước ảnh phụ 1">
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

          <Form.Item label="Hoặc upload ảnh phụ 1 từ máy">
            <Upload
              customRequest={(options) => handleImageUpload(options, 'imageUrl2')}
              showUploadList={false}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              maxCount={1}
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

          {/* Ảnh phụ 2 */}
          <Form.Item
            label="URL ảnh xe phụ 2 (bắt buộc)"
            name="imageUrl3"
            rules={[{ required: true, message: 'Vui lòng nhập URL ảnh chính!' }]}
            tooltip="Link ảnh từ internet hoặc upload bên dưới"
          >
            <Input
              placeholder="https://res.cloudinary.com/... hoặc upload ảnh bên dưới"
            />
          </Form.Item>

          {/* Preview ảnh phụ 2 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl3 !== currentValues.imageUrl3}>
            {({ getFieldValue }) => {
              const imageUrl3 = getFieldValue('imageUrl3');
              return imageUrl3 ? (
                <Form.Item label="Xem trước ảnh phụ 2">
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

          <Form.Item label="Hoặc upload ảnh phụ 2 từ máy">
            <Upload
              customRequest={(options) => handleImageUpload(options, 'imageUrl3')}
              showUploadList={false}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              maxCount={1}
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

          <Form.Item
            label="Kích hoạt"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
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

