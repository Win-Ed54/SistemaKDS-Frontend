import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const TableSelector = ({
  tables,
  allowOccupiedAssigned = false,
  placeholder = "-- SELECCIONAR UBICACION --",
}) => {
  const { setTable, tableId } = useOrderBuilder();
  const tableList = Array.isArray(tables) ? tables : [];
  const hasSelectedLocation =
    tableId !== null && tableId !== undefined && tableId !== "";

  const handleChange = (event) => {
    const selectedNumber = Number(event.target.value);
    const selectedTable = tableList.find((table) => table.number === selectedNumber);
    const isOccupied = selectedTable?.isOccupied || selectedTable?.IsOccupied;

    if (isOccupied && !allowOccupiedAssigned) return;
    setTable(selectedNumber);
  };

  return (
    <div className="relative w-full group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <svg
          className={`h-5 w-5 transition-colors duration-300 ${hasSelectedLocation ? "text-[#39FF14]" : "text-[#FFFF00]"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1"
          />
        </svg>
      </div>

      <select
        className={`w-full bg-slate-950 font-black uppercase text-xs p-5 pl-12 rounded-[1.5rem] outline-none appearance-none cursor-pointer transition-all border-2 ${
          hasSelectedLocation
            ? "text-[#39FF14] border-[#39FF14]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]"
            : "text-[#FFFF00] border-slate-800 hover:border-[#FFFF00]/50"
        }`}
        onChange={handleChange}
        value={tableId ?? ""}
      >
        <option value="" className="text-slate-600 bg-slate-900">
          {placeholder}
        </option>

        <option value="0" className="font-bold bg-slate-900 text-cyan-400">
          PARA LLEVAR
        </option>

        {tableList.map((table) => {
          const isOccupied = table.isOccupied || table.IsOccupied;
          const isReady = table.hasReadyOrder;
          const isSelectable = !isOccupied || allowOccupiedAssigned;
          const totalOrdersToday = Number(table?.orderSummary?.totalOrdersToday || 0);
          const activeOrders = Number(table?.orderSummary?.activeOrders || 0);

          return (
            <option
              key={table.id}
              value={table.number}
              disabled={!isSelectable}
              className={`font-bold bg-slate-900 ${
                isOccupied
                  ? allowOccupiedAssigned
                    ? "text-cyan-300"
                    : "text-red-500/50"
                  : isReady
                    ? "text-[#00FFFF]"
                    : "text-[#FFFF00]"
              }`}
            >
              {table.name}
              {isOccupied ? " (ASIGNADA)" : ` (Cap: ${table.capacity} Pax)`}
              {totalOrdersToday > 0 ? ` ${totalOrdersToday} ORD` : ""}
              {activeOrders > 0 ? ` ${activeOrders} EN CURSO` : ""}
              {isReady ? " PEDIDO LISTO" : ""}
            </option>
          );
        })}
      </select>

      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${hasSelectedLocation ? "text-[#39FF14]" : "text-slate-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {hasSelectedLocation && (
        <div className="absolute -bottom-1 left-6 right-6 h-[2px] bg-[#39FF14] shadow-[0_0_10px_#39FF14] animate-pulse" />
      )}
    </div>
  );
};

export default TableSelector;
