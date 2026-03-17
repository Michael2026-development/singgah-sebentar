import api from "@/lib/axios";

export const createOrder = async (orderData) => {
  const response = await api.post("/orders", orderData);
  return response.data;
};

export const getOrders = async (params = {}) => {
  const response = await api.get("/orders", { params });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const getActiveOrdersByTable = async (tableId) => {
  const response = await api.get(`/orders/table/${tableId}/active`);
  return response.data;
};

export const confirmOrder = async (id) => {
  const response = await api.patch(`/orders/${id}/confirm`);
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`/orders/${id}/status`, { status });
  return response.data;
};