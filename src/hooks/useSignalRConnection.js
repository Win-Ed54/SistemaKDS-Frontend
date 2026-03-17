import { useEffect, useState } from "react";

import {
  startConnection,
  joinGroup
} from "../services/signalrService";

export default function useSignalRConnection(role) {
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState(null);
  useEffect(() => {
    // Prevent running if role is missing
    if (!role) return;

    const init = async () => {
       const conn = await startConnection([role]); 
      setConnection(conn);
      setIsConnected(true);
    };

    init();
  }, [role]);

  return { connection, isConnected };
}
