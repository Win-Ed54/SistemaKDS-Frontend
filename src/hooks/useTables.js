import { useEffect, useState, useCallback } from "react";
import { getTables } from "../services/api.service";
import { onTableUpdated, subscribeConnectionStatus } from "../services/signalrService";

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

      if (!foundMatch) {
        fetchTables();
      }
    });

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) fetchTables();
    });

    const handleForceSync = () => {
      fetchTables();
    };

    window.addEventListener("kds-sync-tables", handleForceSync);

    return () => {
      unsubscribe?.();
      unsubscribeConnection?.();
      window.removeEventListener("kds-sync-tables", handleForceSync);
    };
  }, [fetchTables]);

  return { tables, refetch: fetchTables };
};

export default useTables;
