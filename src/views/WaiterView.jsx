import React, { useEffect, useState } from "react";
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
// ✅ IMPORTACIÓN DEL NUEVO PERFIL
import WaiterProfile from "../components/waiter/WaiterProfile";

const WaiterView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection("waiter", "admin");
  const { products } = useProducts();
  const { tables } = useTables();
  const { tableId, customerName, setCustomer } = useOrderBuilder();
  const { showToast } = useToast();

  // ✅ ESTADOS PARA EL PERFIL
  const [showProfile, setShowProfile] = useState(false);
  const waiterName = localStorage.getItem("user_name") || "Mesero de Turno";
  const currentUser = { username: waiterName, role: "waiter" };

  const [pax, setPax] = useState("");

  const currentTable = tables.find(
    (t) => t.number === tableId || t.id === tableId || t.Number === tableId
  );
  const maxCapacity = currentTable?.capacity ?? currentTable?.Capacity ?? 10;

  const productsWithImages = products.map((product) => ({
    ...product,
    imageUrl: product.imageUrl?.startsWith("http")
      ? product.imageUrl
      : product.imageUrl
  }));

  const [activeCategory, setActiveCategory] = useState("Todas");

  const categories = [
    "Todas",
    ...new Set(productsWithImages.map((p) => p.category).filter(Boolean))
  ];

  const filteredProducts = activeCategory === "Todas"
    ? productsWithImages
    : productsWithImages.filter((p) => p.category === activeCategory);

  useEffect(() => {
    onOrderReady((order) => {
      showToast(
        `🔔 ¡Atención! El pedido de la Mesa ${order?.tableNumber ?? ""} está LISTO.`,
        "success"
      );
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePaxChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      setPax("");
      return;
    }
    const valNum = parseInt(inputValue, 10);
    if (currentTable) {
      const limit = currentTable.capacity ?? currentTable.Capacity ?? 10;
      if (valNum > limit) {
        showToast(`⚠️ Capacidad máxima: ${limit}`, "error");
        return;
      }
    }
    setPax(valNum);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#00FFFF]">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* ✅ HEADER CLICKEABLE PARA VER PERFIL */}
          <div 
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center md:items-start cursor-pointer group hover:bg-white/5 p-2 rounded-2xl transition-all"
          >
            <h1 className="text-2xl font-black tracking-tighter uppercase text-[#00FFFF] group-hover:scale-105 transition-transform">
              KDS <span className="text-white">Terminal</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              Operador: <span className="text-[#00FFFF] group-hover:underline">{waiterName}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
              isConnected ? "border-[#39FF14]/30 bg-[#39FF14]/5" : "border-red-500/30 bg-red-500/5"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-[#39FF14] animate-pulse" : "bg-red-500"}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? "text-[#39FF14]" : "text-red-400"}`}>
                {isConnected ? "Sistema Online" : "Sin Conexión"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 bg-red-600/10 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white px-5 py-2 rounded-xl font-black text-[10px] transition-all"
            >
              SALIR
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* SECCIÓN 1: UBICACIÓN */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-1.5 h-6 bg-[#FFFF00] rounded-full shadow-[0_0_10px_#FFFF00]" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                  1. Ubicación y Pax
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Seleccionar Mesa</label>
                  <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-1 hover:border-[#FFFF00]/50 transition-all cursor-pointer overflow-hidden">
                    <TableSelector tables={tables} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">
                    Cant. Personas {currentTable && <span className="text-cyan-400">(Máx: {maxCapacity})</span>}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={pax}
                    onChange={handlePaxChange}
                    onFocus={(e) => e.target.select()}
                    className={`w-full bg-slate-950 border-2 rounded-2xl p-4 font-black text-2xl outline-none transition-all ${
                      pax >= maxCapacity ? "text-orange-500 border-orange-500/50" : "text-[#FFFF00] border-slate-800 focus:border-[#FFFF00]"
                    }`}
                  />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nombre del Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Familia García"
                  value={customerName}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-[#00FFFF] transition-all placeholder:text-slate-700"
                />
              </div>
            </section>

            {/* SECCIÓN 2: PRODUCTOS */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] shadow-2xl backdrop-blur-sm">
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                        ? "bg-[#00FFFF] text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]" 
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <ProductList products={filteredProducts} />
            </section>
          </div>

          {/* PANEL LATERAL: ORDEN */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-[100px] h-fit">
            <OrderPanel pax={pax} tableId={tableId} />
          </aside>
        </div>
      </main>

      {/* ✅ MODAL DE PERFIL FLOTANTE */}
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
