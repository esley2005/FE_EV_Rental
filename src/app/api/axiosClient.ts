import axios from "axios";

// Use environment variable when available so you can change API target per environment.
let baseURL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:7200";
// If the provided value doesn't include http:// or https://, assume https://
if (!/^https?:\/\//i.test(baseURL)) {
  baseURL = `https://${baseURL}`;
}

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  // localStorage is only available in the browser — guard for SSR.
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      // preserve existing headers object shape
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      } as typeof config.headers;
    }
  }
  return config;
});

export default axiosClient;
