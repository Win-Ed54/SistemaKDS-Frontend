import { useEffect, useState } from "react";

const useTables = () => {

  const [tables, setTables] = useState([]);

  useEffect(() => {

    const fetchTables = async () => {

      try {

        const res = await fetch("http://localhost:5162/api/tables");

        const data = await res.json();

        console.log("Tables:", data);

        setTables(data);

      } catch (error) {

        console.error("Error loading tables:", error);

      }

    };

    fetchTables();

  }, []);

  return { tables };

};

export default useTables;
