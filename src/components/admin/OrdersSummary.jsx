import React, { useState } from "react";
import { cancelOrder } from "../../services/api.service";
import { Clock, CheckCircle2, Flame, AlertTriangle, Trash2, XCircle, Timer } from "lucide-react";
import { useToast } from "../../context/ToastContext";

// ✅ 1. Normalización de estados (Evita el ReferenceError)
const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

// ✅ 2. Configuración Visual de Estados
const getStatusInfo = (status) => {
  const config = {
    0: { label: "Pendiente", color: "text-yellow-500", border: "border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
    1: { label: "Cocinando", color: "text-cyan-400", border: "border-cyan-400/30", icon: <Flame className="w-3 h-3" /> },
    2: { label: "Listo", color: "text-[#39FF14]", border: "border-[#39FF14]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  return config[status] || { label: "Finalizado", color: "text-slate-500", border: "border-slate-800", icon: <CheckCircle2 className="w-3 h-3" /> };
};

// ✅ 3. Lógica de Tiempos (Cronómetro)
const getElapsed = (createdAt) => {
  if (!createdAt) return "00:00";
  const diff = Math.floor((new Date() - new Date(createdAt)) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ✅ 4. Detector de Urgencia (>10 min)
const isUrgent = (createdAt) => {
  if (!createdAt) return false;
  const min = Math.floor((new Date() - new Date(createdAt)) / 60000);
  return min >= 10;
};

const OrdersSummary = ({ orders, onOrderCancelled }) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(null);

  const handleCancel = async (orderId) => {
    if (!window.confirm("⚠️ ¿Estás seguro de CANCELAR esta orden? El stock se devolverá automáticamente.")) return;
    
    setIsDeleting(orderId);
    try {
      await cancelOrder(orderId);
      showToast("✅ Orden cancelada y stock restaurado", "success");
      if (onOrderCancelled) onOrderCancelled();
    } catch (error) {
      showToast("❌ Error al cancelar la orden", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 h-full shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-yellow-400 rounded-full shadow-[0_0_15px_#FFFF00]"></span>
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Monitor de Órdenes
          </h2>
        </div>
        {orders.length > 0 && (
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                {orders.length} ACTIVAS
             </span>
          </div>
        )}
      </div>

      <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
             <XCircle className="w-12 h-12 mb-2 text-slate-500" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sin actividad</p>
          </div>
        ) : (
          orders.map((order) => {
            const statusNum = toStatusNumber(order.status);
            const { label, color, border, icon } = getStatusInfo(statusNum);
            const elapsed = getElapsed(order.createdAt);
            const urgent  = isUrgent(order.createdAt);

            return (
              <div
                key={order.id}
                className={`relative group bg-slate-950 border p-5 rounded-[2rem] transition-all duration-300 ${
                  urgent
                    ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)] bg-red-500/[0.02]"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                        Mesa {order.tableNumber}
                      </h4>
                      {urgent && <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />}
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1.5">
                      {order.waiterName || "Mesero"} <span className="mx-1 opacity-30">·</span> {order.customerName || "General"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 font-black text-[9px] uppercase px-3 py-1.5 rounded-xl border ${color} ${border} bg-slate-900/50`}>
                      {icon} {label}
                    </div>
                    <span className={`text-[10px] font-black tabular-nums tracking-widest ${urgent ? "text-red-500 animate-pulse" : "text-slate-500"}`}>
                       ⏱ {elapsed}
                    </span>
                  </div>
                </div>

                <div className="py-3 border-y border-slate-900/50 flex flex-wrap gap-2">
                  {order.items?.map((item, idx) => (
                    <span key={idx} className="text-[9px] font-black text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 uppercase tracking-tighter">
                       {item.quantity}x {item.productName}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                   <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isDeleting === order.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isDeleting === order.id ? (
                       <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                     ) : (
                       <Trash2 className="w-3.5 h-3.5" />
                     )}
                     Cancelar Orden
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
