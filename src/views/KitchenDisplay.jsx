import React from "react";
import { useNavigate } from "react-router-dom";
import OrderCard from "../components/kitchen/OrderCard";
import useKitchenClock from "../hooks/useKitchenClock";
import useKitchenOrders from "../hooks/useKitchenOrders";
import useOrderSound from "../hooks/useOrderSound";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { logout } from "../services/authService";
import { markOrderPreparing, markOrderReady } from "../services/api.service";
import useOrderStore from "../store/orderStore";

const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const COLUMNS = [
  { key: "pending", title: "Pendiente", status: 0, accent: "#FFFF00" },
  { key: "preparing", title: "Preparando", status: 1, accent: "#00FFFF" },
  { key: "ready", title: "Listo", status: 2, accent: "#39FF14" },
];

const HEADER_H = 73;
const COL_H = 48;

const KitchenDisplay = () => {
  const { orders } = useKitchenOrders();
  const { isConnected } = useSignalRConnection("kitchen");
  const { now } = useKitchenClock();
  const navigate = useNavigate();
  const updateOrder = useOrderStore((state) => state.updateOrder);

  useOrderSound();

  const getOrderId = (order) => order.id || order._id;

  const normalized = (orders ?? []).map((order) => ({
    ...order,
    status: toStatusNumber(order.status),
  }));

  const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const grouped = {
    0: normalized.filter((order) => order.status === 0).sort(byTime),
    1: normalized.filter((order) => order.status === 1).sort(byTime),
    2: normalized.filter((order) => order.status === 2).sort(byTime),
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePreparing = async (orderId) => {
    try {
      const updated = await markOrderPreparing(orderId);
      if (updated) updateOrder(updated);
    } catch (error) {
      console.error("No se pudo pasar la orden a preparando:", error);
    }
  };

  const handleReady = async (orderId) => {
    try {
      const updated = await markOrderReady(orderId);
      if (updated) updateOrder(updated);
    } catch (error) {
      console.error("No se pudo marcar la orden como lista:", error);
    }
  };

  return (
    <div
      className="bg-slate-950 text-white selection:bg-cyan-500/30"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
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
            Pantalla de produccion
          </p>
        </div>

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

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                : "border-red-500/20 bg-red-950/20 text-red-400"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {isConnected ? "En linea" : "Sin conexion"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar sesion
          </button>
        </div>
      </header>

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
                    borderColor: `${col.accent}50`,
                    backgroundColor: `${col.accent}12`,
                  }}
                >
                  {colOrders.length}
                </span>
              </div>

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
                      Sin Ordenes
                    </p>
                  </div>
                ) : (
                  colOrders.map((order, index) => (
                    <OrderCard
                      key={`${getOrderId(order)}-${index}`}
                      order={order}
                      now={now}
                      isConnected={isConnected}
                      onPreparing={() => handlePreparing(getOrderId(order))}
                      onReady={() => handleReady(getOrderId(order))}
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
