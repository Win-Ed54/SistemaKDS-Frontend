import React from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { logout } from "../../services/authService";

const AdminHeader = ({ isConnected, lastUpdate, loading = false }) => {
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="rounded-[1.4rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.10),_transparent_24%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] px-4 py-3 shadow-2xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase text-white leading-none sm:text-xl">
              KDS <span className="text-cyan-400">Control Panel</span>
            </h1>
            <p className="mt-0.5 text-[8px] text-slate-500 font-bold uppercase tracking-[0.24em]">
              Administracion Central
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            Sync {lastUpdate || "--:--"}
          </span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
            5 areas
          </span>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                : "border-red-500/20 bg-red-950/20 text-red-400"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-[9px] font-black uppercase tracking-wider">
              {isConnected ? "En linea" : "Sin conexion"}
            </span>
          </div>

          <div className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] ${
            loading
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
              : "border-slate-800 bg-slate-950 text-slate-400"
          }`}>
            {loading ? "Sincronizando" : "Auto"}
          </div>

          <div className="h-8 w-px bg-slate-800" />
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-red-300 transition-all hover:bg-red-500 hover:text-white"
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
