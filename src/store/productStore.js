import { create } from "zustand";

const useProductStore = create((set) => ({

  products: [],

  setProducts: (products) =>
    set({ products }),

  updateStock: (productId, stock) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? { ...p, stock }
          : p
      ),
    })),

}));

export default useProductStore;
