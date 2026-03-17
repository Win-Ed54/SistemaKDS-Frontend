import React from "react";
import { Users } from "lucide-react";

const TableStatus = ({ tables }) => {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1.5 h-6 bg-emerald-400 rounded-full shadow-[0_0_10px_#39FF14]"></span>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Estado de Mesas</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div 
            key={table.id} 
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              table.isOccupied 
                ? "bg-red-500/5 border-red-500/30 grayscale-[0.5]" 
                : "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400"
            }`}
          >
            <span className="text-[9px] font-black text-slate-500 uppercase">#{table.number}</span>
            <span className={`text-xl font-black ${table.isOccupied ? 'text-red-400' : 'text-emerald-400'}`}>
              {table.isOccupied ? 'OCUPADA' : 'LIBRE'}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
              <Users className="w-3 h-3" /> {table.capacity}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TableStatus;
