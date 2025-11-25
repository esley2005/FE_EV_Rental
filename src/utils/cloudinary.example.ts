/**
 * Ví dụ sử dụng Cloudinary utility
 * 
 * Để sử dụng, bạn cần cấu hình các biến môi trường trong file .env.local:
 * 
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
 * NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ev_rental_cars
 */

import { uploadImageToCloudinary, uploadMultipleImagesToCloudinary } from './cloudinary';

// ========== VÍ DỤ 1: Upload một ảnh đơn giản ==========
export async function exampleUploadSingleImage() {
  // Giả sử bạn có một input file
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = fileInput?.files?.[0];
  
  if (!file) {
    console.error('No file selected');
    return;
  }

  try {
    // Upload ảnh lên Cloudinary
    const imageUrl = await uploadImageToCloudinary(file);
    console.log('Ảnh đã được upload:', imageUrl);
    // imageUrl sẽ là: https://res.cloudinary.com/your-cloud-name/image/upload/...
    
    // Bây giờ bạn có thể lưu imageUrl vào database hoặc sử dụng cho mục đích khác
    return imageUrl;
  } catch (error) {
    console.error('Lỗi upload ảnh:', error);
    throw error;
  }
}

// ========== VÍ DỤ 2: Upload ảnh vào folder cụ thể ==========
export async function exampleUploadToFolder(file: File) {
  try {
    const imageUrl = await uploadImageToCloudinary(file, {
      folder: 'ev-rental/cars', // Ảnh sẽ được lưu trong folder này
    });
    console.log('Ảnh đã được upload vào folder:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Lỗi upload ảnh:', error);
    throw error;
  }
}

// ========== VÍ DỤ 3: Upload nhiều ảnh cùng lúc ==========
export async function exampleUploadMultipleImages(files: FileList | File[]) {
  try {
    const fileArray = Array.from(files);
    const imageUrls = await uploadMultipleImagesToCloudinary(fileArray, {
      folder: 'ev-rental/cars',
    });
    console.log('Đã upload', imageUrls.length, 'ảnh:', imageUrls);
    return imageUrls;
  } catch (error) {
    console.error('Lỗi upload ảnh:', error);
    throw error;
  }
}

// ========== VÍ DỤ 4: Sử dụng với Ant Design Upload component ==========
export function exampleWithAntdUpload() {
  // Trong component của bạn:
  /*
  import { Upload } from 'antd';
  import { uploadImageToCloudinary } from '@/utils/cloudinary';
  import type { UploadProps } from 'antd';

  const handleCustomRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      const imageUrl = await uploadImageToCloudinary(file as File, {
        folder: 'ev-rental/cars',
      });
      
      // Gọi onSuccess với URL
      onSuccess?.(imageUrl, file as any);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <Upload
      customRequest={handleCustomRequest}
      listType="picture-card"
      maxCount={6}
    >
      <button type="button">Upload</button>
    </Upload>
  );
  */
}

// ========== VÍ DỤ 5: Sử dụng với input file thông thường ==========
export function exampleWithInputFile() {
  // Trong component của bạn:
  /*
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Hiển thị loading
      message.loading('Đang upload ảnh...');
      
      const imageUrl = await uploadImageToCloudinary(file, {
        folder: 'ev-rental/documents',
      });
      
      message.success('Upload ảnh thành công!');
      console.log('URL ảnh:', imageUrl);
      
      // Lưu imageUrl vào state hoặc gửi lên server
      setImageUrl(imageUrl);
    } catch (error) {
      message.error('Lỗi upload ảnh: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
    />
  );
  */
}

