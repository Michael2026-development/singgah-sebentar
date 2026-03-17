import api from "@/lib/axios";

export const getMenus = async (params = {}) => {
  const response = await api.get("/menus", { params });
  return response.data;
};

export const getMenuById = async (id) => {
  const response = await api.get(`/menus/${id}`);
  return response.data;
};

export const createMenu = async (formData) => {
  const response = await api.post("/menus", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateMenu = async (id, formData) => {
  const response = await api.put(`/menus/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const toggleMenu = async (id) => {
  const response = await api.patch(`/menus/${id}/toggle`);
  return response.data;
};

export const deleteMenu = async (id) => {
  const response = await api.delete(`/menus/${id}`);
  return response.data;
};