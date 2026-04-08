import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  LogOut,
  PackageCheck,
  Sparkles,
  User,
} from "lucide-react";
import { logout } from "../services/authService";
import { useToast } from "../context/ToastContext";
import { closeTable, getWaiterSummary } from "../services/api.service";
import useOrderBuilder from "../hooks/useOrderBuilder";
import useProducts from "../hooks/useProducts";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useTables from "../hooks/useTables";
import {
  onOrderDelivered,
  onOrderPaid,
  onOrderReady,
} from "../services/signalrService";

import OrderPanel from "../components/waiter/OrderPanel";
import ProductList from "../components/waiter/ProductList";
import ReadyOrdersView from "../components/waiter/ReadyOrdersView";
import TableSelector from "../components/waiter/TableSelector";
import WaiterProfile from "../components/waiter/WaiterProfile";

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
  const [stats, setStats] = useState({ created: 0, delivered: 0 });
  const [cleanupOrders, setCleanupOrders] = useState([]);
  const [cleaningTables, setCleaningTables] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  const waiterName = localStorage.getItem("user_name") || "Mesero de Turno";
  const currentUser = { username: waiterName, role: "waiter" };

  const loadWaiterData = useCallback(async () => {
    try {
      const summary = await getWaiterSummary();
      setStats({
        created: summary?.totalCreated || summary?.totalToday || 0,
        delivered: summary?.totalDelivered || summary?.deliveredToday || 0,
      });
      setCleanupOrders(Array.isArray(summary?.pendingCleanupOrders) ? summary.pendingCleanupOrders : []);
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
    }
  }, []);

  const currentTable = useMemo(
    () =>
      tables.find(
        (table) => table.number === tableId || table.id === tableId || table.Number === tableId
      ),
    [tableId, tables]
  );

  const maxCapacity = currentTable?.capacity ?? currentTable?.Capacity ?? 10;

  const cleanupTasks = useMemo(() => {
    const occupiedTables = new Set(
      tables
        .filter((table) => table.isOccupied || table.IsOccupied)
        .map((table) => table.number ?? table.Number)
    );

    const latestByTable = new Map();

    cleanupOrders.forEach((order) => {
      const tableNumber = order.tableNumber;
      if (!occupiedTables.has(tableNumber)) return;

      const current = latestByTable.get(tableNumber);
      const currentDate = current ? new Date(current.paidAt || current.deliveredAt || current.createdAt) : null;
      const orderDate = new Date(order.paidAt || order.deliveredAt || order.createdAt);

      if (!current || orderDate > currentDate) {
        latestByTable.set(tableNumber, order);
      }
    });

    return Array.from(latestByTable.values()).sort((a, b) => a.tableNumber - b.tableNumber);
  }, [cleanupOrders, tables]);

  const categories = useMemo(
    () => ["Todas", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      activeCategory === "Todas"
        ? products
        : products.filter((product) => product.category === activeCategory),
    [activeCategory, products]
  );

  const handlePaxChange = (event) => {
    const rawValue = String(event.target.value || "").replace(/\D/g, "").slice(0, 2);

    if (!rawValue) {
      setPax("");
      return;
    }

    const value = parseInt(rawValue, 10);

    if (Number.isNaN(value)) {
      setPax("");
      return;
    }

    if (value > maxCapacity) {
      showToast(`Capacidad maxima: ${maxCapacity}`, "error");
      setPax(maxCapacity);
      return;
    }

    if (value < 1) {
      setPax(1);
      return;
    }

    setPax(value);
  };

  const handleCleanupTable = async (tableNumber) => {
    try {
      setCleaningTables((prev) => ({ ...prev, [tableNumber]: true }));
      await closeTable(tableNumber);
      await loadWaiterData();
      showToast(`Mesa ${tableNumber} lista para nuevos comensales`, "success");
    } catch (error) {
      console.error("Error al liberar mesa:", error);
      showToast(`No se pudo liberar la mesa ${tableNumber}`, "error");
    } finally {
      setCleaningTables((prev) => ({ ...prev, [tableNumber]: false }));
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadWaiterData();
    });

    const unsubscribeReady = onOrderReady((order) => {
      showToast(`Mesa ${order?.tableNumber ?? ""} esta LISTA`, "success");
      loadWaiterData();
    });

    const unsubscribeDelivered = onOrderDelivered(() => {
      loadWaiterData();
    });

    const unsubscribePaid = onOrderPaid((order) => {
      showToast(`Mesa ${order?.tableNumber ?? ""} pagada, lista para limpieza`, "success");
      loadWaiterData();
    });

    return () => {
      unsubscribeReady?.();
      unsubscribeDelivered?.();
      unsubscribePaid?.();
    };
  }, [loadWaiterData, showToast]);

  useEffect(() => {
    if (isConnected) {
      void loadWaiterData();
    }
  }, [isConnected, loadWaiterData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#00FFFF]">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md p-2 lg:p-6">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center bg-slate-900/50 border border-slate-800/50 p-3 lg:p-4 rounded-3xl shadow-2xl">
          <div onClick={() => setShowProfile(true)} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400 transition-all">
              <User className="text-cyan-400 w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">
                KDS <span className="text-cyan-400">Terminal</span>
              </h1>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
                Operador: {waiterName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnected ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-500/20 bg-red-950/20"}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-red-500"}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
                {isConnected ? "En linea" : "Sin conexion"}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-6 px-6 border-r border-slate-800/50">
              <div className="text-right">
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Hoy</p>
                <p className="text-sm font-black mt-1">{stats.created}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-cyan-500 font-black uppercase tracking-widest">Entregadas</p>
                <p className="text-sm font-black text-cyan-400 mt-1">{stats.delivered}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:block">Cerrar sesion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-2 lg:p-6 max-w-[1600px] mx-auto pb-32 space-y-6">
        {cleanupTasks.length > 0 && (
          <section className="bg-slate-900/50 border border-emerald-500/20 p-5 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                    Mesas Pagadas Por Limpiar
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">
                    Caja ya cobro, cuando termines libera la mesa
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-3 py-2 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                {cleanupTasks.length} pendientes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cleanupTasks.map((order) => (
                <div key={`${order.id}-${order.tableNumber}`} className="bg-slate-950 border border-slate-800 rounded-[1.75rem] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesa</p>
                      <p className="text-3xl font-black text-white leading-none mt-1">{order.tableNumber}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                      Pagada
                    </span>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                    <p className="text-sm font-black uppercase text-slate-100 mt-1">
                      {order.customerName || "General"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCleanupTable(order.tableNumber)}
                    disabled={cleaningTables[order.tableNumber]}
                    className="w-full py-3 rounded-2xl bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {cleaningTables[order.tableNumber] ? "Liberando..." : "Termine de limpiar"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    1. Seleccionar Mesa
                  </label>
                  <TableSelector tables={tables} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    2. Personas (Max: {maxCapacity})
                  </label>
                  <input
                    type="number"
                    value={pax}
                    onChange={handlePaxChange}
                    onKeyDown={(event) => {
                      if (["e", "E", "+", "-", "."].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    placeholder="Pax..."
                    inputMode="numeric"
                    min="1"
                    max={maxCapacity}
                    step="1"
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 font-black text-2xl text-[#FFFF00] outline-none transition-all focus:border-[#FFFF00]"
                  />
                </div>
              </div>
            </section>

            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                      activeCategory === category ? "bg-[#00FFFF] text-black" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <ProductList products={filteredProducts} />
            </section>
          </div>

          <aside
            className={`fixed lg:sticky top-0 lg:top-[100px] right-0 z-50 w-[90vw] sm:w-[450px] lg:w-full h-full lg:h-[calc(100vh-130px)] bg-slate-900 lg:bg-transparent transition-transform duration-500 shadow-2xl lg:shadow-none ${
              isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            } lg:col-span-5 xl:col-span-4`}
          >
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

          <button
            onClick={() => setIsCartOpen(true)}
            className={`fixed bottom-6 right-6 z-40 lg:hidden w-16 h-16 rounded-full bg-[#00FFFF] text-black shadow-2xl flex items-center justify-center transition-all ${
              isCartOpen ? "scale-0" : "scale-100"
            }`}
          >
            <PackageCheck className="w-8 h-8" />
          </button>
        </div>
      </main>

      {showProfile && <WaiterProfile user={currentUser} onClose={() => setShowProfile(false)} />}
      <ReadyOrdersView />
    </div>
  );
};

export default WaiterView;
