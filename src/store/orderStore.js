import { create } from "zustand";
import { persist } from "zustand/middleware";

const useOrderStore = create(
  persist(
    (set) => ({
      orders: [],

      addOrder: (order) =>
        set((state) => {
          // --- FILTRO ANTI-DUPLICADOS ---
          // Si el ID de la orden ya existe en el estado actual, 
          // devolvemos el estado sin cambios.
          if (state.orders.some((o) => o.id === order.id)) {
            return state;
          }
          // ------------------------------

          return {
            orders: [order, ...state.orders],
          };
        }),

      updateOrder: (order) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id ? { ...o, ...order } : o
          ),
        })),

      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
    }),
    {
      name: "kds-orders", // Esto mantiene tus órdenes en el LocalStorage
    }
  )
);

export default useOrderStore;
