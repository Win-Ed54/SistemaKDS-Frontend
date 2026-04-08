import React, { useState } from "react";
import { Trash2, Plus, Minus, ReceiptText, X } from "lucide-react";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import { createOrder } from "../../services/api.service";
import { useToast } from "../../context/ToastContext";

const normalizeCustomerName = (value) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const OrderBuilder = ({ customerName, tableId, pax }) => {
  const {
    items,
    addItem,
    removeItem,
    decreaseItem,
    clearOrder,
    resetAfterOrder,
  } = useOrderBuilder();
  const { showToast } = useToast();

  const [isSending, setIsSending] = useState(false);
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const sendOrder = async () => {
    const normalizedCustomerName = normalizeCustomerName(customerName || "");
    const normalizedPax = Number.parseInt(pax, 10);

    if (!normalizedCustomerName) {
      showToast("El nombre del cliente es obligatorio", "error");
      return;
    }

    if (!/^[A-ZÁÉÍÓÚÜÑ\s]+$/u.test(normalizedCustomerName)) {
      showToast("El nombre del cliente solo puede llevar letras", "error");
      return;
    }

    if (!tableId || items.length === 0) {
      showToast("Seleccione mesa y productos", "error");
      return;
    }

    if (!Number.isInteger(normalizedPax) || normalizedPax < 1) {
      showToast("Ingrese un numero valido de comensales", "error");
      return;
    }

    if (isSending) return;

    const order = {
      tableNumber: parseInt(tableId, 10),
      waiterName: localStorage.getItem("user_name") || "Mesero",
      customerName: normalizedCustomerName,
      pax: normalizedPax,
      items,
      status: 0,
    };

    try {
      setIsSending(true);
      await createOrder(order);
      window.dispatchEvent(new Event("kds-sync-products"));
      window.dispatchEvent(new Event("kds-sync-tables"));
      resetAfterOrder();
      showToast("Orden enviada a cocina", "success");
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Error de conexion";
      window.dispatchEvent(new Event("kds-sync-products"));
      window.dispatchEvent(new Event("kds-sync-tables"));
      showToast(errorMsg, "error");
    } finally {
      setIsSending(false);
    }
  };

  const isButtonDisabled =
    items.length === 0 ||
    isSending ||
    !normalizeCustomerName(customerName || "") ||
    !Number.isInteger(Number.parseInt(pax, 10));

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-2xl backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Carrito Actual
        </h2>
        {items.length > 0 && (
          <button
            onClick={clearOrder}
            className="text-[9px] font-black uppercase text-red-500/60 hover:text-red-400 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Borrar todo
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 mb-6 overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-20">
            <ReceiptText className="w-12 h-12 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sin productos</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.productId}_${item.notes}_${index}`}
              className="bg-slate-950 border border-slate-800/50 p-3 rounded-2xl hover:border-slate-700 transition-all group"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => decreaseItem(item.productId, item.notes)}
                      className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[#00FFFF] text-xs font-black min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        addItem(
                          { id: item.productId, name: item.productName, price: item.price },
                          item.notes
                        )
                      }
                      className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 hover:text-[#00FFFF] flex items-center justify-center transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-200">{item.productName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-[#39FF14]">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId, item.notes)}
                    className="text-slate-700 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.notes && (
                <div className="mt-1 px-3 py-1.5 rounded-xl bg-[#FFFF00]/5 border-l-2 border-[#FFFF00] text-[9px] font-black text-[#FFFF00] uppercase italic">
                  Nota: {item.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={sendOrder}
        disabled={isButtonDisabled}
        className={`w-full py-5 rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-xs transition-all flex justify-between px-8 items-center shadow-xl ${
          isButtonDisabled
            ? "bg-slate-800 text-slate-600 border border-slate-700 opacity-50 cursor-not-allowed"
            : "bg-[#39FF14] text-black hover:scale-[1.02] active:scale-95 shadow-[#39FF14]/20"
        }`}
      >
        <div className="flex flex-col items-start">
          <span className="text-[10px] opacity-70 leading-none">
            {isSending ? "Enviando..." : "Confirmar Orden"}
          </span>
          {!isSending && !normalizeCustomerName(customerName || "") && (
            <span className="text-[7px] text-red-900 mt-1">Falta nombre del cliente</span>
          )}
        </div>
        <span className="text-xl">{isSending ? "---" : `$${total.toFixed(2)}`}</span>
      </button>
    </div>
  );
};

export default OrderBuilder;
