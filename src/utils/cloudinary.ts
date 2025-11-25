/**
 * Utility functions for uploading images to Cloudinary
 */

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: string;
}

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
}

/**
 * Upload a single image file to Cloudinary
 * @param file - The image file to upload
 * @param options - Optional upload options (folder, publicId, transformation)
 * @returns Promise<string> - The secure URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImageToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  // Lấy Cloudinary config từ environment variables
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ev_rental_cars';

  if (!cloudName || cloudName === 'your-cloud-name') {
    throw new Error('Chưa cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  }

  // Unsigned Upload: Chỉ cần upload_preset (đơn giản, recommended)
  formData.append('upload_preset', uploadPreset);

  // Optional: Thêm folder để tổ chức ảnh
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  // Optional: Thêm public_id để đặt tên file
  if (options?.publicId) {
    formData.append('public_id', options.publicId);
  }

  // Optional: Thêm transformation (resize, crop, etc.)
  if (options?.transformation) {
    formData.append('transformation', options.transformation);
  }

  try {
    console.log('[Cloudinary] Uploading image...', {
      cloudName,
      uploadPreset,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      options,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data: CloudinaryUploadResponse | { error: { message: string } } = await response.json();

    if (!response.ok) {
      // Log chi tiết lỗi từ Cloudinary
      console.error('[Cloudinary] Upload error details:', {
        status: response.status,
        error: 'error' in data ? data.error : null,
        message: 'error' in data ? data.error.message : null,
      });

      const errorMsg = 'error' in data 
        ? data.error.message 
        : `Upload failed with status: ${response.status}`;
      throw new Error(errorMsg);
    }

    if ('secure_url' in data && data.secure_url) {
      console.log('[Cloudinary] Image uploaded successfully:', data.secure_url);
      return data.secure_url;
    }

    throw new Error('No secure_url in response');
  } catch (error) {
    console.error('[Cloudinary] Upload failed:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of image files to upload
 * @param options - Optional upload options
 * @returns Promise<string[]> - Array of secure URLs of uploaded images
 */
export async function uploadMultipleImagesToCloudinary(
  files: File[],
  options?: CloudinaryUploadOptions
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const fileOptions = {
      ...options,
      // Tự động thêm index vào publicId nếu có
      publicId: options?.publicId 
        ? `${options.publicId}_${index}` 
        : undefined,
    };
    return uploadImageToCloudinary(file, fileOptions);
  });

  try {
    const urls = await Promise.all(uploadPromises);
    console.log('[Cloudinary] All images uploaded successfully:', urls.length);
    return urls;
  } catch (error) {
    console.error('[Cloudinary] Failed to upload some images:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary (requires backend API with API_SECRET)
 * Note: This should be done from backend for security
 */
export async function deleteImageFromCloudinary(_publicId: string): Promise<void> {
  // Note: Deletion requires API_SECRET which should not be exposed in frontend
  // This function should be called through your backend API
  console.warn('[Cloudinary] Image deletion should be done through backend API');
  throw new Error('Image deletion must be done through backend API for security');
}

