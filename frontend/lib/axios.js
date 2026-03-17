import axios from "axios";
import { API_URL } from "./constants";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("auth-storage");
        const token = raw ? JSON.parse(raw)?.state?.token : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        // Jangan redirect kalau di halaman customer
        const isCustomerPage = path.startsWith("/menu") || 
                               path.startsWith("/order") || 
                               path.startsWith("/payment");
        if (!isCustomerPage) {
          localStorage.removeItem("auth-storage");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;