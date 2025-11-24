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
    // Luôn load rental locations để admin có thể set location
    loadRentalLocations();
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
        
        // Nếu là staff mode, không cần fetch location (chỉ cần trạng thái)
        if (staffMode) {
          setCars(activeCars);
        } else {
          // Fetch carRentalLocations cho tất cả xe để hiển thị location (chỉ khi không phải staff mode)
          const carsWithLocations = await Promise.all(
            activeCars.map(async (car) => {
              try {
                // Nếu đã có carRentalLocations, không cần fetch lại
                const hasLocations = car.carRentalLocations && 
                  (Array.isArray(car.carRentalLocations) || (car.carRentalLocations as any)?.$values);

                if (!hasLocations) {
                  // Fetch carRentalLocations từ API
                  try {
                    const locationResponse = await carRentalLocationApi.getByCarId(car.id);
                    if (locationResponse.success && locationResponse.data) {
                      const locationsData = Array.isArray(locationResponse.data)
                        ? locationResponse.data
                        : (locationResponse.data as any)?.$values || [];
                      
                      // Enrich với thông tin rentalLocation nếu chưa có
                      const enrichedLocations = await Promise.all(
                        locationsData.map(async (loc: any) => {
                          // Nếu đã có rentalLocation, giữ nguyên
                          if (loc.rentalLocation || loc.RentalLocation) {
                            return loc;
                          }
                          
                          // Nếu chỉ có locationId, fetch thông tin location
                          const locationId = loc.rentalLocationId ?? loc.RentalLocationId ?? loc.locationId ?? loc.LocationId;
                          if (locationId) {
                            try {
                              const rentalLocRes = await rentalLocationApi.getById(locationId);
                              if (rentalLocRes.success && rentalLocRes.data) {
                                return {
                                  ...loc,
                                  rentalLocation: rentalLocRes.data
                                };
                              }
                            } catch (err) {
                              // Nếu không fetch được, vẫn trả về location với locationId
                              console.warn(`Failed to fetch rental location ${locationId}:`, err);
                            }
                          }
                          return loc;
                        })
                      );
                      
                      return {
                        ...car,
                        carRentalLocations: enrichedLocations
                      };
                    }
                  } catch (locationError: any) {
                    // 404 là bình thường nếu xe chưa có location, không cần log
                    if (locationError?.response?.status !== 404) {
                      console.warn(`Failed to fetch locations for car ${car.id}:`, locationError);
                    }
                  }
                } else {
                  // Nếu đã có locations nhưng chưa có rentalLocation object, enrich chúng
                  const carLocations = normalizeDotNetList<RawCarRentalLocation>(car.carRentalLocations);
                  const needsEnrichment = carLocations.some(
                    (loc) => !loc.rentalLocation && !loc.RentalLocation && (loc.rentalLocationId || loc.RentalLocationId || loc.locationId || loc.LocationId)
                  );
                  
                  if (needsEnrichment) {
                    const enrichedLocations = await Promise.all(
                      carLocations.map(async (loc: RawCarRentalLocation) => {
                        if (loc.rentalLocation || loc.RentalLocation) {
                          return loc;
                        }
                        
                        const locationId = loc.rentalLocationId ?? loc.RentalLocationId ?? loc.locationId ?? loc.LocationId;
                        if (locationId) {
                          try {
                            const rentalLocRes = await rentalLocationApi.getById(locationId);
                            if (rentalLocRes.success && rentalLocRes.data) {
                              return {
                                ...loc,
                                rentalLocation: rentalLocRes.data
                              };
                            }
                          } catch (err) {
                            console.warn(`Failed to fetch rental location ${locationId}:`, err);
                          }
                        }
                        return loc;
                      })
                    );
                    
                    return {
                      ...car,
                      carRentalLocations: enrichedLocations
                    };
                  }
                }
                return car;
              } catch (error) {
                // Chỉ log nếu không phải lỗi 404
                const errorStatus = (error as any)?.response?.status;
                if (errorStatus !== 404) {
                  console.warn(`Failed to fetch locations for car ${car.id}:`, error);
                }
                return car;
              }
            })
          );
          
          setCars(carsWithLocations);
        }
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
      status: 0,
      isActive: true,
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
      rentPricePerDay: car.rentPricePerDay,
      rentPricePerHour: car.rentPricePerHour,
      rentPricePerDayWithDriver: car.rentPricePerDayWithDriver,
      rentPricePerHourWithDriver: car.rentPricePerHourWithDriver,
      status: car.status,
      imageUrl: car.imageUrl,
      imageUrl2: car.imageUrl2 ?? undefined,
      imageUrl3: car.imageUrl3 ?? undefined,
      isActive: car.isActive,
      rentalLocationId: locationId,
    });
    setModalOpen(true);
  };

  const handleStatusChange = async (carId: number, newStatus: number) => {
    setLoading(true);
    try {
      // Tìm xe trong danh sách hiện tại
      const currentCar = cars.find(car => car.id === carId);
      if (!currentCar) {
        api.error({
          message: 'Lỗi',
          description: 'Không tìm thấy thông tin xe!',
          placement: 'topRight',
        });
        setLoading(false);
        return;
      }

      // Gửi đầy đủ thông tin xe với Status mới (backend yêu cầu tất cả trường bắt buộc)
      const carDataPascal: Record<string, unknown> = {
        Id: carId,
        Name: currentCar.name || '',
        Model: currentCar.model || '',
        Seats: currentCar.seats || 5,
        SizeType: currentCar.sizeType || '',
        TrunkCapacity: currentCar.trunkCapacity || 0,
        BatteryType: currentCar.batteryType || '',
        BatteryDuration: currentCar.batteryDuration || 0,
        RentPricePerDay: currentCar.rentPricePerDay || 0,
        RentPricePerHour: currentCar.rentPricePerHour || 0,
        RentPricePerDayWithDriver: currentCar.rentPricePerDayWithDriver || 0,
        RentPricePerHourWithDriver: currentCar.rentPricePerHourWithDriver || 0,
        ImageUrl: currentCar.imageUrl || '',
        ImageUrl2: currentCar.imageUrl2 || '',
        ImageUrl3: currentCar.imageUrl3 || '',
        Status: newStatus,
        IsActive: currentCar.isActive !== undefined ? currentCar.isActive : true,
        IsDeleted: false,
        CarRentalLocations: [],
        RentalOrders: [],
        CreatedAt: currentCar.createdAt || new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      const response = await carsApi.update(carId, carDataPascal as Partial<Car>);

      if (response.success) {
        // Cập nhật state ngay lập tức để UI phản ánh thay đổi
        setCars(prevCars => 
          prevCars.map(car => 
            car.id === carId ? { ...car, status: newStatus } : car
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
      console.error('Status update error:', error);
      api.error({
        message: 'Có lỗi xảy ra',
        description: 'Không thể cập nhật trạng thái!',
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
      // Nếu là staff mode, chỉ gửi trường Status
      const carDataPascal: Record<string, unknown> = staffMode
        ? {
            ...(editingCar ? { Id: editingCar.id } : {}),
            Status: values.status,
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
            RentPricePerDay: values.rentPricePerDay,
            RentPricePerHour: values.rentPricePerHour,
            RentPricePerDayWithDriver: values.rentPricePerDayWithDriver,
            RentPricePerHourWithDriver: values.rentPricePerHourWithDriver,
            ImageUrl: values.imageUrl,
            ImageUrl2: values.imageUrl2 || null,
            ImageUrl3: values.imageUrl3 || null,
            Status: values.status,
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

        // Xử lý location cho admin (không phải staff mode)
        if (!staffMode && carId) {
          // Lấy danh sách location hiện tại của xe
          let existingCarRentalLocations: CarRentalLocationData[] = [];
          if (editingCar) {
            const existingResponse = await carRentalLocationApi.getByCarId(carId);
            if (existingResponse.success && existingResponse.data) {
              existingCarRentalLocations = normalizeDotNetList<CarRentalLocationData>(existingResponse.data);
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
          src={url || '/logo_ev.png'}
          alt={record.name}
          className="w-16 h-16 object-cover rounded"
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
      key: 'status',

      width: 150,
      render: (status: number, record: Car) => {
        if (staffMode) {
          // Normalize status để đảm bảo là số
          const statusNum = typeof status === 'number' ? status : (status === 1 || status === '1' ? 1 : 0);
          return (
            <Select
              value={statusNum}
              onChange={async (value) => {
                await handleStatusChange(record.id, value);
              }}
              style={{ width: '100%' }}
              size="small"
            >
              <Select.Option value={1}>Sẵn sàng</Select.Option>
              <Select.Option value={0}>Hết xe</Select.Option>
            </Select>
          );
        }
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
        const carLocations = (record as unknown as { carRentalLocations?: unknown })?.carRentalLocations;
        if (!carLocations) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        const locationsList = normalizeDotNetList<RawCarRentalLocation>(carLocations);
        if (locationsList.length === 0) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

        // Chỉ lấy location đầu tiên
        const firstLocation = locationsList[0];
        const locationInfo = firstLocation.rentalLocation ?? firstLocation.RentalLocation;
        
        let locationName = '';
        let locationAddress = '';
        
        // Ưu tiên lấy từ locationInfo object
        if (locationInfo) {
          locationName = locationInfo.name ?? locationInfo.Name ?? '';
          locationAddress = locationInfo.address ?? locationInfo.Address ?? '';
        }
        
        // Nếu chưa có, thử lấy từ rentalLocations state
        if (!locationName && !locationAddress) {
          const locationId = firstLocation.rentalLocationId ?? firstLocation.RentalLocationId ?? firstLocation.locationId ?? firstLocation.LocationId;
          if (locationId) {
            const foundLocation = rentalLocations.find(l => l.id === locationId || l.id === Number(locationId));
            if (foundLocation) {
              locationName = foundLocation.name || '';
              locationAddress = foundLocation.address || '';
            }
          }
        }

        if (!locationName && !locationAddress) {
          return (
            <Tag color="default" className="text-xs">
              <span className="text-gray-400">Chưa gán</span>
            </Tag>
          );
        }

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
            >
              Thêm xe mới
            </Button>
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
            showTotal: (total) => `Tổng ${total} xe`,
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
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (VND)"
              name="rentPricePerHour"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 150000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
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
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (có tài xế)"
              name="rentPricePerHourWithDriver"
              rules={staffMode ? [] : [{ required: true }]}
              tooltip="Ví dụ: 200000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled={staffMode}
              />
            </Form.Item>

            <Form.Item
              label="Trạng thái"
              name="status"
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
              rules={staffMode ? [] : [{ required: false, message: 'Vui lòng chọn địa điểm!' }]}
            >
              <Select
                placeholder="Chọn địa điểm cho thuê xe"
                loading={loadingLocations}
                optionFilterProp="label"
                showSearch
                allowClear
                disabled={staffMode}
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

          {!staffMode && (
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

          {!staffMode && (
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

          {!staffMode && (
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

