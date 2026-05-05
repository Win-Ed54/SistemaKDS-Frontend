import { useEffect, useState } from "react";
import {
  getConnectionState,
  hasSignalRToken,
  restartConnection,
  startConnection,
  subscribeConnectionStatus,
} from "../services/signalrService";

export default function useSignalRConnection(preferredRole = "") {
  const [isConnected, setIsConnected] = useState(getConnectionState());
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeConnectionStatus(setIsConnected);

    const syncConnection = async (forceRestart = false) => {
      if (!hasSignalRToken(preferredRole)) {
        setConnection(null);
        setIsConnected(false);
        return;
      }

      const conn = forceRestart
        ? await restartConnection(preferredRole)
        : await startConnection(preferredRole);

      setConnection(conn);
      setIsConnected(getConnectionState());
    };

    const handleAuthChanged = () => {
      void syncConnection(true);
    };

    const handleWindowFocus = () => {
      if (!getConnectionState() && hasSignalRToken(preferredRole)) {
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
  }, [preferredRole]);

  return { connection, isConnected };
}
