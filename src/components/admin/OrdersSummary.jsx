import React from "react";
import { Clock, CheckCircle2, Flame } from "lucide-react";

const OrdersSummary = ({ orders }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 0: return { label: "Pendiente", color: "text-yellow-400", icon: <Clock className="w-4 h-4" /> };
      case 1: return { label: "Cocinando", color: "text-cyan-400", icon: <Flame className="w-4 h-4" /> };
      case 2: return { label: "Listo", color: "text-emerald-400", icon: <CheckCircle2 className="w-4 h-4" /> };
      default: return { label: "Desconocido", color: "text-slate-500", icon: <Clock className="w-4 h-4" /> };
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 h-full shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1.5 h-6 bg-yellow-400 rounded-full shadow-[0_0_10px_#FFFF00]"></span>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Resumen de Órdenes</h2>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {orders.length === 0 ? (
          <p className="text-slate-600 text-xs font-bold text-center py-10 uppercase tracking-widest">No hay órdenes activas</p>
        ) : (
          orders.map((order) => {
            const { label, color, icon } = getStatusInfo(order.status);
            return (
              <div key={order.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center group hover:border-slate-600 transition-all">
                <div>
                  <h4 className="text-lg font-black text-white leading-none mb-1">Mesa {order.tableNumber}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase italic">{order.customerName || "Sin nombre"}</p>
                </div>
                <div className={`flex items-center gap-2 font-black text-[10px] uppercase ${color} bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800`}>
                  {icon} {label}
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
