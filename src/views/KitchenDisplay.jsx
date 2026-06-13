import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Clock3, Bell, BellOff, Volume2 } from "lucide-react";
import OrderCard from "../components/kitchen/OrderCard";
import ModuleHeader from "../components/common/ModuleHeader";
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

const COL_H = 48;

const KitchenDisplay = () => {
  const { orders } = useKitchenOrders();
  const { isConnected } = useSignalRConnection("kitchen");
  const { now } = useKitchenClock();
  const navigate = useNavigate();
  const updateOrder = useOrderStore((state) => state.updateOrder);

  const soundControls = useOrderSound();
  const initialSoundSettings = soundControls.getSettings();
  const [soundMuted, setSoundMuted] = useState(initialSoundSettings.muted);
  const [soundVolume, setSoundVolume] = useState(initialSoundSettings.volume);

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
      if (updated) {
        updateOrder(updated);
        soundControls.playReadyOrderSound();
      }
    } catch (error) {
      console.error("No se pudo marcar la orden como lista:", error);
    }
  };

  return (
    <div
      className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.10),_transparent_20%),linear-gradient(180deg,_#07090f_0%,_#0d121a_42%,_#181108_100%)] text-white selection:bg-orange-300/30 md:h-[100dvh]"
    >
      <ModuleHeader
        icon={ChefHat}
        title="KDS Cocina"
        subtitle="Produccion en tiempo real"
        accent={{
          border: "border-orange-500/30",
          background: "bg-orange-500/10",
          text: "text-orange-300",
        }}
        isConnected={isConnected}
        onLogout={handleLogout}
        maxWidthClassName="max-w-[1800px]"
        rightContent={(
          <>
            <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-orange-300">
              <Clock3 className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                {currentTimeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-200">
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !soundMuted;
                  setSoundMuted(nextMuted);
                  soundControls.setMuted(nextMuted);
                }}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"
              >
                {soundMuted ? <BellOff className="h-4 w-4 text-red-300" /> : <Bell className="h-4 w-4 text-emerald-300" />}
                {soundMuted ? "Silenciado" : "Sonido activo"}
              </button>
              <div className="hidden h-6 w-px bg-slate-800 sm:block" />
              <label className="hidden items-center gap-2 sm:flex">
                <Volume2 className="h-4 w-4 text-cyan-300" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(event) => {
                    const nextVolume = Number(event.target.value);
                    setSoundVolume(nextVolume);
                    soundControls.setVolume(nextVolume);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => soundControls.playNewOrderSound()}
                className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300"
              >
                Probar nueva
              </button>
              <button
                type="button"
                onClick={() => soundControls.playUrgentOrderSound()}
                className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300"
              >
                Probar urgente
              </button>
              <button
                type="button"
                onClick={() => soundControls.playCancelOrderSound()}
                className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-red-300"
              >
                Probar cancelada
              </button>
              <button
                type="button"
                onClick={() => soundControls.playReadyOrderSound()}
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300"
              >
                Probar lista
              </button>
            </div>
          </>
        )}
      />

      <div
        className="mx-auto mt-3 grid w-full max-w-[1800px] grid-cols-1 gap-3 overflow-visible px-3 pb-3 md:grid-cols-2 md:overflow-hidden lg:px-5 lg:pb-5"
        style={{
          flex: 1,
        }}
      >
        {COLUMNS.map((col) => {
          const colOrders = grouped[col.status];
          return (
            <div
              key={col.key}
              className="min-h-[70dvh] md:min-h-0"
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
