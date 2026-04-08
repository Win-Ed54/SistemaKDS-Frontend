import { useEffect, useRef } from "react";
import useOrderStore from "../store/orderStore";

const useOrderSound = () => {
  const orders = useOrderStore((state) => state.orders);
  const prevCountRef = useRef(0);

  function playNewOrderSound() {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.volume = 0.5;
    audio.play().catch((err) => {
      console.warn(
        "Autoplay bloqueado por el navegador. Se requiere interaccion previa.",
        err
      );
    });
  }

  useEffect(() => {
    const pendingOrders = orders.filter((order) => order.status === 0);
    const currentCount = pendingOrders.length;

    if (currentCount > prevCountRef.current) {
      playNewOrderSound();
    }

    prevCountRef.current = currentCount;
  }, [orders]);

  return { playNewOrderSound };
};

export default useOrderSound;
