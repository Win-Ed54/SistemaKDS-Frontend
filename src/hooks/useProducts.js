import { useEffect, useRef } from "react";
import useProductStore from "../store/productStore";
import { getProducts } from "../services/api.service";
import { onStockUpdated, onProductOutOfStock } from "../services/signalrService";
import connection from "../services/signalrService";
import * as signalR from "@microsoft/signalr";

const useProducts = () => {
  const { products, setProducts, updateStock, markOutOfStock } = useProductStore();
  const loadedRef = useRef(false);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data ?? []);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  useEffect(() => {
    // Carga inicial
    fetchProducts();

    // Stock en tiempo real — actualiza solo el número
    onStockUpdated((productId, newStock) => {
      console.log("⚡ Stock actualizado en mesero:", { productId, newStock });
      updateStock(productId, newStock);
    });

    // Producto agotado
    onProductOutOfStock((data) => {
      const id = typeof data === "string" ? data : data?.productId || data?.ProductId;
      if (id) markOutOfStock(id);
    });

    // ✅ Recarga completa cuando admin crea, edita o elimina un producto
    // Escucha el evento "productupdated" que el backend emitirá
    connection.off("productupdated");
    connection.on("productupdated", () => {
      console.log("🔄 Catálogo actualizado — recargando productos...");
      fetchProducts();
    });

    // ✅ También recarga al reconectar SignalR (por si se perdió algún evento)
    connection.onreconnected(() => {
      fetchProducts();
    });

  }, []);

  return { products, refetch: fetchProducts };
};

export default useProducts;