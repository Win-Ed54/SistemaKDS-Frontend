import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Flame, Search, Trash2, XCircle } from "lucide-react";
import { cancelOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../common/ConfirmDialog";

const toStatusNumber = (status) => {
  if (typeof status === "number") return status;
  const map = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
  return map[String(status).toLowerCase()] ?? -1;
};

const getOrderLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

const getStatusInfo = (status) => {
  const config = {
    0: {
      label: "Pendiente",
      color: "text-yellow-500",
      border: "border-yellow-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    1: {
      label: "Cocinando",
      color: "text-cyan-400",
      border: "border-cyan-400/30",
      icon: <Flame className="h-3 w-3" />,
    },
    2: {
      label: "Lista",
      color: "text-[#39FF14]",
      border: "border-[#39FF14]/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
  };

  return (
    config[status] || {
      label: "Finalizada",
      color: "text-slate-500",
      border: "border-slate-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    }
  );
};

const OrdersSummary = ({ orders, onOrderCancelled }) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingCancelOrder, setPendingCancelOrder] = useState(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getElapsed = (createdAt) => {
    if (!createdAt) return "00:00";
    const diff = Math.floor((new Date() - new Date(createdAt)) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const isUrgent = (createdAt) => {
    if (!createdAt) return false;
    return Math.floor((new Date() - new Date(createdAt)) / 60000) >= 10;
  };

  const handleCancel = async () => {
    if (!pendingCancelOrder?.id) return;

    setIsDeleting(pendingCancelOrder.id);
    try {
      await cancelOrder(pendingCancelOrder.id);
      showToast("Orden cancelada correctamente", "success");
      setPendingCancelOrder(null);
      onOrderCancelled?.();
    } catch {
      showToast("No se pudo cancelar la orden", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const uniqueOrders = useMemo(
    () =>
      Object.values(
        orders.reduce((acc, order) => {
          acc[order.id] = order;
          return acc;
        }, {}),
      ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return uniqueOrders.filter((order) => {
      const statusNum = toStatusNumber(order.status);
      if (statusFilter !== "all" && String(statusNum) !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchValues = [
        getOrderLocationLabel(order),
        order.waiterName,
        order.customerName,
        order.correlativeCode,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return searchValues.some((value) => value.includes(normalizedSearch));
    });
  }, [search, statusFilter, uniqueOrders]);

  return (
    <section className="h-full rounded-[2.5rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl backdrop-blur-md">
      <ConfirmDialog
        open={Boolean(pendingCancelOrder)}
        title="Cancelar orden activa"
        description={
          pendingCancelOrder
            ? `Se cancelara ${pendingCancelOrder.correlativeCode || pendingCancelOrder.id} y el stock sera restaurado.`
            : ""
        }
        confirmLabel="Cancelar orden"
        cancelLabel="Volver"
        tone="danger"
        loading={Boolean(isDeleting)}
        onConfirm={handleCancel}
        onCancel={() => (isDeleting ? undefined : setPendingCancelOrder(null))}
      />

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Monitor de ordenes
          </h2>

          {uniqueOrders.length > 0 && (
            <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black text-yellow-400">
              {uniqueOrders.length} activas
            </span>
          )}
        </div>

        <label className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value.slice(0, 40))}
            placeholder="Buscar mesa, cliente, mesero o correlativo"
            className="w-full rounded-[1.3rem] border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Todas" },
            { id: "0", label: "Pendientes" },
            { id: "1", label: "En cocina" },
            { id: "2", label: "Listas" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setStatusFilter(option.id)}
              className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                statusFilter === option.id
                  ? "border-cyan-300 bg-cyan-400 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-scrollbar max-h-[700px] space-y-4 overflow-y-auto pr-2">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center py-20 opacity-20">
            <XCircle className="mb-2 h-12 w-12 text-slate-500" />
            <p className="text-[10px] font-black uppercase">Sin resultados</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusNum = toStatusNumber(order.status);
            const { label, color, border, icon } = getStatusInfo(statusNum);
            const elapsed = getElapsed(order.createdAt);
            const urgent = isUrgent(order.createdAt);

            return (
              <div
                key={order.id}
                className={`relative rounded-[2rem] border bg-slate-950 p-5 transition-all ${
                  urgent
                    ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                    : "border-slate-800"
                }`}
              >
                <div className="mb-4 flex justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black uppercase text-white">
                      {getOrderLocationLabel(order)}
                    </h4>
                    <p className="text-[10px] uppercase text-slate-500">
                      {order.waiterName} · {order.customerName}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-[9px] ${color} ${border}`}>
                      {icon} {label}
                    </div>
                    <p className={`mt-2 text-[10px] font-black ${urgent ? "text-red-500" : "text-slate-500"}`}>
                      {elapsed}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {order.items?.map((item, index) => (
                    <span
                      key={`${order.id}-${item.productId}-${index}`}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[9px]"
                    >
                      {item.quantity}x {item.productName}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setPendingCancelOrder(order)}
                    disabled={isDeleting === order.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-[9px] text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {isDeleting === order.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Cancelar
                  </button>
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
