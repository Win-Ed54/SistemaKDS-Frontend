import { useCallback, useEffect, useRef } from "react";
import useOrderStore from "../store/orderStore";
import { getActiveOrders } from "../services/api.service";
import {
  onOrderCancelled,
  onOrderDelivered,
  onOrderPreparing,
  onOrderReady,
  onReceiveOrder,
  subscribeConnectionStatus,
} from "../services/signalrService";

const useKitchenOrders = () => {
  const { orders, setOrders, purgeInactive } = useOrderStore();
  const syncTimeoutRef = useRef(null);

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

    const scheduleSync = () => {
      if (!mounted || syncTimeoutRef.current) return;

      syncTimeoutRef.current = window.setTimeout(() => {
        syncTimeoutRef.current = null;
        if (mounted) void syncActiveOrders();
      }, 250);
    };

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
        scheduleSync();
      }
    });

    const unsubscribeReceiveOrder = onReceiveOrder(() => {
      scheduleSync();
    });

    const unsubscribePreparing = onOrderPreparing(() => {
      scheduleSync();
    });

    const unsubscribeReady = onOrderReady(() => {
      scheduleSync();
    });

    const unsubscribeDelivered = onOrderDelivered(() => {
      scheduleSync();
    });

    const unsubscribeCancelled = onOrderCancelled(() => {
      scheduleSync();
    });

    return () => {
      mounted = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      unsubscribeConnection?.();
      unsubscribeReceiveOrder?.();
      unsubscribePreparing?.();
      unsubscribeReady?.();
      unsubscribeDelivered?.();
      unsubscribeCancelled?.();
    };
  }, [purgeInactive, setOrders, syncActiveOrders]);

  const activeOrders = orders.filter((o) => o.status >= 0 && o.status <= 2);

  return { orders: activeOrders };
};

export default useKitchenOrders;
