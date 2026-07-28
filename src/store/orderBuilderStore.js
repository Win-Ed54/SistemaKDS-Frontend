import { create } from "zustand";
import useProductStore from "./productStore";
import {
  getOrderMetrics,
  getProductUnitsInOrder,
  normalizeOrderSettings,
} from "../constants/orderLimits";
import { getCurrentKdsSettings } from "./kdsSettingsStore";
import { finalizeKitchenNote } from "../utils/inputSanitizers";

const EMPTY_DRAFT = {
  customerName: "",
  items: [],
};

// Cada mesa, pedido para llevar o ubicacion temporal mantiene su propio borrador.
const getLocationKey = (tableId) => {
  if (tableId === null || tableId === undefined || tableId === "") {
    return "__unassigned__";
  }

  const normalizedNumber = Number(tableId);
  return Number.isFinite(normalizedNumber) ? String(normalizedNumber) : String(tableId);
};

const cloneDraft = (draft = EMPTY_DRAFT) => ({
  customerName: draft.customerName || "",
  items: Array.isArray(draft.items) ? [...draft.items] : [],
});

const getDraftForLocation = (state, tableId) =>
  cloneDraft(state.draftsByLocation?.[getLocationKey(tableId)] || EMPTY_DRAFT);

// Sincroniza el borrador persistido de la ubicacion actual con el estado visible del panel.
const buildDraftState = (state, tableId, draftPatch) => {
  const locationKey = getLocationKey(tableId ?? state.tableId);
  const currentDraft = getDraftForLocation(state, tableId ?? state.tableId);
  const nextDraft = {
    ...currentDraft,
    ...draftPatch,
  };

  return {
    draftsByLocation: {
      ...(state.draftsByLocation || {}),
      [locationKey]: nextDraft,
    },
    customerName: nextDraft.customerName,
    items: nextDraft.items,
  };
};

/**
 * Builder de ordenes del mesero.
 * Conserva borradores por mesa o destino para que cambiar de contexto no pierda el carrito.
 */
const useOrderBuilderStore = create((set, get) => ({
  tableId: null,
  waiterName: "",
  customerName: "",
  items: [],
  noteTarget: null,
  draftsByLocation: {
    [getLocationKey(null)]: cloneDraft(),
  },

  setTable: (tableId) =>
    set((state) => {
      const nextDraft = getDraftForLocation(state, tableId);

      return {
        tableId,
        customerName: nextDraft.customerName,
        items: nextDraft.items,
        noteTarget: null,
        draftsByLocation: {
          ...(state.draftsByLocation || {}),
          [getLocationKey(tableId)]: nextDraft,
        },
      };
    }),
  setWaiter: (name) => set({ waiterName: name }),
  setCustomer: (name) =>
    set((state) =>
      buildDraftState(state, state.tableId, { customerName: String(name || "") }),
    ),
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
    const isBlockedByIngredients = Boolean(
      current?.isBlockedByIngredients ?? current?.IsBlockedByIngredients,
    );

    if (isBlockedByIngredients) {
      return { ok: false, message: "Este producto no puede pedirse por falta de ingredientes." };
    }

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
      // Las lineas sin nota se compactan para representar "mismo producto, misma preparacion".
      const existingClean = state.items.find(
        (item) => item.productId === productId && !item.notes
      );

      if (existingClean) {
        return {
          ...buildDraftState(state, state.tableId, {
            items: state.items.map((item) =>
              item.productId === productId && !item.notes
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          }),
        };
      }

      return {
        ...buildDraftState(state, state.tableId, {
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
        }),
      };
    });

    if (current) updateStock(productId, Math.max(0, (current.stock ?? current.Stock ?? 0) - 1));
    return { ok: true };
  },

  addCustomItem: (product, notes = "") => {
    const productId = product.id || product._id || product.Id;
    const normalizedNotes = finalizeKitchenNote(notes);
    const { products, updateStock } = useProductStore.getState();
    const current = products.find((p) => (p.id || p._id || p.Id) === productId);
    const currentItems = get().items;
    const settings = normalizeOrderSettings(getCurrentKdsSettings());
    const inCartTotal = getProductUnitsInOrder(currentItems, productId);
    const { distinctItems, totalUnits } = getOrderMetrics(currentItems);
    const available = (current?.stock ?? current?.Stock ?? 0) - inCartTotal;
    const isBlockedByIngredients = Boolean(
      current?.isBlockedByIngredients ?? current?.IsBlockedByIngredients,
    );

    if (isBlockedByIngredients) {
      return { ok: false, message: "Este producto no puede pedirse por falta de ingredientes." };
    }

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
      // Las lineas con la misma nota se agrupan para no duplicar variantes identicas.
      const matchingItem = state.items.find(
        (item) => item.productId === productId && (item.notes || "") === normalizedNotes
      );

      if (matchingItem) {
        return {
          ...buildDraftState(state, state.tableId, {
            items: state.items.map((item) =>
              item.productId === productId && (item.notes || "") === normalizedNotes
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          }),
          noteTarget: null,
        };
      }

      return {
        ...buildDraftState(state, state.tableId, {
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
        }),
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
      ...buildDraftState(state, state.tableId, {
        items: state.items.filter(
          (item) => !(item.productId === productId && item.notes === notes)
        ),
      }),
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
      ...buildDraftState(state, state.tableId, {
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
      }),
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
      const normalizedNotes = finalizeKitchenNote(notes);
      const normalizedCurrentNotes = finalizeKitchenNote(currentNotes);
      const sourceItem = state.items.find(
        (item) =>
          item.productId === productId &&
          finalizeKitchenNote(item.notes) === normalizedCurrentNotes
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
            finalizeKitchenNote(item.notes) === normalizedCurrentNotes
          )
      );

      const targetIndex = remainingItems.findIndex(
        (item) =>
          item.productId === productId &&
          finalizeKitchenNote(item.notes) === normalizedNotes
      );

      if (targetIndex >= 0) {
        // Si la nota editada coincide con otra linea existente, se fusionan cantidades.
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
        ...buildDraftState(state, state.tableId, {
          items: remainingItems,
        }),
        noteTarget: null,
      };
    });
  },

  reconcileWithAvailableStock: (products = []) => {
    const stockByProduct = new Map(
      (Array.isArray(products) ? products : []).map((product) => {
        const isBlockedByIngredients = Boolean(
          product?.isBlockedByIngredients ?? product?.IsBlockedByIngredients,
        );

        return [
          product.id || product._id || product.Id,
          isBlockedByIngredients ? 0 : Math.max(0, Number(product.stock ?? product.Stock ?? 0)),
        ];
      })
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

      return buildDraftState(state, state.tableId, { items: nextItems });
    });
  },

  clearOrder: () => {
    const { products, updateStock } = useProductStore.getState();
    get().items.forEach((item) => {
      const current = products.find((p) => (p.id || p._id || p.Id) === item.productId);
      if (current) updateStock(item.productId, (current.stock ?? current.Stock ?? 0) + item.quantity);
    });
    set((state) => ({
      ...buildDraftState(state, state.tableId, {
        items: [],
        customerName: "",
      }),
      noteTarget: null,
    }));
  },

  resetAfterOrder: () =>
    set((state) => ({
      ...buildDraftState(state, state.tableId, {
        items: [],
        customerName: "",
      }),
      noteTarget: null,
    })),
}));

export default useOrderBuilderStore;
