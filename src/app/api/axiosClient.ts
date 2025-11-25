import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://localhost:7200/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  // Check if we're on the client side before accessing localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default axiosClient;
