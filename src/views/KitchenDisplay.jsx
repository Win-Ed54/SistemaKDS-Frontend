import React, { useEffect, useState, useRef } from "react";
import connection, {
  startConnection,
  subscribeConnectionStatus
} from "../services/signalrService.js";

import {
  getActiveOrders,
  markOrderPreparing,
  markOrderReady
} from "../services/api.service.js";

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
  // TIEMPO
  // =============================
  const getElapsedTime = (createdAt) => {

    if (!createdAt) return "00:00";

    const start = new Date(createdAt);

    if (isNaN(start)) return "00:00";

    const diff = Math.floor((now - start) / 1000);

    const m = Math.floor(diff / 60);
    const s = diff % 60;

    return `${m.toString().padStart(2,"0")}:${s
      .toString()
      .padStart(2,"0")}`;
  };

  // =============================
  // COLOR SEGÚN TIEMPO
  // =============================
  const getTimeColor = (createdAt) => {

    if (!createdAt) return "bg-gray-700";

    const start = new Date(createdAt);

    const minutes = Math.floor((now - start) / 60000);

    if (minutes < 5) return "bg-green-600";
    if (minutes < 10) return "bg-yellow-500 text-black";

    return "bg-red-600 animate-pulse";
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

    const init = async () => {

      await startConnection(["cocina"]);

      const unsubscribe = subscribeConnectionStatus(setIsConnected);

      await loadOrders();

      return unsubscribe;
    };

    init();

    // evitar duplicados
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

    return () => {

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {orders.length === 0 && (
          <div className="col-span-full text-center opacity-40">
            Esperando pedidos...
          </div>
        )}

        {orders.map(order => {

          const id = order.id ?? order._id;
          const status = STATUS[order.status] ?? order.status;

          return (

            <div
              key={id}
              className={`rounded-xl bg-gray-800 shadow-lg overflow-hidden ${
                order.isNew ? "border-2 border-yellow-400 animate-pulse" : ""
              }`}
            >

              <div className={`${getTimeColor(order.createdAt)} p-3`}>

                <div className="flex justify-between font-bold">

                  <span>Mesa {order.tableNumber}</span>

                  <span>
                    {getElapsedTime(order.createdAt)}
                  </span>

                </div>

              </div>

              <div className="p-4 space-y-2">

                {order.items?.map((item, i) => (

                  <div key={i} className="border-b border-gray-700 pb-1">

                    <b>{item.quantity}x</b> {item.productName}

                    {item.notes && (
                      <p className="text-yellow-400 text-xs">
                        ⚠ {item.notes}
                      </p>
                    )}

                  </div>

                ))}

              </div>

              <div className="p-3">

                <button
                  disabled={!isConnected}
                  onClick={() => {

                    if (status === "Pending") {
                      handlePreparing(id);
                    }

                    if (status === "Preparing") {
                      handleReady(id);
                    }

                  }}
                  className={`w-full py-3 rounded-lg font-bold ${
                    status === "Pending"
                      ? "bg-yellow-600"
                      : status === "Preparing"
                      ? "bg-green-600"
                      : "bg-gray-600"
                  }`}
                >

                  {status === "Pending"
                    ? "Preparar"
                    : status === "Preparing"
                    ? "Listo"
                    : "Finalizado"}

                </button>

                <p className="text-xs text-center mt-2 opacity-70">
                  Mesero: {order.waiterName}
                </p>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

};

export default KitchenDisplay;

