import { useEffect } from "react";
import useOrderStore from "../store/orderStore";

import {
  startConnection,
  onReceiveOrder,
  onOrderPreparing,
  onOrderReady,
  onOrderDelivered
} from "../services/signalrService";

const useKitchenOrders = () => {
  const { orders } = useOrderStore();

  useEffect(() => {
    // Iniciar conexión
    startConnection(["kitchen"]);

    // Escuchar eventos
    onReceiveOrder();
    onOrderPreparing();
    onOrderReady();
    onOrderDelivered();

    // FUNCIÓN DE LIMPIEZA (Cleanup)
    return () => {
      // Si tu signalrService tiene una función para apagar, úsala aquí
      // Ejemplo: connection.off("ReceiveOrder");
    };
  }, []); // El array vacío [] con StrictMode causa la doble ejecución

  return { orders };
};

export default useKitchenOrders;