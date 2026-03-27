import { useEffect, useState, useCallback } from "react";
import { getTables } from "../services/api.service";
import { onTableUpdated } from "../services/signalrService";

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

    onTableUpdated((data) => {
      setTables((prev) =>
        prev.map((t) =>
          t.number === data.tableNumber || t.Number === data.tableNumber
            ? { ...t, isOccupied: data.isOccupied }
            : t
        )
      );
    });
  }, [fetchTables]);

  return { tables, refetch: fetchTables };
};

export default useTables;
