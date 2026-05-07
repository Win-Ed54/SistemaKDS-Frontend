import { create } from "zustand";

const getId = (o) => o?.id || o?._id || o?.Id;

// Normaliza status a número siempre
const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const normalizeOrder = (o) => ({
  ...o,
  id: getId(o),
  status: toStatusNumber(o.status),
});

const useOrderStore = create(
  (set) => ({
    orders: [],

    addOrder: (order) =>
      set((state) => {
        const normalized = normalizeOrder(order);
        if (!normalized.id) return state;
        if (state.orders.some((o) => getId(o) === normalized.id)) return state;
        return { orders: [normalized, ...state.orders] };
      }),

    updateOrder: (order) =>
      set((state) => {
        const normalized = normalizeOrder(order);
        const exists = state.orders.some((o) => getId(o) === normalized.id);

        if (!exists) {
          return {
            orders: [normalized, ...state.orders],
          };
        }

        return {
          orders: state.orders.map((o) =>
            getId(o) === normalized.id ? { ...o, ...normalized } : o
          ),
        };
      }),

    removeOrder: (id) =>
      set((state) => ({
        orders: state.orders.filter((o) => getId(o) !== id),
      })),

    setOrders: (incoming) =>
      set(() => ({
        orders: (incoming ?? []).map(normalizeOrder),
      })),

    clearOrders: () =>
      set(() => ({
        orders: [],
      })),

    purgeInactive: () =>
      set((state) => ({
        orders: state.orders.filter((o) => toStatusNumber(o.status) <= 2),
      })),
  })
);

export default useOrderStore;
