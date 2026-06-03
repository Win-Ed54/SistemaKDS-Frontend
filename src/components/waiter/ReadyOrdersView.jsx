import React, { useCallback, useMemo, useRef } from "react";
import { BellRing, ChevronDown, ChevronUp, MapPin, PackageCheck } from "lucide-react";
import { finishOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import { getAuthValue } from "../../services/authStorage";
import useOrderStore from "../../store/orderStore";

const getTakeoutDestination = (order) =>
  String(order?.takeoutDestination || order?.TakeoutDestination || "").trim();

const getOrderLocationLabel = (order) => {
  if (Number(order?.tableNumber) > 0) return `Mesa ${order.tableNumber}`;

  const destination = getTakeoutDestination(order);
  return destination ? `Para llevar · ${destination}` : "Para llevar";
};

const isDiningOrder = (order) => Number(order?.tableNumber) > 0;

const getDeliveryTargetLabel = (order) => `Mesa ${order.tableNumber}`;

const getDeliveryButtonLabel = (order) =>
  isDiningOrder(order) ? `CONFIRMAR ENTREGA A MESA ${order.tableNumber}` : "CONFIRMAR ENTREGA";

const normalizeCompareValue = (value) => String(value || "").trim().toLowerCase();

const belongsToWaiter = (order, waiterId, waiterName) => {
  const orderWaiterId = order?.waiterId ?? order?.WaiterId;
  const idMatches =
    String(orderWaiterId || "").trim().length > 0 &&
    String(waiterId || "").trim().length > 0 &&
    String(orderWaiterId || "").trim() === String(waiterId || "").trim();

  const nameMatches =
    normalizeCompareValue(order?.waiterName).length > 0 &&
    normalizeCompareValue(order?.waiterName) === normalizeCompareValue(waiterName);

  return idMatches || nameMatches;
};

const ReadyOrderCard = ({ order, variant, onDeliver }) => {
  const detailRef = useRef(null);
  const orderId = order.id || order._id;
  const isInline = variant === "inline";

  const scrollDetail = useCallback((direction) => {
    const detail = detailRef.current;
    if (!detail) return;

    detail.scrollBy({
      top: direction * Math.max(160, detail.clientHeight * 0.75),
      behavior: "smooth",
    });
  }, []);

  return (
    <div
      className={`flex min-h-0 flex-col bg-slate-900 ${
        isInline
          ? "max-h-[min(78vh,760px)] rounded-[2rem] border border-[#39FF14]/30 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(57,255,20,0.12)]"
          : "max-h-[min(72vh,620px)] pointer-events-auto rounded-[2rem] border-2 border-[#39FF14] p-5 shadow-[0_0_30px_rgba(57,255,20,0.3)]"
      }`}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl bg-[#39FF14] p-2.5">
            <MapPin size={20} className="text-black" />
          </div>
          <div className="min-w-0">
            <h4
              className={`truncate text-2xl font-black leading-none text-white uppercase ${
                isInline ? "" : "italic"
              }`}
              title={getOrderLocationLabel(order)}
            >
              {getOrderLocationLabel(order)}
            </h4>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#39FF14]">
              {isInline ? "Lista para entrega" : "Recoger en barra"}
            </p>
          </div>
        </div>
        <BellRing className="shrink-0 text-[#39FF14]" size={20} />
      </div>

      <div className="mb-5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-black/40">
        <div className="flex items-center justify-end gap-2 border-b border-slate-800/80 px-3 py-2">
          <button
            type="button"
            onClick={() => scrollDetail(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 transition-all hover:border-[#39FF14]/50 hover:text-[#39FF14] active:scale-95"
            aria-label="Subir detalle"
            title="Subir detalle"
          >
            <ChevronUp size={17} />
          </button>
          <button
            type="button"
            onClick={() => scrollDetail(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 transition-all hover:border-[#39FF14]/50 hover:text-[#39FF14] active:scale-95"
            aria-label="Bajar detalle"
            title="Bajar detalle"
          >
            <ChevronDown size={17} />
          </button>
        </div>

        <div
          ref={detailRef}
          className="custom-scrollbar max-h-[360px] min-h-0 overflow-y-auto overscroll-contain p-4"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {Number(order?.tableNumber) === 0 && getTakeoutDestination(order) && (
            <div className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-200/80">
                Destino
              </p>
              <p className="mt-1 text-xs font-black uppercase text-amber-100">
                {getTakeoutDestination(order)}
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {order.items?.map((item, index) => (
              <li
                key={`${item.productId || item.productName || "item"}-${index}`}
                className={`text-xs ${isInline ? "font-bold text-slate-300" : "flex items-center justify-between"}`}
              >
                <span className="font-bold text-slate-300">
                  <span className="mr-2 text-cyan-400">{item.quantity}x</span>
                  {item.productName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isDiningOrder(order) && (
        <div className="mb-4 shrink-0 rounded-2xl border border-[#39FF14]/25 bg-[#39FF14]/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#39FF14]/80">
            Entregar en
          </p>
          <p className="mt-1 text-base font-black uppercase text-white">
            {getDeliveryTargetLabel(order)}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onDeliver(orderId)}
        className="flex w-full shrink-0 items-center justify-center gap-3 rounded-2xl bg-[#39FF14] px-4 py-4 text-center font-black text-black shadow-lg transition-all hover:bg-[#2cff00] active:scale-95"
      >
        <PackageCheck size={20} />
        <span className="leading-tight">{getDeliveryButtonLabel(order)}</span>
      </button>
    </div>
  );
};

const ReadyOrdersView = ({ variant = "floating", waiterId = "" }) => {
  const { showToast } = useToast();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const waiterName = getAuthValue("user_name") || "";

  const readyOrders = useMemo(
    () =>
      ordersFromStore.filter((order) => {
        const isMine = belongsToWaiter(order, waiterId, waiterName);
        const isReady = order.status === 2 || String(order.status).toLowerCase() === "ready";
        return isMine && isReady;
      }),
    [ordersFromStore, waiterId, waiterName]
  );

  const handleDeliver = async (orderId) => {
    try {
      await finishOrder(orderId);
      useOrderStore.getState().removeOrder(orderId);
      showToast("Pedido entregado", "success");
    } catch (err) {
      console.error("Fallo al entregar:", err);
      showToast("Error al procesar entrega", "error");
    }
  };

  if (readyOrders.length === 0) {
    if (variant === "inline") {
      return (
        <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
            No hay pedidos listos
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 mt-3">
            Cuando cocina termine una orden tuya, aparecera aqui.
          </p>
        </div>
      );
    }

    return null;
  }

  if (variant === "inline") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {readyOrders.map((order) => (
          <ReadyOrderCard
            key={order.id || order._id}
            order={order}
            variant="inline"
            onDeliver={handleDeliver}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex max-h-[calc(100dvh-7rem)] w-[90%] max-w-sm flex-col gap-4 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
      {readyOrders.map((order) => (
        <ReadyOrderCard
          key={order.id || order._id}
          order={order}
          variant="floating"
          onDeliver={handleDeliver}
        />
      ))}
    </div>
  );
};

export default ReadyOrdersView;
