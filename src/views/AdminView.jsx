import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { ArrowUp, BarChart3, Boxes, ClipboardList, LayoutDashboard, Settings2, Users, TrendingUp } from "lucide-react";
import {
  closeTable,
  getActiveOrders,
  getOrderHistory,
  getProducts,
  getStaff,
  getTables,
  unseatTable,
} from "../services/api.service";
import { useToast } from "../context/ToastContext";
import { subscribeConnectionStatus } from "../services/signalrService";
import useKdsSettings from "../hooks/useKdsSettings";
import { getAuthValue } from "../services/authStorage";
import { readViewState, writeViewState } from "../utils/viewStateStorage";

import AdminHeader from "../components/admin/AdminHeader";
import AdministrativeLog from "../components/admin/AdministrativeLog";
import InventoryManager from "../components/admin/InventoryManager";
import KdsSettingsPanel from "../components/admin/KdsSettingsPanel";
import OrdersSummary from "../components/admin/OrdersSummary";
import StatsCard from "../components/admin/StatsCard";
import StaffAssignmentsPanel from "../components/admin/StaffAssignmentsPanel";
import TableStatus from "../components/admin/TableStatus";
import TopProductsReport from "../components/admin/TopProductsReport";
import ConfirmDialog from "../components/common/ConfirmDialog";

const READY_INCIDENT_MINUTES = 10;
const PAYMENT_INCIDENT_MINUTES = 15;

const isSameLocalDay = (value, referenceDate = new Date()) => {
  if (!value) return false;

  const target = new Date(value);

  return (
    target.getFullYear() === referenceDate.getFullYear() &&
    target.getMonth() === referenceDate.getMonth() &&
    target.getDate() === referenceDate.getDate()
  );
};

const getOrderStatusNumber = (status) => {
  if (typeof status === "number") return status;

  const statusMap = {
    pending: 0,
    preparing: 1,
    ready: 2,
    delivered: 3,
    cancelled: 4,
  };

  return statusMap[String(status || "").toLowerCase()] ?? -1;
};

const getMinutesSince = (value, reference = Date.now()) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((reference - timestamp) / 60000));
};

const AdminView = () => {
  const adminUserName = getAuthValue("user_name") || "admin";
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState(() =>
    readViewState("admin", adminUserName, "activeSection", "overview"),
  );
  const [pendingTableRelease, setPendingTableRelease] = useState(null);
  const [releasingTable, setReleasingTable] = useState(false);
  const refreshTimeoutRef = useRef(null);

  const { connection, isConnected } = useSignalRConnection("admin");
  const { showToast } = useToast();
  const { settings, refreshSettings } = useKdsSettings();
  const isDev = import.meta.env.DEV;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [ordersRes, tablesRes, productsRes, historyRes, staffRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts(),
        getOrderHistory(),
        getStaff(),
      ]);

      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
      setStaff(Array.isArray(staffRes) ? staffRes : []);

      setProducts((currentProducts) => {
        if (!Array.isArray(productsRes)) return [];

        return productsRes.map((newProduct) => {
          const oldProduct = currentProducts.find(
            (product) => (product.id || product._id) === (newProduct.id || newProduct._id)
          );

          if ((!newProduct.imageUrl || newProduct.imageUrl.trim() === "") && oldProduct?.imageUrl) {
            return { ...newProduct, imageUrl: oldProduct.imageUrl };
          }

          return newProduct;
        });
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      if (isDev) console.error("[ADMIN ERROR]:", err);
    } finally {
      setLoading(false);
    }
  }, [isDev]);

  const scheduleSilentLoad = useCallback(() => {
    if (refreshTimeoutRef.current) return;

    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      loadData(true);
    }, 350);
  }, [loadData]);

  const handleCloseTable = async () => {
    if (!pendingTableRelease) return;

    try {
      setReleasingTable(true);
      const tableNumber = Number(
        pendingTableRelease.number ?? pendingTableRelease.Number ?? pendingTableRelease,
      );
      const isBeingCleaned = Boolean(
        pendingTableRelease.isBeingCleaned ?? pendingTableRelease.IsBeingCleaned,
      );
      const hasActiveOrders = orders.some(
        (order) => Number(order?.tableNumber) === tableNumber && getOrderStatusNumber(order?.status) < 3,
      );
      const hasPendingPayment = history.some(
        (order) =>
          Number(order?.tableNumber) === tableNumber &&
          getOrderStatusNumber(order?.status) === 3 &&
          !order?.isPaid,
      );
      const hasPendingCleanup = history.some(
        (order) =>
          Number(order?.tableNumber) === tableNumber &&
          getOrderStatusNumber(order?.status) === 3 &&
          order?.isPaid &&
          !order?.isCleanupCompleted,
      );

      if (isBeingCleaned || hasPendingCleanup) {
        await closeTable(tableNumber);
      } else if (!hasActiveOrders && !hasPendingPayment) {
        await unseatTable(tableNumber);
      } else {
        throw new Error(
          hasActiveOrders
            ? `La mesa ${tableNumber} todavia tiene ordenes activas.`
            : `La mesa ${tableNumber} tiene cobros pendientes.`,
        );
      }

      scheduleSilentLoad();
      showToast(`Mesa ${tableNumber} liberada correctamente`, "success");
      setPendingTableRelease(null);
    } catch (error) {
      scheduleSilentLoad();
      showToast(error?.message || "Error al liberar la mesa", "error");
    } finally {
      setReleasingTable(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  useEffect(() => {
    writeViewState("admin", adminUserName, "activeSection", activeSection);
  }, [activeSection, adminUserName]);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateVisibility = () => setShowBackToTop(window.scrollY > 260);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  useEffect(() => {
    if (!connection) return;

    const handleStockUpdate = (productId, newStock) => {
      setProducts((prev) =>
        prev.map((product) =>
          (product.id || product._id) === productId ? { ...product, stock: newStock } : product
        )
      );
    };

    const handleReload = () => scheduleSilentLoad();
    const reloadEvents = [
      "receiveorder",
      "OrderCreated",
      "orderready",
      "OrderReady",
      "orderpreparing",
      "OrderPreparing",
      "orderdelivered",
      "OrderDelivered",
      "orderpaid",
      "OrderPaid",
      "ordercancelled",
      "OrderCancelled",
      "tablesupdated",
      "TableUpdated",
      "productupdated",
      "ProductUpdated",
      "presenceupdated",
      "staffupdated",
      "StaffUpdated",
    ];

    reloadEvents.forEach((eventName) => connection.on(eventName, handleReload));
    connection.on("stockupdated", handleStockUpdate);
    connection.on("StockUpdated", handleStockUpdate);

    return () => {
      reloadEvents.forEach((eventName) => connection.off(eventName, handleReload));
      connection.off("stockupdated", handleStockUpdate);
      connection.off("StockUpdated", handleStockUpdate);
    };
  }, [connection, scheduleSilentLoad]);

  useEffect(() => {
    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) scheduleSilentLoad();
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      unsubscribeConnection?.();
    };
  }, [scheduleSilentLoad]);

  const stats = useMemo(() => {
    const finished = orders.filter((order) => order.startedAt && order.readyAt);
    const avg =
      finished.length === 0
        ? 0
        : Math.round(
            finished.reduce(
              (acc, order) => acc + (new Date(order.readyAt) - new Date(order.startedAt)),
              0
            ) /
              finished.length /
              60000
          );

    const totalSales = history
      .filter((order) => {
        const status = typeof order.status === "string" ? order.status.toLowerCase() : order.status;
        const isDelivered = status === 3 || status === "delivered";
        return isDelivered && order.isPaid && isSameLocalDay(order.paidAt);
      })
      .reduce(
        (acc, order) =>
          acc +
          (order.items?.reduce((subtotal, item) => subtotal + (item.unitPrice || 0) * item.quantity, 0) || 0),
        0
      );

    return { avg, totalSales };
  }, [history, orders]);

  const activeTableNumbers = useMemo(
    () =>
      new Set(
        orders
          .map((order) => Number(order?.tableNumber))
          .filter((tableNumber) => Number.isFinite(tableNumber) && tableNumber > 0),
      ),
    [orders],
  );

  const effectiveTables = useMemo(
    () =>
      tables.map((table) => {
        const tableNumber = Number(table.number ?? table.Number);
        if (!activeTableNumbers.has(tableNumber)) return table;

        return {
          ...table,
          isOccupied: true,
          IsOccupied: true,
        };
      }),
    [activeTableNumbers, tables],
  );

  const adminTableStates = useMemo(
    () =>
      effectiveTables.map((table) => {
        const tableNumber = Number(table.number ?? table.Number);
        const isBeingCleaned = Boolean(table.isBeingCleaned ?? table.IsBeingCleaned);
        const hasActiveOrders = orders.some(
          (order) => Number(order?.tableNumber) === tableNumber && getOrderStatusNumber(order?.status) < 3,
        );
        const hasPendingPayment = history.some(
          (order) =>
            Number(order?.tableNumber) === tableNumber &&
            getOrderStatusNumber(order?.status) === 3 &&
            !order?.isPaid,
        );
        const hasPendingCleanup = history.some(
          (order) =>
            Number(order?.tableNumber) === tableNumber &&
            getOrderStatusNumber(order?.status) === 3 &&
            order?.isPaid &&
            !order?.isCleanupCompleted,
        );

        let releaseAction = null;
        let releaseBlockedReason = "";

        if (isBeingCleaned || hasPendingCleanup) {
          releaseAction = "close";
        } else if (!hasActiveOrders && !hasPendingPayment) {
          releaseAction = "unseat";
        } else if (hasActiveOrders) {
          releaseBlockedReason = "Tiene ordenes activas";
        } else if (hasPendingPayment) {
          releaseBlockedReason = "Tiene cobros pendientes";
        }

        return {
          ...table,
          releaseAction,
          releaseBlockedReason,
        };
      }),
    [effectiveTables, history, orders],
  );

  const quickStats = useMemo(() => {
    const availableTables = effectiveTables.filter((table) => !(table.isOccupied || table.IsOccupied)).length;
    const lowStockProducts = products.filter((product) => Number(product.stock ?? product.Stock ?? 0) > 0 && Number(product.stock ?? product.Stock ?? 0) <= 10).length;
    const outOfStockProducts = products.filter((product) => Number(product.stock ?? product.Stock ?? 0) <= 0).length;

    return {
      availableTables,
      lowStockProducts,
      outOfStockProducts,
    };
  }, [effectiveTables, products]);

  const incidents = useMemo(() => {
    const now = Date.now();

    const readyOrders = orders
      .filter((order) => getOrderStatusNumber(order?.status) === 2)
      .map((order) => ({
        ...order,
        waitingMinutes: getMinutesSince(order?.readyAt || order?.createdAt, now),
      }))
      .filter((order) => order.waitingMinutes >= READY_INCIDENT_MINUTES)
      .sort((a, b) => b.waitingMinutes - a.waitingMinutes);

    const pendingPayments = history
      .filter((order) => getOrderStatusNumber(order?.status) === 3 && !order?.isPaid)
      .map((order) => ({
        ...order,
        waitingMinutes: getMinutesSince(order?.deliveredAt || order?.createdAt, now),
      }))
      .filter((order) => order.waitingMinutes >= PAYMENT_INCIDENT_MINUTES)
      .sort((a, b) => b.waitingMinutes - a.waitingMinutes);

    const pendingCleanupByTable = new Map();

    history
      .filter((order) => Number(order?.tableNumber) > 0 && order?.isPaid && !order?.isCleanupCompleted)
      .forEach((order) => {
        const tableNumber = Number(order.tableNumber);
        const current = pendingCleanupByTable.get(tableNumber);
        const referenceDate = new Date(order?.paidAt || order?.deliveredAt || order?.createdAt || 0).getTime();

        if (!current || referenceDate > current.referenceDate) {
          pendingCleanupByTable.set(tableNumber, {
            tableNumber,
            order,
            referenceDate,
            waitingMinutes: getMinutesSince(order?.paidAt || order?.deliveredAt || order?.createdAt, now),
          });
        }
      });

    const cleanupPending = Array.from(pendingCleanupByTable.values()).sort(
      (a, b) => b.waitingMinutes - a.waitingMinutes,
    );

    const outOfStockProducts = products
      .filter((product) => Number(product.stock ?? product.Stock ?? 0) <= 0)
      .sort((a, b) => String(a.name || a.Name || "").localeCompare(String(b.name || b.Name || "")));

    return {
      readyOrders,
      pendingPayments,
      cleanupPending,
      outOfStockProducts,
      total:
        readyOrders.length +
        pendingPayments.length +
        cleanupPending.length +
        outOfStockProducts.length,
    };
  }, [history, orders, products]);

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] animate-pulse">
            Sincronizando Sistema...
          </p>
        </div>
      </div>
    );
  }

  const sectionTabs = [
    { id: "overview", label: "Resumen", icon: LayoutDashboard },
    { id: "operations", label: "Operacion", icon: ClipboardList },
    { id: "inventory", label: "Inventario", icon: Boxes },
    { id: "team", label: "Equipo", icon: Users },
    { id: "settings", label: "Configuracion", icon: Settings2 },
    { id: "audit", label: "Auditoria", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-950 text-white p-4 lg:p-8 selection:bg-cyan-500/30">
      <div className="max-w-[1700px] mx-auto space-y-8">
        <ConfirmDialog
          open={pendingTableRelease !== null}
          title="Liberar mesa ocupada"
          description={
            pendingTableRelease !== null
              ? `Se intentara liberar la mesa ${pendingTableRelease.number ?? pendingTableRelease.Number ?? pendingTableRelease}. Admin cancelara la asignacion si no tuvo ordenes o finalizara la limpieza si ya paso por pago.`
              : ""
          }
          confirmLabel="Liberar mesa"
          cancelLabel="Volver"
          tone="warning"
          loading={releasingTable}
          onConfirm={handleCloseTable}
          onCancel={() => (releasingTable ? undefined : setPendingTableRelease(null))}
        />

        <AdminHeader
          isConnected={isConnected}
          lastUpdate={lastUpdate}
          loading={loading}
        />

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
                Panel administrativo
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {sectionTabs.map((section) => {
                const Icon = section.icon;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                      activeSection === section.id
                        ? "border-cyan-300 bg-cyan-400 text-slate-950"
                        : "border-slate-800 bg-slate-950 text-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Recaudacion Hoy"
            value={`$${new Intl.NumberFormat("es-SV", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(stats.totalSales)}`}
            color="text-[#39FF14]"
          />
          <StatsCard title="Eficiencia KDS" value={`${stats.avg} min`} color="text-cyan-400" />
          <StatsCard title="Ordenes Activas" value={orders.length} color="text-yellow-400" />
          <StatsCard
            title="Mesas Libres"
            value={quickStats.availableTables}
            color="text-slate-400"
          />
        </div>

        {(activeSection === "overview" || activeSection === "operations") && (
          <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>               
              </div>

              <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                {incidents.total} incidencia{incidents.total === 1 ? "" : "s"} activa{incidents.total === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <IncidentCard
                tone="red"
                title="Pedidos listos"
                count={incidents.readyOrders.length}
                helper={`Mas de ${READY_INCIDENT_MINUTES} min sin entregar.`}
                items={incidents.readyOrders.slice(0, 3).map((order) => ({
                  id: order.id,
                  label: `${order.correlativeCode || order.id} · ${Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar"}`,
                  detail: `${order.waitingMinutes} min en estado listo`,
                }))}
              />
              <IncidentCard
                tone="amber"
                title="Cobros pendientes"
                count={incidents.pendingPayments.length}
                helper={`Mas de ${PAYMENT_INCIDENT_MINUTES} min desde la entrega.`}
                items={incidents.pendingPayments.slice(0, 3).map((order) => ({
                  id: order.id,
                  label: `${order.correlativeCode || order.id} · ${Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar"}`,
                  detail: `${order.waitingMinutes} min sin cobro`,
                }))}
              />
              <IncidentCard
                tone="cyan"
                title="Mesas por limpiar"
                count={incidents.cleanupPending.length}
                helper="Mesas pagadas pendientes de liberacion."
                items={incidents.cleanupPending.slice(0, 3).map((entry) => ({
                  id: `${entry.tableNumber}`,
                  label: `Mesa ${entry.tableNumber}`,
                  detail: `${entry.waitingMinutes} min desde el pago`,
                }))}
              />
              <IncidentCard
                tone="slate"
                title="Agotados"
                count={incidents.outOfStockProducts.length}
                helper="Conviene ocultarlos o reponer stock."
                items={incidents.outOfStockProducts.slice(0, 3).map((product) => ({
                  id: product.id || product._id,
                  label: product.name || product.Name || "Producto",
                  detail: "Stock en cero",
                }))}
              />
            </div>
          </section>
        )}

        {(activeSection === "overview" || activeSection === "operations") && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-4">
              <OrdersSummary orders={orders} onOrderCancelled={() => loadData(true)} />
            </div>

            <div className="xl:col-span-8">
              <TableStatus tables={adminTableStates} onReleaseTable={setPendingTableRelease} />
            </div>
          </div>
        )}

        {(activeSection === "overview" || activeSection === "inventory") && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8">
              <InventoryManager products={products} refresh={() => loadData(true)} />
            </div>
            <div className="xl:col-span-4">
              <TopProductsReport data={history} totalSales={stats.totalSales} />
            </div>
          </div>
        )}

        {(activeSection === "overview" || activeSection === "team") && (
          <StaffAssignmentsPanel
            users={staff}
            onUpdated={() => {
              void loadData(true);
            }}
          />
        )}

        {(activeSection === "overview" || activeSection === "settings") && (
          <KdsSettingsPanel
            settings={settings}
            onSaved={() => {
              void refreshSettings();
              showToast("Configuracion KDS actualizada", "success");
            }}
          />
        )}

        {(activeSection === "overview" || activeSection === "audit") && (
          <AdministrativeLog orders={orders} history={history} />
        )}
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-slate-800 bg-slate-950/90 text-cyan-300 shadow-2xl shadow-cyan-950/40"
          aria-label="Subir arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const IncidentCard = ({ tone = "red", title, count, helper, items }) => {
  const [expanded, setExpanded] = useState(false);
  const toneMap = {
    red: {
      accent: "text-red-300",
      badge: "border-red-400/20 bg-red-400/10 text-red-300",
    },
    amber: {
      accent: "text-amber-300",
      badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    },
    cyan: {
      accent: "text-cyan-300",
      badge: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    },
    slate: {
      accent: "text-slate-200",
      badge: "border-slate-700 bg-slate-800 text-slate-200",
    },
  };

  const currentTone = toneMap[tone] || toneMap.red;

  return (
    <article className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Incidencia
          </p>
          <h3 className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {title}
          </h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${currentTone.badge}`}>
          {count}
        </span>
      </div>

      <p className={`mt-3 text-3xl font-black tracking-tighter ${currentTone.accent}`}>{count}</p>
      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{helper}</p>

      {count > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${currentTone.badge}`}
        >
          {expanded ? "Ocultar detalle" : "Ver detalle"}
        </button>
      ) : null}

      {expanded || count === 0 ? (
      <div className="mt-3 space-y-1.5">
        {count === 0 ? (
          <div className="rounded-[0.9rem] border border-dashed border-slate-800 bg-slate-900/40 p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
              Sin incidencias
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[0.9rem] border border-slate-800 bg-slate-900/60 p-2"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-100">
                {item.label}
              </p>
              <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
                {item.detail}
              </p>
            </div>
          ))
        )}
      </div>
      ) : null}
    </article>
  );
};

export default AdminView;
