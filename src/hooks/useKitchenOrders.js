import { useCallback, useEffect } from "react";
import useOrderStore from "../store/orderStore";
import { getActiveOrders } from "../services/api.service";
import { subscribeConnectionStatus } from "../services/signalrService";

const useKitchenOrders = () => {
  const { orders, setOrders, purgeInactive } = useOrderStore();

  const syncActiveOrders = useCallback(async () => {
    try {
      const active = await getActiveOrders();
      setOrders(active ?? []);
    } catch (err) {
      console.error("Error cargando ordenes activas:", err);
      setOrders([]);
    }
  }, [setOrders]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      purgeInactive();

      try {
        const active = await getActiveOrders();
        if (mounted) setOrders(active ?? []);
      } catch (err) {
        console.error("Error cargando ordenes iniciales:", err);
        if (mounted) setOrders([]);
      }
    };

    init();

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected && mounted) {
        void syncActiveOrders();
      }
    });

    return () => {
      mounted = false;
      unsubscribeConnection?.();
    };
  }, [purgeInactive, setOrders, syncActiveOrders]);

  const activeOrders = orders.filter((o) => o.status >= 0 && o.status <= 2);

  return { orders: activeOrders };
};

export default useKitchenOrders;
