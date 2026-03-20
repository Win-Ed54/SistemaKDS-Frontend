import { useEffect, useState } from "react";
import { getTables } from "../services/api.service";

const useTables = () => {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        // ✅ Usa el proxy de Vite en vez de fetch directo a localhost
        const data = await getTables();
        console.log("Tables:", data);
        setTables(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading tables:", error);
      }
    };

    fetchTables();
  }, []);

  return { tables };
};

export default useTables;
