import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data.data.user });
      get().connectSocket();
    } catch (error) {
      console.log("Auth check failed:", error.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.data.user });
      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      const msg = error.response?.data?.error?.message || "Signup failed";
      toast.error(msg);
      throw error;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data.data.user });
      toast.success("Welcome back!");
      get().connectSocket();
    } catch (error) {
      const msg = error.response?.data?.error?.message || "Login failed";
      toast.error(msg);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Logout failed");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.data.user });
      toast.success("Profile updated!");
    } catch (error) {
      const msg = error.response?.data?.error?.message || "Update failed";
      toast.error(msg);
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  forgotPassword: async (email) => {
    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      toast.success("If that email exists, a reset link has been sent");
    } catch (error) {
      toast.error("Failed to send reset email");
    }
  },

  resetPassword: async (token, password) => {
    try {
      await axiosInstance.post("/auth/reset-password", { token, password });
      toast.success("Password reset! Please login.");
      return true;
    } catch (error) {
      const msg = error.response?.data?.error?.message || "Reset failed";
      toast.error(msg);
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true,
    });

    socket.connect();
    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("notification", (notification) => {
      // Will be handled by notification store
      window.dispatchEvent(new CustomEvent("newNotification", { detail: notification }));
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
