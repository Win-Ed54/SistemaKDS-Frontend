import React, { useState } from "react";
import { updateProductStock } from "../../services/api.service";

const InventoryManager = ({ products, refresh }) => {
  // id del producto que tiene el input abierto
  const [editing, setEditing] = useState(null);
  // valor del input por producto
  const [inputValues, setInputValues] = useState({});
  // estado de carga por producto
  const [loading, setLoading] = useState({});

  const handleEdit = (product) => {
    setEditing(product.id);
    // Pre-llenar con el stock actual como punto de partida
    setInputValues((prev) => ({ ...prev, [product.id]: product.stock }));
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async (product) => {
    const newStock = parseInt(inputValues[product.id]);

    if (isNaN(newStock) || newStock < 0) {
      alert("Ingresa un número válido mayor o igual a 0.");
      return;
    }

    setLoading((prev) => ({ ...prev, [product.id]: true }));

    try {
      await updateProductStock(product.id, newStock);
      setEditing(null);
      refresh(); // recarga el inventario desde la API
    } catch (err) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_#00FFFF]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Control de Inventario
          </h2>
        </div>
        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
          {products.length} productos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="pb-4">Producto</th>
              <th className="pb-4 text-center">Stock</th>
              <th className="pb-4 text-center">Estado</th>
              <th className="pb-4 text-right">Reabastecer</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {products.map((p) => {
              const isEditing = editing === p.id;
              const isLoading = loading[p.id];

              return (
                <tr key={p.id} className="group hover:bg-slate-800/30 transition-all">

                  {/* NOMBRE */}
                  <td className="py-4 font-bold text-sm text-slate-200 uppercase pr-4">
                    {p.name}
                  </td>

                  {/* STOCK ACTUAL */}
                  <td className={`py-4 text-center font-black text-xl ${
                    p.stock <= 0 ? "text-red-500" :
                    p.stock <= 10 ? "text-yellow-400" :
                    "text-white"
                  }`}>
                    {p.stock}
                  </td>

                  {/* ESTADO */}
                  <td className="py-4 text-center">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${
                      p.stock <= 0  ? "bg-red-500/10 border-red-500 text-red-500" :
                      p.stock <= 10 ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" :
                      "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                    }`}>
                      {p.stock <= 0 ? "AGOTADO" : p.stock <= 10 ? "BAJO" : "OK"}
                    </span>
                  </td>

                  {/* ACCIÓN */}
                  <td className="py-4 text-right">
                    {!isEditing ? (
                      // Botón para abrir el input
                      <button
                        onClick={() => handleEdit(p)}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg
                          bg-slate-800 hover:bg-slate-700 border border-slate-700
                          hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400
                          text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 4v16m8-8H4" />
                        </svg>
                        Ajustar
                      </button>
                    ) : (
                      // Input + botones Guardar / Cancelar
                      <div className="flex items-center gap-2 justify-end">
                        <input
                          type="number"
                          min="0"
                          value={inputValues[p.id] ?? p.stock}
                          onChange={(e) =>
                            setInputValues((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(p);
                            if (e.key === "Escape") handleCancel();
                          }}
                          autoFocus
                          className="w-20 bg-slate-950 border border-cyan-500/50 rounded-lg
                            px-2 py-1 text-center text-cyan-400 font-black text-sm
                            focus:outline-none focus:border-cyan-400 transition-all"
                        />

                        {/* Guardar */}
                        <button
                          onClick={() => handleSave(p)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500
                            text-cyan-400 hover:bg-cyan-500/30 text-[10px] font-black
                            uppercase transition-all disabled:opacity-40"
                        >
                          {isLoading ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : "✓"}
                        </button>

                        {/* Cancelar */}
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700
                            text-slate-400 hover:text-white text-[10px] font-black
                            uppercase transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InventoryManager;
