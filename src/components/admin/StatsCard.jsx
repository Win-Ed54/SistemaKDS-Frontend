import React from "react";

const StatsCard = ({ title, value, color }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/85 p-6 shadow-xl transition-all hover:border-slate-700">
    <div className={`absolute right-0 top-0 h-24 w-24 blur-[60px] opacity-10 ${color.replace("text-", "bg-")}`}></div>
    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">{title}</p>
    <p className={`mt-4 text-4xl sm:text-5xl font-black tracking-tighter ${color}`}>{value}</p>
  </div>
);

export default StatsCard;
