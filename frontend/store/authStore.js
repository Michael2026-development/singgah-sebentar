import { create } from "zustand";
import { persist } from "zustand/middleware";

const setCookie = (name, value, days = 7) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        setCookie("auth_token", token);
        setCookie("user_role", user.role);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        deleteCookie("auth_token");
        deleteCookie("user_role");
        set({ user: null, token: null, isAuthenticated: false });
      },

      initAuth: () => {},
    }),
    {
      name: "auth-storage", // key di localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;