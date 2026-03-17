import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

import useSignalRConnection from "../hooks/useSignalRConnection";

import { getActiveOrders, getTables } from "../services/api.service";

const AdminView = () => {

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { connection, isConnected } = useSignalRConnection("admin");

  // =========================
  // LOGOUT
  // =========================

  const logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("admin_token");

    window.location.href = "/login";

  };

  // =========================
  // CARGAR DATOS
  // =========================

  const loadData = useCallback(async () => {

    setLoading(true);
    setError(null);

    try {

      const [ordersResponse, tablesResponse] = await Promise.all([
        getActiveOrders(),
        getTables()
      ]);

      setOrders(Array.isArray(ordersResponse) ? ordersResponse : []);
      setTables(Array.isArray(tablesResponse) ? tablesResponse : []);

    } catch (error) {

      console.error("Error cargando datos:", error);
      setError("Error al cargar los datos");

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    loadData();

  }, [loadData]);

  // =========================
  // SIGNALR (tiempo real)
  // =========================

 useEffect(() => {
  if (!connection) return;
  
  connection.on("OrderCreated", () => {
    console.log("¡SEÑAL RECIBIDA EN ADMIN!"); 
    loadData();
  });

  connection.on("OrderUpdated", () => {
    console.log("¡ACTUALIZACIÓN RECIBIDA!");
    loadData();
  });

  return () => {
    connection.off("OrderCreated");
    connection.off("OrderUpdated");
  };
}, [connection, loadData]);

  // =========================
  // AGRUPAR ÓRDENES POR MESA
  // =========================

  const ordersByTable = orders.reduce((acc, order) => {

    const tableNum = order.tableNumber || "Sin mesa";

    if (!acc[tableNum]) acc[tableNum] = [];

    acc[tableNum].push(order);

    return acc;

  }, {});

  // =========================
  // TIEMPO PROMEDIO DE COCINA
  // =========================

  const averageKitchenTime = useMemo(() => {
    // Filtramos órdenes que tengan AMBAS fechas y que el estado sea 'ready'
    const finishedOrders = orders.filter(
      o => o.startedAt && o.readyAt && o.status?.toLowerCase() === "ready"
    );

    if (finishedOrders.length === 0) return 0;

    const totalTime = finishedOrders.reduce((sum, order) => {

      const start = new Date(order.startedAt);
      const end = new Date(order.readyAt);

      const minutes = (end - start) / 60000;

      return sum + minutes;

    }, 0);

    return Math.round(totalTime / finishedOrders.length);

  }, [orders]);

  // =========================
  // ICONOS
  // =========================

  const getStatusIcon = (status) => {

    switch (status?.toLowerCase()) {

      case "preparing":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;

      case "ready":
        return <CheckCircle className="w-4 h-4 text-green-400" />;

      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-400" />;

      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;

    }

  };

  const getStatusColor = (status) => {

    switch (status?.toLowerCase()) {

      case "preparing":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-100";

      case "ready":
        return "bg-green-500/20 border-green-500/50 text-green-100";

      case "cancelled":
        return "bg-red-500/20 border-red-500/50 text-red-100";

      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-100";

    }

  };

  if (loading && orders.length === 0 && tables.length === 0) {

    return (

      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">

        <div className="text-center">

          <p className="text-lg">Cargando datos...</p>

        </div>

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Panel de Administrador
        </h1>

        <div className="flex gap-6 items-center">

          {isConnected ? (
            <span className="text-green-400 font-semibold">
              🟢 Conectado
            </span>
          ) : (
            <span className="text-red-400 font-semibold">
              🔴 Sin conexión
            </span>
          )}

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold"
          >
            Logout
          </button>

        </div>

      </div>

      {/* ESTADÍSTICA */}

      <div className="bg-gray-800 rounded-xl p-6 mb-6">

        <h2 className="text-xl font-bold mb-2">
          ⏱ Tiempo Promedio de Cocina
        </h2>

        <p className="text-3xl font-bold text-green-400">
          {averageKitchenTime} min
        </p>

      </div>

      {error && (

        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-100">

          <div className="flex items-center gap-2">

            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>

          </div>

        </div>

      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ORDENES */}

        <div className="bg-gray-800 rounded-xl p-6">

          <h2 className="text-2xl font-semibold mb-4">
            📋 Órdenes Activas ({Object.keys(ordersByTable).length})
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">

            {Object.entries(ordersByTable).map(([tableNum, tableOrders]) => (

              <div key={tableNum} className="space-y-2">

                <div className="font-medium text-lg text-blue-300 border-b border-blue-500/30 pb-1">
                  Mesa #{tableNum}
                </div>

                {tableOrders.map(order => (

                  <div
                    key={order.id}
                    className={`p-3 rounded-lg border ${getStatusColor(order.status)}`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-medium text-sm">
                        #{order.id?.toString().padStart(4, "0")}
                      </span>

                      <div className="flex items-center gap-1 font-medium">

                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            ))}

          </div>

        </div>

        {/* MESAS */}

        <div className="bg-gray-800 rounded-xl p-6">

          <h2 className="text-2xl font-semibold mb-4">
            🪑 Mesas Disponibles ({tables.filter(t => t.status !== "occupied").length})
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

             {tables
              .filter(table => table.status !== "occupied") // NUEVO: Filtro aquí
              .map(table => (
                <div
                  key={table.id}
                  className="p-4 rounded-xl border-2 text-center font-medium bg-emerald-500/20 border-emerald-500/50 text-emerald-100"
                >
                  <div className="font-bold text-lg">#{table.number}</div>
                  <div className="text-xs capitalize">{table.status || "libre"}</div>
                </div>
              ))}

          </div>

        </div>

      </div>

    </div>

  );

};

export default AdminView;