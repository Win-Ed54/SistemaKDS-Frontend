import React, { useEffect, useMemo } from "react";
import { BellRing, MapPin, PackageCheck } from "lucide-react";
import { finishOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";
import useOrderStore from "../../store/orderStore";

const ReadyOrdersView = () => {
  const { showToast } = useToast();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const waiterName = localStorage.getItem("user_name") || "";

  const readyOrders = useMemo(
    () =>
      ordersFromStore.filter((order) => {
        const isMine = order.waiterName?.toLowerCase().trim() === waiterName.toLowerCase().trim();
        const isReady = order.status === 2 || String(order.status).toLowerCase() === "ready";
        return isMine && isReady;
      }),
    [ordersFromStore, waiterName]
  );

  useEffect(() => {
    if (readyOrders.length === 0) return;

    const latestReady = readyOrders[0];
    showToast(`Mesa ${latestReady.tableNumber} LISTA`, "success");
  }, [readyOrders, showToast]);

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

  if (readyOrders.length === 0) return null;

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
                    Mesa {order.tableNumber}
                  </h4>
                  <p className="text-[9px] text-[#39FF14] font-black uppercase tracking-widest mt-1">
                    Recoger en barra
                  </p>
                </div>
              </div>
              <BellRing className="text-[#39FF14] animate-bounce" size={20} />
            </div>

            <div className="bg-black/40 rounded-2xl p-4 border border-slate-800 mb-5">
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

            <button
              onClick={() => handleDeliver(orderId)}
              className="w-full bg-[#39FF14] hover:bg-[#2cff00] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
            >
              <PackageCheck size={20} />
              CONFIRMAR ENTREGA
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ReadyOrdersView;
