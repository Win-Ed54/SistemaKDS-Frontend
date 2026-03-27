import React from "react";
import useOrderSound from "../hooks/useOrderSound";
import useKitchenOrders from "../hooks/useKitchenOrders";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useKitchenClock from "../hooks/useKitchenClock";
import OrderCard from "../components/kitchen/OrderCard";
import { markOrderPreparing, markOrderReady, finishOrder, cancelOrder } from "../services/api.service";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const COLUMNS = [
  { key: "pending",   title: "Pendiente",  status: 0, accent: "#FFFF00" },
  { key: "preparing", title: "Preparando", status: 1, accent: "#00FFFF" },
  { key: "ready",     title: "Listo",      status: 2, accent: "#39FF14" },
];

const HEADER_H = 73;   // altura del header principal en px
const COL_H    = 48;   // altura del header de cada columna en px

const KitchenDisplay = () => {
  const { orders }      = useKitchenOrders();
  const { isConnected } = useSignalRConnection("kitchen");
  const { now }         = useKitchenClock();
  const navigate        = useNavigate();
  useOrderSound();

  const getOrderId = (o) => o.id || o._id;

  const normalized = (orders ?? []).map((o) => ({
    ...o,
    status: toStatusNumber(o.status),
  }));

  const byTime  = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const grouped = {
    0: normalized.filter((o) => o.status === 0).sort(byTime),
    1: normalized.filter((o) => o.status === 1).sort(byTime),
    2: normalized.filter((o) => o.status === 2).sort(byTime),
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div
      className="bg-slate-950 text-white selection:bg-cyan-500/30"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* ── HEADER PRINCIPAL ── */}
        <header
        className="bg-slate-900 border-b border-slate-800 px-6 shadow-2xl"
        style={{
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
            <span className="text-[#FF6B00]">KDS</span>
            <span className="text-white ml-2">Cocina</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] mt-0.5">
            Pantalla de producción
          </p>
        </div>

        {/* CONTADORES (Se mantienen igual) */}
        <div className="hidden md:flex items-center gap-8">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col items-center gap-0.5">
              <span className="text-3xl font-black leading-none" style={{ color: col.accent }}>
                {grouped[col.status].length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {col.title}
              </span>
            </div>
          ))}
          <div className="w-px h-10 bg-slate-700" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-3xl font-black leading-none text-white">{normalized.length}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total</span>
          </div>
        </div>

        {/* ── SECCIÓN DE BOTONES (ESTILO EXACTO A LA IMAGEN) ── */}
        <div className="flex items-center gap-4">
          {/* Botón de Estado Dinámico */}
          <div
            className={`flex items-center gap-4 px-6 py-2.5 rounded-full border-2 transition-all duration-500 ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                : "border-red-500/20 bg-red-950/20 text-red-400"
            }`}
          >
            <div className={isConnected ? "animate-pulse" : ""}>
              <svg
                className={`w-5 h-5 ${isConnected ? "drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex flex-col leading-[0.8] text-left">
              <span className="text-[10px] font-black uppercase tracking-wider"> En Línea</span>
            </div>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 bg-red-950/20 hover:bg-red-900/40 border-2 border-red-500/30 text-red-500 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* ── COLUMNAS — ocupan el resto de la pantalla ── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          overflow: "hidden",
        }}
      >
        {COLUMNS.map((col) => {
          const colOrders = grouped[col.status];
          return (
            <div
              key={col.key}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                overflow: "hidden",
              }}
            >
              {/* ✅ Header de columna — fijo arriba, NO sticky */}
              <div
                style={{
                  flexShrink: 0,
                  height: COL_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 20px",
                  backgroundColor: "#0f172a",
                  borderBottom: `1px solid ${col.accent}22`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 6,
                      height: 20,
                      borderRadius: 3,
                      backgroundColor: col.accent,
                      boxShadow: `0 0 10px ${col.accent}`,
                      display: "inline-block",
                    }}
                  />
                  <span className="text-sm font-black uppercase tracking-[0.25em] text-slate-300">
                    {col.title}
                  </span>
                </div>
                <span
                  className="text-xs font-black px-2.5 py-1 rounded-full border"
                  style={{
                    color: col.accent,
                    borderColor: col.accent + "50",
                    backgroundColor: col.accent + "12",
                  }}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* ✅ Tarjetas — scroll independiente por columna */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {colOrders.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 12,
                      opacity: 0.4,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        border: `2px solid ${col.accent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: col.accent,
                        }}
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Sin órdenes
                    </p>
                  </div>
                ) : (
                  colOrders.map((order, i) => (
                    <OrderCard
                      key={`${getOrderId(order)}-${i}`}
                      order={order}
                      now={now}
                      isConnected={isConnected}
                      onPreparing={() => markOrderPreparing(getOrderId(order))}
                      onReady={() => markOrderReady(getOrderId(order))}
                      onFinish={() => finishOrder(getOrderId(order))}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenDisplay;
