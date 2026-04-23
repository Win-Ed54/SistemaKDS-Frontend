import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";
import { clearAuthStorage, getAuthValue } from "./authStorage";

const HUB_URL = import.meta.env.VITE_HUB_URL;
const ROLE_TOKEN_MAP = {
  kitchen: "kitchen_token",
  host: "host_token",
  waiter: "waiter_token",
  admin: "admin_token",
  cashier: "cashier_token",
};

if (!HUB_URL) throw new Error("VITE_HUB_URL no definido");

const getSignalRToken = () => {
  const role = String(getAuthValue("role") || "").trim().toLowerCase();
  const scopedTokenKey = ROLE_TOKEN_MAP[role];
  const scopedToken = scopedTokenKey ? getAuthValue(scopedTokenKey) : null;
  if (scopedToken) return scopedToken;

  const path = window.location.pathname;

  if (path.includes("cocina")) return getAuthValue("kitchen_token");
  if (path.includes("host")) return getAuthValue("host_token");
  if (path.includes("terminal")) return getAuthValue("waiter_token");
  if (path.includes("panel")) return getAuthValue("admin_token");
  if (path.includes("caja")) return getAuthValue("cashier_token");

  return getAuthValue("token");
};

const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => getSignalRToken(),
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(signalR.LogLevel.None)
  .build();

let isConnected = false;
let listeners = [];
let statusHandlersRegistered = false;
let startPromise = null;
let reconnectTimeoutId = null;

const scheduleReconnect = () => {
  if (reconnectTimeoutId) return;

  reconnectTimeoutId = window.setTimeout(() => {
    reconnectTimeoutId = null;
    void startConnection();
  }, 3000);
};

export const subscribeConnectionStatus = (cb) => {
  listeners.push(cb);
  cb(isConnected);
  return () => {
    listeners = listeners.filter((listener) => listener !== cb);
  };
};

const notifyStatus = (status) => {
  isConnected = status;
  listeners.forEach((cb) => cb(status));
};

export const getConnectionState = () => isConnected;

export const startConnection = async () => {
  if (!statusHandlersRegistered) {
    statusHandlersRegistered = true;

    connection.onreconnecting(() => {
      notifyStatus(false);
    });

    connection.onreconnected(() => {
      notifyStatus(true);
    });

    connection.onclose(() => {
      notifyStatus(false);
      scheduleReconnect();
    });
  }

  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting ||
    connection.state === signalR.HubConnectionState.Reconnecting
  ) {
    notifyStatus(connection.state === signalR.HubConnectionState.Connected);
    return connection;
  }

  if (startPromise) {
    return startPromise;
  }

  startPromise = connection
    .start()
    .then(() => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
      notifyStatus(true);
      return connection;
    })
    .catch((err) => {
      notifyStatus(false);

      if (err?.message?.includes("401")) {
        clearAuthStorage();
        localStorage.removeItem("user_name");
        window.location.href = "/login";
        return connection;
      }

      scheduleReconnect();
      return connection;
    })
    .finally(() => {
      startPromise = null;
    });

  return startPromise;
};

export const restartConnection = async () => {
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }

  if (!getSignalRToken()) {
    notifyStatus(false);
    return connection;
  }

  if (startPromise) {
    return startPromise;
  }

  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting ||
    connection.state === signalR.HubConnectionState.Reconnecting
  ) {
    try {
      await connection.stop();
    } catch {
      // Keep going; a fresh start attempt below will settle the state.
    }
  }

  notifyStatus(false);
  return startConnection();
};

const removeHandler = (eventName, handler) => connection.off(eventName, handler);

const bindEvents = (events, handler) => {
  events.forEach((eventName) => connection.on(eventName, handler));
  return () => {
    events.forEach((eventName) => removeHandler(eventName, handler));
  };
};

export const onReceiveOrder = (callback) => {
  const handler = (order) => {
    if (!order) return;
    useOrderStore.getState().addOrder(order);
    callback?.(order);
  };

  return bindEvents(["receiveorder"], handler);
};

export const onOrderCreated = (callback) => {
  const handler = (order) => {
    if (!order) return;
    useOrderStore.getState().addOrder(order);
    callback?.(order);
  };

  return bindEvents(["OrderCreated"], handler);
};

export const onOrderPreparing = (callback) => {
  const handler = (order) => {
    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  return bindEvents(["orderpreparing", "OrderPreparing"], handler);
};

export const onOrderReady = (callback) => {
  const handler = (order) => {
    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  return bindEvents(["orderready", "OrderReady"], handler);
};

export const offOrderReady = (handler) => {
  removeHandler("orderready", handler);
  removeHandler("OrderReady", handler);
};

export const onOrderDelivered = (callback) => {
  const idHandler = (orderId) => {
    useOrderStore.getState().removeOrder(orderId);
    callback?.(orderId);
  };

  const objectHandler = (order) => {
    useOrderStore.getState().removeOrder(order?.id);
    callback?.(order);
  };

  const cleanupId = bindEvents(["orderdelivered"], idHandler);
  const cleanupObject = bindEvents(["OrderDelivered"], objectHandler);

  return () => {
    cleanupId();
    cleanupObject();
  };
};

export const onOrderCancelled = (callback) => {
  const handler = (data) => {
    const id = data?.id ?? data;
    useOrderStore.getState().removeOrder(id);
    callback?.(data);
  };

  return bindEvents(["ordercancelled", "OrderCancelled"], handler);
};

export const onOrderPaid = (callback) => {
  const handler = (order) => {
    if (!order) return;
    callback?.(order);
  };

  return bindEvents(["orderpaid", "OrderPaid"], handler);
};

export const onStockUpdated = (callback) => {
  const handler = (data, stock) => {
    let productId = null;
    let currentStock = 0;

    if (typeof data === "object" && data !== null) {
      productId = data.productId || data.id || data.Id;
      currentStock = data.newStock ?? data.stock ?? data.Stock ?? 0;
    } else {
      productId = data;
      currentStock = stock;
    }

    callback?.(productId, currentStock);
  };

  return bindEvents(["stockupdated", "StockUpdated"], handler);
};

export const onProductOutOfStock = (callback) => {
  const handler = (productId) => {
    callback?.(productId);
  };

  return bindEvents(["productoutofstock", "ProductOutOfStock"], handler);
};

export const onTableUpdated = (callback) => {
  const handler = (data) => {
    if (!data) return;

    const tableNumber =
      data.tableNumber ?? data.TableNumber ?? data.number ?? data.Number;
    const isOccupied = data.isOccupied ?? data.IsOccupied;

    callback?.({ ...data, tableNumber, isOccupied });
  };

  return bindEvents(["tablesupdated", "TableUpdated"], handler);
};

export default connection;
