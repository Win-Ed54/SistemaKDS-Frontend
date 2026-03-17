import React, { useEffect, useState, useCallback, useMemo } from "react";
import useSignalRConnection from "../hooks/useSignalRConnection";
import { getActiveOrders, getTables, getProducts } from "../services/api.service";

// Sub-componentes (Asegúrate de que las rutas coincidan con tu nueva estructura)
import AdminHeader from "../components/admin/AdminHeader";
import StatsCard from "../components/admin/StatsCard";
import OrdersSummary from "../components/admin/OrdersSummary";
import TableStatus from "../components/admin/TableStatus";
import InventoryManager from "../components/admin/InventoryManager";

const AdminView = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  
  const { connection, isConnected } = useSignalRConnection("admin");
  const isDev = import.meta.env.DEV;

  // Carga de datos con opción "silent" para no mostrar el spinner en actualizaciones de SignalR
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const [ordersRes, tablesRes, productsRes] = await Promise.all([
        getActiveOrders(),
        getTables(),
        getProducts()
      ]);
      
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setLastUpdate(new Date().toLocaleTimeString()); // Actualizamos la hora de sincronización
      
    } catch (error) {
      if (isDev) console.error("[ADMIN ERROR]:", error);
    } finally {
      setLoading(false);
    }
  }, [isDev]);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escucha de SignalR blindada (mapea eventos de C# en cualquier formato)
  useEffect(() => {
    if (!connection) return;

    const events = [
      "receiveorder", "OrderCreated",
      "orderready", "OrderReady",
      "orderpreparing", "OrderPreparing",
      "orderdelivered", "OrderDelivered",
      "stockupdated", "StockUpdated"
    ];
    
    events.forEach(event => {
      connection.on(event, () => {
        if (isDev) console.log(`📢 SignalR Admin: Evento [${event}] recibido.`);
        loadData(true); // Recarga silenciosa sin interrumpir la vista del Admin
      });
    });

    return () => {
      events.forEach(event => connection.off(event));
    };
  }, [connection, loadData, isDev]);

  // KPI: Tiempo promedio de cocina (en minutos)
  const avgTime = useMemo(() => {
    const finished = orders.filter(o => o.startedAt && o.readyAt);
    if (finished.length === 0) return 0;
    
    const totalMs = finished.reduce((acc, o) => {
      return acc + (new Date(o.readyAt) - new Date(o.startedAt));
    }, 0);
    
    return Math.round(totalMs / finished.length / 60000);
  }, [orders]);

  // Pantalla de carga inicial elegante
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Sincronizando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8 font-sans selection:bg-cyan-500">
      <div className="max-w-[1700px] mx-auto space-y-8">
        
        {/* Header con indicador de última actualización */}
        <AdminHeader isConnected={isConnected} lastUpdate={lastUpdate} />

        {/* Bento Grid de Estadísticas con Brillo Neón */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            title="Eficiencia de Cocina" 
            value={`${avgTime} min`} 
            color="text-cyan-400" 
          />
          <StatsCard 
            title="Órdenes Activas" 
            value={orders.length} 
            color="text-yellow-400" 
          />
          <StatsCard 
            title="Capacidad de Salón" 
            value={tables.filter(t => !t.isOccupied).length} 
            color="text-emerald-400" 
          />
        </div>

        {/* Cuerpo Principal del Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Resumen Lateral de Órdenes */}
          <div className="xl:col-span-4 h-full">
            <OrdersSummary orders={orders} />
          </div>

          {/* Gestión de Operaciones e Inventario */}
          <div className="xl:col-span-8 space-y-8">
            <TableStatus tables={tables} />
            <InventoryManager products={products} refresh={() => loadData(true)} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminView;
