import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";

// ---------------------------
// CONFIG
// ---------------------------
const HUB_URL = import.meta.env.VITE_HUB_URL;

if (!HUB_URL) {
  throw new Error("VITE_HUB_URL no definido");
}

// ---------------------------
// CONEXIÓN (Singleton)
// ---------------------------
const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => localStorage.getItem("token")
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(signalR.LogLevel.Information)
  .build();

// ---------------------------
// ESTADO GLOBAL
// ---------------------------
let isConnected = false;
let currentGroups = [];
let handlersRegistered = false;
let listeners = [];

// ---------------------------
// SUBSCRIBE STATUS
// ---------------------------
export const subscribeConnectionStatus = (callback) => {

  listeners.push(callback);

  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
};

const notifyStatusChange = (status) => {

  isConnected = status;

  listeners.forEach(cb => cb(status));
};

export const getConnectionState = () => isConnected;

// ---------------------------
// START CON RETRY
// ---------------------------
const startWithRetry = async (groups = []) => {

  while (connection.state !== signalR.HubConnectionState.Connected) {

    try {

      console.log("Intentando conectar a SignalR...");

      await connection.start();

      console.log(">>> Conectado a SignalR");

      notifyStatusChange(true);

      break;

    } catch (err) {

      console.error("Error conectando. Reintentando...", err);

      notifyStatusChange(false);

      if (err?.message?.includes("401")) {
        console.error("Token expirado. Redirigiendo a login...");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      await new Promise(res => setTimeout(res, 5000));
    }
  }

  currentGroups = groups;

  for (const group of groups) {
    await joinGroup(group);
  }
};

// ---------------------------
// START CONNECTION
// ---------------------------
  export const startConnection = async (groups = []) => {

  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting
  ) {
    return;
  }

  await startWithRetry(groups);

  if (!handlersRegistered) {

    handlersRegistered = true;

    connection.onreconnecting(() => {

      console.warn("Reconectando...");
      notifyStatusChange(false);

    });

    connection.onreconnected(async () => {

      console.log("Reconectado");

      for (const group of currentGroups) {
        await joinGroup(group);
      }

      notifyStatusChange(true);
    });

    connection.onclose(async () => {

      console.warn("Conexión cerrada. Reintentando...");
      notifyStatusChange(false);

      await startWithRetry(currentGroups);
    });
  }
};


// ---------------------------
// JOIN GROUP
// ---------------------------
export const joinGroup = async (group) => {

  if (connection.state !== signalR.HubConnectionState.Connected) return;

  try {

    switch (group) {

      case "kitchen":
        await connection.invoke("JoinKitchenGroup");
        break;

      case "waiter":
        await connection.invoke("JoinWaiterGroup");
        break;
      case "admin":
        await connection.invoke("JoinAdminGroup");
        break;
      default:
        console.warn(`Grupo no reconocido: ${group}`);
        return;
    }

    console.log(`>>> Unido al grupo: ${group}`);

  } catch (err) {

    console.error("Error join group:", err);
  }
};

// ---------------------------
// REMOVE HANDLER
// ---------------------------
export const offEvent = (eventName) => {
  connection.off(eventName);
};

// ---------------------------
// EVENTOS KDS
// ---------------------------
export const onReceiveOrder = () => {

  connection.off("receiveorder");

  connection.on("receiveorder", (order) => {

    const { addOrder } = useOrderStore.getState();

    console.log("Nueva orden recibida:", order);

    addOrder(order);
  });
};

export const onOrderReady = () => {

  connection.off("orderready");

  connection.on("orderready", (order) => {

    const { updateOrder } = useOrderStore.getState();

    console.log("Orden lista:", order);

    updateOrder(order);

  });

};


export const onOrderPreparing = () => {

  connection.off("orderpreparing");

  connection.on("orderpreparing", (order) => {

    const { updateOrder } = useOrderStore.getState();

    console.log("Orden preparando:", order);

    updateOrder(order);
  });
};

export const onOrderDelivered = () => {

  connection.off("orderdelivered");

  connection.on("orderdelivered", (orderId) => {

    const { removeOrder } = useOrderStore.getState();

    console.log("Orden entregada:", orderId);

    removeOrder(orderId);
  });
};

// ---------------------------
// EVENTO ADMIN / DASHBOARD
// ---------------------------
export const onOrderCreated = () => {
  connection.off("ordercreated");

  connection.on("ordercreated", (data) => {
    // Cambiamos el log para ver TODO lo que llega
    console.log("Datos recibidos en ordercreated:", data); 
    
    if (data) {
      const { addOrder } = useOrderStore.getState();
      addOrder(data);
    }
  });
};


export default connection;
