import React from "react";

// Normaliza status sin importar si llega como string o número
const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const OrderCard = ({ order, now, isConnected, onPreparing, onReady, onFinish }) => {

  const id = order.id || order._id || order.Id;
  // ✅ Siempre número — funciona con "Pending" o 0
  const status = toStatusNumber(order.status);

  const getElapsedTime = (createdAt) => {
    if (!createdAt) return "00:00";
    const start = new Date(createdAt);
    const diff = Math.floor((now - start) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getTimeColor = (createdAt) => {
    const minutes = Math.floor((now - new Date(createdAt)) / 60000);
    if (minutes < 5)  return "bg-[#39FF14] text-black";
    if (minutes < 10) return "bg-[#FFFF00] text-black";
    return "bg-[#FF0000] text-white animate-pulse shadow-[0_0_15px_rgba(255,0,0,0.5)]";
  };

  const groupItems = (items = []) => {
    const grouped = {};
    items.forEach((item) => {
      const key = `${item.productName}_${item.notes || ""}`;
      if (!grouped[key]) grouped[key] = { ...item, quantity: 0 };
      grouped[key].quantity += item.quantity;
    });
    return Object.values(grouped);
  };

  const handleAction = () => {
    if (!isConnected) return;
    if (!id) { alert("Error: No se encontró el ID de la orden"); return; }
    // ✅ Usa 'status' (ya normalizado), no 'order.status' (podría ser string)
    if (status === 0) onPreparing(id);
    else if (status === 1) onReady(id);
    else if (status === 2) onFinish(id);
  };

  return (
    <div className={`rounded-2xl bg-white shadow-2xl overflow-hidden border-4 
      ${order.isNew ? "animate-bounce border-[#00E5FF]" : "border-gray-200"}
      ${order.removing ? "animate-order-exit" : ""}`}
    >
      {/* HEADER TIEMPO */}
      <div className={`${getTimeColor(order.createdAt)} p-4 border-b-4 border-black/10`}>
        <div className="flex justify-between items-center font-black text-2xl tracking-tighter">
          <span>MESA {order.tableNumber}</span>
          <span className="bg-black/10 px-2 rounded-md">{getElapsedTime(order.createdAt)}</span>
        </div>
      </div>

      {/* ITEMS */}
      <div className="p-4 space-y-3">
        <div className="mb-3 text-center border-b-2 border-gray-100 pb-2">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Cliente</p>
          <p className="text-2xl font-black text-black uppercase">{order.customerName || "General"}</p>
        </div>

        {groupItems(order.items)?.map((item, i) => (
          <div key={i} className="border-b-2 border-gray-100 pb-3 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-[#0077FF] font-black text-4xl leading-none">{item.quantity}x</span>
              <span className="text-black font-black text-2xl uppercase leading-tight tracking-tight">
                {item.productName}
              </span>
            </div>
            {item.notes && (
              <div className="mt-2 bg-[#FFD700] p-2 rounded-md border-l-8 border-red-600">
                <p className="text-black font-black text-sm uppercase italic">⚠ {item.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* BOTÓN DE ACCIÓN */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          disabled={!isConnected || status > 2}
          onClick={handleAction}
          className={`w-full py-5 rounded-2xl font-black text-2xl shadow-[0_5px_0_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all ${
            status === 0 ? "bg-[#FFFF00] text-black hover:bg-[#E6E600]"
            : status === 1 ? "bg-[#39FF14] text-black hover:bg-[#32CD32]"
            : status === 2 ? "bg-[#0077FF] text-white hover:bg-[#0056b3] shadow-[0_0_20px_rgba(0,119,255,0.4)]"
            : "bg-gray-300 text-gray-500"
          }`}
        >
          {status === 0 ? "PREPARAR"
            : status === 1 ? "LISTO"
            : status === 2 ? "ENTREGAR"
            : "FINALIZADO"}
        </button>

        <p className="text-[10px] text-center mt-4 text-gray-400 font-black uppercase tracking-[0.2em]">
          MESERO: {order.waiterName || "NO ASIGNADO"}
        </p>
      </div>
    </div>
  );
};

export default OrderCard;
