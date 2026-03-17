import React from "react";
import { LogOut, ShieldCheck, Activity } from "lucide-react";

const AdminHeader = ({ isConnected }) => {
  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <header className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            KDS <span className="text-cyan-400">Control Panel</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Administración Central</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
            {isConnected ? "En Línea" : "Desconectado"}
          </span>
        </div>
        
        <button 
          onClick={logout}
          className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white px-6 py-2.5 rounded-2xl font-black text-[10px] transition-all uppercase"
        >
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
