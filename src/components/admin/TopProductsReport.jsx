import React, { useEffect, useState, useCallback } from "react";
import { getTopProducts } from "../../services/api.service";

// Colores neón para las barras — mismo lenguaje visual que el resto del admin
const BAR_COLORS = [
  { bar: "#00FFFF", glow: "rgba(0,255,255,0.3)",   text: "text-cyan-400"    },
  { bar: "#39FF14", glow: "rgba(57,255,20,0.3)",    text: "text-[#39FF14]"  },
  { bar: "#FFFF00", glow: "rgba(255,255,0,0.3)",    text: "text-yellow-400" },
  { bar: "#FF6B00", glow: "rgba(255,107,0,0.3)",    text: "text-orange-400" },
  { bar: "#FF0080", glow: "rgba(255,0,128,0.3)",    text: "text-pink-400"   },
  { bar: "#A855F7", glow: "rgba(168,85,247,0.3)",   text: "text-purple-400" },
  { bar: "#3B82F6", glow: "rgba(59,130,246,0.3)",   text: "text-blue-400"   },
  { bar: "#F97316", glow: "rgba(249,115,22,0.3)",   text: "text-orange-300" },
  { bar: "#10B981", glow: "rgba(16,185,129,0.3)",   text: "text-emerald-400"},
  { bar: "#EF4444", glow: "rgba(239,68,68,0.3)",    text: "text-red-400"    },
];

const TopProductsReport = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit]     = useState(10);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTopProducts(limit);
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      setError("No se pudo cargar el reporte.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  const maxSold = data[0]?.totalSold ?? 1;

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#FF6B00] rounded-full shadow-[0_0_10px_#FF6B00]" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Platillos más vendidos
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de límite */}
          <div className="flex gap-1">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all border ${
                  limit === n
                    ? "bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]"
                    : "border-slate-700 text-slate-500 hover:border-slate-600"
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>

          {/* Botón refrescar */}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 text-[10px] font-black uppercase transition-all disabled:opacity-40"
          >
            <svg className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* ESTADOS */}
      {loading && (
        <div className="flex items-center justify-center h-48 gap-3">
          <div className="w-6 h-6 border-2 border-[#FF6B00]/20 border-t-[#FF6B00] rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Calculando...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center h-48">
          <p className="text-red-400 text-sm font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Sin datos aún</p>
          <p className="text-slate-600 text-xs">Las órdenes entregadas aparecerán aquí</p>
        </div>
      )}

      {/* GRÁFICA DE BARRAS HORIZONTALES */}
      {!loading && !error && data.length > 0 && (
        <div className="space-y-3">
          {data.map((item, index) => {
            const color     = BAR_COLORS[index % BAR_COLORS.length];
            const pct       = Math.round((item.totalSold / maxSold) * 100);
            const isTop     = index === 0;

            return (
              <div key={item.productId} className="group">
                {/* Nombre + métricas */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Número de ranking */}
                    <span className={`text-[10px] font-black w-5 text-center shrink-0 ${
                      isTop ? "text-[#FF6B00]" : "text-slate-600"
                    }`}>
                      #{index + 1}
                    </span>
                    <span className={`text-sm font-black truncate uppercase ${
                      isTop ? "text-white" : "text-slate-300"
                    }`}>
                      {item.productName}
                    </span>
                    {isTop && (
                      <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FF6B00]/20 border border-[#FF6B00]/50 text-[#FF6B00]">
                        #1
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-500 font-black">
                      {item.totalOrders} órdenes
                    </span>
                    <span className={`text-lg font-black ${color.text}`}>
                      {item.totalSold}
                    </span>
                    <span className="text-[10px] text-slate-600 font-black">uds</span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: color.bar,
                      boxShadow: `0 0 8px ${color.glow}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER — total de ventas */}
      {!loading && data.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            Total unidades vendidas
          </span>
          <span className="text-xl font-black text-white">
            {data.reduce((acc, item) => acc + item.totalSold, 0).toLocaleString()}
          </span>
        </div>
      )}
    </section>
  );
};

export default TopProductsReport;
