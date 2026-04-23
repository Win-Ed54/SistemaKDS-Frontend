import { useEffect, useState } from "react";
import {
  getConnectionState,
  restartConnection,
  startConnection,
  subscribeConnectionStatus,
} from "../services/signalrService";
import { getAuthValue } from "../services/authStorage";

export default function useSignalRConnection() {
  const [isConnected, setIsConnected] = useState(getConnectionState());
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeConnectionStatus(setIsConnected);

    const syncConnection = async (forceRestart = false) => {
      if (!getAuthValue("token")) {
        setConnection(null);
        setIsConnected(false);
        return;
      }

      const conn = forceRestart
        ? await restartConnection()
        : await startConnection();

      setConnection(conn);
      setIsConnected(getConnectionState());
    };

    const handleAuthChanged = () => {
      void syncConnection(true);
    };

    const handleWindowFocus = () => {
      if (!getConnectionState()) {
        void syncConnection(true);
      }
    };

    void syncConnection();
    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return { connection, isConnected };
}
