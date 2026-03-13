import React from "react";

const STATUS = {
  0: "Pending",
  1: "Preparing",
  2: "Ready",
  3: "Delivered",
  4: "Cancelled"
};

const OrderCard = ({
  order,
  now,
  isConnected,
  onPreparing,
  onReady,
  onFinish // <--- Agregamos la prop para finalizar/entregar
}) => {

  const id = order.id ?? order._id;
  const status = STATUS[order.status] ?? order.status;

  const getElapsedTime = (createdAt) => {
    if (!createdAt) return "00:00";
    const start = new Date(createdAt);
    const diff = Math.floor((now - start) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  };

  const getTimeColor = (createdAt) => {
    const start = new Date(createdAt);
    const minutes = Math.floor((now - start) / 60000);
    if (minutes < 5) return "bg-green-600";
    if (minutes < 10) return "bg-yellow-500 text-black";
    return "bg-red-600 animate-pulse";
  };

  const groupItems = (items = []) => {
    const grouped = {};
    items.forEach((item) => {
      const key = `${item.productName}_${item.notes || ""}`;
      if (!grouped[key]) {
        grouped[key] = { ...item, quantity: 0 };
      }
      grouped[key].quantity += item.quantity;
    });
    return Object.values(grouped);
  };

  // =============================
  // ACCIÓN BOTÓN (ACTUALIZADO)
  // =============================
  const handleAction = () => {
    if (!isConnected) return;
    const orderId = order.id || order._id;

    if (order.status === 0) {
      onPreparing(orderId);
    } else if (order.status === 1) {
      onReady(orderId);
    } else if (order.status === 2) {
      onFinish(orderId); // <--- Llama a la función de finalizar
    }
  };

  return (
    <div
      className={`rounded-xl bg-gray-800 shadow-lg overflow-hidden
      ${order.isNew ? "animate-order-enter border-2 border-yellow-400" : ""}
      ${order.removing ? "animate-order-exit" : ""}`}
    >
      {/* HEADER TIEMPO */}
      <div className={`${getTimeColor(order.createdAt)} p-3`}>
        <div className="flex justify-between font-bold">
          <span>Mesa {order.tableNumber}</span>
          <span>{getElapsedTime(order.createdAt)}</span>
        </div>
      </div>

      {/* ITEMS */}
      <div className="p-4 space-y-2">
        {/* --- NOMBRE DEL CLIENTE (NUEVO) --- */}
        <div className="mb-3 text-center border-b border-gray-700 pb-2">
        </div>

        {groupItems(order.items)?.map((item, i) => (
          <div key={i} className="border-b border-gray-700 pb-1">
            <b>{item.quantity}x</b> {item.productName}
            {item.notes && (
              <p className="text-yellow-400 text-xs italic">⚠ {item.notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* BOTÓN ACCIÓN (ACTUALIZADO) */}
      <div className="p-3">
        <button
          // Ahora habilitado hasta el status 2
          disabled={!isConnected || order.status > 2}
          onClick={handleAction}
          className={`w-full py-3 rounded-lg font-bold transition ${
            order.status === 0
              ? "bg-yellow-600 hover:bg-yellow-700"
              : order.status === 1
              ? "bg-green-600 hover:bg-green-700"
              : order.status === 2
              ? "bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              : "bg-gray-700 text-gray-500"
          }`}
        >
          {order.status === 0
            ? "Preparar"
            : order.status === 1
            ? "Listo"
            : order.status === 2
            ? "Entregar Pedido" // <-- Texto nuevo
            : "Finalizado"}
        </button>

        <p className="text-[10px] text-center mt-2 opacity-50 uppercase tracking-widest">
          Mesero: {order.waiterName || "No asignado"}
        </p>
      </div>
    </div>
  );
};

export default OrderCard;
