import React, { useEffect, useState } from "react";
import { ReceiptText, MapPin, User, ChevronDown } from "lucide-react";
import OrderBuilder from "./OrderBuilder";
import useOrderBuilderStore from "../../store/orderBuilderStore";
import { sanitizeCustomerName, sanitizeSafeFreeText } from "../../utils/inputSanitizers";

const TAKEOUT_DESTINATIONS = ["Mostrador", "Autoservicio", "Delivery"];

const normalizeDeliveryAddress = (value) =>
  sanitizeSafeFreeText(value, 180);

const normalizeCustomerName = (value) =>
  sanitizeCustomerName(value, 60);

const OrderPanel = ({
  pax,
  tableId,
  onOrderSent,
  canHandleTakeout = true,
  canHandleDining = true,
  sourceTableId = null,
}) => {
  const customerName = useOrderBuilderStore((state) => state.customerName);
  const setCustomer = useOrderBuilderStore((state) => state.setCustomer);
  const [takeoutDestination, setTakeoutDestination] = useState(TAKEOUT_DESTINATIONS[0]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [serviceMode, setServiceMode] = useState(
    Number(tableId) === 0 ? "takeout" : "dine-in",
  );
  const isAssignedTakeout = Number(tableId) === 0;
  const isTakeout = isAssignedTakeout || serviceMode === "takeout";
  const isDeliverySelected = isTakeout && takeoutDestination === "Delivery";
  const takeoutDestinations =
    Number(tableId) > 0
      ? [`Mesa ${tableId}`, ...TAKEOUT_DESTINATIONS]
      : TAKEOUT_DESTINATIONS;

  useEffect(() => {
    queueMicrotask(() => {
      setServiceMode(Number(tableId) === 0 || !canHandleDining ? "takeout" : "dine-in");
      setTakeoutDestination(TAKEOUT_DESTINATIONS[0]);
      setDeliveryAddress("");
      setShowServiceDetails(Number(tableId) === 0 || !canHandleDining);
    });
  }, [canHandleDining, tableId]);

  useEffect(() => {
    if (!canHandleTakeout && serviceMode === "takeout") {
      queueMicrotask(() => {
        setServiceMode("dine-in");
      });
    }
  }, [canHandleTakeout, serviceMode]);

  const handleOrderSent = (createdOrder) => {
    setTakeoutDestination(TAKEOUT_DESTINATIONS[0]);
    setDeliveryAddress("");
    setShowServiceDetails(Number(tableId) === 0 || !canHandleDining);
    onOrderSent?.(createdOrder);
  };

  return (
    <div className="flex min-h-full flex-col rounded-[2rem] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem] sm:p-5 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:p-4 custom-scrollbar">
      <div className="mb-4 flex shrink-0 items-center justify-between xl:mb-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-[#39FF14] shadow-[0_0_15px_#39FF14]" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-400 sm:text-sm sm:tracking-[0.3em]">
            Detalle del Pedido
          </h2>
        </div>
        <ReceiptText className="h-5 w-5 text-slate-500" />
      </div>

      <div className="mb-4 shrink-0 xl:mb-3">
        <div className="flex items-center gap-3 rounded-[1.2rem] border border-slate-800 bg-slate-950 p-3 transition-colors focus-within:border-cyan-500/50 sm:rounded-2xl">
          <User className="h-4 w-4 text-cyan-400" />
          <div className="flex-1">
            <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500">
              {isTakeout ? "Cliente (Obligatorio)" : "Cliente (Opcional)"}
            </p>
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomer(normalizeCustomerName(event.target.value))}
              placeholder={
                isTakeout
                  ? "NOMBRE PARA LLEVAR (OBLIGATORIO)"
                  : "NOMBRE DEL CLIENTE (OPCIONAL)"
              }
              maxLength={60}
              autoComplete="off"
              className="w-full border-none bg-transparent text-xs font-black uppercase tracking-tighter text-white outline-none placeholder:text-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 shrink-0 xl:mb-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-slate-800 bg-slate-950/80 p-3">
            <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500">
              Servicio
            </p>
            <p
              className={`mt-2 text-[10px] font-black uppercase tracking-[0.14em] ${
                isTakeout ? "text-amber-300" : "text-cyan-300"
              }`}
            >
              {isTakeout ? "Para llevar" : "Mesa"}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-[1.2rem] border border-slate-800 bg-slate-950 p-2.5 sm:gap-3 sm:rounded-2xl sm:p-3">
            <MapPin className="h-4 w-4 text-[#FFFF00]" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500">
                Ubicacion
              </p>
              <p className="text-[10px] font-black uppercase tracking-tighter text-white sm:text-xs">
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

          <div className="rounded-[1.2rem] border border-fuchsia-500/20 bg-slate-950 p-2.5 sm:rounded-2xl sm:p-3">
            <p className="text-[8px] font-black uppercase tracking-tighter text-fuchsia-300">
              Clientes
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-tighter text-white sm:text-xs">
              {isTakeout ? "No aplica" : `${Number(pax) || 0} personas`}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-[1.3rem] border border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={() => setShowServiceDetails((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                Configuracion del servicio
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100">
                {isTakeout
                  ? `Destino actual: ${takeoutDestination}`
                  : "Ajusta el modo y el destino si hace falta"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
              {showServiceDetails ? "Ocultar" : "Ver"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showServiceDetails ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {showServiceDetails && (
            <div className="border-t border-slate-800 px-4 py-4">
              {!isAssignedTakeout && canHandleTakeout && canHandleDining && Number(tableId) > 0 && (
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

              {isTakeout && (
                <div className="rounded-[1.2rem] border border-amber-300/20 bg-slate-950 p-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase tracking-tighter text-amber-200/70">
                        Destino para llevar
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {takeoutDestinations.map((destination) => (
                          <button
                            key={destination}
                            type="button"
                            onClick={() => setTakeoutDestination(destination)}
                            className={`rounded-xl border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                              takeoutDestination === destination
                                ? "border-amber-300 bg-amber-300 text-slate-950"
                                : "border-slate-800 bg-slate-950 text-slate-300"
                            }`}
                          >
                            {destination}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isDeliverySelected && (
                <div className="mt-3 rounded-[1.2rem] border border-cyan-400/20 bg-slate-950 p-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-4 w-4 text-cyan-300" />
                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase tracking-tighter text-cyan-200/70">
                        Direccion de delivery
                      </p>
                      <textarea
                        value={deliveryAddress}
                        onChange={(event) =>
                          setDeliveryAddress(normalizeDeliveryAddress(event.target.value))
                        }
                        rows={3}
                        placeholder="CALLE, COLONIA, REFERENCIAS..."
                        maxLength={180}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[360px] flex-1 xl:min-h-[430px]">
        <OrderBuilder
          customerName={customerName}
          tableId={isTakeout ? 0 : tableId}
          pax={pax}
          onOrderSent={handleOrderSent}
          serviceMode={isTakeout ? "takeout" : "dine-in"}
          sourceTableId={Number(sourceTableId) > 0 ? Number(sourceTableId) : (Number(tableId) > 0 ? Number(tableId) : null)}
          takeoutDestination={takeoutDestination}
          deliveryAddress={deliveryAddress}
        />
      </div>

    </div>
  );
};

export default OrderPanel;
