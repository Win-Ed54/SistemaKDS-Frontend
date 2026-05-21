import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMyWaiterOrdersToday, getWaiterSummary } from "../../services/api.service";
import { logout } from "../../services/authService";
import { getAppPath } from "../../config/appPaths";
import {
  onOrderCancelled,
  onOrderDelivered,
  onOrderPaid,
  onOrderPreparing,
  onOrderReady,
  subscribeConnectionStatus,
} from "../../services/signalrService";

const getLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

const WaiterProfile = ({ user, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [todayOrders, waiterSummary] = await Promise.all([
        getMyWaiterOrdersToday(),
        getWaiterSummary(),
      ]);

      setOrders(Array.isArray(todayOrders) ? [...todayOrders].reverse() : []);
      setSummary(waiterSummary || null);
    } catch (err) {
      console.error("Error cargando actividad:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let refreshTimeoutId = null;

    const scheduleRefresh = () => {
      if (refreshTimeoutId) return;

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void fetchOrders();
      }, 250);
    };

    const unsubscribePreparing = onOrderPreparing(() => {
      scheduleRefresh();
    });

    const unsubscribeReady = onOrderReady(() => {
      scheduleRefresh();
    });

    const unsubscribeDelivered = onOrderDelivered(() => {
      scheduleRefresh();
    });

    const unsubscribePaid = onOrderPaid(() => {
      scheduleRefresh();
    });

    const unsubscribeCancelled = onOrderCancelled(() => {
      scheduleRefresh();
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) {
        scheduleRefresh();
      }
    });

    return () => {
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }
      unsubscribePreparing?.();
      unsubscribeReady?.();
      unsubscribeDelivered?.();
      unsubscribePaid?.();
      unsubscribeCancelled?.();
      unsubscribeConnection?.();
    };
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const activeOrders = Array.isArray(summary?.myActiveOrders)
      ? summary.myActiveOrders
      : [];

    return {
      total: summary?.totalCreated || summary?.totalToday || orders.length,
      delivered: summary?.totalDelivered || summary?.deliveredToday || 0,
      pending: activeOrders.filter((order) =>
        [0, 1, 2, "Pending", "Preparing", "Ready"].includes(order.status),
      ).length,
    };
  }, [orders.length, summary]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400/10 rounded-full blur-[80px]" />

        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-black text-4xl mb-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            {user.username}
          </h2>
          <span className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.3em] mt-2 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
            Sesion activa
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatBox label="Creadas" value={stats.total} colorClass="text-white" />
          <StatBox
            label="Entregadas"
            value={stats.delivered}
            colorClass="text-emerald-400"
          />
          <StatBox
            label="En curso"
            value={stats.pending}
            colorClass="text-yellow-300"
          />
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] text-center">
            Actividad reciente
          </p>
          <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-[10px] font-black uppercase border-2 border-dashed border-slate-800 rounded-3xl">
                Sin actividad hoy
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50"
                >
                  <div>
                    <p className="text-xs font-black text-white uppercase">
                      {getLocationLabel(order)}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span className="ml-2 opacity-50">
                        #{order.id?.toString().slice(-4)}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-slate-800 text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all"
          >
            Volver a la terminal
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = getAppPath("/login");
            }}
            className="w-full py-4 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
          >
            Finalizar turno
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, colorClass }) => (
  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 text-center">
    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">{label}</p>
    <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const sMap = { Pending: 0, Preparing: 1, Ready: 2, Delivered: 3 };
  const s = typeof status === "string" ? sMap[status] : status;
  const config = {
    0: { text: "Cola", color: "text-yellow-300 bg-yellow-300/10" },
    1: { text: "Cocina", color: "text-cyan-300 bg-cyan-300/10" },
    2: { text: "Listo", color: "text-emerald-400 bg-emerald-400/10" },
    3: { text: "Entregada", color: "text-slate-400 bg-slate-800" },
  };
  const { text, color } = config[s] || { text: "...", color: "text-slate-500" };

  return (
    <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${color}`}>
      {text}
    </span>
  );
};

export default WaiterProfile;
