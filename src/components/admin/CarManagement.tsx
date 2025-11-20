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
  Image,
  Tabs,
  Spin,
  Descriptions
} from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Plus, Edit, Trash2, CheckCircle, Upload as UploadIcon, Car as CarIcon, MapPin, FileCheck } from "lucide-react";
import { carsApi, rentalLocationApi, carRentalLocationApi, rentalOrderApi, driverLicenseApi, citizenIdApi, authApi } from "@/services/api";
import type { RentalOrderData, DriverLicenseData, CitizenIdData, User } from "@/services/api";
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

export default function CarManagement() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [form] = Form.useForm<CarFormValues>();
  const [uploading, setUploading] = useState(false);
  const [rentalLocations, setRentalLocations] = useState<RentalLocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Document verification states
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [ordersForCar, setOrdersForCar] = useState<RentalOrderData[]>([]);
  const [driverLicenses, setDriverLicenses] = useState<DriverLicenseData[]>([]);
  const [citizenIds, setCitizenIds] = useState<CitizenIdData[]>([]);
  const [users, setUsers] = useState<Record<number, User>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<DriverLicenseData | null>(null);
  const [selectedCitizenId, setSelectedCitizenId] = useState<CitizenIdData | null>(null);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [citizenIdModalVisible, setCitizenIdModalVisible] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

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
        // Filter out deleted cars
        const activeCars = listToUse.filter((car) => !car.isDeleted);
        
        // Fetch carRentalLocations cho tất cả xe để hiển thị location
        const carsWithLocations = await Promise.all(
          activeCars.map(async (car) => {
            try {
              // Nếu đã có carRentalLocations, không cần fetch lại
              const hasLocations = car.carRentalLocations && 
                (Array.isArray(car.carRentalLocations) || (car.carRentalLocations as any)?.$values);

              if (!hasLocations) {
                // Fetch carRentalLocations từ API
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
      status: 0,
      isActive: true,
      rentalLocationId: rentalLocations.length > 0 ? rentalLocations[0].id : undefined
    });
    setModalOpen(true);
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
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

  // Handle verify documents for a car
  const handleVerifyDocuments = async (carId: number) => {
    setSelectedCarId(carId);
    setDocumentModalVisible(true);
    await loadDocumentsForCar(carId);
  };

  const loadDocumentsForCar = async (carId: number) => {
    setLoadingDocuments(true);
    try {
      // Load all orders for this car
      const ordersResponse = await rentalOrderApi.getAll();
      const ordersData = ordersResponse.success && ordersResponse.data
        ? (Array.isArray(ordersResponse.data) ? ordersResponse.data : (ordersResponse.data as any)?.$values || [])
        : [];
      
      // Filter orders for this car
      const carOrders = ordersData.filter((order: RentalOrderData) => order.carId === carId);
      setOrdersForCar(carOrders);

      // Load all documents
      const [licenseRes, citizenRes, usersRes] = await Promise.all([
        driverLicenseApi.getAll(),
        citizenIdApi.getAll(),
        authApi.getAllUsers()
      ]);

      // Process driver licenses
      if (licenseRes.success && licenseRes.data) {
        const licenses = Array.isArray(licenseRes.data) 
          ? licenseRes.data 
          : (licenseRes.data as any)?.$values || [];
        // Filter licenses for orders of this car
        const orderIds = carOrders.map((o: RentalOrderData) => o.id);
        const carLicenses = licenses.filter((l: DriverLicenseData) => 
          l.rentalOrderId && orderIds.includes(l.rentalOrderId)
        );
        setDriverLicenses(carLicenses);
      }

      // Process citizen IDs
      if (citizenRes.success && citizenRes.data) {
        const citizenIdsData = Array.isArray(citizenRes.data)
          ? citizenRes.data
          : (citizenRes.data as any)?.$values || [];
        const orderIds = carOrders.map((o: RentalOrderData) => o.id);
        const carCitizenIds = citizenIdsData.filter((c: CitizenIdData) => 
          c.rentalOrderId && orderIds.includes(c.rentalOrderId)
        );
        setCitizenIds(carCitizenIds);
      }

      // Process users
      if (usersRes.success && usersRes.data) {
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const usersMap: Record<number, User> = {};
        usersData.forEach((user: any) => {
          const userId = user.id || user.userId;
          if (userId) {
            usersMap[userId] = user;
          }
        });
        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Load documents error:', error);
      api.error({
        message: 'Lỗi tải giấy tờ',
        description: 'Không thể tải danh sách giấy tờ',
        placement: 'topRight',
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const getUserFromOrder = (order: RentalOrderData): User | null => {
    return users[order.userId] || null;
  };

  const handleApproveLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 1);
      if (response.success) {
        const license = driverLicenses.find(l => l.id === licenseId);
        if (license?.rentalOrderId) {
          const order = ordersForCar.find(o => o.id === license.rentalOrderId);
          if (order) {
            const citizenId = citizenIds.find(c => c.rentalOrderId === license.rentalOrderId);
            if (citizenId && (citizenId.status === '1' || citizenId.status === 'Approved')) {
              api.success({
                message: 'Xác thực GPLX thành công. Email đã được gửi (cả 2 giấy tờ đã được xác nhận).',
                placement: 'topRight',
              });
            } else {
              api.success({
                message: 'Xác thực GPLX thành công. Vui lòng xác nhận thêm CCCD.',
                placement: 'topRight',
              });
            }
          }
        }
        if (selectedCarId) {
          await loadDocumentsForCar(selectedCarId);
        }
        setLicenseModalVisible(false);
      } else {
        api.error({
          message: 'Lỗi xác thực',
          description: response.error || 'Không thể xác thực GPLX',
          placement: 'topRight',
        });
      }
    } catch (error) {
      api.error({
        message: 'Lỗi xác thực',
        description: 'Có lỗi xảy ra khi xác thực',
        placement: 'topRight',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLicense = async (licenseId: number) => {
    setProcessingId(licenseId);
    try {
      const response = await driverLicenseApi.updateStatus(licenseId, 2);
      if (response.success) {
        api.success({
          message: 'Đã từ chối GPLX',
          placement: 'topRight',
        });
        if (selectedCarId) {
          await loadDocumentsForCar(selectedCarId);
        }
        setLicenseModalVisible(false);
      } else {
        api.error({
          message: 'Lỗi từ chối',
          description: response.error || 'Không thể từ chối GPLX',
          placement: 'topRight',
        });
      }
    } catch (error) {
      api.error({
        message: 'Lỗi từ chối',
        description: 'Có lỗi xảy ra khi từ chối',
        placement: 'topRight',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 1);
      if (response.success) {
        const citizenId = citizenIds.find(c => c.id === citizenIdId);
        if (citizenId?.rentalOrderId) {
          const license = driverLicenses.find(l => l.rentalOrderId === citizenId.rentalOrderId);
          if (license && (license.status === '1' || license.status === 'Approved')) {
            api.success({
              message: 'Xác thực CCCD thành công. Email đã được gửi (cả 2 giấy tờ đã được xác nhận).',
              placement: 'topRight',
            });
          } else {
            api.success({
              message: 'Xác thực CCCD thành công. Vui lòng xác nhận thêm GPLX.',
              placement: 'topRight',
            });
          }
        }
        if (selectedCarId) {
          await loadDocumentsForCar(selectedCarId);
        }
        setCitizenIdModalVisible(false);
      } else {
        api.error({
          message: 'Lỗi xác thực',
          description: response.error || 'Không thể xác thực CCCD',
          placement: 'topRight',
        });
      }
    } catch (error) {
      api.error({
        message: 'Lỗi xác thực',
        description: 'Có lỗi xảy ra khi xác thực',
        placement: 'topRight',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCitizenId = async (citizenIdId: number) => {
    setProcessingId(citizenIdId);
    try {
      const response = await citizenIdApi.updateStatus(citizenIdId, 2);
      if (response.success) {
        api.success({
          message: 'Đã từ chối CCCD',
          placement: 'topRight',
        });
        if (selectedCarId) {
          await loadDocumentsForCar(selectedCarId);
        }
        setCitizenIdModalVisible(false);
      } else {
        api.error({
          message: 'Lỗi từ chối',
          description: response.error || 'Không thể từ chối CCCD',
          placement: 'topRight',
        });
      }
    } catch (error) {
      api.error({
        message: 'Lỗi từ chối',
        description: 'Có lỗi xảy ra khi từ chối',
        placement: 'topRight',
      });
    } finally {
      setProcessingId(null);
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

        if (carId) {
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
          message: editingCar ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!',
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
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? 'Sẵn sàng' : 'Hết xe'}
        </Tag>
      ),
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
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
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
          {/* <Button
            type="default"
            size="small"
            icon={<FileCheck />}
            onClick={() => handleVerifyDocuments(record.id)}
          >
            Xác thực giấy tờ
          </Button> */}
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
          <Button
            type="primary"
            icon={<Plus />}
            onClick={handleAdd}
            className="bg-blue-600"
          >
            Thêm xe mới
          </Button>
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
              label="Giá thuê/ngày (VND)"
              name="rentPricePerDay"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 900000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (VND)"
              name="rentPricePerHour"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 150000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/ngày (có tài xế)"
              name="rentPricePerDayWithDriver"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 1200000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="Giá thuê/giờ (có tài xế)"
              name="rentPricePerHourWithDriver"
              rules={[{ required: true }]}
              tooltip="Ví dụ: 200000"
            >
              <InputNumber
                min={0}
                className="w-full"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="Trạng thái"
              name="status"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value={0}>Sẵn sàng</Select.Option>
                <Select.Option value={1}>Hết xe</Select.Option>
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

      {/* Document Verification Modal */}
      <Modal
        title="Xác thực giấy tờ"
        open={documentModalVisible}
        onCancel={() => {
          setDocumentModalVisible(false);
          setSelectedCarId(null);
          setOrdersForCar([]);
          setDriverLicenses([]);
          setCitizenIds([]);
        }}
        footer={null}
        width={1200}
      >
        <Spin spinning={loadingDocuments}>
          <Tabs
            defaultActiveKey="licenses"
            items={[
              {
                key: 'licenses',
                label: `Giấy phép lái xe (${driverLicenses.length})`,
                children: (
                  <Table
                    columns={[
                      {
                        title: 'ID',
                        dataIndex: 'id',
                        key: 'id',
                        width: 80,
                      },
                      {
                        title: 'Họ tên (trên GPLX)',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: 'Người upload',
                        key: 'user',
                        render: (_: any, record: DriverLicenseData) => {
                          const order = ordersForCar.find(o => o.id === record.rentalOrderId);
                          const user = order ? getUserFromOrder(order) : null;
                          if (!user) return '-';
                          return (
                            <div>
                              <div className="font-medium">{user.fullName || user.email}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          );
                        },
                      },
                      {
                        title: 'Mã đơn hàng',
                        key: 'rentalOrderId',
                        render: (_: any, record: DriverLicenseData) => 
                          record.rentalOrderId ? `#${record.rentalOrderId}` : '-',
                      },
                      {
                        title: 'Số bằng lái',
                        dataIndex: 'licenseNumber',
                        key: 'licenseNumber',
                      },
                      {
                        title: 'Trạng thái',
                        key: 'status',
                        render: (_: any, record: DriverLicenseData) => {
                          if (record.status === '1' || record.status === 'Approved') {
                            return <Tag color="success">Đã xác thực</Tag>;
                          }
                          if (record.status === '2' || record.status === 'Rejected') {
                            return <Tag color="error">Đã từ chối</Tag>;
                          }
                          return <Tag color="warning">Chờ xác thực</Tag>;
                        },
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 200,
                        render: (_: any, record: DriverLicenseData) => {
                          const isPending = !record.status || record.status === '0' || record.status === 'Pending';
                          return (
                            <Space>
                              <Button 
                                type="link" 
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setSelectedLicense(record);
                                  setLicenseModalVisible(true);
                                }}
                              >
                                Xem
                              </Button>
                              {isPending && (
                                <>
                                  <Button 
                                    type="primary" 
                                    size="small"
                                    loading={processingId === record.id}
                                    onClick={() => record.id && handleApproveLicense(record.id)}
                                  >
                                    Duyệt
                                  </Button>
                                  <Button 
                                    danger 
                                    size="small"
                                    loading={processingId === record.id}
                                    onClick={() => record.id && handleRejectLicense(record.id)}
                                  >
                                    Từ chối
                                  </Button>
                                </>
                              )}
                            </Space>
                          );
                        },
                      },
                    ]}
                    dataSource={driverLicenses}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                ),
              },
              {
                key: 'citizenIds',
                label: `Căn cước công dân (${citizenIds.length})`,
                children: (
                  <Table
                    columns={[
                      {
                        title: 'ID',
                        dataIndex: 'id',
                        key: 'id',
                        width: 80,
                      },
                      {
                        title: 'Họ tên (trên CCCD)',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: 'Người upload',
                        key: 'user',
                        render: (_: any, record: CitizenIdData) => {
                          const order = ordersForCar.find(o => o.id === record.rentalOrderId);
                          const user = order ? getUserFromOrder(order) : null;
                          if (!user) return '-';
                          return (
                            <div>
                              <div className="font-medium">{user.fullName || user.email}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          );
                        },
                      },
                      {
                        title: 'Mã đơn hàng',
                        key: 'rentalOrderId',
                        render: (_: any, record: CitizenIdData) => 
                          record.rentalOrderId ? `#${record.rentalOrderId}` : '-',
                      },
                      {
                        title: 'Số CCCD',
                        dataIndex: 'citizenIdNumber',
                        key: 'citizenIdNumber',
                      },
                      {
                        title: 'Trạng thái',
                        key: 'status',
                        render: (_: any, record: CitizenIdData) => {
                          if (record.status === '1' || record.status === 'Approved') {
                            return <Tag color="success">Đã xác thực</Tag>;
                          }
                          if (record.status === '2' || record.status === 'Rejected') {
                            return <Tag color="error">Đã từ chối</Tag>;
                          }
                          return <Tag color="warning">Chờ xác thực</Tag>;
                        },
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 200,
                        render: (_: any, record: CitizenIdData) => {
                          const isPending = !record.status || record.status === '0' || record.status === 'Pending';
                          return (
                            <Space>
                              <Button 
                                type="link" 
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setSelectedCitizenId(record);
                                  setCitizenIdModalVisible(true);
                                }}
                              >
                                Xem
                              </Button>
                              {isPending && (
                                <>
                                  <Button 
                                    type="primary" 
                                    size="small"
                                    loading={processingId === record.id}
                                    onClick={() => record.id && handleApproveCitizenId(record.id)}
                                  >
                                    Duyệt
                                  </Button>
                                  <Button 
                                    danger 
                                    size="small"
                                    loading={processingId === record.id}
                                    onClick={() => record.id && handleRejectCitizenId(record.id)}
                                  >
                                    Từ chối
                                  </Button>
                                </>
                              )}
                            </Space>
                          );
                        },
                      },
                    ]}
                    dataSource={citizenIds}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                ),
              },
            ]}
          />
        </Spin>
      </Modal>

      {/* License Detail Modal */}
      <Modal
        title="Chi tiết Giấy phép lái xe"
        open={licenseModalVisible}
        onCancel={() => {
          setLicenseModalVisible(false);
          setSelectedLicense(null);
        }}
        footer={null}
        width={800}
      >
        {selectedLicense && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Họ tên">{selectedLicense.name}</Descriptions.Item>
              <Descriptions.Item label="Số bằng lái">{selectedLicense.licenseNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                {selectedLicense.rentalOrderId ? `#${selectedLicense.rentalOrderId}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedLicense.status === '1' || selectedLicense.status === 'Approved' ? (
                  <Tag color="success">Đã xác thực</Tag>
                ) : selectedLicense.status === '2' || selectedLicense.status === 'Rejected' ? (
                  <Tag color="error">Đã từ chối</Tag>
                ) : (
                  <Tag color="warning">Chờ xác thực</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
            {(selectedLicense.imageUrl || selectedLicense.imageUrl2) && (
              <div className="mt-4">
                <div className="font-medium mb-2">Ảnh giấy phép lái xe:</div>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {selectedLicense.imageUrl && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mặt trước:</div>
                      <Image src={selectedLicense.imageUrl} alt="GPLX mặt trước" className="max-w-full" />
                    </div>
                  )}
                  {selectedLicense.imageUrl2 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mặt sau:</div>
                      <Image src={selectedLicense.imageUrl2} alt="GPLX mặt sau" className="max-w-full" />
                    </div>
                  )}
                </Space>
              </div>
            )}
            {(!selectedLicense.status || selectedLicense.status === '0' || selectedLicense.status === 'Pending') && (
              <div className="mt-4 flex gap-2">
                <Button 
                  type="primary"
                  loading={processingId === selectedLicense.id}
                  onClick={() => selectedLicense.id && handleApproveLicense(selectedLicense.id)}
                >
                  Duyệt
                </Button>
                <Button 
                  danger
                  loading={processingId === selectedLicense.id}
                  onClick={() => selectedLicense.id && handleRejectLicense(selectedLicense.id)}
                >
                  Từ chối
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Citizen ID Detail Modal */}
      <Modal
        title="Chi tiết Căn cước công dân"
        open={citizenIdModalVisible}
        onCancel={() => {
          setCitizenIdModalVisible(false);
          setSelectedCitizenId(null);
        }}
        footer={null}
        width={800}
      >
        {selectedCitizenId && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Họ tên">{selectedCitizenId.name}</Descriptions.Item>
              <Descriptions.Item label="Số CCCD">{selectedCitizenId.citizenIdNumber}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedCitizenId.birthDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                {selectedCitizenId.rentalOrderId ? `#${selectedCitizenId.rentalOrderId}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedCitizenId.status === '1' || selectedCitizenId.status === 'Approved' ? (
                  <Tag color="success">Đã xác thực</Tag>
                ) : selectedCitizenId.status === '2' || selectedCitizenId.status === 'Rejected' ? (
                  <Tag color="error">Đã từ chối</Tag>
                ) : (
                  <Tag color="warning">Chờ xác thực</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
            {(selectedCitizenId.imageUrl || selectedCitizenId.imageUrl2) && (
              <div className="mt-4">
                <div className="font-medium mb-2">Ảnh căn cước công dân:</div>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {selectedCitizenId.imageUrl && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mặt trước:</div>
                      <Image src={selectedCitizenId.imageUrl} alt="CCCD mặt trước" className="max-w-full" />
                    </div>
                  )}
                  {selectedCitizenId.imageUrl2 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mặt sau:</div>
                      <Image src={selectedCitizenId.imageUrl2} alt="CCCD mặt sau" className="max-w-full" />
                    </div>
                  )}
                </Space>
              </div>
            )}
            {(!selectedCitizenId.status || selectedCitizenId.status === '0' || selectedCitizenId.status === 'Pending') && (
              <div className="mt-4 flex gap-2">
                <Button 
                  type="primary"
                  loading={processingId === selectedCitizenId.id}
                  onClick={() => selectedCitizenId.id && handleApproveCitizenId(selectedCitizenId.id)}
                >
                  Duyệt
                </Button>
                <Button 
                  danger
                  loading={processingId === selectedCitizenId.id}
                  onClick={() => selectedCitizenId.id && handleRejectCitizenId(selectedCitizenId.id)}
                >
                  Từ chối
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

