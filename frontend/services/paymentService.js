import api from "@/lib/axios";

export const getPaymentByOrderId = async (orderId) => {
  const response = await api.get(`/payments/order/${orderId}`);
  return response.data;
};

export const confirmCashPayment = async (orderId, data) => {
  const response = await api.patch(`/payments/order/${orderId}/confirm-cash`, data);
  return response.data;
};

export const confirmQrisPayment = async (orderId, data) => {
  const response = await api.patch(`/payments/order/${orderId}/confirm-qris`, data);
  return response.data;
};

export const getAllPayments = async (params = {}) => {
  const response = await api.get("/payments", { params });
  return response.data;
};