// productStore.js — SOLO el store de Zustand, sin imports de hooks
import { create } from "zustand";

const getId = (p) => p?.id || p?._id || p?.Id;

const useProductStore = create((set) => ({
  products: [],

  setProducts: (incoming) =>
    set(() => ({
      products: (incoming ?? []).map((p) => ({ ...p, id: getId(p) })),
    })),

  updateStock: (productId, newStock) => set((state) => ({
  products: state.products.map((p) => 
    (p.id === productId || p._id === productId) // Validar ambos formatos de ID
      ? { ...p, stock: newStock } 
      : p
  )
})),

  markOutOfStock: (productId) =>
    set((state) => ({
      products: state.products.map((p) =>
        (p.id === productId || p._id === productId) ? { ...p, stock: 0 } : p
      ),
    })),
}));

export default useProductStore;