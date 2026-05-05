import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, Settings2 } from "lucide-react";
import {
  closeTable,
  getActiveOrders,
  getOrderHistory,
  getProducts,
  getTables,
  unseatTable,
} from "../services/api.service";
import { useToast } from "../context/ToastContext";
import { subscribeConnectionStatus } from "../services/signalrService";
import useKdsSettings from "../hooks/useKdsSettings";

import AdminHeader from "../components/admin/AdminHeader";
import AdministrativeLog from "../components/admin/AdministrativeLog";
import InventoryManager from "../components/admin/InventoryManager";
import KdsSettingsPanel from "../components/admin/KdsSettingsPanel";
import OrdersSummary from "../components/admin/OrdersSummary";
import StatsCard from "../components/admin/StatsCard";
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
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [activeSection, setActiveSection] = useState("overview");
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
      const [ordersRes, tablesRes, productsRes, historyRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts(),
        getOrderHistory(),
      ]);

      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setHistory(Array.isArray(historyRes) ? historyRes : []);

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

      showToast(`Mesa ${tableNumber} liberada correctamente`, "success");
      setPendingTableRelease(null);
    } catch (error) {
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
      "orderready",
      "orderpreparing",
      "orderdelivered",
      "orderpaid",
      "ordercancelled",
      "tablesupdated",
    ];

    reloadEvents.forEach((eventName) => connection.on(eventName, handleReload));
    connection.on("stockupdated", handleStockUpdate);

    return () => {
      reloadEvents.forEach((eventName) => connection.off(eventName, handleReload));
      connection.off("stockupdated", handleStockUpdate);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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
    { id: "settings", label: "Configuracion", icon: Settings2 },
    { id: "audit", label: "Auditoria", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_100%)] text-white p-4 lg:p-8 selection:bg-cyan-500/30">
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
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Navegacion de control
              </p>
              <h2 className="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">
                Panel administrativo ordenado por areas
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
            value={`$${stats.totalSales.toFixed(2)}`}
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
          <section className="rounded-[1.5rem] border border-red-500/20 bg-[linear-gradient(135deg,_rgba(239,68,68,0.08)_0%,_rgba(15,23,42,0.96)_42%,_rgba(2,6,23,0.98)_100%)] p-3 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-red-200/80">
                  Incidencias automaticas
                </p>
                <h2 className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-white">
                  Alertas operativas detectadas por el sistema
                </h2>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Ordenes listas sin entregar, cobros pendientes, limpiezas atrasadas y productos agotados.
                </p>
              </div>

              <div className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-red-200">
                {incidents.total} incidencia{incidents.total === 1 ? "" : "s"} activas
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-4">
              <IncidentCard
                tone="red"
                title="Pedidos listos sin entregar"
                count={incidents.readyOrders.length}
                helper={`Mas de ${READY_INCIDENT_MINUTES} min esperando mesero.`}
                items={incidents.readyOrders.slice(0, 3).map((order) => ({
                  id: order.id,
                  label: `${order.correlativeCode || order.id} · ${Number(order?.tableNumber) > 0 ? `Mesa ${order.tableNumber}` : "Para llevar"}`,
                  detail: `${order.waitingMinutes} min en estado listo`,
                }))}
              />
              <IncidentCard
                tone="amber"
                title="Cobros pendientes en caja"
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
                title="Mesas pendientes de limpieza"
                count={incidents.cleanupPending.length}
                helper="Mesas pagadas que aun no se liberan."
                items={incidents.cleanupPending.slice(0, 3).map((entry) => ({
                  id: `${entry.tableNumber}`,
                  label: `Mesa ${entry.tableNumber}`,
                  detail: `${entry.waitingMinutes} min desde el pago`,
                }))}
              />
              <IncidentCard
                tone="slate"
                title="Productos agotados"
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

        {(activeSection === "operations" || activeSection === "inventory" || activeSection === "settings" || activeSection === "audit") && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ControlInsightCard
              eyebrow="Alertas"
              title="Incidencias activas"
              value={incidents.total}
              helper="Casos que requieren seguimiento inmediato."
              accent="text-rose-300"
            />
            <ControlInsightCard
              eyebrow="Inventario"
              title="Productos con stock bajo"
              value={quickStats.lowStockProducts}
              helper={`${quickStats.outOfStockProducts} productos agotados actualmente.`}
              accent="text-amber-300"
            />
            <ControlInsightCard
              eyebrow="Mesas"
              title="Mesas por limpiar"
              value={incidents.cleanupPending.length}
              helper="Mesas pagadas pendientes de liberacion."
              accent="text-cyan-300"
            />
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
    </div>
  );
};

const ControlInsightCard = ({ eyebrow, title, value, helper, accent }) => (
  <div className="rounded-[1.8rem] border border-slate-800 bg-slate-900/75 p-5 shadow-xl">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
    <h3 className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white">{title}</h3>
    <p className={`mt-4 text-4xl font-black tracking-tighter ${accent}`}>{value}</p>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{helper}</p>
  </div>
);

const IncidentCard = ({ tone = "red", title, count, helper, items }) => {
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
    <article className="rounded-[1.2rem] border border-slate-800 bg-slate-950/70 p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-500">
            Incidencia
          </p>
          <h3 className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
            {title}
          </h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${currentTone.badge}`}>
          {count}
        </span>
      </div>

      <p className={`mt-2 text-xl font-black tracking-tighter ${currentTone.accent}`}>{count}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">{helper}</p>

      <div className="mt-2 space-y-1.5">
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
    </article>
  );
};

export default AdminView;
