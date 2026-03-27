import React from "react";
import { LogOut, ShieldCheck, Activity } from "lucide-react";

const AdminHeader = ({ isConnected }) => {
  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
     <header className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
      {/* Lado Izquierdo: Branding */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
            KDS <span className="text-cyan-400">Control Panel</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
            Administración Central
          </p>
        </div>
      </div>

      {/* Lado Derecho: Botones Estilo Imagen */}
      <div className="flex items-center gap-4">
        {/* Botón de Estado Dinámico (Texto Apilado) */}
        <div
          className={`flex items-center gap-4 px-7 py-2.5 rounded-full border-2 transition-all duration-700 ${
            isConnected
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
              : "border-red-500/20 bg-red-950/20 text-red-400"
          }`}
        >
          <div className={isConnected ? "animate-pulse" : ""}>
            <Activity className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-[0.8] text-left">
            <span className="text-[10px] font-black uppercase tracking-wider"> En Línea</span>
          </div>
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={logout}
          className="flex items-center gap-3 bg-red-950/20 hover:bg-red-900/40 border-2 border-red-500/30 text-red-500 px-7 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10"
        >
          <LogOut className="w-4 h-4" strokeWidth={2.5} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
