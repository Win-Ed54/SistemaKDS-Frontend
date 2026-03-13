import React, { useEffect } from "react";
import useOrderSound from "../hooks/useOrderSound";
import useKitchenOrders from "../hooks/useKitchenOrders";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useKitchenClock from "../hooks/useKitchenClock";

import OrderCard from "../components/OrderCard";

import {
  markOrderPreparing,
  markOrderReady,
  finishOrder,
} from "../services/api.service";

const KitchenDisplay = () => {
  const { orders } = useKitchenOrders();
  const { isConnected } = useSignalRConnection("kitchen");
  const { now } = useKitchenClock();
  useOrderSound();

  const getOrderId = (order) => order.id || order._id;

  // =============================
  // FILTRAR POR STATUS
  // =============================

  const pending = orders
    ?.filter((o) => o.status === 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const preparing = orders
    ?.filter((o) => o.status === 1)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const ready = orders
    ?.filter((o) => o.status === 2)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // =============================
  // LOGOUT
  // =============================

  const logout = () => {
    localStorage.removeItem("token");

    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pantalla de Cocina</h1>

        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}
            ></div>
            <span
              className={`font-semibold ${isConnected ? "text-green-400" : "text-red-400"}`}
            >
              {isConnected ? "Conectado" : "Sin conexión"}
            </span>
          </div>

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* COLUMNAS */}

      <div className="grid grid-cols-3 gap-6">
        {/* PENDING */}

        <Column
          title="Pending"
          orders={pending}
          now={now}
          isConnected={isConnected}
          getOrderId={getOrderId}
        />

        {/* PREPARING */}

        <Column
          title="Preparing"
          orders={preparing}
          now={now}
          isConnected={isConnected}
          getOrderId={getOrderId}
        />

        {/* READY */}

        <Column
          title="Ready"
          orders={ready}
          now={now}
          isConnected={isConnected}
          getOrderId={getOrderId}
        />
      </div>
    </div>
  );
};

const Column = ({ title, orders, now, isConnected, getOrderId }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">{title}</h2>

      <div className="space-y-4">
        {orders?.length === 0 && (
          <div className="text-gray-400 text-center p-6">Sin órdenes</div>
        )}

        {orders?.map((order) => (
          <OrderCard
            key={getOrderId(order)}
            order={order}
            now={now}
            isConnected={isConnected}
            onPreparing={markOrderPreparing}
            onReady={markOrderReady}
            onFinish={finishOrder}
          />
        ))}
      </div>
    </div>
  );
};

export default KitchenDisplay;
