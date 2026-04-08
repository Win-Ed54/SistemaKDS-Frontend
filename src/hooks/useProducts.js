import { useCallback, useEffect } from "react";
import useProductStore from "../store/productStore";
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
      setProducts(data ?? []);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  }, [setProducts]);

  useEffect(() => {
    fetchProducts();

    const unsubscribeStock = onStockUpdated((productId, newStock) => {
      updateStock(productId, newStock);
    });

    const unsubscribeOutOfStock = onProductOutOfStock((data) => {
      const id =
        typeof data === "string" ? data : data?.productId || data?.ProductId;

      if (id) markOutOfStock(id);
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

    return () => {
      unsubscribeStock?.();
      unsubscribeOutOfStock?.();
      unsubscribeConnection?.();
      window.removeEventListener("kds-sync-products", handleForceSync);
      connection.off("productupdated", handleProductUpdated);
    };
  }, [fetchProducts, markOutOfStock, updateStock]);

  return { products, refetch: fetchProducts };
};

export default useProducts;
