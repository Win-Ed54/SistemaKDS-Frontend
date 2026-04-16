import { create } from "zustand";
import useProductStore from "./productStore";
import {
  getOrderMetrics,
  getProductUnitsInOrder,
  normalizeOrderSettings,
} from "../constants/orderLimits";
import { getCurrentKdsSettings } from "./kdsSettingsStore";

const useOrderBuilderStore = create((set, get) => ({
  tableId: null,
  waiterName: "",
  customerName: "",
  items: [],
  noteTarget: null,

  setTable: (tableId) => set({ tableId }),
  setWaiter: (name) => set({ waiterName: name }),
  setCustomer: (name) => set({ customerName: name }),
  setNoteTarget: (target) => set({ noteTarget: target }),
  clearNoteTarget: () => set({ noteTarget: null }),

  addItem: (product) => {
    const productId = product.id || product._id || product.Id;
    const { products, updateStock } = useProductStore.getState();
    const current = products.find((p) => (p.id || p._id || p.Id) === productId);
    const currentItems = get().items;
    const settings = normalizeOrderSettings(getCurrentKdsSettings());
    const inCartTotal = getProductUnitsInOrder(currentItems, productId);
    const { distinctItems, totalUnits } = getOrderMetrics(currentItems);
    const available = (current?.stock ?? current?.Stock ?? 0) - inCartTotal;

    if (available <= 0) {
      return { ok: false, message: "Stock insuficiente para agregar otro producto." };
    }

    if (inCartTotal >= settings.maxQuantityPerProduct) {
      return {
        ok: false,
        message: `Maximo ${settings.maxQuantityPerProduct} unidades por producto.`,
      };
    }

    const hasExistingClean = currentItems.some(
      (item) => item.productId === productId && !item.notes
    );

    if (!hasExistingClean && distinctItems >= settings.maxDistinctItems) {
      return {
        ok: false,
        message: `Maximo ${settings.maxDistinctItems} productos distintos por orden.`,
      };
    }

    if (totalUnits >= settings.maxTotalUnits) {
      return {
        ok: false,
        message: `Maximo ${settings.maxTotalUnits} unidades totales por orden.`,
      };
    }

    set((state) => {
      const existingClean = state.items.find(
        (item) => item.productId === productId && !item.notes
      );

      if (existingClean) {
        return {
          items: state.items.map((item) =>
            item.productId === productId && !item.notes
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId,
            productName: product.name || product.Name,
            price: product.price || product.Price,
            quantity: 1,
            notes: "",
          },
        ],
      };
    });

    if (current) updateStock(productId, Math.max(0, (current.stock ?? current.Stock ?? 0) - 1));
    return { ok: true };
  },

  addCustomItem: (product, notes = "") => {
    const productId = product.id || product._id || product.Id;
    const normalizedNotes = String(notes || "").trim();
    const { products, updateStock } = useProductStore.getState();
    const current = products.find((p) => (p.id || p._id || p.Id) === productId);
    const currentItems = get().items;
    const settings = normalizeOrderSettings(getCurrentKdsSettings());
    const inCartTotal = getProductUnitsInOrder(currentItems, productId);
    const { distinctItems, totalUnits } = getOrderMetrics(currentItems);
    const available = (current?.stock ?? current?.Stock ?? 0) - inCartTotal;

    if (available <= 0) {
      return { ok: false, message: "Stock insuficiente para agregar otro producto." };
    }

    if (inCartTotal >= settings.maxQuantityPerProduct) {
      return {
        ok: false,
        message: `Maximo ${settings.maxQuantityPerProduct} unidades por producto.`,
      };
    }

    const existingItem = currentItems.find(
      (item) => item.productId === productId && (item.notes || "") === normalizedNotes
    );

    if (!existingItem && distinctItems >= settings.maxDistinctItems) {
      return {
        ok: false,
        message: `Maximo ${settings.maxDistinctItems} productos distintos por orden.`,
      };
    }

    if (totalUnits >= settings.maxTotalUnits) {
      return {
        ok: false,
        message: `Maximo ${settings.maxTotalUnits} unidades totales por orden.`,
      };
    }

    set((state) => {
      const matchingItem = state.items.find(
        (item) => item.productId === productId && (item.notes || "") === normalizedNotes
      );

      if (matchingItem) {
        return {
          items: state.items.map((item) =>
            item.productId === productId && (item.notes || "") === normalizedNotes
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          noteTarget: null,
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId,
            productName: product.name || product.Name,
            price: product.price || product.Price,
            quantity: 1,
            notes: normalizedNotes,
          },
        ],
        noteTarget: null,
      };
    });

    if (current) updateStock(productId, Math.max(0, (current.stock ?? current.Stock ?? 0) - 1));
    return { ok: true };
  },

  removeItem: (productId, notes = "") => {
    const { products, updateStock } = useProductStore.getState();
    const inCart = get().items.find(
      (item) => item.productId === productId && item.notes === notes
    );
    const current = products.find((p) => (p.id || p._id || p.Id) === productId);

    set((state) => ({
      items: state.items.filter(
        (item) => !(item.productId === productId && item.notes === notes)
      ),
      noteTarget:
        state.noteTarget?.productId === productId &&
        (state.noteTarget?.currentNotes || "") === (notes || "")
          ? null
          : state.noteTarget,
    }));

    if (current && inCart) {
      updateStock(productId, (current.stock ?? current.Stock ?? 0) + inCart.quantity);
    }
  },

  decreaseItem: (productId, notes = "") => {
    const { products, updateStock } = useProductStore.getState();
    const inCart = get().items.find(
      (item) => item.productId === productId && item.notes === notes
    );
    const current = products.find((p) => (p.id || p._id || p.Id) === productId);

    if (!inCart) return;

    set((state) => ({
      items:
        inCart.quantity <= 1
          ? state.items.filter(
              (item) => !(item.productId === productId && item.notes === notes)
            )
          : state.items.map((item) =>
              item.productId === productId && item.notes === notes
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ),
      noteTarget:
        inCart.quantity <= 1 &&
        state.noteTarget?.productId === productId &&
        (state.noteTarget?.currentNotes || "") === (notes || "")
          ? null
          : state.noteTarget,
    }));

    if (current) {
      updateStock(productId, (current.stock ?? current.Stock ?? 0) + 1);
    }
  },

  updateItemNotes: (productId, notes, currentNotes = "") => {
    set((state) => {
      const normalizedNotes = String(notes || "").trim();
      const normalizedCurrentNotes = String(currentNotes || "").trim();
      const sourceItem = state.items.find(
        (item) =>
          item.productId === productId &&
          String(item.notes || "").trim() === normalizedCurrentNotes
      );

      if (!sourceItem) {
        return state;
      }

      if (normalizedNotes === normalizedCurrentNotes) {
        return { noteTarget: null };
      }

      const remainingItems = state.items.filter(
        (item) =>
          !(
            item.productId === productId &&
            String(item.notes || "").trim() === normalizedCurrentNotes
          )
      );

      const targetIndex = remainingItems.findIndex(
        (item) =>
          item.productId === productId &&
          String(item.notes || "").trim() === normalizedNotes
      );

      if (targetIndex >= 0) {
        remainingItems[targetIndex] = {
          ...remainingItems[targetIndex],
          quantity: remainingItems[targetIndex].quantity + sourceItem.quantity,
        };
      } else {
        remainingItems.push({
          ...sourceItem,
          notes: normalizedNotes,
        });
      }

      return {
        items: remainingItems,
        noteTarget: null,
      };
    });
  },

  reconcileWithAvailableStock: (products = []) => {
    const stockByProduct = new Map(
      (Array.isArray(products) ? products : []).map((product) => [
        product.id || product._id || product.Id,
        Math.max(0, Number(product.stock ?? product.Stock ?? 0)),
      ])
    );

    set((state) => {
      const nextItems = [];
      const consumedByProduct = new Map();

      state.items.forEach((item) => {
        const productId = item.productId;
        const availableStock = stockByProduct.get(productId);

        if (availableStock == null) {
          nextItems.push(item);
          return;
        }

        const alreadyConsumed = consumedByProduct.get(productId) ?? 0;
        const remaining = Math.max(0, availableStock - alreadyConsumed);

        if (remaining <= 0) {
          return;
        }

        const allowedQuantity = Math.min(item.quantity, remaining);
        consumedByProduct.set(productId, alreadyConsumed + allowedQuantity);
        nextItems.push(
          allowedQuantity === item.quantity ? item : { ...item, quantity: allowedQuantity }
        );
      });

      return { items: nextItems };
    });
  },

  clearOrder: () => {
    const { products, updateStock } = useProductStore.getState();
    get().items.forEach((item) => {
      const current = products.find((p) => (p.id || p._id || p.Id) === item.productId);
      if (current) updateStock(item.productId, (current.stock ?? current.Stock ?? 0) + item.quantity);
    });
    set({ items: [], customerName: "", noteTarget: null });
  },

  resetAfterOrder: () =>
    set({ items: [], customerName: "", noteTarget: null }),
}));

export default useOrderBuilderStore;
