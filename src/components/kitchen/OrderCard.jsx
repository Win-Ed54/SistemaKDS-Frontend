import React, { useState } from "react";

const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

// Detectar si el usuario logueado es admin
const isAdmin = () => localStorage.getItem("role") === "admin";

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
    if (min < 5)  return { color: "rgb(255, 255, 255)", bg: "#00ff2a", pulse: false, label: null       };
    if (min < 10) return { color: "rgb(255, 255, 255)", bg: "#fcfc03", pulse: false, label: null };
    if (min < 15) return { color: "rgb(255, 255, 255)", bg: "#ff8801", pulse: true,  label: null   };
    return               { color: "rgb(255, 255, 255)", bg: "#ff0404", pulse: true,  label: null  };
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
    else if (status === 2) onFinish(id);
  };

  const timer   = timerInfo(order.createdAt);
  const elapsed = getElapsed(order.createdAt);

  const btnConfig = {
    0: { label: "PREPARAR", color: "#FFFF00" },
    1: { label: "LISTO",    color: "#39FF14" },
    2: { label: "ENTREGAR", color: "#00FFFF" },
  };
  const btn = btnConfig[status];

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${order.isNew ? "animate-bounce" : ""} ${timer.pulse ? "animate-pulse" : ""}`}
      style={{
        backgroundColor: "#1e293b",
        borderColor: timer.color + "40",
        boxShadow: timer.pulse ? `0 0 20px ${timer.color}25` : "none",
      }}>

      {/* ── HEADER: TIMER GRANDE ── */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: timer.bg, borderBottom: `1px solid ${timer.color}25` }}>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[9px] font-black text-white uppercase tracking-widest">Mesa</span>
          <span className="font-black text-2xl text-white leading-none">{order.tableNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          {timer.label && (
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest }`}
              style={{ color: timer.color, border: `1px solid ${timer.color}50`, backgroundColor: timer.color + "15" }}>
              {timer.label}
            </span>
          )}
          {/* Timer grande y siempre visible */}
          <span className={`font-black text-3xl tabular-nums leading-none}`}
            style={{ color: timer.color, textShadow: "none" }}>
            {elapsed}
          </span>
        </div>
      </div>

      {/* ── CLIENTE ── */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-700/30">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Cliente</p>
        <p className="font-black text-base text-white uppercase leading-tight">
          {order.customerName || "General"}
        </p>
      </div>

      {/* ── ITEMS ── */}
      <div className="px-4 py-3 space-y-2">
        {groupItems(order.items)?.map((item, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-2xl leading-none" style={{ color: "#00FFFF" }}>
                {item.quantity}x
              </span>
              <span className="font-black text-base text-white uppercase leading-tight tracking-tight">
                {item.productName}
              </span>
            </div>
            {item.notes && (
              <div className="mt-1 px-3 py-1 rounded-lg border-l-4 text-[10px] font-black uppercase"
                style={{ backgroundColor: "#FFFF0012", borderLeftColor: "#FFFF00", color: "#FFFF00" }}>
                ⚠ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── BOTÓN ACCIÓN ── */}
      <div className="px-4 pt-2 pb-2">
        <button disabled={!isConnected || status > 2} onClick={handleAction}
          className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all active:scale-95 disabled:opacity-30"
          style={btn
            ? { backgroundColor: btn.color + "25", border: `2px solid ${btn.color}`, color: btn.color, boxShadow: `0 0 16px ${btn.color}20` }
            : { backgroundColor: "#334155", border: "2px solid #475569", color: "#64748b" }
          }>
          {btn?.label ?? "FINALIZADO"}
        </button>
      </div>

      {/* ── CANCELAR — SOLO ADMIN ── */}
      <div className="px-4 pb-4">
        {userIsAdmin && status <= 2 && (
          !confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)} disabled={!isConnected}
              className="w-full py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
                bg-transparent border border-red-500/20 text-red-500/50
                hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20">
              Cancelar orden
            </button>
          ) : (
            <div className="space-y-1">
              <p className="text-[9px] text-center text-red-400 font-black uppercase tracking-widest mb-2">
                ¿Confirmar cancelación?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase border border-slate-700 text-slate-400 hover:text-white transition-all">
                  No
                </button>
                <button onClick={() => { onCancel?.(id); setConfirmCancel(false); }}
                  className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase border border-red-500 text-red-400 bg-red-500/15 hover:bg-red-500/25 transition-all">
                  Sí, cancelar
                </button>
              </div>
            </div>
          )
        )}

        <p className="text-[9px] text-center mt-2 text-slate-600 font-black uppercase tracking-[0.2em]">
          {order.waiterName || "Sin asignar"}
        </p>
      </div>
    </div>
  );
};

export default OrderCard;
