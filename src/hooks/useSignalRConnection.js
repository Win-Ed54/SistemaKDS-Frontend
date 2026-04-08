import { useEffect, useState } from "react";
import {
  getConnectionState,
  startConnection,
  subscribeConnectionStatus,
} from "../services/signalrService";

export default function useSignalRConnection() {
  const [isConnected, setIsConnected] = useState(getConnectionState());
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeConnectionStatus(setIsConnected);

    const init = async () => {
      const conn = await startConnection();
      setConnection(conn);
      setIsConnected(getConnectionState());
    };

    init();

    return () => {
      unsubscribe();
    };
  }, []);

  return { connection, isConnected };
}
