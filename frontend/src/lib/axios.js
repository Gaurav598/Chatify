import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api",
  withCredentials: true,
  timeout: 30000,
});

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, and it's not the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/auth/refresh") {
      originalRequest._retry = true;

      try {
        await axiosInstance.post("/auth/refresh");
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, let the calling function handle the rejection (e.g. checkAuth)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
