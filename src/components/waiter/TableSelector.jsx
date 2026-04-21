import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const getTableTone = (table, isSelected) => {
  if (isSelected) {
    return "border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(74,222,128,0.28)]";
  }

  if ((table?.orderSummary?.readyOrders || 0) > 0) {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }

  if ((table?.orderSummary?.activeOrders || 0) > 0) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-slate-800 bg-slate-950 text-slate-200 hover:border-cyan-400/30 hover:bg-slate-900";
};

const TableSelector = ({
  tables,
  allowOccupiedAssigned = false,
}) => {
  const { setTable, tableId } = useOrderBuilder();
  const tableList = Array.isArray(tables) ? tables : [];
  const diningTables = tableList.filter((table) => Number(table?.number) > 0);
  const isTakeoutSelected = Number(tableId) === 0;

  const handleSelect = (selectedNumber) => {
    const selectedTable = diningTables.find(
      (table) => Number(table.number) === Number(selectedNumber),
    );
    const isOccupied = selectedTable?.isOccupied || selectedTable?.IsOccupied;

    if (selectedTable && isOccupied && !allowOccupiedAssigned) return;
    setTable(selectedNumber);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setTable(0)}
          className={`rounded-[1rem] border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
            isTakeoutSelected
              ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)]"
              : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/40"
          }`}
        >
          Para llevar
        </button>
      </div>

      {diningTables.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-900/35 p-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Sin mesas asignadas por ahora
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7">
          {diningTables.map((table, index) => {
            const isSelected = Number(tableId) === Number(table.number);

            return (
              <button
                key={table.id ?? table.number}
                type="button"
                onClick={() => handleSelect(table.number)}
                className={`group relative aspect-square rounded-[1rem] border p-2 text-left transition-all ${getTableTone(table, isSelected)}`}
                aria-pressed={isSelected}
                aria-label={`Mesa ${table.number}`}
              >
                <span className="absolute left-2 top-2 text-[8px] font-black uppercase tracking-[0.16em] opacity-60">
                  {index + 1}
                </span>

                {(table?.orderSummary?.readyOrders || 0) > 0 && !isSelected && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                )}

                <div className="flex h-full flex-col items-center justify-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] opacity-70">
                    Mesa
                  </span>
                  <span className="mt-1 text-lg font-black leading-none sm:text-xl">
                    {table.number}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TableSelector;
