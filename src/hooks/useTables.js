import { useEffect, useRef, useState, useCallback } from "react";
import { getTables } from "../services/api.service";
import { onTableUpdated, subscribeConnectionStatus } from "../services/signalrService";

const useTables = () => {
  const [tables, setTables] = useState([]);
  const fetchTimeoutRef = useRef(null);

  const fetchTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  }, []);

  useEffect(() => {
    const scheduleFetchTables = () => {
      if (fetchTimeoutRef.current) return;

      fetchTimeoutRef.current = window.setTimeout(() => {
        fetchTimeoutRef.current = null;
        fetchTables();
      }, 250);
    };

    queueMicrotask(fetchTables);

    const unsubscribe = onTableUpdated((data) => {
      let foundMatch = false;

      setTables((prev) =>
        prev.map((t) => {
          if (t.number !== data.tableNumber && t.Number !== data.tableNumber) {
            return t;
          }

          foundMatch = true;

          return {
            ...t,
            ...data,
            number: data.number ?? data.Number ?? t.number ?? t.Number,
            isOccupied:
              data.isOccupied ?? data.IsOccupied ?? t.isOccupied ?? t.IsOccupied,
          };
        })
      );

      // Reconciliamos siempre con el servidor para evitar estados parciales
      // cuando el evento llega con datos incompletos o la vista estuvo desfasada.
      if (!foundMatch) {
        scheduleFetchTables();
        return;
      }

      scheduleFetchTables();
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) scheduleFetchTables();
    });

    const handleForceSync = () => {
      scheduleFetchTables();
    };

    const handleWindowFocus = () => {
      scheduleFetchTables();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleFetchTables();
      }
    };

    window.addEventListener("kds-sync-tables", handleForceSync);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      unsubscribe?.();
      unsubscribeConnection?.();
      window.removeEventListener("kds-sync-tables", handleForceSync);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTables]);

  return { tables, refetch: fetchTables };
};

export default useTables;
