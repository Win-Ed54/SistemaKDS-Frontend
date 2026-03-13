import { useEffect, useState } from "react";

import {
  startConnection,
  joinGroup
} from "../services/signalrService";

export default function useSignalRConnection(role) {

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {

    const init = async () => {

      await startConnection();

      await joinGroup(role);

      setIsConnected(true);
    };

    init();

  }, [role]);

  return { isConnected };
}
