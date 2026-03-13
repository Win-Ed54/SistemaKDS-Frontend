const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no definido");
}

const getToken = () => {

  const path = window.location.pathname;

  if (path.includes("kitchen"))
    return localStorage.getItem("kitchen_token");

  if (path.includes("waiter"))
    return localStorage.getItem("waiter_token");

  if (path.includes("admin"))
    return localStorage.getItem("admin_token");

  return null;
};

const request = async (endpoint, options = {}) => {

  try {

    const token = getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error("Error en la petición");
    }

    return response;

  } catch (error) {

    console.error("API Error:", error);
    throw error;

  }
};

export default request;


// ===============================
// ÓRDENES
// ===============================

// Crear orden
export const createOrder = (orderData) => {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify(orderData)
  });
};

// Obtener órdenes activas
export const getActiveOrders = () => {
  return request("/orders/active");
};

// Historial
export const getOrderHistory = () => {
  return request("/orders/history");
};

// ===============================
// CAMBIOS DE ESTADO
// ===============================

// Pending → Preparing
export const markOrderPreparing = (orderId) => {
  return request(`/orders/${orderId}/preparing`, {
    method: "PATCH"
  });
};

// Preparing → Ready
export const markOrderReady = (orderId) => {
  return request(`/orders/${orderId}/ready`, {
    method: "PATCH"
  });
};

// Ready → Delivered
export const finishOrder = (orderId) => {
  return request(`/orders/${orderId}/finish`, {
    method: "PATCH"
  });
};

// Cancelar orden
export const cancelOrder = (orderId) => {
  return request(`/orders/${orderId}/cancel`, {
    method: "PATCH"
  });
};

// ===============================
// TABLAS
// ===============================

export const getTables = () => {
  return request("/tables");
};

// ===============================
// PRODUCTOS
// ===============================

export const getProducts = () => {
  return request("/products");
};
