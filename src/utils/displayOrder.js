export const compareLocalizedText = (left, right) =>
  String(left || "").localeCompare(String(right || ""), "es", {
    sensitivity: "base",
    numeric: true,
  });

export const getProductCategory = (product) =>
  String(product?.category || product?.Category || "").trim();

export const getProductName = (product) =>
  String(product?.name || product?.Name || "Producto").trim();

export const sortCategoriesForDisplay = (products = []) => {
  const categories = Array.from(
    new Set((Array.isArray(products) ? products : []).map(getProductCategory).filter(Boolean)),
  );

  return categories.sort(compareLocalizedText);
};

export const sortProductsForDisplay = (products = [], activeCategory = "Todas") => {
  return [...(Array.isArray(products) ? products : [])].sort((left, right) => {
    if (activeCategory === "Todas") {
      const categoryComparison = compareLocalizedText(
        getProductCategory(left),
        getProductCategory(right),
      );

      if (categoryComparison !== 0) return categoryComparison;
    }

    return compareLocalizedText(getProductName(left), getProductName(right));
  });
};

export const sortCartItemsForTakeout = (items = [], products = []) => {
  const productById = new Map(
    (Array.isArray(products) ? products : []).map((product) => [
      product.id || product._id || product.Id,
      product,
    ]),
  );

  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftProduct = productById.get(left.productId);
    const rightProduct = productById.get(right.productId);

    const categoryComparison = compareLocalizedText(
      getProductCategory(leftProduct),
      getProductCategory(rightProduct),
    );

    if (categoryComparison !== 0) return categoryComparison;

    const nameComparison = compareLocalizedText(left.productName, right.productName);
    if (nameComparison !== 0) return nameComparison;

    return compareLocalizedText(left.notes, right.notes);
  });
};
