import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";
import { clearAuthStorage, getAuthValue } from "./authStorage";

const HUB_URL = import.meta.env.VITE_HUB_URL;

if (!HUB_URL) throw new Error("VITE_HUB_URL no definido");

const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => {
      const path = window.location.pathname;

      if (path.includes("cocina")) return getAuthValue("kitchen_token");
      if (path.includes("terminal")) return getAuthValue("waiter_token");
      if (path.includes("panel")) return getAuthValue("admin_token");
      if (path.includes("caja")) return getAuthValue("cashier_token");

      return getAuthValue("token");
    },
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(signalR.LogLevel.None)
  .build();

let isConnected = false;
let listeners = [];
let statusHandlersRegistered = false;

export const subscribeConnectionStatus = (cb) => {
  listeners.push(cb);
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
  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting ||
    connection.state === signalR.HubConnectionState.Reconnecting
  ) {
    notifyStatus(connection.state === signalR.HubConnectionState.Connected);
    return connection;
  }

  try {
    await connection.start();
    notifyStatus(true);
  } catch (err) {
    notifyStatus(false);

    if (err?.message?.includes("401")) {
      clearAuthStorage();
      localStorage.removeItem("user_name");
      window.location.href = "/login";
      return connection;
    }
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
      void startConnection();
    });
  }

  return connection;
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

    const tableNumber = data.tableNumber ?? data.TableNumber;
    const isOccupied = data.isOccupied ?? data.IsOccupied;

    callback?.({ tableNumber, isOccupied });
  };

  return bindEvents(["tablesupdated", "TableUpdated"], handler);
};

export default connection;
