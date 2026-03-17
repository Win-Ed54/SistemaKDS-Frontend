// src/components/admin/InventoryManager.jsx
import React from "react";

const InventoryManager = ({ products, refresh }) => {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_#00FFFF]"></span>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Control de Inventario</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="pb-4">Producto</th>
              <th className="pb-4 text-center">Stock</th>
              <th className="pb-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {products.map(p => (
              <tr key={p.id} className="group hover:bg-slate-800/30 transition-all">
                <td className="py-4 font-bold text-sm text-slate-200 uppercase">{p.name}</td>
                <td className={`py-4 text-center font-black text-xl ${p.stock <= 5 ? 'text-red-500' : 'text-white'}`}>
                  {p.stock}
                </td>
                <td className="py-4">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${
                    p.stock <= 0 ? 'bg-red-500/10 border-red-500 text-red-500' : 
                    p.stock <= 10 ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 
                    'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                  }`}>
                    {p.stock <= 0 ? 'AGOTADO' : p.stock <= 10 ? 'BAJO' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InventoryManager;
