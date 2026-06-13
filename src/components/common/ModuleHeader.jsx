import React from "react";
import { LogOut } from "lucide-react";

const ModuleHeader = ({
  icon: Icon,
  title,
  subtitle,
  accent = {
    border: "border-cyan-500/30",
    background: "bg-cyan-500/10",
    text: "text-cyan-300",
  },
  isConnected,
  onLogout,
  leftFooter = null,
  rightContent = null,
  sticky = false,
  maxWidthClassName = "max-w-[1600px]",
}) => {
  const headerBody = (
    <div className={`${maxWidthClassName} mx-auto overflow-hidden rounded-[1.4rem] border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.08),_transparent_22%),linear-gradient(135deg,_rgba(10,18,32,0.98)_0%,_rgba(5,8,22,0.98)_100%)] px-4 py-3 shadow-[0_20px_45px_rgba(2,6,23,0.45)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border ${accent.border} ${accent.background} shadow-[0_0_18px_rgba(103,232,249,0.12)]`}>
            <Icon className={`h-5 w-5 ${accent.text}`} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none text-white sm:text-xl">
              {title}
            </h1>
            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">
              {subtitle}
            </p>
            {leftFooter ? <div className="mt-2">{leftFooter}</div> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {rightContent}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-[0_0_16px_rgba(15,23,42,0.2)] ${
              isConnected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/20 bg-red-400/10 text-red-300"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {isConnected ? "Conectado" : "Sin conexion"}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-red-200 transition-all hover:bg-red-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:block">Cerrar sesion</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (sticky) {
    return <header className="sticky top-0 z-50 px-3 pt-3 backdrop-blur-md lg:px-5 lg:pt-4">{headerBody}</header>;
  }

  return <header className="px-3 pt-3 lg:px-5 lg:pt-4">{headerBody}</header>;
};

export default ModuleHeader;
