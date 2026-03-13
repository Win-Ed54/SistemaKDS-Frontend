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

    // iniciar conexión y unirse al grupo kitchen
    startConnection(["kitchen"]);

    // escuchar eventos
    onReceiveOrder();
    onOrderPreparing();
    onOrderReady();
    onOrderDelivered();

  }, []);

  return { orders };

};

export default useKitchenOrders;
