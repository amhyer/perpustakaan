/**
 * API Client — HTTP client untuk mobile app.
 *
 * Configured dengan base URL dari app config (production/staging).
 * Auto-include JWT token dari AsyncStorage.
 * Refresh token logic untuk handle expired tokens.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.API_BASE_URL || "https://perpustakaan.sekolah.sch.id";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor: add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor: handle 401 with refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        const newToken = res.data.token;
        await AsyncStorage.setItem("auth_token", newToken);

        refreshSubscribers.forEach((cb) => cb(newToken));
        refreshSubscribers = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed — force logout
        await AsyncStorage.multiRemove(["auth_token", "refresh_token", "user"]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Helper functions (mirror web API client pattern)
export async function apiGet<T = any>(url: string, params?: Record<string, any>): Promise<T> {
  const res = await api.get<T>(url, { params });
  return res.data;
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const res = await api.post<T>(url, data);
  return res.data;
}

export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const res = await api.put<T>(url, data);
  return res.data;
}

export async function apiPatch<T = any>(url: string, data?: any): Promise<T> {
  const res = await api.patch<T>(url, data);
  return res.data;
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  const res = await api.delete<T>(url);
  return res.data;
}
