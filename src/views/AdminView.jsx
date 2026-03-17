import React, { useEffect, useState, useCallback, useMemo } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { getActiveOrders, getTables, getProducts } from "../services/api.service";

// Sub-componentes
import AdminHeader from "../components/admin/AdminHeader";
import StatsCard from "../components/admin/StatsCard";
import OrdersSummary from "../components/admin/OrdersSummary";
import TableStatus from "../components/admin/TableStatus";
import InventoryManager from "../components/admin/InventoryManager"; // Integración de Stock

const AdminView = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { connection, isConnected } = useSignalRConnection("admin");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, tablesRes, productsRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts()
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
    } catch (error) {
      console.error("Error en Admin:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escucha de SignalR para refrescar datos automáticamente
  useEffect(() => {
    if (!connection) return;
    const events = ["receiveorder", "orderready", "orderpreparing", "orderdelivered", "stockupdated"];
    
    events.forEach(event => {
      connection.on(event, () => loadData());
    });

    return () => events.forEach(event => connection.off(event));
  }, [connection, loadData]);

  // Cálculos de KPI
  const avgTime = useMemo(() => {
    const finished = orders.filter(o => o.startedAt && o.readyAt);
    if (finished.length === 0) return 0;
    const total = finished.reduce((acc, o) => acc + (new Date(o.readyAt) - new Date(o.startedAt)), 0);
    return Math.round(total / finished.length / 60000);
  }, [orders]);

  if (loading && orders.length === 0) return <div className="p-10 text-center text-white">Cargando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        <AdminHeader isConnected={isConnected} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard title="Tiempo Promedio" value={`${avgTime} min`} color="text-cyan-400" />
          <StatsCard title="Órdenes Activas" value={orders.length} color="text-yellow-400" />
          <StatsCard title="Mesas Libres" value={tables.filter(t => !t.isOccupied).length} color="text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4">
            <OrdersSummary orders={orders} />
          </div>
          <div className="xl:col-span-8 space-y-8">
            <TableStatus tables={tables} />
            <InventoryManager products={products} refresh={loadData} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminView;
