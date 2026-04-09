import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  ClipboardList,
  LogOut,
  PackageCheck,
  ReceiptText,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { logout } from "../services/authService";
import { useToast } from "../context/ToastContext";
import { closeTable, getWaiterSummary } from "../services/api.service";
import useOrderBuilder from "../hooks/useOrderBuilder";
import useProducts from "../hooks/useProducts";
import useSignalRConnection from "../hooks/useSignalRConnection";
import useTables from "../hooks/useTables";
import { onOrderDelivered, onOrderPaid, onOrderReady } from "../services/signalrService";
import useOrderStore from "../store/orderStore";
import OrderPanel from "../components/waiter/OrderPanel";
import ProductList from "../components/waiter/ProductList";
import ReadyOrdersView from "../components/waiter/ReadyOrdersView";
import TableSelector from "../components/waiter/TableSelector";
import WaiterProfile from "../components/waiter/WaiterProfile";

const TABS = [
  { id: "ordenar", label: "Nueva orden", icon: ReceiptText },
  { id: "listas", label: "Entregar", icon: BellRing },
  { id: "limpieza", label: "Limpiar", icon: Sparkles },
  { id: "actividad", label: "Mis ordenes", icon: ClipboardList },
];

const CATEGORY_IMAGE_MAP = {
  Hamburguesas: encodeURI("/assets/images/categoria/carne.jpg"),
  Pollo: encodeURI("/assets/images/categoria/pollo.jpg"),
  "Acompañamientos": encodeURI("/assets/images/categoria/acompañamientos.jpg"),
  Postres: encodeURI("/assets/images/categoria/postres.jpg"),
  Bebidas: encodeURI("/assets/images/categoria/bebidas.jpg"),
  Ensaladas: encodeURI("/assets/images/categoria/ensaladas.jpg"),
};

const getOrderLocationLabel = (order) =>
  Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar";

const WaiterView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection("waiter", "admin");
  const { products } = useProducts();
  const { tables } = useTables();
  const { tableId, items } = useOrderBuilder();
  const ordersFromStore = useOrderStore((state) => state.orders);
  const setOrderStore = useOrderStore((state) => state.setOrders);
  const { showToast } = useToast();

  const [showProfile, setShowProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [activeTab, setActiveTab] = useState("ordenar");
  const [pax, setPax] = useState("");
  const [stats, setStats] = useState({ created: 0, delivered: 0 });
  const [cleanupOrders, setCleanupOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
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
      const activeOrders = Array.isArray(summary?.myActiveOrders) ? summary.myActiveOrders : [];
      setMyActiveOrders(activeOrders);
      setOrderStore(activeOrders);
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
    }
  }, [setOrderStore]);

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

  const readyOrders = useMemo(
    () =>
      ordersFromStore.filter((order) => {
        const isMine = order.waiterName?.toLowerCase().trim() === waiterName.toLowerCase().trim();
        const isReady = order.status === 2 || String(order.status).toLowerCase() === "ready";
        return isMine && isReady;
      }),
    [ordersFromStore, waiterName]
  );

  const categories = useMemo(
    () => ["Todas", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const visualCategories = useMemo(
    () =>
      categories
        .filter((category) => category !== "Todas")
        .map((category) => ({
          id: category,
          label: category,
          image: CATEGORY_IMAGE_MAP[category] || null,
          total: products.filter((product) => product.category === category).length,
        })),
    [categories, products]
  );

  const filteredProducts = useMemo(
    () =>
      activeCategory === "Todas"
        ? products
        : products.filter((product) => product.category === activeCategory),
    [activeCategory, products]
  );

  const cartTotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
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
      showToast(`${getOrderLocationLabel(order)} esta LISTA`, "success");
      loadWaiterData();
    });

    const unsubscribeDelivered = onOrderDelivered(() => {
      loadWaiterData();
    });

    const unsubscribePaid = onOrderPaid((order) => {
      if (Number(order?.tableNumber) > 0) {
        showToast(`${getOrderLocationLabel(order)} pagada, lista para limpieza`, "success");
      }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white selection:bg-cyan-400/30">
      <header className="sticky top-0 z-50 px-3 pt-3 lg:px-6 lg:pt-6 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto rounded-[2rem] border border-slate-800 bg-slate-900/85 shadow-2xl p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4">
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tighter uppercase leading-none">
                  KDS <span className="text-cyan-400">Terminal</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.28em] mt-1">
                  Operador: {waiterName}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  isConnected
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : "border-red-500/20 bg-red-950/20 text-red-400"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isConnected ? "En linea" : "Sin conexion"}
                </span>
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

        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 pb-32 pt-4 lg:px-6 lg:pb-10 space-y-5">
        <section className="sticky top-[92px] lg:top-[108px] z-40 rounded-[2rem] border border-slate-800 bg-slate-900/90 backdrop-blur-md p-2 shadow-xl overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count =
                tab.id === "listas"
                  ? readyOrders.length
                  : tab.id === "limpieza"
                    ? cleanupTasks.length
                    : tab.id === "actividad"
                      ? myActiveOrders.length
                      : items.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[1.4rem] transition-all border ${
                    activeTab === tab.id
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_10px_30px_rgba(34,211,238,0.25)]"
                      : "bg-slate-950/70 text-slate-300 border-slate-800 hover:border-cyan-500/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                    {tab.label}
                  </span>
                  <span
                    className={`min-w-7 h-7 px-2 rounded-full inline-flex items-center justify-center text-[10px] font-black ${
                      activeTab === tab.id ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-cyan-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {activeTab === "ordenar" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-8 2xl:col-span-9 space-y-5">
              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                      Nueva orden
                    </p>
                    <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                      
                    </h2>
                  </div>

                  {items.length > 0 && (
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="xl:hidden inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-400 text-slate-950 font-black uppercase text-[10px] tracking-[0.2em]"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Ver orden
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StepCard
                    step="1"
                    title="Selecciona mesa"
                    subtitle="Solo se muestran libres para evitar errores"
                  >
                    <TableSelector tables={tables} />
                  </StepCard>

                  <StepCard
                    step="2"
                    title={`Comensales${currentTable ? ` de mesa ${tableId}` : ""}`}
                    subtitle={`Capacidad maxima: ${maxCapacity}`}
                  >
                    <input
                      type="number"
                      value={pax}
                      onChange={handlePaxChange}
                      onKeyDown={(event) => {
                        if (["e", "E", "+", "-", "."].includes(event.key)) {
                          event.preventDefault();
                        }
                      }}
                      placeholder="Cantidad de clientes"
                      inputMode="numeric"
                      min="1"
                      max={maxCapacity}
                      step="1"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-[1.4rem] p-4 font-black text-2xl text-[#FFFF00] outline-none transition-all focus:border-[#FFFF00]"
                    />
                  </StepCard>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                      Productos
                    </p>
                    <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">
                      
                    </h2>
                  </div>
                  <div className="px-3 py-2 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    {filteredProducts.length} visibles
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                        Navegacion visual
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300 mt-2">
                        Toca una imagen para filtrar por categoria
                      </p>
                    </div>

                    {activeCategory !== "Todas" && (
                      <button
                        onClick={() => setActiveCategory("Todas")}
                        className="px-4 py-2 rounded-xl bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-black uppercase tracking-[0.18em] hover:border-cyan-500/30"
                      >
                        Ver todas
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visualCategories.map((category) => {
                      const isActive = activeCategory === category.id;

                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`group relative overflow-hidden rounded-[1.8rem] border text-left transition-all ${
                            isActive
                              ? "border-cyan-300 shadow-[0_16px_40px_rgba(34,211,238,0.24)]"
                              : "border-slate-800 hover:border-cyan-500/30"
                          }`}
                        >
                          <div className="absolute inset-0 bg-slate-950" />

                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.label}
                              className="relative h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="relative h-44 w-full bg-[linear-gradient(135deg,_rgba(34,211,238,0.18),_rgba(15,23,42,1))]" />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

                          <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                                {category.label}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 mt-1">
                                {category.total} productos
                              </p>
                            </div>

                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
                                isActive
                                  ? "bg-cyan-300 text-slate-950"
                                  : "bg-slate-950/80 text-cyan-300 border border-slate-700"
                              }`}
                            >
                              {isActive ? "Activa" : "Seleccionar"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ProductList products={filteredProducts} />
              </section>
            </div>

            <aside className="hidden xl:block xl:col-span-4 2xl:col-span-3 sticky top-[220px]">
              <OrderPanel pax={pax} tableId={tableId} onOrderSent={() => setIsCartOpen(false)} />
            </aside>
          </div>
        )}

        {activeTab === "listas" && (
          <section className="space-y-5">
            <SurfaceHeader
              eyebrow="Entregas"
              title="Pedidos listos para llevar a mesa"
              badge={`${readyOrders.length} pendientes`}
            />
            <ReadyOrdersView variant="inline" />
          </section>
        )}

        {activeTab === "limpieza" && (
          <section className="space-y-5">
            <SurfaceHeader
              eyebrow="Limpieza"
              title="Mesas cobradas que ya puedes liberar"
              badge={`${cleanupTasks.length} pendientes`}
            />

            {cleanupTasks.length === 0 ? (
              <EmptyState
                title="No hay mesas pendientes"
                subtitle="Cuando caja cobre una orden, la veras aqui para limpieza."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cleanupTasks.map((order) => (
                  <div key={`${order.id}-${order.tableNumber}`} className="rounded-[2rem] border border-emerald-500/20 bg-slate-900/70 p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesa</p>
                        <p className="text-3xl font-black text-white mt-2 leading-none">{getOrderLocationLabel(order)}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                        Pagada
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                        <p className="text-sm font-black uppercase text-slate-100 mt-2">
                          {order.customerName || "General"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCleanupTable(order.tableNumber)}
                        disabled={cleaningTables[order.tableNumber]}
                        className="w-full py-4 rounded-[1.4rem] bg-emerald-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-300 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {cleaningTables[order.tableNumber] ? "Liberando..." : "Termine de limpiar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "actividad" && (
          <section className="space-y-5">
            <SurfaceHeader
              eyebrow="Seguimiento"
              title="Tus ordenes activas y el estado de turno"
              badge={`${myActiveOrders.length} activas`}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Creadas hoy" value={stats.created} accent="text-white" />
              <MetricCard label="Entregadas" value={stats.delivered} accent="text-emerald-300" />
              <MetricCard label="En cocina" value={myActiveOrders.filter((o) => [0, 1].includes(Number(o.status))).length} accent="text-yellow-300" />
              <MetricCard label="Esperando entrega" value={readyOrders.length} accent="text-cyan-300" />
            </div>

            {myActiveOrders.length === 0 ? (
              <EmptyState
                title="No tienes ordenes activas"
                subtitle="Cuando abras mesas o cocina avance tus pedidos, apareceran aqui."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {myActiveOrders.map((order) => (
                  <div key={order.id} className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mesa</p>
                        <p className="text-3xl font-black text-white mt-2 leading-none">{getOrderLocationLabel(order)}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-5 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                        <p className="text-sm font-black uppercase text-slate-100 mt-2">
                          {order.customerName || "General"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Productos</p>
                        <div className="mt-2 space-y-1">
                          {order.items?.slice(0, 3).map((item, index) => (
                            <p key={`${order.id}-${index}`} className="text-xs font-bold text-slate-300">
                              {item.quantity}x {item.productName}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {activeTab === "ordenar" && items.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="xl:hidden fixed bottom-5 left-3 right-3 z-40 rounded-[1.6rem] bg-cyan-400 text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.35)] px-5 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950/10 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Orden actual</p>
              <p className="text-xs font-black uppercase">{items.length} lineas en carrito</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">${cartTotal.toFixed(2)}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]">Abrir</p>
          </div>
        </button>
      )}

      {activeTab === "ordenar" && (
        <aside
          className={`xl:hidden fixed inset-y-0 right-0 z-50 w-[92vw] max-w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl transition-transform duration-500 ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Orden actual
                </p>
                <p className="text-sm font-black uppercase text-white mt-1">
                  Panel de confirmacion
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-[0.18em] hover:border-cyan-500/30 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
                Cerrar
              </button>
            </div>
            <OrderPanel pax={pax} tableId={tableId} onOrderSent={() => setIsCartOpen(false)} />
          </div>
        </aside>
      )}

      {showProfile && <WaiterProfile user={currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
};

const MetricCard = ({ label, value, accent }) => (
  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/75 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className={`text-2xl sm:text-3xl font-black mt-3 ${accent}`}>{value}</p>
  </div>
);

const StepCard = ({ step, title, subtitle, children }) => (
  <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/70 p-4 md:p-5">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-black flex items-center justify-center shrink-0">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">{title}</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const SurfaceHeader = ({ eyebrow, title, badge }) => (
  <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
      <h2 className="text-xl font-black tracking-tighter uppercase text-white mt-2">{title}</h2>
    </div>
    <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em]">
      {badge}
    </div>
  </div>
);

const EmptyState = ({ title, subtitle }) => (
  <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{title}</p>
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 mt-3">{subtitle}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const numeric = typeof status === "string"
    ? { pending: 0, preparing: 1, ready: 2, delivered: 3 }[status.toLowerCase()]
    : status;

  const config = {
    0: { text: "Pendiente", className: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" },
    1: { text: "Preparando", className: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
    2: { text: "Lista", className: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    3: { text: "Entregada", className: "text-slate-300 bg-slate-700/40 border-slate-700" },
  };

  const current = config[numeric] || config[0];

  return (
    <span className={`text-[9px] font-black uppercase px-3 py-2 rounded-full border ${current.className}`}>
      {current.text}
    </span>
  );
};

export default WaiterView;
