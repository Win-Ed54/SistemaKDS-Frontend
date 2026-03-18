import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";

const HUB_URL = import.meta.env.VITE_HUB_URL;
const isDev = import.meta.env.DEV;

if (!HUB_URL) throw new Error("VITE_HUB_URL no definido");

// ---------------------------
// CONEXIÓN (Singleton)
// ---------------------------
const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => {
      // Misma lógica de roles que tu api.service.js
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

// ---------------------------
// ESTADO GLOBAL
// ---------------------------
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

// ---------------------------
// START CON RETRY
// ---------------------------
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

// ---------------------------
// START CONNECTION
// ---------------------------
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

// ---------------------------
// JOIN GROUP
// ---------------------------
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

// ------------------------------------------------------------------
// HANDLER COMPARTIDO — orden nueva
// onReceiveOrder (cocina) y onOrderCreated (admin) usan el mismo
// handler porque el backend ahora emite "receiveorder" a los dos.
// ------------------------------------------------------------------
const handleNewOrder = (order) => {
  if (!order) return;
  if (isDev) console.log("✅ Nueva orden:", order);
  useOrderStore.getState().addOrder(order);
};

export const onReceiveOrder = () => {
  connection.off("receiveorder");
  connection.on("receiveorder", handleNewOrder);
};

// ✅ FIX PRINCIPAL: antes escuchaba "ordercreated" (evento que ya no existe)
// Ahora escucha "receiveorder" igual que cocina.
export const onOrderCreated = () => {
  connection.off("ordercreated"); // limpiar registro viejo
  connection.off("receiveorder");
  connection.on("receiveorder", handleNewOrder);
};

// ------------------------------------------------------------------
// ESTADOS
// ------------------------------------------------------------------
export const onOrderPreparing = () => {
  connection.off("orderpreparing");
  connection.on("orderpreparing", (order) => {
    if (isDev) console.log("🔄 Preparando:", order);
    useOrderStore.getState().updateOrder(order);
  });
};

export const onOrderReady = () => {
  connection.off("orderready");
  connection.on("orderready", (order) => {
    if (isDev) console.log("🟢 Lista:", order);
    useOrderStore.getState().updateOrder(order);
  });
};

export const onOrderDelivered = () => {
  connection.off("orderdelivered");
  connection.on("orderdelivered", (orderId) => {
    if (isDev) console.log("🗑️ Entregada:", orderId);
    useOrderStore.getState().removeOrder(orderId);
  });
};

export const onOrderCancelled = () => {
  connection.off("ordercancelled");
  connection.on("ordercancelled", (orderId) => {
    if (isDev) console.log("❌ Cancelada:", orderId);
    useOrderStore.getState().removeOrder(orderId);
  });
};

// ------------------------------------------------------------------
// STOCK
// ------------------------------------------------------------------
export const onProductOutOfStock = (callback) => {
  connection.off("productoutofstock");
  connection.on("productoutofstock", (data) => {
    console.warn("Stock insuficiente:", data);
    callback?.(data);
  });
};

export const onStockUpdated = (callback) => {
  connection.off("stockupdated");
  connection.on("stockupdated", (productId, newStock) => {
    if (isDev) console.log(`Stock: ${productId} → ${newStock}`);
    callback?.(productId, newStock);
  });
};

export default connection;