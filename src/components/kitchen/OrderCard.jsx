import React, { useState } from "react";
import { getAuthValue } from "../../services/authStorage";

const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const isAdmin = () => String(getAuthValue("role") || "").trim().toLowerCase() === "admin";

const getTakeoutDestination = (order) =>
  String(order?.takeoutDestination || order?.TakeoutDestination || "").trim();

const OrderCard = ({ order, now, isConnected, onPreparing, onReady, onFinish, onCancel }) => {
  const id     = order.id || order._id || order.Id;
  const status = toStatusNumber(order.status);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const userIsAdmin = isAdmin();

  const getElapsed = (createdAt) => {
    if (!createdAt) return "00:00";
    const diff = Math.floor((now - new Date(createdAt)) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const timerInfo = (createdAt) => {
    const min = Math.floor((now - new Date(createdAt)) / 60000);
    if (min < 5)  return { color: "rgb(255, 255, 255)", bg: "#0ad12b", pulse: false, label: null };
    if (min < 10) return { color: "rgb(255, 255, 255)", bg: "#d4bc2b", pulse: false, label: null };
    if (min < 15) return { color: "rgb(255, 255, 255)", bg: "#ff8801", pulse: true,  label: "RETRASO" };
    return               { color: "rgb(255, 255, 255)", bg: "#ff0404", pulse: true,  label: "CRÍTICO" };
  };

  const groupItems = (items = []) => {
    const g = {};
    items.forEach((item) => {
      const key = `${item.productName}_${item.notes || ""}`;
      if (!g[key]) g[key] = { ...item, quantity: 0 };
      g[key].quantity += item.quantity;
    });
    return Object.values(g);
  };

  const handleAction = () => {
    if (!isConnected || !id) return;
    if (status === 0) onPreparing(id);
    else if (status === 1) onReady(id);
    else if (status === 2 && onFinish) onFinish(id);
  };

  const timer   = timerInfo(order.createdAt);
  const elapsed = getElapsed(order.createdAt);
  const isTakeout = Number(order.tableNumber) === 0;
  const takeoutDestination = getTakeoutDestination(order);

  const btnConfig = {
    0: { label: "PREPARAR", color: "#FFFF00" },
    1: { label: "LISTO",    color: "#39FF14" },
    2: onFinish ? { label: "ENTREGAR", color: "#00FFFF" } : { label: "MESERO ENTREGA", color: "#64748b" },
  };
  const btn = btnConfig[status];
  const showPrimaryAction = status < 2 || (status === 2 && Boolean(onFinish));

  return (
    <div className={`rounded-[2rem] overflow-hidden border transition-all shrink-0 shadow-2xl
       ${order.isNew ? "animate-bounce" : ""} ${timer.pulse ? "animate-pulse shadow-red-500/20" : ""}`}
      style={{
        backgroundColor: "#0f172a",
        borderColor: timer.color + "20",
      }}>

      {/* ── HEADER: MESA + TICKET + TIMER ── */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: timer.bg }}>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none">
              {isTakeout ? "Destino" : "Mesa"}
            </span>
            <span className="font-black text-3xl text-white leading-none">
              {isTakeout ? "Para llevar" : order.tableNumber}
            </span>
          </div>
          {/* NUEVO: Identificador de Orden (Ticket) */}
          <span className="text-[11px] font-black text-white bg-black/20 px-2 py-0.5 rounded-md mt-1.5 w-fit border border-white/10 uppercase tracking-tighter">
            Orden #{id?.toString().slice(-4).toUpperCase() || "---"}
          </span>
        </div>

        <div className="text-right">
          {timer.label && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white block mb-1">
              {timer.label}
            </span>
          )}
          <span className="font-black text-4xl tabular-nums leading-none text-white">
            {elapsed}
          </span>
        </div>
      </div>

      {/* ── CLIENTE ── */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-800/50 bg-slate-900/30">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
        <p className="font-black text-lg text-white uppercase leading-tight">
          {order.customerName || "General"}
        </p>
        {isTakeout && takeoutDestination && (
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
            Va para: {takeoutDestination}
          </p>
        )}
      </div>

      {/* ── ITEMS AGRUPADOS ── */}
      <div className="px-5 py-4 space-y-3 min-h-[140px]">
        {groupItems(order.items)?.map((item, i) => (
          <div key={i} className="group">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="font-black text-2xl leading-none text-[#00FFFF]">
                {item.quantity}x
              </span>
              <span className="min-w-0 break-words font-black text-base text-slate-100 uppercase tracking-tight leading-tight">
                {item.productName}
              </span>
            </div>
            {item.notes && (
              <div className="mt-2 max-w-full break-words whitespace-pre-wrap px-3 py-2 rounded-lg border-l-4 text-[11px] font-black uppercase tracking-normal italic leading-snug"
                style={{ backgroundColor: "#FFFF0008", borderLeftColor: "#FFFF00", color: "#FFFF00" }}>
                ! {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ACCIONES ── */}
      <div className="px-5 pb-5 space-y-3">
        {showPrimaryAction && (
          <button disabled={!isConnected || status > 2 || (status === 2 && !onFinish)} onClick={handleAction}
            className="w-full py-5 rounded-2xl font-black text-lg uppercase tracking-[0.15em] transition-all active:scale-95 disabled:opacity-20 shadow-lg"
            style={btn
              ? { backgroundColor: btn.color + "15", border: `2px solid ${btn.color}`, color: btn.color }
              : { backgroundColor: "#1e293b", border: "2px solid #334155", color: "#475569" }
            }>
            {btn?.label ?? "FINALIZADO"}
          </button>
        )}

        {/* ── PANEL ADMIN / MESERO ── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Mesero</span>
              <span className="text-[11px] font-black text-slate-400 uppercase italic">
                {order.waiterName || "---"}
              </span>
           </div>

           {userIsAdmin && status <= 2 && (
             !confirmCancel ? (
               <button onClick={() => setConfirmCancel(true)} 
                 className="text-[9px] font-black uppercase text-red-500/40 hover:text-red-500 transition-colors">
                 Cancelar
               </button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setConfirmCancel(false)} className="text-[9px] font-black text-slate-500 uppercase">No</button>
                 <button onClick={() => { onCancel?.(id); setConfirmCancel(false); }} className="text-[9px] font-black text-red-500 uppercase underline">Sí</button>
               </div>
             )
           )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
