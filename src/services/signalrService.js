import * as signalR from "@microsoft/signalr";
import useOrderStore from "../store/orderStore";

// ============================
// CONFIG
// ============================
const HUB_URL = import.meta.env.VITE_HUB_URL;
const isDev = import.meta.env.DEV;

if (!HUB_URL) throw new Error("VITE_HUB_URL no definido");

// ============================
// CONNECTION
// ============================
const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_URL, {
    accessTokenFactory: () => {
      const path = window.location.pathname;

      if (path.includes("cocina")) return localStorage.getItem("kitchen_token");
      if (path.includes("terminal")) return localStorage.getItem("waiter_token");
      if (path.includes("panel")) return localStorage.getItem("admin_token");

      return localStorage.getItem("token");
    },
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(isDev ? signalR.LogLevel.Information : signalR.LogLevel.Error)
  .build();

// ============================
// STATE
// ============================
let isConnected = false;
let listeners = [];
let handlersRegistered = false;

// ============================
// STATUS
// ============================
export const subscribeConnectionStatus = (cb) => {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

const notifyStatus = (status) => {
  isConnected = status;
  listeners.forEach((cb) => cb(status));
};

export const getConnectionState = () => isConnected;

// ============================
// START CONNECTION
// ============================
export const startConnection = async () => {
  if (
    connection.state === signalR.HubConnectionState.Connected ||
    connection.state === signalR.HubConnectionState.Connecting
  ) {
    return connection;
  }

  while (connection.state !== signalR.HubConnectionState.Connected) {
    try {
      if (isDev) console.log("🔌 Conectando a SignalR...");
      await connection.start();
      notifyStatus(true);
      if (isDev) console.log("✅ Conectado a SignalR");
    } catch (err) {
      notifyStatus(false);

      if (err?.message?.includes("401")) {
        console.error("❌ Token inválido → logout");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!handlersRegistered) {
    handlersRegistered = true;

    connection.onreconnecting(() => {
      if (isDev) console.warn("⚠️ Reconectando...");
      notifyStatus(false);
    });

    connection.onreconnected(() => {
      if (isDev) console.log("🔁 Reconectado");
      notifyStatus(true);
    });

    connection.onclose(() => {
      if (isDev) console.error("❌ Conexión cerrada");
      notifyStatus(false);
    });
  }

  return connection;
};

// ============================
// HELPERS
// ============================
const off = (event) => connection.off(event);

// ============================
// 🧾 ORDENES
// ============================

export const onReceiveOrder = (callback) => {
  off("receiveorder");

  connection.on("receiveorder", (order) => {
    if (!order) return;

    if (isDev) console.log("🆕 Nueva orden:", order);

    useOrderStore.getState().addOrder(order);
    callback?.(order);
  });
};

export const onOrderCreated = (callback) => {
  off("OrderCreated");

  connection.on("OrderCreated", (order) => {
    if (!order) return;

    if (isDev) console.log("🆕 OrderCreated:", order);

    useOrderStore.getState().addOrder(order);
    callback?.(order);
  });
};

export const onOrderPreparing = (callback) => {
  off("orderpreparing");
  off("OrderPreparing");

  const handler = (order) => {
    if (isDev) console.log("👨‍🍳 Preparando:", order);

    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  connection.on("orderpreparing", handler);
  connection.on("OrderPreparing", handler);
};

export const onOrderReady = (callback) => {
  off("orderready");
  off("OrderReady");

  const handler = (order) => {
    if (isDev) console.log("🟢 Lista:", order);

    useOrderStore.getState().updateOrder(order);
    callback?.(order);
  };

  connection.on("orderready", handler);
  connection.on("OrderReady", handler);
};

export const onOrderDelivered = (callback) => {
  off("orderdelivered");
  off("OrderDelivered");

  // 🔹 ID
  connection.on("orderdelivered", (orderId) => {
    if (isDev) console.log("📦 Entregada (ID):", orderId);

    useOrderStore.getState().removeOrder(orderId);
    callback?.(orderId);
  });

  // 🔹 OBJ
  connection.on("OrderDelivered", (order) => {
    if (isDev) console.log("📦 Entregada (OBJ):", order);

    useOrderStore.getState().removeOrder(order?.id);
    callback?.(order);
  });
};

export const onOrderCancelled = (callback) => {
  off("ordercancelled");
  off("OrderCancelled");

  const handler = (data) => {
    const id = data?.id ?? data;

    if (isDev) console.log("❌ Cancelada:", id);

    useOrderStore.getState().removeOrder(id);
    callback?.(data);
  };

  connection.on("ordercancelled", handler);
  connection.on("OrderCancelled", handler);
};

// ============================
// 📦 STOCK
// ============================

export const onStockUpdated = (callback) => {
  off("stockupdated");
  off("StockUpdated");

  const handler = (data, stock) => {
    let productId = null;
    let currentStock = 0;

    if (typeof data === "object") {
      productId = data.productId || data.id || data.Id;
      currentStock = data.newStock ?? data.stock ?? data.Stock ?? 0;
    } else {
      productId = data;
      currentStock = stock;
    }

    if (isDev) console.log(`📦 Stock: ${productId} → ${currentStock}`);

    callback?.(productId, currentStock);
  };

  connection.on("stockupdated", handler);
  connection.on("StockUpdated", handler);
};

export const onProductOutOfStock = (callback) => {
  off("productoutofstock");
  off("ProductOutOfStock");

  const handler = (productId) => {
    console.warn("🚫 Sin stock:", productId);
    callback?.(productId);
  };

  connection.on("productoutofstock", handler);
  connection.on("ProductOutOfStock", handler);
};

// ============================
// 🪑 MESAS
// ============================

export const onTableUpdated = (callback) => {
  off("tablesupdated");
  off("TableUpdated");

  const handler = (data) => {
    if (!data) return;

    const tableNumber = data.tableNumber ?? data.TableNumber;
    const isOccupied = data.isOccupied ?? data.IsOccupied;

    if (isDev) {
      console.log(
        `🪑 Mesa ${tableNumber} → ${isOccupied ? "OCUPADA" : "LIBRE"}`
      );
    }

    callback?.({ tableNumber, isOccupied });
  };

  connection.on("tablesupdated", handler);
  connection.on("TableUpdated", handler);
};

// ============================
// EXPORT
// ============================
export default connection;
