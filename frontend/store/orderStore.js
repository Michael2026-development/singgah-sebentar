import { create } from "zustand";

const useOrderStore = create((set, get) => ({
  orders: [],
  activeOrder: null,

  setOrders: (orders) => set({ orders }),

  addOrder: (order) => {
    const { orders } = get();
    set({ orders: [order, ...orders] });
  },

  updateOrder: (updatedOrder) => {
    const { orders } = get();
    set({
      orders: orders.map((o) =>
        o.id === updatedOrder.id ? updatedOrder : o
      ),
    });
  },

  setActiveOrder: (order) => set({ activeOrder: order }),

  clearActiveOrder: () => set({ activeOrder: null }),
}));

export default useOrderStore;