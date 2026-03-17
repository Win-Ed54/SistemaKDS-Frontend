import React from "react";

const StatsCard = ({ title, value, color }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-slate-600 transition-all">
    <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${color.replace('text-', 'bg-')}`}></div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{title}</p>
    <p className={`text-5xl font-black tracking-tighter ${color}`}>{value}</p>
  </div>
);

export default StatsCard;
