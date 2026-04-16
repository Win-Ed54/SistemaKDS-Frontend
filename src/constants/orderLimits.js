export const ORDER_MODES = {
  QUICK_SERVICE: "quick-service",
  RESTAURANT: "restaurant",
};

export const ORDER_MODE_DEFAULTS = {
  [ORDER_MODES.QUICK_SERVICE]: {
    serviceMode: ORDER_MODES.QUICK_SERVICE,
    maxDistinctItems: 30,
    maxTotalUnits: 80,
    maxQuantityPerProduct: 20,
    largeOrderUnitsWarning: 15,
  },
  [ORDER_MODES.RESTAURANT]: {
    serviceMode: ORDER_MODES.RESTAURANT,
    maxDistinctItems: 45,
    maxTotalUnits: 120,
    maxQuantityPerProduct: 30,
    largeOrderUnitsWarning: 25,
  },
};

export const normalizeOrderSettings = (settings) => {
  const mode =
    settings?.serviceMode === ORDER_MODES.RESTAURANT
      ? ORDER_MODES.RESTAURANT
      : ORDER_MODES.QUICK_SERVICE;
  const defaults = ORDER_MODE_DEFAULTS[mode];

  return {
    serviceMode: mode,
    maxDistinctItems:
      settings?.maxDistinctItems > 0 ? settings.maxDistinctItems : defaults.maxDistinctItems,
    maxTotalUnits:
      settings?.maxTotalUnits > 0 ? settings.maxTotalUnits : defaults.maxTotalUnits,
    maxQuantityPerProduct:
      settings?.maxQuantityPerProduct > 0
        ? settings.maxQuantityPerProduct
        : defaults.maxQuantityPerProduct,
    largeOrderUnitsWarning:
      settings?.largeOrderUnitsWarning > 0
        ? settings.largeOrderUnitsWarning
        : defaults.largeOrderUnitsWarning,
  };
};

export const getOrderMetrics = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];

  return {
    distinctItems: safeItems.length,
    totalUnits: safeItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
  };
};

export const getProductUnitsInOrder = (items = [], productId) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

export const validateOrderLimits = (items = [], settings = ORDER_MODE_DEFAULTS[ORDER_MODES.QUICK_SERVICE]) => {
  const resolvedSettings = normalizeOrderSettings(settings);
  const { distinctItems, totalUnits } = getOrderMetrics(items);

  if (distinctItems === 0) {
    return { ok: false, message: "La orden debe incluir al menos un producto." };
  }

  if (distinctItems > resolvedSettings.maxDistinctItems) {
    return {
      ok: false,
      message: `Maximo ${resolvedSettings.maxDistinctItems} productos distintos por orden.`,
    };
  }

  if (totalUnits > resolvedSettings.maxTotalUnits) {
    return {
      ok: false,
      message: `Maximo ${resolvedSettings.maxTotalUnits} unidades totales por orden.`,
    };
  }

  const invalidItem = (Array.isArray(items) ? items : []).find(
    (item) =>
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > resolvedSettings.maxQuantityPerProduct
  );

  if (invalidItem) {
    return {
      ok: false,
      message: `${invalidItem.productName}: maximo ${resolvedSettings.maxQuantityPerProduct} unidades por producto.`,
    };
  }

  return { ok: true };
};
