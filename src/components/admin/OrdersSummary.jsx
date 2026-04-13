import React, { useState, useEffect } from "react";
import { cancelOrder } from "../../services/api.service";
import { Clock, CheckCircle2, Flame, AlertTriangle, Trash2, XCircle } from "lucide-react";
import { useToast } from "../../context/ToastContext";

// ============================
// NORMALIZACIÓN DE ESTADO
// ============================
const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const getOrderLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

// ============================
// UI STATUS
// ============================
const getStatusInfo = (status) => {
  const config = {
    0: { label: "Pendiente", color: "text-yellow-500", border: "border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
    1: { label: "Cocinando", color: "text-cyan-400", border: "border-cyan-400/30", icon: <Flame className="w-3 h-3" /> },
    2: { label: "Listo", color: "text-[#39FF14]", border: "border-[#39FF14]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  return config[status] || { label: "Finalizado", color: "text-slate-500", border: "border-slate-800", icon: <CheckCircle2 className="w-3 h-3" /> };
};

// ============================
// COMPONENT
// ============================
const OrdersSummary = ({ orders, onOrderCancelled }) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(null);
  const [, forceUpdate] = useState(0); 

  //TIMER GLOBAL (actualiza cada segundo)
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((v) => v + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ============================
  // HELPERS TIEMPO
  // ============================
  const getElapsed = (createdAt) => {
    if (!createdAt) return "00:00";
    const diff = Math.floor((new Date() - new Date(createdAt)) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isUrgent = (createdAt) => {
    if (!createdAt) return false;
    const min = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return min >= 10;
  };

  // ============================
  // CANCELAR
  // ============================
  const handleCancel = async (orderId) => {
    if (!window.confirm("⚠️ ¿Cancelar orden? Se restaurará el stock.")) return;

    setIsDeleting(orderId);
    try {
      await cancelOrder(orderId);
      showToast("✅ Orden cancelada", "success");
      onOrderCancelled?.();
    } catch {
      showToast("❌ Error al cancelar", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  // ANTI-DUPLICADOS UI
  const uniqueOrders = Object.values(
    orders.reduce((acc, o) => {
      acc[o.id] = o;
      return acc;
    }, {})
  );

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 h-full shadow-2xl backdrop-blur-md">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
          Monitor de Órdenes
        </h2>

        {uniqueOrders.length > 0 && (
          <span className="text-[10px] font-black px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
            {uniqueOrders.length} ACTIVAS
          </span>
        )}
      </div>

      {/* LISTA */}
      <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
        {uniqueOrders.length === 0 ? (
          <div className="flex flex-col items-center py-20 opacity-20">
            <XCircle className="w-12 h-12 mb-2 text-slate-500" />
            <p className="text-[10px] font-black uppercase">Sin actividad</p>
          </div>
        ) : (
          uniqueOrders.map((order) => {
            const statusNum = toStatusNumber(order.status);
            const { label, color, border, icon } = getStatusInfo(statusNum);
            const elapsed = getElapsed(order.createdAt);
            const urgent = isUrgent(order.createdAt);

            return (
              <div
                key={order.id}
                className={`relative group bg-slate-950 border p-5 rounded-[2rem] transition-all ${
                  urgent
                    ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                    : "border-slate-800"
                }`}
              >
                {/* HEADER */}
                <div className="flex justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-black text-white uppercase">
                      {getOrderLocationLabel(order)}
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {order.waiterName} · {order.customerName}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center gap-2 text-[9px] px-3 py-1 rounded-xl border ${color} ${border}`}>
                      {icon} {label}
                    </div>
                    <span className={`text-[10px] font-black ${urgent ? "text-red-500" : "text-slate-500"}`}>
                      ⏱ {elapsed}
                    </span>
                  </div>
                </div>

                {/* ITEMS */}
                <div className="flex flex-wrap gap-2">
                  {order.items?.map((item) => (
                    <span
                      key={`${order.id}-${item.productId}`} 
                      className="text-[9px] bg-slate-900 px-2 py-1 rounded-lg border border-slate-800"
                    >
                      {item.quantity}x {item.productName}
                    </span>
                  ))}
                </div>

                {/* ACTION */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isDeleting === order.id}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-500/20 rounded-xl text-[9px]"
                  >
                    {isDeleting === order.id ? (
                      <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Cancelar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default OrdersSummary;
