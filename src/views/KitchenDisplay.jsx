import React, { useEffect, useState, useRef } from "react";

import connection, {
  startConnection,
  subscribeConnectionStatus
} from "../services/signalrService";

import {
  getActiveOrders,
  markOrderPreparing,
  markOrderReady
} from "../services/api.service";

import OrderCard from "../components/OrderCard";

const STATUS = {
  0: "Pending",
  1: "Preparing",
  2: "Ready",
  3: "Delivered",
  4: "Cancelled"
};

const KitchenDisplay = () => {

  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [now, setNow] = useState(new Date());

  // =============================
// ORDEN FIFO (PRIORIDAD COCINA)
// =============================

const sortOrders = (ordersList) => {

  return [...ordersList].sort((a, b) => {

    const nowTime = new Date().getTime();

    const aAge = nowTime - new Date(a.createdAt).getTime();
    const bAge = nowTime - new Date(b.createdAt).getTime();

    return bAge - aAge; 

    });

};

  const audioRef = useRef(null);

  // =============================
  // SONIDO
  // =============================

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
  }, []);

  const playSound = () => {

    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

  };

  // =============================
  // CARGAR ÓRDENES
  // =============================

  const loadOrders = async () => {

    try {

      const data = await getActiveOrders();

      const filtered = data.filter(o => {

        const status = STATUS[o.status] ?? o.status;
        return status !== "Ready";

      });

      setOrders(filtered);

    } catch (err) {

      console.error("Error cargando órdenes:", err);

    }

  };

  // =============================
  // SIGNALR
  // =============================

  useEffect(() => {

   const unsubscribe = subscribeConnectionStatus(setIsConnected);

  connection.off("ReceiveOrder");
  connection.off("OrderPreparing");
  connection.off("OrderReady");

  // =============================
  // NUEVA ORDEN
  // =============================

  connection.on("ReceiveOrder", (order) => {

    const id = order.id ?? order._id;

    setOrders(prev => {

      const exists = prev.some(o => (o.id ?? o._id) === id);

      if (exists) return prev;

      playSound();

      return [{ ...order, isNew: true }, ...prev];

    });

    setTimeout(() => {

      setOrders(prev =>
        prev.map(o =>
          (o.id ?? o._id) === id
            ? { ...o, isNew: false }
            : o
        )
      );

    }, 2000);

  });

  // =============================
  // PREPARING
  // =============================

  connection.on("OrderPreparing", (order) => {

    const id = order.id ?? order._id;

    setOrders(prev =>
      prev.map(o =>
        (o.id ?? o._id) === id
          ? { ...o, status: 1 }
          : o
      )
    );

  });

  // =============================
  // READY
  // =============================

  connection.on("OrderReady", (order) => {

    const id = order.id ?? order._id;

    setTimeout(() => {

      setOrders(prev =>
        prev.filter(o => (o.id ?? o._id) !== id)
      );

    }, 300);

  });

  const init = async () => {

    await startConnection(["cocina"]);

    await loadOrders();

  };

  init();

  return () => {

    unsubscribe();

    connection.off("ReceiveOrder");
    connection.off("OrderPreparing");
    connection.off("OrderReady");

  };

}, []);
   

  // =============================
  // RELOJ GLOBAL
  // =============================

  useEffect(() => {

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);

  }, []);

  // =============================
  // ACCIONES
  // =============================

  const handlePreparing = async (orderId) => {

    try {

      await markOrderPreparing(orderId);

      setOrders(prev =>
        prev.map(o =>
          (o.id ?? o._id) === orderId
            ? { ...o, status: 1 }
            : o
        )
      );

    } catch (err) {

      console.error(err);

    }

  };

  const handleReady = async (orderId) => {

    try {

      await markOrderReady(orderId);

      setOrders(prev =>
        prev.filter(o => (o.id ?? o._id) !== orderId)
      );

    } catch (err) {

      console.error(err);

    }

  };

  // =============================
  // UI
  // =============================

  return (

    <div className="p-6 bg-gray-900 min-h-screen text-white">

      <header className="flex justify-between mb-6">

        <h1 className="text-3xl font-bold">
          Panel de Cocina (KDS)
        </h1>

        <div
          className={`px-4 py-1 rounded-full border ${
            isConnected
              ? "border-green-500 text-green-500"
              : "border-red-500 text-red-500 animate-pulse"
          }`}
        >
          {isConnected ? "ONLINE" : "OFFLINE"}
        </div>

      </header>

      <div className="auto-grid gap-6">

        {orders.length === 0 && (
          <div className="col-span-full text-center opacity-40">
            Esperando pedidos...
          </div>
        )}

        {sortOrders(orders).map(order => (

          <OrderCard
            key={order.id ?? order._id}
            order={order}
            now={now}
            isConnected={isConnected}
            onPreparing={handlePreparing}
            onReady={handleReady}
          />

        ))}

      </div>

    </div>

  );

};

export default KitchenDisplay;
