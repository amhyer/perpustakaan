/**
 * Auth Store — Zustand-based authentication state.
 *
 * Persists to AsyncStorage. Tracks:
 * - user: CurrentUser
 * - token: JWT access token
 * - refreshToken: for refresh
 * - isAuthenticated: boolean
 *
 * Actions: login, logout, refresh, checkAuth (on app start)
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost, apiGet } from "../lib/api";

export interface MobileUser {
  id: string;
  email: string;
  name: string;
  role: "LIBRARIAN" | "PUSTAKAWAN_JUNIOR" | "TEACHER" | "STUDENT";
  member?: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    classGrade?: string;
  };
  defaultDashboard?: string;
}

interface AuthState {
  user: MobileUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setUser: (user: MobileUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userStr = await AsyncStorage.getItem("user");
      if (token && userStr) {
        const user = JSON.parse(userStr) as MobileUser;
        set({ token, user, isAuthenticated: true });
        // Verify token still valid
        try {
          const fresh = await apiGet<MobileUser>("/api/auth/me");
          set({ user: fresh, isAuthenticated: true });
          await AsyncStorage.setItem("user", JSON.stringify(fresh));
        } catch {
          // Try refresh
          const refreshed = await get().refresh();
          if (!refreshed) {
            await get().logout();
          }
        }
      }
    } catch (err) {
      // No stored auth, fine
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiPost<{
        user: MobileUser;
        token: string;
        refreshToken: string;
      }>("/api/auth/login", { email, password });
      await AsyncStorage.multiSet([
        ["auth_token", res.token],
        ["refresh_token", res.refreshToken],
        ["user", JSON.stringify(res.user)],
      ]);
      set({
        user: res.user,
        token: res.token,
        refreshToken: res.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || "Login gagal",
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["auth_token", "refresh_token", "user"]);
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refresh: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      if (!refreshToken) return false;
      const res = await apiPost<{ token: string }>("/api/auth/refresh", { refreshToken });
      await AsyncStorage.setItem("auth_token", res.token);
      set({ token: res.token });
      return true;
    } catch {
      return false;
    }
  },

  setUser: (user) => set({ user }),
}));
