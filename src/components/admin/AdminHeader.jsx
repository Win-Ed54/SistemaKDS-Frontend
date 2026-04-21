import React from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { logout } from "../../services/authService";

const AdminHeader = ({ isConnected, lastUpdate, loading = false }) => {
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="rounded-[2.5rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] p-6 shadow-2xl">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
              Ultima sincronizacion: {lastUpdate || "--:--"}
            </span>
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Control operativo central
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
            loading
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
              : "border-slate-800 bg-slate-950 text-slate-400"
          }`}>
            {loading ? "Sincronizando" : "Actualizacion automatica"}
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesion
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
