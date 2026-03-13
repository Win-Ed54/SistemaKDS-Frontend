import { useEffect, useState } from "react";

import {
  startConnection,
  joinGroup
} from "../services/signalrService";

export default function useSignalRConnection(role) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Prevent running if role is missing
    if (!role) return;

    const init = async () => {
      // Pass the role as an array so startConnection stores it in currentGroups
      await startConnection([role]);
      setIsConnected(true);
    };

    init();
  }, [role]);

  return { isConnected };
}
