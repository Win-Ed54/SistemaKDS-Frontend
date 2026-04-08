import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, LogOut, Receipt, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { logout } from "../services/authService";
import { getOrderHistory, getTables, payOrder } from "../services/api.service";
import {
  onOrderDelivered,
  onOrderPaid,
  subscribeConnectionStatus,
} from "../services/signalrService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const CashierView = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [chargingOrders, setChargingOrders] = useState({});
  const [loading, setLoading] = useState(false);

  const { isConnected } = useSignalRConnection("cashier");
  const { showToast } = useToast();

  const loadCashierData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [historyRes, tablesRes] = await Promise.all([getOrderHistory(), getTables()]);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
    } catch (error) {
      console.error("Error cargando caja:", error);
      if (!silent) showToast("No se pudieron cargar las cuentas pendientes", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCashierData();

    const unsubscribeDelivered = onOrderDelivered(() => {
      loadCashierData(true);
    });

    const unsubscribePaid = onOrderPaid(() => {
      loadCashierData(true);
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) loadCashierData(true);
    });

    return () => {
      unsubscribeDelivered?.();
      unsubscribePaid?.();
      unsubscribeConnection?.();
    };
  }, [loadCashierData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const pendingPayments = useMemo(() => {
    const occupiedTables = new Set(
      tables
        .filter((table) => table.isOccupied || table.IsOccupied)
        .map((table) => table.number ?? table.Number)
    );

    return history
      .filter((order) => {
        const status = typeof order.status === "string" ? order.status.toLowerCase() : order.status;
        const isDelivered = status === 3 || status === "delivered";
        return isDelivered && !order.isPaid && occupiedTables.has(order.tableNumber);
      })
      .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));
  }, [history, tables]);

  const totals = useMemo(() => {
    const totalOrders = pendingPayments.length;
    const totalAmount = pendingPayments.reduce(
      (acc, order) =>
        acc +
        (order.items?.reduce(
          (subtotal, item) => subtotal + (item.unitPrice || 0) * item.quantity,
          0
        ) || 0),
      0
    );

    return { totalOrders, totalAmount };
  }, [pendingPayments]);

  const handleCharge = async (order) => {
    try {
      setChargingOrders((prev) => ({ ...prev, [order.id]: true }));
      await payOrder(order.id);
      showToast(`Mesa ${order.tableNumber} cobrada correctamente`, "success");
      await loadCashierData(true);
    } catch (error) {
      console.error("Error cobrando orden:", error);
      showToast(`No se pudo cobrar la mesa ${order.tableNumber}`, "error");
    } finally {
      setChargingOrders((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 selection:bg-emerald-400/30">
      <div className="max-w-[1500px] mx-auto space-y-8">
        <header className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">
                KDS <span className="text-emerald-400">Caja</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
                Cobro de productos entregados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnected ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" : "border-red-500/20 bg-red-950/20 text-red-400"}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {isConnected ? "En linea" : "Sin conexion"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesion
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Cuentas pendientes</p>
            <p className="text-4xl font-black text-white mt-3">{totals.totalOrders}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Total por cobrar</p>
            <p className="text-4xl font-black text-emerald-400 mt-3">{formatCurrency(totals.totalAmount)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Estado</p>
            <p className="text-xl font-black text-slate-200 mt-4">
              {loading ? "Actualizando..." : "Caja sincronizada"}
            </p>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
              Ordenes Pendientes De Cobro
            </h2>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-[2rem] p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                No hay cuentas pendientes en este momento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {pendingPayments.map((order) => {
                const orderTotal =
                  order.items?.reduce(
                    (subtotal, item) => subtotal + (item.unitPrice || 0) * item.quantity,
                    0
                  ) || 0;

                return (
                  <article key={order.id} className="bg-slate-950 border border-slate-800 rounded-[2rem] p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesa</p>
                        <p className="text-4xl font-black text-white mt-1">{order.tableNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">
                          {formatCurrency(orderTotal)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                        <p className="text-sm font-black uppercase text-slate-100 mt-1">
                          {order.customerName || "General"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesero</p>
                        <p className="text-sm font-black uppercase text-slate-100 mt-1">
                          {order.waiterName || "---"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-[1.5rem] p-4 space-y-2">
                      {order.items?.map((item, index) => (
                        <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm">
                          <span className="font-bold text-slate-200">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="font-black text-slate-400">
                            {formatCurrency((item.unitPrice || 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCharge(order)}
                      disabled={chargingOrders[order.id]}
                      className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
                    >
                      <CreditCard className="w-4 h-4" />
                      {chargingOrders[order.id] ? "Cobrando..." : "Cobrar orden"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CashierView;
