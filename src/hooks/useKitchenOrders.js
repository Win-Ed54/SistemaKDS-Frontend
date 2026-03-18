import { useEffect } from "react";
import useOrderStore from "../store/orderStore";
import { getActiveOrders } from "../services/api.service";
import {
  startConnection,
  onReceiveOrder,
  onOrderPreparing,
  onOrderReady,
  onOrderDelivered,
  onOrderCancelled,
} from "../services/signalrService";

const useKitchenOrders = () => {
  const { orders, setOrders, purgeInactive } = useOrderStore();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Limpiar órdenes finalizadas del localStorage
      purgeInactive();

      // 2. ✅ Cargar órdenes activas PRIMERO desde la API
      try {
        const active = await getActiveOrders();
        if (mounted) setOrders(active ?? []);
      } catch (err) {
        console.error("Error cargando órdenes iniciales:", err);
        if (mounted) setOrders([]);
      }

      // 3. Conectar SignalR DESPUÉS de tener el estado base
      await startConnection(["kitchen"]);

      // 4. Registrar eventos — addOrder tiene anti-duplicados
      onReceiveOrder();
      onOrderPreparing();
      onOrderReady();
      onOrderDelivered();
      onOrderCancelled();
    };

    init();

    return () => { mounted = false; };
  }, []);

  // Filtrar solo activas (0=Pending, 1=Preparing, 2=Ready)
  const activeOrders = orders.filter((o) => o.status >= 0 && o.status <= 2);

  return { orders: activeOrders };
};

export default useKitchenOrders;