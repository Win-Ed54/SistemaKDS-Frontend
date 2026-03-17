import { useEffect, useRef } from "react";
import useOrderStore from "../store/orderStore";

const useOrderSound = () => {
  // Obtenemos las órdenes del store global (Zustand/Redux)
  const orders = useOrderStore((state) => state.orders);
  
  // Usamos una referencia para recordar cuántas órdenes había antes
  const prevCountRef = useRef(0);

  useEffect(() => {
    // 1. Filtramos solo las que están en estado "Pending" (status 0)
    const pendingOrders = orders.filter(o => o.status === 0);
    const currentCount = pendingOrders.length;

    // 2. Si hay más órdenes pendientes que antes, ¡es un pedido nuevo!
    if (currentCount > prevCountRef.current) {
      playNewOrderSound();
    }

    // 3. Actualizamos la referencia para la siguiente comparación
    prevCountRef.current = currentCount;
  }, [orders]); // Se dispara cada vez que SignalR actualiza el array de órdenes

  const playNewOrderSound = () => {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.volume = 0.5; // Volumen controlado
    audio.play().catch(err => {
      console.warn("Autoplay bloqueado por el navegador. Se requiere interacción previa.", err);
    });
  };

  return { playNewOrderSound };
};

export default useOrderSound;
