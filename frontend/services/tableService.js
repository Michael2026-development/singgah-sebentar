import api from "@/lib/axios";

export const getTables = async (params = {}) => {
  const response = await api.get("/tables", { params });
  return response.data;
};

export const getTableByNumber = async (number) => {
  const response = await api.get(`/tables/number/${number}`);
  return response.data;
};

export const createTable = async (data) => {
  const response = await api.post("/tables", data);
  return response.data;
};

export const updateTable = async (id, data) => {
  const response = await api.put(`/tables/${id}`, data);
  return response.data;
};

export const updateTableStatus = async (id, status) => {
  const response = await api.patch(`/tables/${id}/status`, { status });
  return response.data;
};