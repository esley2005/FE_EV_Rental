import { apiCall, setAuthData, clearAuthData, getAuthData, type AuthUser } from "./api";

type LoginPayload = { email: string; password: string };
type LoginResponse = { token: string; user: AuthUser; isEmailConfirmed?: boolean };

export async function login(payload: LoginPayload) {
  const res = await apiCall<LoginResponse>("/api/Auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.success || !res.data) {
    throw new Error(res.error || "Login failed");
  }

  if (res.data.isEmailConfirmed === false) {
    throw new Error("Email chưa xác thực");
  }

  setAuthData({ token: res.data.token, user: res.data.user });
  return res.data;
}

export function logout() {
  clearAuthData();
}

export function getCurrentUser() {
  return getAuthData()?.user || null;
}

export function getToken() {
  return getAuthData()?.token || null;
}


