const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no definido");
}

// ---------------------------
// OBTENER TOKEN
// ---------------------------
const getToken = () => {
  const path = window.location.pathname;
  let token = null;

  if (path.includes("kitchen")) token = localStorage.getItem("kitchen_token");
  else if (path.includes("waiter")) token = localStorage.getItem("waiter_token");
  else if (path.includes("admin")) token = localStorage.getItem("admin_token");

  return token || localStorage.getItem("token");
};
// ---------------------------
// REQUEST GENÉRICO (MEJORADO PARA CAPTURAR ERRORES DE STOCK)
// ---------------------------
const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

  const response = await fetch(`${cleanUrl}${cleanEndpoint}`, { ...options, headers });

  // SI LA RESPUESTA NO ES OK (Ej: Error 400 de stock)
  if (!response.ok) {
    // Intentamos leer el mensaje de error que envía el backend
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `Error: ${response.status}`);
    
    // Adjuntamos la respuesta para que el componente pueda leerla
    error.response = { data: errorData };
    throw error;
  }

  // Si no hay contenido (204)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null; 
  }

  return await response.json();
};

export default request;

// ===============================
// ÓRDENES
// ===============================
export const createOrder = (orderData) => request("/orders", { method: "POST", body: JSON.stringify(orderData) });
export const getActiveOrders = () => request("/orders/active");
export const getOrderHistory = () => request("/orders/history");
export const getTopProducts  = (limit = 10) => request(`/orders/top-products?limit=${limit}`);

// ===============================
// CAMBIOS DE ESTADO (PATCH)
// ===============================
export const markOrderPreparing = (orderId) => request(`/orders/${orderId}/preparing`, { method: "PATCH", body: JSON.stringify({}) });
export const markOrderReady = (orderId) => request(`/orders/${orderId}/ready`, { method: "PATCH" });
export const finishOrder = (orderId) => request(`/orders/${orderId}/finish`, { method: "PATCH" });
export const cancelOrder = (orderId) => request(`/orders/${orderId}/cancel`, { method: "PATCH" });

// ===============================
// TABLAS Y PRODUCTOS
// ===============================
export const getTables = () => request("/tables");
export const getProducts = () => request("/products");
export const updateProductStock = (productId, newStock) => 
  request(`/products/${productId}/stock`, { 
    method: "PATCH", 
    body: JSON.stringify({ newStock }) 
  });