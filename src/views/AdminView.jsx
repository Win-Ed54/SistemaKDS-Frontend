import React, { useEffect, useState, useCallback, useMemo } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { getActiveOrders, getTables, getProducts, closeTable, getOrderHistory } from "../services/api.service";
import { useToast } from "../context/ToastContext";

import AdminHeader      from "../components/admin/AdminHeader";
import StatsCard        from "../components/admin/StatsCard";
import OrdersSummary    from "../components/admin/OrdersSummary";
import TableStatus      from "../components/admin/TableStatus";
import InventoryManager from "../components/admin/InventoryManager";
import TopProductsReport from "../components/admin/TopProductsReport";

const AdminView = () => {
  const [orders,   setOrders]   = useState([]);
  const [tables,   setTables]   = useState([]);
  const [products, setProducts] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  const { connection, isConnected } = useSignalRConnection("admin");
  const { showToast } = useToast();
  const isDev = import.meta.env.DEV;

  // 1. CARGA DE DATOS COMPLETA
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersRes, tablesRes, productsRes, historyRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts(),
        getOrderHistory() // ✅ Traemos el historial para el total de ventas
      ]);

      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setHistory(Array.isArray(historyRes) ? historyRes : []);

      setProducts((currentProducts) => {
        if (!Array.isArray(productsRes)) return [];
        return productsRes.map((newP) => {
          const oldP = currentProducts.find((p) => (p.id || p._id) === (newP.id || newP._id));
          if ((!newP.imageUrl || newP.imageUrl.trim() === "") && oldP?.imageUrl) {
            return { ...newP, imageUrl: oldP.imageUrl };
          }
          return newP;
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
      showToast(`✅ Mesa ${tableNumber} liberada correctamente`, "success");
    } catch (err) {
      showToast("❌ Error al liberar la mesa", "error");
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // 2. SIGNALR: SINCRONIZACIÓN TOTAL
  useEffect(() => {
    if (!connection) return;

    const handleStockUpdate = (productId, newStock) => {
      setProducts((prev) =>
        prev.map((p) => (p.id || p._id) === productId ? { ...p, stock: newStock } : p)
      );
    };

    const handleReload = () => loadData(true);

    const reloadEvents = [
      "receiveorder", "orderready", "orderpreparing", 
      "orderdelivered", "ordercancelled", "tablesupdated"
    ];

    reloadEvents.forEach((e) => connection.on(e, handleReload));
    connection.on("stockupdated", handleStockUpdate);
    
    return () => {
      reloadEvents.forEach((e) => connection.off(e));
      connection.off("stockupdated");
    };
  }, [connection, loadData]);

  // 3. MÉTRICAS AVANZADAS (Calculadas en tiempo real)
  const stats = useMemo(() => {
    // A. Tiempo Promedio
    const finished = orders.filter((o) => o.startedAt && o.readyAt);
    const avg = finished.length === 0 
      ? 0 
      : Math.round(finished.reduce((acc, o) => acc + (new Date(o.readyAt) - new Date(o.startedAt)), 0) / finished.length / 60000);

    // B. Ventas Totales del Día (Solo entregadas)
    const totalSales = history
      .filter(o => o.status === 3 || o.status === "Delivered")
      .reduce((acc, o) => acc + (o.items?.reduce((sub, i) => sub + (i.price * i.quantity), 0) || 0), 0);

    return { avg, totalSales };
  }, [orders, history]);

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] animate-pulse">Sincronizando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 selection:bg-cyan-500/30">
      <div className="max-w-[1700px] mx-auto space-y-8">
        <AdminHeader isConnected={isConnected} lastUpdate={lastUpdate} />

        {/* STATS RÁPIDAS: Toque de Negocio */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Recaudación Hoy"
            value={`$${stats.totalSales.toFixed(2)}`}
            color="text-[#39FF14]"
          />
          <StatsCard
            title="Eficiencia KDS"
            value={`${stats.avg} min`}
            color="text-cyan-400"
          />
          <StatsCard
            title="Órdenes Activas"
            value={orders.length}
            color="text-yellow-400"
          />
          <StatsCard
            title="Mesas Libres"
            value={tables.filter((t) => !t.isOccupied).length}
            color="text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-4">
            <OrdersSummary
              orders={orders}
              onOrderCancelled={() => loadData(true)}
            />
          </div>

          <div className="xl:col-span-8 space-y-8">
            <TableStatus tables={tables} onReleaseTable={handleCloseTable} />
            <InventoryManager
              products={products}
              refresh={() => loadData(true)}
            />
          </div>
        </div>

        {/* ✅ El reporte ahora se beneficia del historial cargado */}
        <TopProductsReport data={history} totalSales={stats.totalSales} />
      </div>
    </div>
  );
};

export default AdminView;
