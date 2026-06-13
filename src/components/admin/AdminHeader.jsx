import React from "react";
import { ShieldCheck } from "lucide-react";
import { logout } from "../../services/authService";
import { getAppPath } from "../../config/appPaths";
import ModuleHeader from "../common/ModuleHeader";

const AdminHeader = ({ isConnected, lastUpdate, loading = false }) => {
  const handleLogout = () => {
    logout();
    window.location.href = getAppPath("/login");
  };

  return (
    <ModuleHeader
      icon={ShieldCheck}
      title="KDS Admin"
      subtitle="Administracion central"
      isConnected={isConnected}
      onLogout={handleLogout}
      maxWidthClassName="max-w-[1700px]"
      rightContent={
        <>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            Sync {lastUpdate || "--:--"}
          </span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
            6 areas
          </span>
          <div className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] ${
            loading
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
              : "border-slate-800 bg-slate-950 text-slate-400"
          }`}>
            {loading ? "Sincronizando" : "Auto"}
          </div>
        </>
      }
    />
  );
};

export default AdminHeader;
