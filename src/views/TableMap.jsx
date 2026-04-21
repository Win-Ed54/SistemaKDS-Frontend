import React, { useEffect, useState } from "react";

const TableMap = ({ hubConnection }) => {
  const [tables, setTables] = useState([
    { id: 1, number: "101", status: "available", currentOrder: null },
    { id: 2, number: "102", status: "available", currentOrder: null },
    { id: 3, number: "103", status: "available", currentOrder: null },
  ]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!hubConnection) return;

    const handleOrderReadyForPickup = (data) => {
      setTables((prev) =>
        prev.map((table) =>
          table.number === data.tableNumber.toString()
            ? { ...table, status: "ready", orderId: data.orderId }
            : table,
        ),
      );
    };

    const handleUpdateOrderStatus = (data) => {
      if (data.status === "Preparing") {
        setTables((prev) =>
          prev.map((table) =>
            table.orderId === data.orderId ? { ...table, status: "busy" } : table,
          ),
        );
      }
    };

    hubConnection.on("OrderReadyForPickup", handleOrderReadyForPickup);
    hubConnection.on("UpdateOrderStatus", handleUpdateOrderStatus);

    return () => {
      hubConnection.off("OrderReadyForPickup", handleOrderReadyForPickup);
      hubConnection.off("UpdateOrderStatus", handleUpdateOrderStatus);
    };
  }, [hubConnection]);

  const handleTableClick = (table) => {
    if (table.status === "ready") {
      setStatusMessage(`Entregando orden ${table.orderId} en mesa ${table.number}`);
    } else if (table.status === "available") {
      setStatusMessage(`Abriendo toma de pedido para mesa ${table.number}`);
    }
  };

  return (
    <div className="rounded-xl bg-gray-900 p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Mapa de salon</h2>
      {statusMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {statusMessage}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-6">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => handleTableClick(table)}
            className={`flex h-32 flex-col items-center justify-center rounded-2xl shadow-xl transition-all active:scale-95 ${
              table.status === "available" ? "bg-slate-700 text-slate-300" : ""
            } ${table.status === "busy" ? "animate-pulse bg-yellow-500 text-black" : ""} ${
              table.status === "ready"
                ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                : ""
            }`}
          >
            <span className="text-sm font-medium uppercase">Mesa</span>
            <span className="text-4xl font-black">{table.number}</span>
            {table.status === "ready" ? (
              <span className="mt-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-green-700">
                Lista
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableMap;
