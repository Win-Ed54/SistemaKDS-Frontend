const API_URL = "/api";

const getToken = () => {
  const path = window.location.pathname;
  if (path.includes("cocina"))   return localStorage.getItem("kitchen_token");
  if (path.includes("terminal")) return localStorage.getItem("waiter_token");
  if (path.includes("panel"))    return localStorage.getItem("admin_token");
  return localStorage.getItem("token");
};

let isRefreshing = false;
let refreshQueue = [];

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    ["token","role","refresh_token","admin_token","waiter_token","kitchen_token"]
      .forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("refresh_token", data.refreshToken);
  localStorage.setItem(`${data.role}_token`, data.token);
  return data.token;
};

const request = async (endpoint, options = {}, retry = true) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const response = await fetch(`${API_URL}/${cleanEndpoint}`, { ...options, headers });
  const isAuthRoute = cleanEndpoint.startsWith("auth/login");

  if (response.status === 401 && retry && !isAuthRoute) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        await refreshAccessToken();
        isRefreshing = false;
        refreshQueue.forEach((resolve) => resolve());
        refreshQueue = [];
        return request(endpoint, options, false);
      } catch {
        isRefreshing = false;
        refreshQueue = [];
        throw new Error("Session expired");
      }
    } else {
      return new Promise((resolve) => {
        refreshQueue.push(() => resolve(request(endpoint, options, false)));
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.message || errorData || `Error: ${response.status}`;

    const error = new Error(message);
    error.response = { status: response.status, data: errorData };
    throw error;
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") return null;
  return await response.json();
};

export default request;

export const createOrder        = (data)       => request("/orders",                    { method: "POST",  body: JSON.stringify(data) });
export const getActiveOrders    = ()           => request("/orders/active");
export const getOrderHistory    = ()           => request("/orders/history");
export const getTopProducts     = (limit = 10)=> request(`/orders/top-products?limit=${limit}`);
export const markOrderPreparing = (id)        => request(`/orders/${id}/preparing`,     { method: "PATCH", body: JSON.stringify({}) });
export const markOrderReady     = (id)        => request(`/orders/${id}/ready`,         { method: "PATCH" });
export const finishOrder        = (id)        => request(`/orders/${id}/finish`,        { method: "PATCH" });
export const cancelOrder        = (id)        => request(`/orders/${id}/cancel`,        { method: "PATCH" });
export const getTables          = ()           => request("/tables");
export const getProducts        = ()           => request("/products");
export const updateProductStock = (id, stock) => request(`/products/${id}/stock`,       { method: "PATCH", body: JSON.stringify({ newStock: stock }) });
export const createProduct      = (data)       => request("/products",                   { method: "POST",  body: JSON.stringify(data) });
export const updateProduct      = (id, data)  => request(`/products/${id}`,             { method: "PUT",   body: JSON.stringify(data) });
export const deleteProduct      = (id)        => request(`/products/${id}`,             { method: "DELETE" });
export const getWaiterOrdersToday = (waiterName) => 
  request(`/orders/waiter/${waiterName}/today`);