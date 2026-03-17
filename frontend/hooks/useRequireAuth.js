"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import useAuthStore from "@/store/authStore";

export default function useRequireAuth(allowedRoles = []) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const hasAccess = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  }, [isAuthenticated, user, allowedRoles]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const map = { owner: "/owner", manager: "/manager", kasir: "/kasir", dapur: "/dapur" };
      router.replace(map[user.role] || "/login");
    }
  }, [isAuthenticated, user]);

  return { user: hasAccess ? user : null, isLoading: !isAuthenticated, hasAccess };
}