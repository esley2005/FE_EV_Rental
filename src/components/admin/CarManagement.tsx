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
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  CarOutlined
} from "@ant-design/icons";
import { carsApi } from "@/services/api";
import type { Car } from "@/types/car";

export default function CarManagement() {
  const [api, contextHolder] = antdNotification.useNotification();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    setLoading(true);
    try {
      const response = await carsApi.getAll();
      if (response.success && response.data) {
        // Backend C# trả về { "$values": [...] }
        const carsData = (response.data as any)?.$values || response.data;
        const carsList = Array.isArray(carsData) ? carsData : [];
        
        // Filter out deleted cars
        const activeCars = carsList.filter((car: Car) => !car.isDeleted);
        setCars(activeCars);
      }
    } catch (error) {
      console.error('Load cars error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCar(null);
    form.resetFields();
    form.setFieldsValue({
      status: 0,
      isActive: true
    });
    setModalOpen(true);
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    form.setFieldsValue(car);
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
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
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

  const handleImageUpload = async (options: any, fieldName: string = 'imageUrl') => {
    const { file, onSuccess, onError } = options;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      api.error({
        message: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!',
        placement: 'topRight',
      });
      onError(new Error('Invalid file type'));
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      api.error({
        message: 'Lỗi',
        description: 'Kích thước file không được vượt quá 5MB!',
        placement: 'topRight',
      });
      onError(new Error('File too large'));
      return;
    }
    
    setUploading(true);
    
    try {
      const imageUrl = await handleUploadToCloudinary(file);
      form.setFieldsValue({ [fieldName]: imageUrl });
      api.success({
        message: 'Upload ảnh thành công!',
        description: 'Ảnh đã được tải lên Cloudinary và link đã được cập nhật.',
        placement: 'topRight',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
      onSuccess(imageUrl);
    } catch (error) {
      api.error({
        message: 'Upload ảnh thất bại!',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra config Cloudinary và thử lại.',
        placement: 'topRight',
      });
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Map sang PascalCase để tương thích backend .NET (tránh lỗi 'rentPricePerDay is required')
      const carDataPascal: any = {
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
        // Quan hệ: gửi mảng rỗng nếu không có
        CarRentalLocations: [],
        RentalOrders: [],
        CreatedAt: editingCar ? editingCar.createdAt : new Date().toISOString(),
        UpdatedAt: editingCar ? new Date().toISOString() : null,
      };

      let response;
      if (editingCar) {
        // Update với payload PascalCase (ép kiểu any để vượt qua excess property check)
        response = await carsApi.update(editingCar.id, carDataPascal as any);
      } else {
        // Tạo mới
        response = await carsApi.create(carDataPascal as any);
      }

      if (response.success) {
        api.success({
          message: editingCar ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!',
          placement: 'topRight',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
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
        <Tag color={status === 0 ? 'green' : 'red'}>
          {status === 0 ? 'Sẵn sàng' : 'Hết xe'}
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
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: Car) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
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
            <Button danger size="small" icon={<DeleteOutlined />}>
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
            <CarOutlined /> Quản lý xe
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
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
              rules={[{ required: true, message: 'Vui lòng nhập loại xe!' }]}
            >
              <Input placeholder="mini, compact, sedan, suv, mpv..." />
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
              rules={[{ required: true }]}
              tooltip="Ví dụ: LFP, NMC, hoặc số kWh như 40"
            >
              <Input placeholder="LFP, NMC, 40 kWh..." />
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
                icon={<UploadOutlined />} 
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
            label="URL ảnh xe phụ 1 (tùy chọn)"
            name="imageUrl2"
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
                icon={<UploadOutlined />} 
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
            label="URL ảnh xe phụ 2 (tùy chọn)"
            name="imageUrl3"
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
                icon={<UploadOutlined />} 
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

