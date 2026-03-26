import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";

const HUB_URL = import.meta.env.VITE_HUB_URL;
const isDev = import.meta.env.DEV;

if (!HUB_URL) throw new Error("VITE_HUB_URL no definido");

const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => {
      const path = window.location.pathname;
      if (path.includes("kitchen")) return localStorage.getItem("kitchen_token");
      if (path.includes("waiter"))  return localStorage.getItem("waiter_token");
      if (path.includes("admin"))   return localStorage.getItem("admin_token");
      return localStorage.getItem("token");
    },
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(isDev ? signalR.LogLevel.Information : signalR.LogLevel.Error)
  .build();

let isConnected = false;
let currentGroups = [];
let handlersRegistered = false;
let listeners = [];

export const subscribeConnectionStatus = (cb) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
};

const notifyStatus = (status) => {
  isConnected = status;
  listeners.forEach((cb) => cb(status));
};

export const getConnectionState = () => isConnected;

const startWithRetry = async (groups = []) => {
  while (connection.state !== signalR.HubConnectionState.Connected) {
    try {
      if (isDev) console.log("Intentando conectar a SignalR...");
      await connection.start();
      if (isDev) console.log(">>> Conectado a SignalR");
      notifyStatus(true);
      break;
    } catch (err) {
      notifyStatus(false);
      if (err?.message?.includes("401")) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  currentGroups = groups;
  for (const g of groups) await joinGroup(g);
};

export const startConnection = async (groups = []) => {
  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting
  ) {
    for (const g of groups) {
      if (!currentGroups.includes(g)) {
        await joinGroup(g);
        currentGroups.push(g);
      }
    }
    return connection;
  }

  await startWithRetry(groups);

  if (!handlersRegistered) {
    handlersRegistered = true;
    connection.onreconnecting(() => notifyStatus(false));
    connection.onreconnected(async () => {
      for (const g of currentGroups) await joinGroup(g);
      notifyStatus(true);
    });
    connection.onclose(async () => {
      notifyStatus(false);
      await startWithRetry(currentGroups);
    });
  }
  return connection;
};

export const joinGroup = async (group) => {
  if (connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    const invokeMap = {
      kitchen: "JoinKitchenGroup",
      waiter:  "JoinWaiterGroup",
      admin:   "JoinAdminGroup",
    };
    if (!invokeMap[group]) { console.warn(`Grupo no reconocido: ${group}`); return; }
    await connection.invoke(invokeMap[group]);
    if (isDev) console.log(`>>> Unido al grupo: ${group}`);
  } catch (err) {
    console.error("Error join group:", err);
  }
};

export const offEvent = (name) => connection.off(name);

// ✅ Eventos actualizados para aceptar callback opcional
export const onReceiveOrder = (callback) => {
  connection.off("receiveorder");
  connection.on("receiveorder", (order) => {
    if (!order) return;
    if (isDev) console.log("✅ Nueva orden:", order);
    useOrderStore.getState().addOrder(order);
    if (callback) callback(order);
  });
};

export const onOrderPreparing = (callback) => {
  connection.off("orderpreparing");
  connection.on("orderpreparing", (order) => {
    if (isDev) console.log("🔄 Preparando:", order);
    useOrderStore.getState().updateOrder(order);
    if (callback) callback(order);
  });
};

export const onOrderReady = (callback) => {
  connection.off("orderready");
  connection.on("orderready", (order) => {
    if (isDev) console.log("🟢 Lista:", order);
    useOrderStore.getState().updateOrder(order);
    if (callback) callback(order);
  });
};

export const onOrderDelivered = (callback) => {
  connection.off("orderdelivered");
  connection.on("orderdelivered", (orderId) => {
    if (isDev) console.log("🗑️ Entregada:", orderId);
    useOrderStore.getState().removeOrder(orderId);
    if (callback) callback(orderId);
  });
};

export const onOrderCreated = (callback) => {
  connection.off("ordercreated");
  connection.on("ordercreated", (order) => {
    if (isDev) console.log("🆕 Orden Creada:", order);
    useOrderStore.getState().addOrder(order);
    if (callback) callback(order);
  });
};

// ... (onOrderCancelled, onProductOutOfStock y onStockUpdated se mantienen igual)
export const onOrderCancelled = () => {
  connection.off("ordercancelled");
  connection.on("ordercancelled", (orderId) => {
    if (isDev) console.log("❌ Cancelada:", orderId);
    useOrderStore.getState().removeOrder(orderId);
  });
};

export const onProductOutOfStock = (callback) => {
  connection.off("productoutofstock");
  connection.off("ProductOutOfStock");
  const handler = (data) => {
    console.warn("Stock insuficiente:", data);
    callback?.(data);
  };
  connection.on("productoutofstock", handler);
  connection.on("ProductOutOfStock", handler);
};

export const onStockUpdated = (callback) => {
  connection.off("stockupdated");
  connection.off("StockUpdated");
  const handleUpdate = (data, stock) => {
    let productId = null;
    let currentStock = 0;
    if (data && typeof data === "object") {
      productId = data.productId || data.id || data.Id;
      currentStock = data.newStock ?? data.stock ?? data.Stock ?? 0;
    } else {
      productId = data;
      currentStock = stock;
    }
    if (isDev) console.log(`📦 Stock: ${productId} → ${currentStock}`);
    if (productId != null) callback?.(productId, currentStock);
  };
  connection.on("stockupdated", handleUpdate);
  connection.on("StockUpdated", handleUpdate);
};

export default connection;
