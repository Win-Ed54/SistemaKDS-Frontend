// useProducts.js — hook que usa el store, NO al revés
import { useEffect } from "react";
import useProductStore from "../store/productStore";
import { getProducts } from "../services/api.service";
import { onStockUpdated, onProductOutOfStock } from "../services/signalrService";

const useProducts = () => {
  const { products, setProducts, updateStock, markOutOfStock } = useProductStore();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data ?? []);
      } catch (error) {
        console.error("Error cargando productos:", error);
      }
    };

    fetchProducts();

    onStockUpdated((productId, newStock) => {
        console.log("⚡ ¡LLEGÓ AL MESERO!", { id, stock });
      updateStock(productId, newStock);
    });

    onProductOutOfStock((data) => {
      markOutOfStock(data?.productId || data);
    });
  }, []);

  return { products };
};

export default useProducts;