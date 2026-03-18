import React, { useEffect, useState, useCallback, useMemo } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { getActiveOrders, getTables, getProducts } from "../services/api.service";

import AdminHeader from "../components/admin/AdminHeader";
import StatsCard from "../components/admin/StatsCard";
import OrdersSummary from "../components/admin/OrdersSummary";
import TableStatus from "../components/admin/TableStatus";
import InventoryManager from "../components/admin/InventoryManager";
import TopProductsReport from "../components/admin/TopProductsReport"; // ✅ NUEVO

const AdminView = () => {
  const [orders, setOrders]     = useState([]);
  const [tables, setTables]     = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  const { connection, isConnected } = useSignalRConnection("admin");
  const isDev = import.meta.env.DEV;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersRes, tablesRes, productsRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts(),
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      if (isDev) console.error("[ADMIN ERROR]:", error);
    } finally {
      setLoading(false);
    }
  }, [isDev]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!connection) return;

    const events = [
      "receiveorder",   "OrderCreated",
      "orderready",     "OrderReady",
      "orderpreparing", "OrderPreparing",
      "orderdelivered", "OrderDelivered",
      "ordercancelled", "OrderCancelled",
      "stockupdated",   "StockUpdated",
      "tablesupdated",  "TablesUpdated",
    ];

    events.forEach((event) => {
      connection.on(event, () => {
        if (isDev) console.log(`📢 SignalR Admin: [${event}]`);
        loadData(true);
      });
    });

    return () => { events.forEach((event) => connection.off(event)); };
  }, [connection, loadData, isDev]);

  const avgTime = useMemo(() => {
    const finished = orders.filter((o) => o.startedAt && o.readyAt);
    if (finished.length === 0) return 0;
    const totalMs = finished.reduce(
      (acc, o) => acc + (new Date(o.readyAt) - new Date(o.startedAt)), 0
    );
    return Math.round(totalMs / finished.length / 60000);
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">
            Sincronizando Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 font-sans">
      <div className="max-w-[1700px] mx-auto space-y-8">

        <AdminHeader isConnected={isConnected} lastUpdate={lastUpdate} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard title="Eficiencia de Cocina" value={`${avgTime} min`}  color="text-cyan-400"    />
          <StatsCard title="Órdenes Activas"       value={orders.length}    color="text-yellow-400"  />
          <StatsCard title="Capacidad de Salón"    value={tables.filter((t) => !t.isOccupied).length} color="text-emerald-400" />
        </div>

        {/* FILA PRINCIPAL */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-4 h-full">
            <OrdersSummary orders={orders} />
          </div>
          <div className="xl:col-span-8 space-y-8">
            <TableStatus tables={tables} />
            <InventoryManager products={products} refresh={() => loadData(true)} />
          </div>
        </div>

        {/* ✅ REPORTE DE PLATILLOS MÁS VENDIDOS — fila completa al final */}
        <TopProductsReport />

      </div>
    </div>
  );
};

export default AdminView;
