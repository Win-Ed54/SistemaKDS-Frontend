import { useEffect, useState, useCallback } from "react";
import { getTables } from "../services/api.service";
import connection from "../services/signalrService"; // ✅ Importamos SignalR

const useTables = () => {
  const [tables, setTables] = useState([]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  }, []);

  useEffect(() => {
    fetchTables();

    // ⚡ ESCUCHA DE SIGNALR: Actualiza el mapa de mesas al instante
    // Cuando el Admin libera una mesa o entra un pedido nuevo
    connection.on("tablesupdated", () => {
      console.log("🔄 Mesas actualizadas desde el servidor...");
      fetchTables();
    });

    return () => {
      connection.off("tablesupdated");
    };
  }, [fetchTables]);

  return { tables, refetch: fetchTables };
};

export default useTables;
