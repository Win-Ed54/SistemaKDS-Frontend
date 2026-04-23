import React, { useMemo } from "react";
import { BellRing, MapPin, PackageCheck } from "lucide-react";
import { finishOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
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

const ReadyOrdersView = ({ variant = "floating", waiterId = "" }) => {
  const { showToast } = useToast();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const waiterName = localStorage.getItem("user_name") || "";

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
        {readyOrders.map((order) => {
          const orderId = order.id || order._id;
          return (
            <div
              key={orderId}
              className="bg-slate-900/70 border border-[#39FF14]/30 rounded-[2rem] p-5 shadow-[0_0_30px_rgba(57,255,20,0.12)]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#39FF14] p-2.5 rounded-2xl">
                    <MapPin size={20} className="text-black" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white leading-none uppercase">
                      {getOrderLocationLabel(order)}
                    </h4>
                    <p className="text-[9px] text-[#39FF14] font-black uppercase tracking-widest mt-1">
                      Lista para entrega
                    </p>
                  </div>
                </div>
                <BellRing className="text-[#39FF14]" size={20} />
              </div>

              <div className="bg-black/30 rounded-2xl p-4 border border-slate-800 mb-5">
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
                    <li key={index} className="text-xs font-bold text-slate-300">
                      <span className="text-cyan-400 mr-2">{item.quantity}x</span>
                      {item.productName}
                    </li>
                  ))}
                </ul>
              </div>

              {isDiningOrder(order) && (
                <div className="mb-4 rounded-2xl border border-[#39FF14]/25 bg-[#39FF14]/10 p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#39FF14]/80">
                    Entregar en
                  </p>
                  <p className="mt-1 text-base font-black uppercase text-white">
                    {getDeliveryTargetLabel(order)}
                  </p>
                </div>
              )}

              <button
                onClick={() => handleDeliver(orderId)}
                className="w-full bg-[#39FF14] hover:bg-[#2cff00] text-black font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-3 text-center transition-all active:scale-95 shadow-lg"
              >
                <PackageCheck size={20} />
                <span className="leading-tight">{getDeliveryButtonLabel(order)}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-4 w-[90%] max-w-sm pointer-events-none">
      {readyOrders.map((order) => {
        const orderId = order.id || order._id;
        return (
          <div
            key={orderId}
            className="pointer-events-auto bg-slate-900 border-2 border-[#39FF14] rounded-[2rem] p-5 shadow-[0_0_30px_rgba(57,255,20,0.3)] animate-in slide-in-from-right duration-500"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#39FF14] p-2.5 rounded-2xl">
                  <MapPin size={20} className="text-black" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white italic leading-none uppercase">
                    {getOrderLocationLabel(order)}
                  </h4>
                  <p className="text-[9px] text-[#39FF14] font-black uppercase tracking-widest mt-1">
                    Recoger en barra
                  </p>
                </div>
              </div>
              <BellRing className="text-[#39FF14] animate-bounce" size={20} />
            </div>

            <div className="bg-black/40 rounded-2xl p-4 border border-slate-800 mb-5">
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
                  <li key={index} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">
                      <span className="text-cyan-400 mr-2">{item.quantity}x</span>
                      {item.productName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {isDiningOrder(order) && (
              <div className="mb-4 rounded-2xl border border-[#39FF14]/25 bg-[#39FF14]/10 p-4">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#39FF14]/80">
                  Entregar en
                </p>
                <p className="mt-1 text-base font-black uppercase text-white">
                  {getDeliveryTargetLabel(order)}
                </p>
              </div>
            )}

            <button
              onClick={() => handleDeliver(orderId)}
              className="w-full bg-[#39FF14] hover:bg-[#2cff00] text-black font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-3 text-center transition-all active:scale-95 shadow-lg"
            >
              <PackageCheck size={20} />
              <span className="leading-tight">{getDeliveryButtonLabel(order)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ReadyOrdersView;
