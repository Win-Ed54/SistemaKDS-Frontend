import React, { useEffect, useState } from "react";
import { ReceiptText, MapPin, User } from "lucide-react";
import OrderBuilder from "./OrderBuilder";
import useOrderBuilderStore from "../../store/orderBuilderStore";

const normalizeCustomerName = (value) =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);

const OrderPanel = ({ pax, tableId, onOrderSent }) => {
  const customerName = useOrderBuilderStore((state) => state.customerName);
  const setCustomer = useOrderBuilderStore((state) => state.setCustomer);
  const [serviceMode, setServiceMode] = useState(
    Number(tableId) === 0 ? "takeout" : "dine-in",
  );
  const isAssignedTakeout = Number(tableId) === 0;
  const isTakeout = isAssignedTakeout || serviceMode === "takeout";

  useEffect(() => {
    setServiceMode(Number(tableId) === 0 ? "takeout" : "dine-in");
  }, [tableId]);

  const handleOrderSent = () => {
    onOrderSent?.();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl backdrop-blur-xl flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#39FF14] rounded-full shadow-[0_0_15px_#39FF14]" />
          <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-[0.26em] sm:tracking-[0.3em] text-slate-400">
            Detalle del Pedido
          </h2>
        </div>
        <ReceiptText className="w-5 h-5 text-slate-600" />
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-[1.2rem] sm:rounded-2xl flex items-center gap-3 focus-within:border-cyan-500/50 transition-colors">
          <User className="w-4 h-4 text-cyan-400" />
          <div className="flex-1">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
              {isTakeout ? "Cliente (Obligatorio)" : "Cliente (Opcional)"}
            </p>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomer(normalizeCustomerName(e.target.value))}
              placeholder={isTakeout ? "NOMBRE PARA LLEVAR (OBLIGATORIO)" : "NOMBRE DEL CLIENTE (OPCIONAL)"}
              maxLength={60}
              autoComplete="off"
              className="bg-transparent border-none text-xs font-black text-white uppercase tracking-tighter w-full focus:outline-none placeholder:text-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        {!isAssignedTakeout && Number(tableId) > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setServiceMode("dine-in")}
              className={`rounded-[1rem] border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                serviceMode === "dine-in"
                  ? "border-cyan-300 bg-cyan-400 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              }`}
            >
              Consumir en mesa
            </button>
            <button
              type="button"
              onClick={() => setServiceMode("takeout")}
              className={`rounded-[1rem] border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                serviceMode === "takeout"
                  ? "border-amber-300 bg-amber-300 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              }`}
            >
              Pedir para llevar
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 border border-slate-800 p-2.5 sm:p-3 rounded-[1.2rem] sm:rounded-2xl flex items-center gap-2 sm:gap-3">
            <MapPin className="w-4 h-4 text-[#FFFF00]" />
            <div>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                Ubicacion
              </p>
              <p className="text-[10px] sm:text-xs font-black text-white uppercase tracking-tighter">
                {tableId === 0
                  ? "Para llevar"
                  : tableId
                    ? isTakeout
                      ? `Mesa ${tableId} > Para llevar`
                      : `Mesa ${tableId}`
                    : "---"}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-fuchsia-500/20 p-2.5 sm:p-3 rounded-[1.2rem] sm:rounded-2xl">
            <p className="text-[8px] font-black text-fuchsia-300 uppercase tracking-tighter">
              Clientes
            </p>
            <p className="mt-1 text-[10px] sm:text-xs font-black text-white uppercase tracking-tighter">
              {isTakeout ? "No aplica" : `${Number(pax) || 0} personas`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <OrderBuilder
          customerName={customerName}
          tableId={isTakeout ? 0 : tableId}
          pax={pax}
          onOrderSent={handleOrderSent}
          serviceMode={isTakeout ? "takeout" : "dine-in"}
          sourceTableId={Number(tableId) > 0 ? tableId : null}
        />
      </div>

      <p className="mt-3 sm:mt-4 text-[8px] sm:text-[9px] text-center font-black text-slate-700 uppercase tracking-[0.18em] sm:tracking-widest">
        {isTakeout && Number(tableId) > 0
          ? `La orden se enviara para llevar sin salir de la mesa ${tableId}`
          : "Verifica los productos antes de enviar"}
      </p>
    </div>
  );
};

export default OrderPanel;
