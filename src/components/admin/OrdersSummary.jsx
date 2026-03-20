import React from "react";
import { cancelOrder } from "../../services/api.service";
import { Clock, CheckCircle2, Flame, AlertTriangle } from "lucide-react";

// Misma función que usas en cocina — convierte "Pending" o 0 → número
const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const getStatusInfo = (status) => {
  switch (status) {
    case 0: return { label: "Pendiente", color: "text-yellow-400",  border: "border-yellow-400/20", icon: <Clock       className="w-3.5 h-3.5" /> };
    case 1: return { label: "Cocinando", color: "text-cyan-400",    border: "border-cyan-400/20",   icon: <Flame       className="w-3.5 h-3.5" /> };
    case 2: return { label: "Listo",     color: "text-emerald-400", border: "border-emerald-400/20",icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    default: return { label: "Activo",   color: "text-slate-500",   border: "border-slate-700",     icon: <Clock       className="w-3.5 h-3.5" /> };
  }
};

// Tiempo transcurrido desde que se creó la orden
const getElapsed = (createdAt) => {
  if (!createdAt) return null;
  const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const isUrgent = (createdAt) => {
  if (!createdAt) return false;
  return Math.floor((Date.now() - new Date(createdAt)) / 60000) >= 15;
};

const OrdersSummary = ({ orders }) => {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 h-full shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-yellow-400 rounded-full shadow-[0_0_10px_#FFFF00]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Resumen de Órdenes
          </h2>
        </div>
        {orders.length > 0 && (
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
            {orders.length} activas
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {orders.length === 0 ? (
          <p className="text-slate-600 text-xs font-bold text-center py-10 uppercase tracking-widest">
            No hay órdenes activas
          </p>
        ) : (
          orders.map((order) => {
            // ✅ Normalizar status antes de usarlo
            const statusNum = toStatusNumber(order.status);
            const { label, color, border, icon } = getStatusInfo(statusNum);
            const elapsed = getElapsed(order.createdAt);
            const urgent  = isUrgent(order.createdAt);

            return (
              <div
                key={order.id}
                className={`bg-slate-950 border p-4 rounded-2xl transition-all ${
                  urgent
                    ? "border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                    : "border-slate-800 hover:border-slate-600"
                }`}
              >
                <div className="flex justify-between items-start">
                  {/* Info de la orden */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-white leading-none">
                        Mesa {order.tableNumber}
                      </h4>
                      {urgent && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      {order.customerName || "Sin nombre"} · {order.waiterName || "Mesero"}
                    </p>
                  </div>

                  {/* Estado + timer */}
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase ${color} bg-slate-900 px-3 py-1.5 rounded-xl border ${border}`}>
                      {icon} {label}
                    </div>
                    {elapsed && (
                      <span className={`text-[10px] font-black tabular-nums ${
                        urgent ? "text-red-400 animate-pulse" : "text-slate-600"
                      }`}>
                        {elapsed}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items resumidos */}
                {order.items?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default OrdersSummary;
