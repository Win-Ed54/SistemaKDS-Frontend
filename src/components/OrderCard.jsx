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
  onReady
}) => {

  const id = order.id ?? order._id;
  const status = STATUS[order.status] ?? order.status;

  const getElapsedTime = (createdAt) => {

    if (!createdAt) return "00:00";

    const start = new Date(createdAt);
    const diff = Math.floor((now - start) / 1000);

    const m = Math.floor(diff / 60);
    const s = diff % 60;

    return `${m.toString().padStart(2,"0")}:${s
      .toString()
      .padStart(2,"0")}`;
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
        grouped[key] = {
          ...item,
          quantity: 0,
        };
      }

      grouped[key].quantity += item.quantity;
    });

    return Object.values(grouped);
  };

  return (

    <div
      className={`rounded-xl bg-gray-800 shadow-lg overflow-hidden
      ${order.isNew ? "animate-order-enter border-2 border-yellow-400" : ""}
      ${order.removing ? "animate-order-exit" : ""}`}
    >

      <div className={`${getTimeColor(order.createdAt)} p-3`}>

        <div className="flex justify-between font-bold">
          <span>Mesa {order.tableNumber}</span>
          <span>{getElapsedTime(order.createdAt)}</span>
        </div>

      </div>

      <div className="p-4 space-y-2">

        {groupItems(order.items)?.map((item, i) => (

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
              onPreparing(id);
            }

            if (status === "Preparing") {
              onReady(id);
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

};

export default OrderCard;
