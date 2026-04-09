import React, { useState } from "react";
import { ReceiptText, Users, MapPin, User } from "lucide-react";
import OrderBuilder from "./OrderBuilder";

const normalizeCustomerName = (value) =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);

const OrderPanel = ({ pax, tableId, onOrderSent }) => {
  const [customerName, setCustomerName] = useState("");
  const handleOrderSent = () => {
    setCustomerName("");
    onOrderSent?.();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#39FF14] rounded-full shadow-[0_0_15px_#39FF14]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Detalle del Pedido
          </h2>
        </div>
        <ReceiptText className="w-5 h-5 text-slate-600" />
      </div>

      <div className="mb-6">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 focus-within:border-cyan-500/50 transition-colors">
          <User className="w-4 h-4 text-cyan-400" />
          <div className="flex-1">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
              Cliente (Obligatorio)
            </p>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(normalizeCustomerName(e.target.value))}
              placeholder="NOMBRE DEL CLIENTE..."
              maxLength={60}
              autoComplete="off"
              className="bg-transparent border-none text-xs font-black text-white uppercase tracking-tighter w-full focus:outline-none placeholder:text-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <MapPin className="w-4 h-4 text-[#FFFF00]" />
          <div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
              Ubicacion
            </p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">
              {tableId === 0 ? "Para llevar" : tableId ? `Mesa ${tableId}` : "---"}
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <Users className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
              Comensales
            </p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">
              {pax || "0"} Pers.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <OrderBuilder customerName={customerName} tableId={tableId} pax={pax} onOrderSent={handleOrderSent} />
      </div>

      <p className="mt-4 text-[9px] text-center font-black text-slate-700 uppercase tracking-widest">
        Verifica los productos antes de enviar
      </p>
    </div>
  );
};

export default OrderPanel;
