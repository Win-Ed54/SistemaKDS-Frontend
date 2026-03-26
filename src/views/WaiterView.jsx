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
  const categories = useMemo(() => [
    "Todas",
    ...new Set(products.map((p) => p.category).filter(Boolean))
  ], [products]);

  const filteredProducts = useMemo(() => {
    return activeCategory === "Todas"
      ? products
      : products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const currentTable = useMemo(() => 
    tables.find((t) => t.number === tableId || t.id === tableId || t.Number === tableId),
  [tables, tableId]);
  
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
    if (isNaN(val)) { setPax(""); return; }

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
      
      {/* ── HEADER UNIFICADO (Mismo diseño para todos los roles) ── */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          <div onClick={() => setShowProfile(true)} className="flex items-center gap-4 cursor-pointer group hover:bg-white/5 p-2 px-4 rounded-2xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00FFFF]/10 flex items-center justify-center border border-[#00FFFF]/20">
               <User className="text-[#00FFFF] w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase text-white group-hover:text-[#00FFFF] transition-colors leading-none">
                KDS <span className="opacity-50">Terminal</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                Operador: <span className="text-slate-300">{waiterName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Estado de Sincronización */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
              isConnected ? "border-[#39FF14]/30 bg-[#39FF14]/5 text-[#39FF14]" : "border-red-500/30 bg-red-500/5 text-red-500"
            }`}>
              {isConnected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                {isConnected ? "Sincronizado" : "Offline"}
              </span>
            </div>

            {/* Botón Salir Unificado */}
            <button onClick={handleLogout} className="bg-red-600/10 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-90 flex items-center gap-2">
              <LogOut size={14} />
              <span>Salir</span>
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">1. Seleccionar Mesa</label>
                  <TableSelector tables={tables} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">2. Personas (Máximo: {maxCapacity})</label>
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
                {categories.map(cat => (
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
        <WaiterProfile user={currentUser} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default WaiterView;
