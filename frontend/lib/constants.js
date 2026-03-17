export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  KASIR: "kasir",
  DAPUR: "dapur",
};

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const PAYMENT_METHOD = {
  QRIS: "qris",
  CASH: "cash",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
};

export const ORDER_STATUS_LABEL = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  preparing: "Sedang Disiapkan",
  delivered: "Sudah Diantarkan",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const ZONE_LABEL = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  vip: "VIP",
};