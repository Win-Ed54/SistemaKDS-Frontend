import React from "react";
import useOrderBuilder from "../hooks/useOrderBuilder";

const TableSelector = ({ tables }) => {
  const { setTable, tableId } = useOrderBuilder(); // Traemos el ID actual del store
  const tableList = Array.isArray(tables) ? tables : [];

  const handleChange = (e) => {
    const selectedNumber = Number(e.target.value);
    // 1. Buscamos la mesa completa para conocer su capacidad
    const selectedTable = tableList.find(t => t.number === selectedNumber);
    
    // 2. Guardamos la mesa en el store
    setTable(selectedNumber);

    // 3. OPCIONAL: Puedes disparar un evento o guardar la capacidad en el store
    // para que el input de PAX se bloquee automáticamente.
    console.log(`Mesa elegida: ${selectedNumber}, Capacidad: ${selectedTable?.capacity || 'N/A'}`);
  };

  return (
    <div className="relative w-full group">
      {/* Icono decorativo Neón */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg xmlns="http://www.w3.org" className="h-4 w-4 text-[#FFFF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
        </svg>
      </div>

      <select
        className="w-full bg-slate-950 text-[#FFFF00] font-black uppercase text-sm p-4 pl-10 rounded-2xl border-none outline-none appearance-none cursor-pointer transition-all hover:bg-slate-900"
        onChange={handleChange}
        value={tableId || ""}
      >
        <option value="" className="text-slate-500 bg-slate-900">-- ELEGIR MESA --</option>
        {tableList.map(table => (
          <option 
            key={table.id} 
            value={table.number} 
            className="text-[#FFFF00] bg-slate-900 font-bold"
          >
            {table.name} (Cap: {table.capacity} Pax)
          </option>
        ))}
      </select>

      {/* Flecha personalizada */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <svg xmlns="http://www.w3.org" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default TableSelector;
