import api from "@/app/api/axiosClient";
import { Car } from "@/types/car";

// 🧠 Lấy danh sách xe từ backend
export const getCars = async (): Promise<Car[]> => {
  const res = await api.get<Car[]>("/api/Car");
  return res.data;
};

// 🧠 Lấy 1 xe theo tên
export const getCarByName = async (name: string): Promise<Car | null> => {
  try {
    const res = await api.get<Car>(`/api/Car/byName/${encodeURIComponent(name)}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

// 🧠 Tạo xe mới
export const createCar = async (data: Partial<Car>): Promise<Car> => {
  const res = await api.post<Car>("/api/Car", data);
  return res.data;
};

// 🧠 Cập nhật xe (PUT api/Car/{id})
export const updateCar = async (id: number, data: Partial<Car>): Promise<void> => {
  await api.put(`/api/Car/${id}`, data);
};

// 🧠 Xóa xe
export const deleteCar = async (id: number): Promise<void> => {
  await api.delete(`/api/Car/${id}`);
};

export default { getCars, getCarByName, createCar, updateCar, deleteCar };
