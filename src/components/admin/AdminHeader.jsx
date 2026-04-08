import React from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { logout } from "../../services/authService";

const AdminHeader = ({ isConnected }) => {
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">
            KDS <span className="text-cyan-400">Control Panel</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
            Administracion Central
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
            isConnected
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
              : "border-red-500/20 bg-red-950/20 text-red-400"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isConnected ? "En linea" : "Sin conexion"}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
