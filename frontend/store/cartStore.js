import { create } from "zustand";

const useCartStore = create((set, get) => ({
  items: [],
  tableId: null,
  tableNumber: null,
  paymentMethod: "qris",

  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  addItem: (menu, options = {}) => {
    const { items } = get();
    const existingIndex = items.findIndex(
      (item) =>
        item.menuId === menu.id &&
        item.size === (options.size || null) &&
        item.temperature === (options.temperature || null) &&
        item.sweetness === (options.sweetness || null) &&
        item.spiciness === (options.spiciness || null) &&
        item.specialNote === (options.specialNote || null)
    );

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal =
        updated[existingIndex].unitPrice * updated[existingIndex].quantity;
      set({ items: updated });
    } else {
      const unitPrice = parseFloat(menu.basePrice);
      set({
        items: [
          ...items,
          {
            menuId: menu.id,
            name: menu.name,
            imageUrl: menu.imageUrl,
            category: menu.category,
            unitPrice,
            quantity: 1,
            subtotal: unitPrice,
            size: options.size || null,
            temperature: options.temperature || null,
            sweetness: options.sweetness || null,
            spiciness: options.spiciness || null,
            toppings: options.toppings || null,
            specialNote: options.specialNote || null,
          },
        ],
      });
    }
  },

  removeItem: (index) => {
    const { items } = get();
    set({ items: items.filter((_, i) => i !== index) });
  },

  updateQuantity: (index, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      set({ items: items.filter((_, i) => i !== index) });
      return;
    }
    const updated = [...items];
    updated[index].quantity = quantity;
    updated[index].subtotal = updated[index].unitPrice * quantity;
    set({ items: updated });
  },

  updateNote: (index, note) => {
    const { items } = get();
    const updated = [...items];
    updated[index].specialNote = note;
    set({ items: updated });
  },

  clearCart: () => set({ items: [], paymentMethod: "qris" }),

  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },
}));

export default useCartStore;