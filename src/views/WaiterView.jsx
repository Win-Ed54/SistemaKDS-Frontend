import React, { useEffect, useState, useMemo } from "react";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

import useSignalRConnection from "../hooks/useSignalRConnection";
import useProducts from "../hooks/useProducts";
import useTables from "../hooks/useTables";
import useOrderBuilder from "../hooks/useOrderBuilder";

import { onOrderReady } from "../services/signalrService";

import TableSelector from "../components/waiter/TableSelector";
import ProductList from "../components/waiter/ProductList";
import OrderPanel from "../components/waiter/OrderPanel";
import WaiterProfile from "../components/waiter/WaiterProfile";
import { User, LogOut, Wifi, WifiOff } from "lucide-react";

const WaiterView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection("waiter", "admin");
  const { products } = useProducts();
  const { tables } = useTables();
  const { tableId, items } = useOrderBuilder();
  const { showToast } = useToast();

  // 1. ✅ ESTADOS (Al inicio para evitar errores de inicialización)
  const [showProfile, setShowProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [pax, setPax] = useState("");

  const waiterName = localStorage.getItem("user_name") || "Mesero de Turno";
  const currentUser = { username: waiterName, role: "waiter" };

  // 2. ✅ LÓGICA CALCULADA (useMemo para fluidez en tablets)
  const categories = useMemo(
    () => [
      "Todas",
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return activeCategory === "Todas"
      ? products
      : products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const currentTable = useMemo(
    () =>
      tables.find(
        (t) => t.number === tableId || t.id === tableId || t.Number === tableId,
      ),
    [tables, tableId],
  );

  const maxCapacity = currentTable?.capacity ?? currentTable?.Capacity ?? 10;

  // 3. ✅ EFECTOS: Notificaciones en tiempo real
  useEffect(() => {
    onOrderReady((order) => {
      showToast(`🔔 ¡Mesa ${order?.tableNumber ?? ""} está LISTA!`, "success");
    });
  }, [showToast]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ✅ CONTROL DE PAX: Bloqueo según capacidad de mesa
  const handlePaxChange = (e) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      setPax("");
      return;
    }

    if (val > maxCapacity) {
      showToast(`⚠️ Capacidad máxima: ${maxCapacity} personas`, "error");
      setPax(maxCapacity);
    } else if (val < 1) {
      setPax(1);
    } else {
      setPax(val);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#00FFFF]">
      {/* ── HEADER UNIFICADO (Estilo KDS Control Panel) ── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center bg-slate-900/50 border border-slate-800/50 p-4 px-8 rounded-[2.5rem] shadow-2xl">
          {/* Lado Izquierdo: Logo e Info */}
          <div
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-5 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-cyan-500/20 flex items-center justify-center shadow-lg group-hover:border-cyan-400 transition-all">
              <User className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none uppercase">
                KDS <span className="text-cyan-400">Terminal</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
                Operador: <span className="text-slate-300">{waiterName}</span>
              </p>
            </div>
          </div>

          {/* Lado Derecho: Botones Estilo Imagen */}
          <div className="flex items-center gap-4">
            {/* Botón EN LÍNEA - Texto Apilado */}
            <div
              className={`flex items-center gap-4 px-7 py-2.5 rounded-full border-2 transition-all duration-700 ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                  : "border-red-500/30 bg-red-950/20 text-red-400"
              }`}
            >
              <div className={isConnected ? "animate-pulse" : ""}>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <div className="flex flex-col leading-[0.8] text-left">
                <span className="text-[11px] font-black uppercase tracking-wider">
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider">
                   En Línea
                </span>
              </div>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
            onClick={handleLogout}
            className="flex items-center gap-3 bg-red-950/20 hover:bg-red-900/40 border-2 border-red-500/30 text-red-500 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-[1600px] mx-auto pb-24">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* SECCIÓN MESAS Y PAX */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    1. Seleccionar Mesa
                  </label>
                  <TableSelector tables={tables} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    2. Personas (Máximo: {maxCapacity})
                  </label>
                  <input
                    type="number"
                    value={pax}
                    onChange={handlePaxChange}
                    placeholder="Cantidad..."
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 font-black text-2xl text-[#FFFF00] focus:border-[#FFFF00] outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN MENÚ */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? "bg-[#00FFFF] text-black shadow-[0_0_15px_#00FFFF44]"
                        : "bg-slate-800 text-slate-500 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <ProductList products={filteredProducts} />
            </section>
          </div>

          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-[100px] h-[calc(100vh-130px)]">
            <OrderPanel pax={pax} tableId={tableId} />
          </aside>
        </div>
      </main>

      {showProfile && (
        <WaiterProfile
          user={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default WaiterView;
