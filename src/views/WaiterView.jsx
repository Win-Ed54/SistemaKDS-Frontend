import React, { useEffect, useState, useMemo, useCallback } from "react";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

// Hooks con rutas corregidas según tu estructura de carpetas
import useSignalRConnection from "../hooks/useSignalRConnection";
import useProducts from "../hooks/useProducts";
import useTables from "../hooks/useTables";
import useOrderBuilder from "../hooks/useOrderBuilder";

import { onOrderReady, onOrderDelivered } from "../services/signalrService";

import TableSelector from "../components/waiter/TableSelector";
import ProductList from "../components/waiter/ProductList";
import OrderPanel from "../components/waiter/OrderPanel";
import WaiterProfile from "../components/waiter/WaiterProfile";
import { User, LogOut, PackageCheck, ChevronRight } from "lucide-react";

const WaiterView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection("waiter", "admin");
  const { products } = useProducts();
  const { tables } = useTables();
  const { tableId } = useOrderBuilder();
  const { showToast } = useToast();

  const [showProfile, setShowProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [pax, setPax] = useState("");
  const [myOrders, setMyOrders] = useState([]); 
  const [stats, setStats] = useState({ created: 0, delivered: 0 }); 
  const [isCartOpen, setIsCartOpen] = useState(false);

  const waiterName = localStorage.getItem("user_name") || "Mesero de Turno";
  const currentUser = { username: waiterName, role: "waiter" };

  const loadWaiterData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { 'Authorization': `Bearer ${token}` };
      const API_URL = import.meta.env.VITE_API_URL;

      const myOrdersRes = await fetch(`${API_URL}/orders/my`, { headers });
      if (myOrdersRes.ok) {
        const data = await myOrdersRes.json();
        setMyOrders(data.filter(o => o.status !== 3 && o.status !== "Delivered"));
      }

      const statsRes = await fetch(`${API_URL}/orders/waiter-stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({ created: statsData.totalToday || 0, delivered: statsData.deliveredToday || 0 });
      }
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
    }
  }, []);

  // ✅ Lógica de Pax con límite de capacidad (image_7b4783.png)
  const currentTable = useMemo(() => 
    tables.find((t) => t.number === tableId || t.id === tableId || t.Number === tableId), 
  [tables, tableId]);

  const maxCapacity = currentTable?.capacity ?? currentTable?.Capacity ?? 10;

  const handlePaxChange = (e) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) { setPax(""); return; }
    if (val > maxCapacity) { 
      showToast(`⚠️ Capacidad máxima: ${maxCapacity}`, "error"); 
      setPax(maxCapacity); 
    } else if (val < 1) { 
      setPax(1); 
    } else { 
      setPax(val); 
    }
  };

  useEffect(() => {
    loadWaiterData();
    onOrderReady((order) => {
      showToast(`🔔 ¡Mesa ${order?.tableNumber ?? ""} está LISTA!`, "success");
      loadWaiterData(); 
    });
    onOrderDelivered(() => loadWaiterData());
  }, [loadWaiterData, showToast]);

  const categories = useMemo(() => ["Todas", ...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => activeCategory === "Todas" ? products : products.filter((p) => p.category === activeCategory), [products, activeCategory]);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#00FFFF]">
      {/* HEADER CON BOTÓN SALIR (image_7bb0fb.jpg) */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md p-2 lg:p-6">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center bg-slate-900/50 border border-slate-800/50 p-3 lg:p-4 rounded-3xl shadow-2xl">
          <div onClick={() => setShowProfile(true)} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400 transition-all">
              <User className="text-cyan-400 w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">KDS <span className="text-cyan-400">Terminal</span></h1>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Operador: {waiterName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de conexión en línea */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold uppercase text-slate-400">{isConnected ? 'En línea' : 'Desconectado'}</span>
            </div>

            <div className="hidden sm:flex items-center gap-6 px-6 border-r border-slate-800/50">
              <div className="text-right">
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Hoy</p>
                <p className="text-sm font-black mt-1">{stats.created}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-cyan-500 font-black uppercase tracking-widest">Entregas</p>
                <p className="text-sm font-black text-cyan-400 mt-1">{stats.delivered}</p>
              </div>
            </div>
            
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 px-4 py-2 rounded-2xl transition-all group">
              <span className="text-[10px] font-black uppercase text-red-500 group-hover:text-white hidden md:block">Salir</span>
              <LogOut className="w-4 h-4 text-red-500 group-hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-2 lg:p-6 max-w-[1600px] mx-auto pb-32">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* 1. SELECCIONAR MESA Y 2. PERSONAS (image_7bb0fb.jpg) */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">1. Seleccionar Mesa</label>
                  <TableSelector tables={tables} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">2. Personas (Máx: {maxCapacity})</label>
                  <input 
                    type="number" 
                    value={pax} 
                    onChange={handlePaxChange} 
                    placeholder="Pax..." 
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 font-black text-2xl text-[#FFFF00] outline-none transition-all focus:border-[#FFFF00]" 
                  />
                </div>
              </div>
            </section>

            {/* PRODUCTOS */}
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeCategory === cat ? "bg-[#00FFFF] text-black" : "bg-slate-800 text-slate-500"}`}>{cat}</button>
                ))}
              </div>
              <ProductList products={filteredProducts} />
            </section>
          </div>

          {/* ASIDE RESPONSIVO CON BOTÓN DE OCULTAR (image_7b560f.png) */}
          <aside className={`fixed lg:sticky top-0 lg:top-[100px] right-0 z-50 w-[90vw] sm:w-[450px] lg:w-full h-full lg:h-[calc(100vh-130px)] bg-slate-900 lg:bg-transparent transition-transform duration-500 shadow-2xl lg:shadow-none ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} lg:col-span-5 xl:col-span-4`}>
            
            {/* ✅ BOTÓN DE FLECHA PARA SALIR DEL PEDIDO Y VOLVER A PRODUCTOS */}
            <button 
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden absolute top-1/2 -left-12 w-12 h-16 bg-slate-900 border border-slate-800 border-r-0 rounded-l-3xl flex items-center justify-center text-cyan-400 shadow-xl"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <div className="h-full overflow-y-auto no-scrollbar">
               <OrderPanel pax={pax} tableId={tableId} onOrderSent={() => setIsCartOpen(false)} />
            </div>
          </aside>

          {/* Botón flotante para abrir el pedido (Solo Móvil) */}
          <button onClick={() => setIsCartOpen(true)} className={`fixed bottom-6 right-6 z-40 lg:hidden w-16 h-16 rounded-full bg-[#00FFFF] text-black shadow-2xl flex items-center justify-center transition-all ${isCartOpen ? 'scale-0' : 'scale-100'}`}>
            <PackageCheck className="w-8 h-8" />
          </button>
        </div>
      </main>

      {showProfile && <WaiterProfile user={currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default WaiterView;