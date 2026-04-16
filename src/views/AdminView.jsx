import React, { useCallback, useEffect, useMemo, useState } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import {
  closeTable,
  getActiveOrders,
  getOrderHistory,
  getProducts,
  getTables,
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

const isSameLocalDay = (value, referenceDate = new Date()) => {
  if (!value) return false;

  const target = new Date(value);

  return (
    target.getFullYear() === referenceDate.getFullYear() &&
    target.getMonth() === referenceDate.getMonth() &&
    target.getDate() === referenceDate.getDate()
  );
};

const AdminView = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

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

  const handleCloseTable = async (tableNumber) => {
    try {
      await closeTable(tableNumber);
      showToast(`Mesa ${tableNumber} liberada correctamente`, "success");
    } catch {
      showToast("Error al liberar la mesa", "error");
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

    const handleReload = () => loadData(true);
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
  }, [connection, loadData]);

  useEffect(() => {
    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) void loadData(true);
    });

    return () => {
      unsubscribeConnection?.();
    };
  }, [loadData]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 selection:bg-cyan-500/30">
      <div className="max-w-[1700px] mx-auto space-y-8">
        <AdminHeader isConnected={isConnected} lastUpdate={lastUpdate} />

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
            value={effectiveTables.filter((table) => !(table.isOccupied || table.IsOccupied)).length}
            color="text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-4">
            <OrdersSummary orders={orders} onOrderCancelled={() => loadData(true)} />
          </div>

          <div className="xl:col-span-8 space-y-8">
            <TableStatus tables={effectiveTables} onReleaseTable={handleCloseTable} />
            <KdsSettingsPanel
              settings={settings}
              onSaved={() => {
                void refreshSettings();
                showToast("Configuracion KDS actualizada", "success");
              }}
            />
            <InventoryManager products={products} refresh={() => loadData(true)} />
          </div>
        </div>

        <TopProductsReport data={history} totalSales={stats.totalSales} />
        <AdministrativeLog orders={orders} history={history} />
      </div>
    </div>
  );
};

export default AdminView;
