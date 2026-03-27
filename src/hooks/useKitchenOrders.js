import { useEffect } from "react";
import useOrderStore from "../store/orderStore";
import { getActiveOrders } from "../services/api.service";

const useKitchenOrders = () => {
  const { orders, setOrders, purgeInactive } = useOrderStore();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Limpiar órdenes finalizadas del localStorage
      purgeInactive();

      // 2. Cargar órdenes activas desde API
      try {
        const active = await getActiveOrders();
        if (mounted) setOrders(active ?? []);
      } catch (err) {
        console.error("Error cargando órdenes iniciales:", err);
        if (mounted) setOrders([]);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Filtrar solo activas
  const activeOrders = orders.filter(
    (o) => o.status >= 0 && o.status <= 2
  );

  return { orders: activeOrders };
};

export default useKitchenOrders;
