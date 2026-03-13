const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no definido");
}

// ---------------------------
// OBTENER TOKEN (CORREGIDO)
// ---------------------------
const getToken = () => {
  const path = window.location.pathname;
  let token = null;

  // 1. Intenta obtener el específico por ruta (lo que ya tenías)
  if (path.includes("kitchen")) token = localStorage.getItem("kitchen_token");
  else if (path.includes("waiter")) token = localStorage.getItem("waiter_token");
  else if (path.includes("admin")) token = localStorage.getItem("admin_token");

  // 2. Si lo anterior es null, usa el genérico 'token' como respaldo
  // Esto soluciona el error 401 si tu login guarda el token con nombre simple
  return token || localStorage.getItem("token");
};

// ---------------------------
// REQUEST GENÉRICO (CORREGIDO)
// ---------------------------
const request = async (endpoint, options = {}) => {
  try {
    const token = getToken();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

    const response = await fetch(`${cleanUrl}${cleanEndpoint}`, { ...options, headers });

    // Si la respuesta fue exitosa (200-299)
    if (response.ok) {
      // VERIFICACIÓN CLAVE: Si no hay contenido (204) o el body está vacío
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null; 
      }
      // Intentar leer JSON solo si hay contenido
      return await response.json();
    }

    throw new Error(`Error en la petición: ${response.status}`);
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

export const markOrderPreparing = (orderId) => {
  return request(`/orders/${orderId}/preparing`, {
    method: "PATCH",
    body: JSON.stringify({})
  });
};

export const markOrderReady = (orderId) => {
  return request(`/orders/${orderId}/ready`, {
    method: "PATCH"
  });
};

export const finishOrder = (orderId) => {
  return request(`/orders/${orderId}/finish`, {
    method: "PATCH"
  });
};

export const cancelOrder = (orderId) => {
  return request(`/orders/${orderId}/cancel`, {
    method: "PATCH"
  });
};

// ===============================
// TABLAS Y PRODUCTOS
// ===============================

export const getTables = () => {
  return request("/tables");
};

export const getProducts = () => {
  return request("/products");
};
