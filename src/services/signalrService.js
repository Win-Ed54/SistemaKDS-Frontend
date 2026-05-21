import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";
import { clearAuthStorage, getAuthValue } from "./authStorage";
import { getAppPath, getCurrentAppPath } from "../config/appPaths";
import { hubUrl } from "../config/runtime";
const ROLE_TOKEN_MAP = {
  kitchen: "kitchen_token",
  host: "host_token",
  waiter: "waiter_token",
  admin: "admin_token",
  cashier: "cashier_token",
};

export const getSignalRToken = (preferredRole = "") => {
  const normalizedPreferredRole = String(preferredRole || "").trim().toLowerCase();
  const preferredTokenKey = ROLE_TOKEN_MAP[normalizedPreferredRole];
  const preferredToken = preferredTokenKey ? getAuthValue(preferredTokenKey) : null;
  if (preferredToken) return preferredToken;

  const path = getCurrentAppPath();

  if (path.includes("cocina")) return getAuthValue("kitchen_token");
  if (path.includes("host")) return getAuthValue("host_token");
  if (path.includes("terminal")) return getAuthValue("waiter_token");
  if (path.includes("panel")) return getAuthValue("admin_token");
  if (path.includes("caja")) return getAuthValue("cashier_token");

  const role = String(getAuthValue("role") || "").trim().toLowerCase();
  const scopedTokenKey = ROLE_TOKEN_MAP[role];
  const scopedToken = scopedTokenKey ? getAuthValue(scopedTokenKey) : null;
  if (scopedToken) return scopedToken;

  return getAuthValue("token");
};

export const hasSignalRToken = (preferredRole = "") => Boolean(getSignalRToken(preferredRole));

const connection = new signalR.HubConnectionBuilder()
  .withUrl(hubUrl, {
    accessTokenFactory: () => getSignalRToken(activePreferredRole),
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(signalR.LogLevel.None)
  .build();

let isConnected = false;
let listeners = [];
let statusHandlersRegistered = false;
let startPromise = null;
let reconnectTimeoutId = null;
let activePreferredRole = "";
const EVENT_DEDUPE_MS = 1500;

const getPayloadId = (payload) => {
  if (payload && typeof payload === "object") {
    return payload.id ?? payload._id ?? payload.Id ?? payload.orderId ?? payload.tableNumber;
  }

  return payload;
};

const createEventDeduper = (scope) => {
  const recentEvents = new Map();

  return (payload) => {
    const id = getPayloadId(payload);
    if (!id) return true;

    const now = Date.now();
    const key = `${scope}:${id}`;
    const lastSeen = recentEvents.get(key) || 0;

    if (now - lastSeen < EVENT_DEDUPE_MS) {
      return false;
    }

    recentEvents.set(key, now);

    for (const [eventKey, timestamp] of recentEvents.entries()) {
      if (now - timestamp > EVENT_DEDUPE_MS * 4) {
        recentEvents.delete(eventKey);
      }
    }

    return true;
  };
};

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

export const startConnection = async (preferredRole = "") => {
  const normalizedPreferredRole = String(preferredRole || "").trim().toLowerCase();
  if (normalizedPreferredRole) {
    activePreferredRole = normalizedPreferredRole;
  }

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
        window.location.href = getAppPath("/login");
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

export const restartConnection = async (preferredRole = "") => {
  const normalizedPreferredRole = String(preferredRole || "").trim().toLowerCase();
  if (normalizedPreferredRole) {
    activePreferredRole = normalizedPreferredRole;
  }

  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }

  if (!getSignalRToken(activePreferredRole)) {
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
  return startConnection(activePreferredRole);
};

const removeHandler = (eventName, handler) => connection.off(eventName, handler);

const bindEvents = (events, handler) => {
  events.forEach((eventName) => connection.on(eventName, handler));
  return () => {
    events.forEach((eventName) => removeHandler(eventName, handler));
  };
};

export const onReceiveOrder = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:new");
  const handler = (order) => {
    if (!order) return;
    if (!shouldProcessEvent(order)) return;
    useOrderStore.getState().addOrder(order);
    callback?.(order);
  };

  return bindEvents(["receiveorder", "OrderCreated"], handler);
};

export const onOrderPreparing = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:preparing");
  const handler = (order) => {
    if (!shouldProcessEvent(order)) return;
    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  return bindEvents(["orderpreparing", "OrderPreparing"], handler);
};

export const onOrderReady = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:ready");
  const handler = (order) => {
    if (!shouldProcessEvent(order)) return;
    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  return bindEvents(["orderready", "OrderReady"], handler);
};

export const onOrderDelivered = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:delivered");
  const idHandler = (orderId) => {
    if (!shouldProcessEvent(orderId)) return;
    useOrderStore.getState().removeOrder(orderId);
    callback?.(orderId);
  };

  const objectHandler = (order) => {
    if (!shouldProcessEvent(order)) return;
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
  const shouldProcessEvent = createEventDeduper("order:cancelled");
  const handler = (data) => {
    const id = data?.id ?? data;
    if (!shouldProcessEvent(id)) return;
    useOrderStore.getState().removeOrder(id);
    callback?.(data);
  };

  return bindEvents(["ordercancelled", "OrderCancelled"], handler);
};

export const onOrderPaid = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:paid");
  const handler = (order) => {
    if (!order) return;
    if (!shouldProcessEvent(order)) return;
    callback?.(order);
  };

  return bindEvents(["orderpaid", "OrderPaid"], handler);
};

export const onOrderCreatedForPayment = (callback) => {
  const shouldProcessEvent = createEventDeduper("order:created-for-payment");
  const handler = (order) => {
    if (!order) return;
    if (!shouldProcessEvent(order)) return;
    callback?.(order);
  };

  return bindEvents(["ordercreatedforpayment", "OrderCreatedForPayment"], handler);
};

export const onStockUpdated = (callback) => {
  const shouldProcessEvent = createEventDeduper("stock:updated");
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

    if (!shouldProcessEvent(productId)) return;
    callback?.(productId, currentStock);
  };

  return bindEvents(["stockupdated", "StockUpdated"], handler);
};

export const onProductOutOfStock = (callback) => {
  const shouldProcessEvent = createEventDeduper("stock:out");
  const handler = (productId) => {
    if (!shouldProcessEvent(productId)) return;
    callback?.(productId);
  };

  return bindEvents(["productoutofstock", "ProductOutOfStock"], handler);
};

export const onTableUpdated = (callback) => {
  const shouldProcessEvent = createEventDeduper("table:updated");
  const handler = (data) => {
    if (!data) return;

    const tableNumber =
      data.tableNumber ?? data.TableNumber ?? data.number ?? data.Number;
    const isOccupied = data.isOccupied ?? data.IsOccupied;

    if (!shouldProcessEvent(tableNumber)) return;
    callback?.({ ...data, tableNumber, isOccupied });
  };

  return bindEvents(["tablesupdated", "TableUpdated"], handler);
};

export default connection;
