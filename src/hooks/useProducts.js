import { useEffect } from "react";
import useProductStore from "../store/productStore"; // 1. Importamos tu store
import { onStockUpdated } from "../services/signalrService"; // 2. Importamos el listener de SignalR

const useProducts = () => {
  // 3. Usamos el estado global del store en lugar de useState local
  const { products, setProducts, updateStock } = useProductStore();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5162/api/products");
        const data = await res.json();
        
        console.log("Products data cargada:", data);
        
        // 4. Guardamos los productos en el Store global
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };

    // Solo cargamos si la lista está vacía para no sobrescribir cambios en tiempo real
    if (products.length === 0) {
      fetchProducts();
    }

    // 5. ESCUCHAR ACTUALIZACIONES DE STOCK EN TIEMPO REAL
    // Cuando el servidor mande 'stockupdated', el hook actualizará el store automáticamente
    onStockUpdated((productId, newStock) => {
      console.log(`Actualizando stock visual: ID ${productId} -> ${newStock}`);
      updateStock(productId, newStock);
    });

  }, []); // Se ejecuta una sola vez al montar el componente

  return { products };
};

export default useProducts;
