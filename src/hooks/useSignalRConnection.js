import { useEffect, useState } from "react";
import {
  startConnection,
  subscribeConnectionStatus
} from "../services/signalrService";

export default function useSignalRConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const init = async () => {
      const conn = await startConnection();
      setConnection(conn);
    };

    init();

    // 🔄 escuchar cambios de conexión (reconnect, disconnect, etc)
    const unsubscribe = subscribeConnectionStatus(setIsConnected);

    return () => {
      unsubscribe();
    };
  }, []);

  return { connection, isConnected };
}
