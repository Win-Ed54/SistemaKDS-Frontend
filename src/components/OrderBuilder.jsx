import React, { useState } from "react";
import useOrderBuilder from "../hooks/useOrderBuilder";
import { createOrder } from "../services/api.service";

const OrderBuilder = () => {
  const {
    tableId,
    waiterName,
    customerName,
    items,
    setWaiter,
    setCustomer,
    removeItem,
    clearOrder,
    updateItemNotes // <--- Asegúrate de que este método exista en tu hook
  } = useOrderBuilder();

  const [isSending, setIsSending] = useState(false);

  // Calculamos el total para mostrarlo en el botón (UX de móvil)
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const sendOrder = async () => {
    if (!tableId || items.length === 0) {
      alert("⚠️ Seleccione mesa y productos");
      return;
    }

    if (isSending) return;

    const order = {
      tableNumber: tableId,
      waiterName: waiterName || "Mesero",
      customerName: customerName || "General",
      items, // Aquí ya viajan las notas que escribas abajo
      status: 0
    };

    try {
      setIsSending(true);
      await createOrder(order);
      clearOrder(); 
      alert("✅ Orden enviada con éxito");
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Error al enviar la orden";
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-2xl backdrop-blur-md">
      <h2 className="text-sm font-black mb-4 uppercase tracking-[0.2em] border-b border-slate-800 pb-3 text-slate-400">
        Resumen de Orden
      </h2>

      {/* LISTA DE PRODUCTOS CON NOTAS */}
      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
        {items.length === 0 && (
          <p className="text-slate-600 text-xs italic text-center py-10 uppercase font-bold tracking-widest">
            Carrito vacío
          </p>
        )}
        
        {items.map(item => (
          <div key={item.productId} className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50 group transition-all hover:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#00FFFF]/10 text-[#00FFFF] text-[10px] px-2 py-0.5 rounded-md font-black">
                  {item.quantity}x
                </span>
                <span className="text-xs font-bold text-slate-200">{item.productName}</span>
              </div>
              <button 
                onClick={() => removeItem(item.productId)} 
                className="text-slate-600 hover:text-red-500 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* CAMPO DE NOTA: Importante para Cocina */}
            <div className="relative mt-1">
              <div className="absolute left-2 top-2.5">
                <svg xmlns="http://www.w3.org" className="h-3 w-3 text-[#FFFF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <input 
                type="text"
                placeholder="Escribir nota (ej: Sin cebolla)..."
                value={item.notes || ""}
                onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 pl-7 text-[10px] text-amber-200 placeholder:text-slate-700 focus:border-[#FFFF00] outline-none transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      {/* BOTÓN DE ENVÍO CON TOTAL (UX MÓVIL) */}
      <button
        onClick={sendOrder}
        disabled={items.length === 0 || isSending}
        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex justify-between px-6 items-center shadow-xl ${
          (items.length === 0 || isSending) 
            ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700" 
            : "bg-[#39FF14] text-black hover:scale-[1.02] active:scale-95 shadow-[#39FF14]/20"
        }`}
      >
        <span className="text-[10px] opacity-70">
          {isSending ? "Cargando..." : "Confirmar"}
        </span>
        <span className="text-lg">
          {isSending ? "---" : `ENVIAR $${total.toFixed(2)}`}
        </span>
      </button>
    </div>
  );
};

export default OrderBuilder;
