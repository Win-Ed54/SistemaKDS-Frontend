import React from "react";
import { Users, CheckCircle2, Lock } from "lucide-react";

const TableStatus = ({ tables, onReleaseTable }) => {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#39FF14] rounded-full shadow-[0_0_15px_#39FF14]"></span>
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Estado de Salón</h2>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Libre
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black text-red-500 uppercase">
                <div className="w-2 h-2 bg-red-500 rounded-full" /> Ocupada
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {tables.map((table) => {
          const isOccupied = table.isOccupied || table.IsOccupied;
          const isBeingCleaned = table.isBeingCleaned || table.IsBeingCleaned;
          const releaseBlockedReason = table.releaseBlockedReason || "";
          const canRelease = Boolean(table.releaseAction);
          
          return (
            <div 
              key={table.id} 
              className={`relative group p-5 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                isOccupied 
                  ? "bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]" 
                  : "bg-slate-950 border-slate-800 hover:border-[#39FF14]/40 hover:shadow-[0_0_25px_rgba(57,255,20,0.1)]"
              }`}
            >
              {/* Indicador de Capacidad */}
              <div className="absolute top-4 right-4 flex items-center gap-1 text-[8px] font-black text-slate-600">
                <Users className="w-3 h-3" /> {table.capacity}
              </div>

              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mesa {table.number}</span>
              
              <div className={`flex flex-col items-center transition-all ${isOccupied ? 'scale-90 mb-8' : 'scale-100'}`}>
                {isOccupied ? (
                    <Lock className="w-6 h-6 text-red-500/40 mb-1" />
                ) : (
                    <CheckCircle2 className="w-6 h-6 text-[#39FF14]/40 mb-1" />
                )}
                <span className={`text-[11px] font-black tracking-widest ${isOccupied ? 'text-red-400' : 'text-[#39FF14]'}`}>
                  {isOccupied ? 'OCUPADA' : 'DISPONIBLE'}
                </span>
              </div>

              {/*BOTÓN DE ACCIÓN: Solo aparece si está ocupada */}
              {isOccupied && (
                <>
                  <button
                    onClick={() => (canRelease ? onReleaseTable(table) : undefined)}
                    disabled={!canRelease}
                    className={`absolute bottom-4 left-4 right-4 py-2.5 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
                      canRelease
                        ? "bg-red-500 hover:bg-red-400 active:scale-95 shadow-red-500/20"
                        : "bg-slate-800 text-slate-400 cursor-not-allowed shadow-slate-950/20"
                    }`}
                  >
                    {canRelease
                      ? isBeingCleaned
                        ? "Terminar limpieza"
                        : "Liberar"
                      : "Bloqueada"}
                  </button>
                  {!canRelease && (
                    <p className="absolute bottom-16 left-4 right-4 text-center text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">
                      {releaseBlockedReason}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TableStatus;
