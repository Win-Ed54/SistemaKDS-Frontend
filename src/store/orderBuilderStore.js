import { create } from "zustand";

const useOrderBuilderStore = create((set) => ({

  tableId: null,
  waiterName: "",
  customerName: "",
  items: [],

  setTable: (tableId) =>
    set({ tableId }),

  setWaiter: (name) =>
    set({ waiterName: name }),

  setCustomer: (name) =>
    set({ customerName: name }),

  addItem: (product) =>
    set((state) => {

      const existing = state.items.find(
        (i) => i.productId === product.id
      );

      if (existing) {

        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };

      }

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            notes: "",
          },
        ],
      };

    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => i.productId !== productId
      ),
    })),

  clearOrder: () =>
    set({
      items: [],
      customerName: "",
    }),

}));

export default useOrderBuilderStore;
