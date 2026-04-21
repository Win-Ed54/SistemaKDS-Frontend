import React from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Clock3, LogOut, PanelTopOpen } from "lucide-react";
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
  };
  const readyCount = normalized.filter((order) => order.status === 2).length;
  const currentTimeLabel = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.10),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_100%)] text-white selection:bg-orange-500/30"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header className="px-3 pt-3 lg:px-6 lg:pt-6" style={{ flexShrink: 0 }}>
        <div className="mx-auto max-w-[1800px] rounded-[2.2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] p-4 shadow-2xl lg:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] border border-orange-500/30 bg-orange-500/10">
                <ChefHat className="h-6 w-6 text-orange-300" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter uppercase sm:text-2xl">
                  KDS <span className="text-orange-400">Cocina</span>
                </h1>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Produccion en tiempo real
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                  isConnected
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : "border-red-500/20 bg-red-950/20 text-red-400"
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isConnected ? "En linea" : "Sin conexion"}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-orange-300">
                <Clock3 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                  {currentTimeLabel}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-300 transition-all hover:bg-red-500 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KitchenMetricCard
              icon={PanelTopOpen}
              label="Pendientes"
              value={grouped[0].length}
              accent="text-amber-300"
              glow="border-amber-400/20 bg-amber-400/10"
            />
            <KitchenMetricCard
              icon={ChefHat}
              label="Preparando"
              value={grouped[1].length}
              accent="text-cyan-300"
              glow="border-cyan-400/20 bg-cyan-400/10"
            />
            <KitchenMetricCard
              icon={Clock3}
              label="Listas"
              value={readyCount}
              accent="text-emerald-300"
              glow="border-emerald-400/20 bg-emerald-400/10"
            />
            <KitchenMetricCard
              icon={ChefHat}
              label="Total activo"
              value={normalized.length}
              accent="text-white"
              glow="border-orange-400/20 bg-orange-400/10"
            />
          </div>
        </div>
      </header>

      <div
        className="mx-auto mt-4 w-full max-w-[1800px] px-3 pb-3 lg:px-6 lg:pb-6"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))`,
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
                  <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/35 p-8">
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "999px",
                        border: `2px solid ${col.accent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 0 18px ${col.accent}22`,
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
                      Sin ordenes
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

const KitchenMetricCard = ({ icon: Icon, label, value, accent, glow }) => (
  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className={`mt-3 text-3xl font-black tracking-tighter ${accent}`}>{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${glow}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
    </div>
  </div>
);
