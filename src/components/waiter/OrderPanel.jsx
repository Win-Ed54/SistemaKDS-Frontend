import React from "react";
import OrderBuilder from "./OrderBuilder";
import { ReceiptText, Users, MapPin } from "lucide-react"; 

const OrderPanel = ({ pax, tableId }) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl h-full flex flex-col">
      
      {/* 1. Header con acento Neón */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#39FF14] rounded-full shadow-[0_0_15px_#39FF14]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Detalle del Pedido
          </h2>
        </div>
        <ReceiptText className="w-5 h-5 text-slate-600" />
      </div>

      {/* 2. Barra de Info Rápida (Mesa y Pax) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <MapPin className="w-4 h-4 text-[#FFFF00]" />
          <div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Ubicación</p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">
              {tableId ? `Mesa ${tableId}` : "---"}
            </p>
          </div>
        </div>
        
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
          <Users className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Comensales</p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">
              {pax || "0"} Pers.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Lógica Central (OrderBuilder) */}
      <div className="flex-1 overflow-hidden">
         {/* OrderBuilder maneja su propio scroll interno para los items */}
         <OrderBuilder />
      </div>

      {/* 4. Nota de pie (Opcional) */}
      <p className="mt-4 text-[9px] text-center font-black text-slate-700 uppercase tracking-widest">
        Verifica los productos antes de enviar
      </p>
    </div>
  );
};

export default OrderPanel;
