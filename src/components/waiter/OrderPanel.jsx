import React, { useState } from "react";
import OrderBuilder from "./OrderBuilder";
import { ReceiptText, Users, MapPin, User } from "lucide-react"; 

const OrderPanel = ({ pax, tableId }) => {
  // Estado para el nombre del cliente (Requisito Pendiente #8)
  const [customerName, setCustomerName] = useState("");

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

      {/* 2. Campo Obligatorio: Nombre del Cliente */}
      <div className="mb-6">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 focus-within:border-cyan-500/50 transition-colors">
          <User className="w-4 h-4 text-cyan-400" />
          <div className="flex-1">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Cliente (Obligatorio)</p>
            <input 
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="NOMBRE DEL CLIENTE..."
              className="bg-transparent border-none text-xs font-black text-white uppercase tracking-tighter w-full focus:outline-none placeholder:text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 3. Barra de Info Rápida (Mesa y Pax) */}
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

      {/* 4. Lógica Central (OrderBuilder) */}
      <div className="flex-1 overflow-hidden">
         {/* Pasamos customerName para que OrderBuilder pueda validar el envío */}
         <OrderBuilder 
            customerName={customerName} 
            tableId={tableId} 
            pax={pax} 
         />
      </div>

      {/* 5. Nota de pie */}
      <p className="mt-4 text-[9px] text-center font-black text-slate-700 uppercase tracking-widest">
        Verifica los productos antes de enviar
      </p>
    </div>
  );
};

export default OrderPanel;