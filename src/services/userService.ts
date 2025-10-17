import api from "@/app/api/axiosClient";

// 🧩 Định nghĩa kiểu dữ liệu User (tùy theo API của bạn)
export interface User {
  id: number;
  name: string;
  email: string;
}

// 🧠 Lấy danh sách user
export const getUsers = async (): Promise<User[]> => {
  const res = await api.get<User[]>("/users");
  return res.data;
};

// 🧠 Tạo user mới
export const createUser = async (data: Omit<User, "id">): Promise<User> => {
  const res = await api.post<User>("/users", data);
  return res.data;
};
