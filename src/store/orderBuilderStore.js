import { create } from "zustand";
import useProductStore from "./productStore";

const useOrderBuilderStore = create((set, get) => ({
  tableId:      null,
  waiterName:   "",
  customerName: "",
  items:        [],

  setTable:    (tableId) => set({ tableId }),
  setWaiter:   (name)    => set({ waiterName: name }),
  setCustomer: (name)    => set({ customerName: name }),

  addItem: (product) => {
    const productId = product.id || product._id || product.Id;
    const { products, updateStock } = useProductStore.getState();
    const current = products.find((p) => (p.id || p._id) === productId);

    // Calcular cuántas unidades ya están en carrito (de este producto, cualquier nota)
    const inCartTotal = get().items
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);

    const available = (current?.stock ?? 0) - inCartTotal;
    if (available <= 0) return;

    // ✅ Al agregar, siempre crea un item SIN nota (nota = "")
    // Si el usuario quiere nota diferente, se aplica después via updateItemNotes
    // y eso crea una entrada separada en el carrito
    set((state) => {
      // Buscar item existente SIN nota para este producto
      const existingClean = state.items.find(
        (i) => i.productId === productId && !i.notes
      );

      if (existingClean) {
        return {
          items: state.items.map((i) =>
            i.productId === productId && !i.notes
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId:   productId,
            productName: product.name || product.Name,
            price:       product.price || product.Price,
            quantity:    1,
            notes:       "",
          },
        ],
      };
    });

    if (current) updateStock(productId, Math.max(0, current.stock - 1));
  },

  removeItem: (productId, notes = "") => {
    const { products, updateStock } = useProductStore.getState();

    // ✅ Eliminar el item específico por productId + notes
    const inCart = get().items.find(
      (i) => i.productId === productId && i.notes === notes
    );
    const current = products.find((p) => (p.id || p._id) === productId);

    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.notes === notes)
      ),
    }));

    if (current && inCart) {
      updateStock(productId, current.stock + inCart.quantity);
    }
  },

  decreaseItem: (productId, notes = "") => {
    const { products, updateStock } = useProductStore.getState();
    const inCart = get().items.find(
      (i) => i.productId === productId && i.notes === notes
    );
    const current = products.find((p) => (p.id || p._id) === productId);

    if (!inCart) return;

    set((state) => ({
      items: inCart.quantity <= 1
        ? state.items.filter(
            (i) => !(i.productId === productId && i.notes === notes)
          )
        : state.items.map((i) =>
            i.productId === productId && i.notes === notes
              ? { ...i, quantity: i.quantity - 1 }
              : i
          ),
    }));

    if (current) updateStock(productId, current.stock + 1);
  },

  // ✅ updateItemNotes: cuando se aplica una nota a un item sin nota,
  // se crea una entrada SEPARADA en el carrito
  updateItemNotes: (productId, notes) => {
    set((state) => {
      // Buscar el item sin nota más reciente de este producto
      const cleanItem = state.items.find(
        (i) => i.productId === productId && !i.notes
      );

      if (!cleanItem || !notes) return state;

      // Verificar si ya existe un item con esa misma nota
      const existingWithNote = state.items.find(
        (i) => i.productId === productId && i.notes === notes
      );

      if (existingWithNote) {
        // Sumar al existente y reducir el clean en 1
        return {
          items: state.items
            .map((i) => {
              if (i.productId === productId && i.notes === notes)
                return { ...i, quantity: i.quantity + 1 };
              if (i.productId === productId && !i.notes)
                return i.quantity <= 1 ? null : { ...i, quantity: i.quantity - 1 };
              return i;
            })
            .filter(Boolean),
        };
      }

      // Crear nueva entrada con nota, reducir clean en 1
      const newItem = { ...cleanItem, quantity: 1, notes };
      return {
        items: [
          ...state.items
            .map((i) => {
              if (i.productId === productId && !i.notes)
                return i.quantity <= 1 ? null : { ...i, quantity: i.quantity - 1 };
              return i;
            })
            .filter(Boolean),
          newItem,
        ],
      };
    });
  },

  clearOrder: () => {
    const { products, updateStock } = useProductStore.getState();
    get().items.forEach((item) => {
      const current = products.find((p) => (p.id || p._id) === item.productId);
      if (current) updateStock(item.productId, current.stock + item.quantity);
    });
    set({ items: [], customerName: "", tableId: null });
  },

  resetAfterOrder: () => set({ items: [], customerName: "", tableId: null }),
}));

export default useOrderBuilderStore;