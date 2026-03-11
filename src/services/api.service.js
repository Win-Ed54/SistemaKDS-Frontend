const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no definido");
}

// ===============================
// FUNCIÓN BASE PARA REQUESTS
// ===============================
const request = async (endpoint, options = {}) => {

  try {

    const token = localStorage.getItem("token");

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    // agregar token solo si existe
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    // si el token expiró
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    // manejar errores
    if (!response.ok) {

      let errorMessage = "Error en la petición";

      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {}

      throw new Error(errorMessage);
    }

    // respuestas sin contenido
    if (response.status === 204) {
      return null;
    }

    return await response.json();

  } catch (err) {

    console.error("API Error:", err);
    throw err;

  }
};

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
