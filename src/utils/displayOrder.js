const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getCategoryName = (product) => String(product?.category ?? product?.Category ?? "").trim();
const getProductName = (product) => String(product?.name ?? product?.Name ?? "").trim();

export const sortCategoriesForDisplay = (products = []) => {
  const categories = [...new Set(products.map(getCategoryName).filter(Boolean))];

  return categories.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));
};

export const sortProductsForDisplay = (products = []) => {
  return [...products].sort((a, b) => {
    const categoryDiff = normalizeText(getCategoryName(a)).localeCompare(
      normalizeText(getCategoryName(b)),
    );

    if (categoryDiff !== 0) return categoryDiff;

    return normalizeText(getProductName(a)).localeCompare(normalizeText(getProductName(b)));
  });
};

export const sortCartItemsForTakeout = (items = [], products = []) => {
  const byId = new Map(
    products.map((product) => [String(product?.id ?? product?._id ?? product?.Id), product]),
  );

  return [...items].sort((a, b) => {
    const productA = byId.get(String(a?.productId ?? a?.product_id ?? ""));
    const productB = byId.get(String(b?.productId ?? b?.product_id ?? ""));

    const categoryDiff = normalizeText(getCategoryName(productA)).localeCompare(
      normalizeText(getCategoryName(productB)),
    );

    if (categoryDiff !== 0) return categoryDiff;

    return normalizeText(getProductName(productA)).localeCompare(
      normalizeText(getProductName(productB)),
    );
  });
};
