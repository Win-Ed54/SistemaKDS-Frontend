import { useCallback, useEffect } from "react";
import useProductStore from "../store/productStore";
import useOrderBuilderStore from "../store/orderBuilderStore";
import { getProducts } from "../services/api.service";
import connection, {
  onProductOutOfStock,
  onStockUpdated,
  subscribeConnectionStatus,
} from "../services/signalrService";

const useProducts = () => {
  const { products, setProducts, updateStock, markOutOfStock } = useProductStore();

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      const safeData = data ?? [];
      setProducts(safeData);
      useOrderBuilderStore.getState().reconcileWithAvailableStock(safeData);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  }, [setProducts]);

  useEffect(() => {
    fetchProducts();

    const unsubscribeStock = onStockUpdated((productId, newStock) => {
      updateStock(productId, newStock);
      useOrderBuilderStore
        .getState()
        .reconcileWithAvailableStock(useProductStore.getState().products);
    });

    const unsubscribeOutOfStock = onProductOutOfStock((data) => {
      const id =
        typeof data === "string" ? data : data?.productId || data?.ProductId;

      if (id) markOutOfStock(id);
      useOrderBuilderStore
        .getState()
        .reconcileWithAvailableStock(useProductStore.getState().products);
    });

    const handleProductUpdated = () => {
      fetchProducts();
    };

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) fetchProducts();
    });

    const handleForceSync = () => {
      fetchProducts();
    };

    window.addEventListener("kds-sync-products", handleForceSync);
    connection.on("productupdated", handleProductUpdated);
    connection.on("ProductUpdated", handleProductUpdated);

    return () => {
      unsubscribeStock?.();
      unsubscribeOutOfStock?.();
      unsubscribeConnection?.();
      window.removeEventListener("kds-sync-products", handleForceSync);
      connection.off("productupdated", handleProductUpdated);
      connection.off("ProductUpdated", handleProductUpdated);
    };
  }, [fetchProducts, markOutOfStock, updateStock]);

  return { products, refetch: fetchProducts };
};

export default useProducts;
