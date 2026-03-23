import React, { useState } from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import { createOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const OrderBuilder = () => {
  const {
    tableId, waiterName, customerName, items,
    removeItem, decreaseItem, clearOrder, resetAfterOrder, updateItemNotes,
  } = useOrderBuilder();
  const { showToast } = useToast();

  const [isSending, setIsSending] = useState(false);
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const sendOrder = async () => {
    if (!tableId || items.length === 0) { showToast("⚠️ Seleccione mesa y productos", "error"); return; }
    if (isSending) return;

    const order = {
      tableNumber:  tableId,
      waiterName:   waiterName || "Mesero",
      customerName: customerName || "General",
      items,
      status: 0,
    };

    try {
      setIsSending(true);
      await createOrder(order);
      resetAfterOrder();
      showToast("✅ Orden enviada con éxito", "success");
    } catch (error) {
      showToast(`❌ ${error.response?.data?.error || "Error al enviar la orden"}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Resumen de Orden</h2>
        {items.length > 0 && (
          <button onClick={clearOrder}
            className="text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
            Cancelar todo
          </button>
        )}
      </div>

      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
        {items.length === 0 && (
          <p className="text-slate-600 text-xs italic text-center py-10 uppercase font-bold tracking-widest">
            Carrito vacío
          </p>
        )}

        {items.map((item, index) => (
          // ✅ key usa productId + notes para diferenciar items del mismo producto
          <div key={`${item.productId}_${item.notes}_${index}`}
            className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-all">

            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {/* Controles cantidad */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => decreaseItem(item.productId, item.notes)}
                    className="w-5 h-5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-black transition-all">
                    −
                  </button>
                  <span className="bg-[#00FFFF]/10 text-[#00FFFF] text-[10px] px-2 py-0.5 rounded-md font-black min-w-[28px] text-center">
                    {item.quantity}x
                  </span>
                  <button
                    onClick={() => {
                      import("../../store/orderBuilderStore").then(({ default: store }) => {
                        store.getState().addItem({ id: item.productId, name: item.productName, price: item.price });
                      });
                    }}
                    className="w-5 h-5 rounded-md bg-slate-800 hover:bg-[#00FFFF]/10 border border-slate-700 hover:border-[#00FFFF]/30 text-slate-400 hover:text-[#00FFFF] flex items-center justify-center text-xs font-black transition-all">
                    +
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-200">{item.productName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#39FF14]">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                {/* ✅ removeItem recibe productId + notes para eliminar el item correcto */}
                <button onClick={() => removeItem(item.productId, item.notes)}
                  className="text-slate-600 hover:text-red-500 transition-colors p-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Nota — solo si tiene */}
            {item.notes && (
              <div className="mt-1 px-2 py-1 rounded-lg border-l-4 text-[10px] font-black uppercase"
                style={{ backgroundColor: "#FFFF0010", borderLeftColor: "#FFFF00", color: "#FFFF00" }}>
                ⚠ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={sendOrder} disabled={items.length === 0 || isSending}
        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex justify-between px-6 items-center shadow-xl ${
          items.length === 0 || isSending
            ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
            : "bg-[#39FF14] text-black hover:scale-[1.02] active:scale-95 shadow-[#39FF14]/20"
        }`}>
        <span className="text-[10px] opacity-70">{isSending ? "Enviando..." : "Confirmar"}</span>
        <span className="text-lg">{isSending ? "---" : `ENVIAR $${total.toFixed(2)}`}</span>
      </button>
    </div>
  );
};

export default OrderBuilder;
