import { clearAuthStorage, getAuthValue, setAuthValue } from "./authStorage";
import { getAppPath, getCurrentAppPath } from "../config/appPaths";
import { buildApiUrl } from "../config/runtime";

const getToken = () => {
  const path = getCurrentAppPath();
  if (path.includes("cocina")) return getAuthValue("kitchen_token");
  if (path.includes("host")) return getAuthValue("host_token");
  if (path.includes("terminal")) return getAuthValue("waiter_token");
  if (path.includes("panel")) return getAuthValue("admin_token");
  if (path.includes("caja")) return getAuthValue("cashier_token");
  return getAuthValue("token");
};

let isRefreshing = false;
let refreshQueue = [];

const refreshAccessToken = async () => {
  const refreshToken = getAuthValue("refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearAuthStorage();
    window.location.href = getAppPath("/login");
    throw new Error("Session expired");
  }

  const data = await res.json();
  const normalizedRole = String(data.role || "").trim().toLowerCase();
  setAuthValue("token", data.token);
  setAuthValue("refresh_token", data.refreshToken);
  setAuthValue(`${normalizedRole}_token`, data.token);
  setAuthValue("role", normalizedRole);
  return data.token;
};

const request = async (endpoint, options = {}, retry = true) => {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (!isFormData && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const response = await fetch(buildApiUrl(cleanEndpoint), { ...options, headers });
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
    }

    return new Promise((resolve) => {
      refreshQueue.push(() => resolve(request(endpoint, options, false)));
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error ||
      errorData?.message ||
      (typeof errorData === "string" ? errorData : `Error: ${response.status}`);

    const error = new Error(message);
    error.response = { status: response.status, data: errorData };
    throw error;
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") return null;
  return await response.json();
};

export default request;

export const createOrder = (data) =>
  request("/orders", { method: "POST", body: JSON.stringify(data) });
export const getActiveOrders = () => request("/orders/active");
export const getOrderHistory = () => request("/orders/history");
export const getTopProducts = (limit = 10) => request(`/orders/top-products?limit=${limit}`);
export const markOrderPreparing = (id) =>
  request(`/orders/${id}/preparing`, { method: "PATCH", body: JSON.stringify({}) });
export const markOrderReady = (id) => request(`/orders/${id}/ready`, { method: "PATCH" });
export const finishOrder = (id) => request(`/orders/${id}/finish`, { method: "PATCH" });
export const payOrder = (id, data) =>
  request(`/orders/${id}/pay`, { method: "PATCH", body: JSON.stringify(data || {}) });
export const cancelOrder = (id) => request(`/orders/${id}/cancel`, { method: "PATCH" });
export const getTables = () => request("/tables");
export const getProducts = () => request("/products");
export const updateProductStock = (id, stock) =>
  request(`/products/${id}/stock`, { method: "PATCH", body: JSON.stringify({ newStock: stock }) });
export const createProduct = (data) =>
  request("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id, data) =>
  request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request("/products/upload-image", { method: "POST", body: formData });
};
export const deleteProduct = (id) => request(`/products/${id}`, { method: "DELETE" });
export const getWaiterOrdersToday = (waiterName) => request(`/orders/waiter/${waiterName}/today`);
export const getMyWaiterOrdersToday = () => request("/waiter/today");
export const closeTable = (tableNumber) =>
  request(`/orders/table/${tableNumber}/close`, { method: "PATCH" });
export const getWaiterSummary = () => request("/waiter/summary");
export const getKdsSettings = () => request("/kdssettings");
export const updateKdsSettings = (data) =>
  request("/kdssettings", { method: "PUT", body: JSON.stringify(data) });
export const seatTable = (tableNumber, data) =>
  request(`/tables/${tableNumber}/seat`, { method: "PATCH", body: JSON.stringify(data) });
export const unseatTable = (tableNumber) =>
  request(`/tables/${tableNumber}/unseat`, { method: "PATCH", body: JSON.stringify({}) });
export const transferTableAssignment = (tableNumber, targetTableNumber) =>
  request(`/tables/${tableNumber}/transfer`, {
    method: "PATCH",
    body: JSON.stringify({ targetTableNumber }),
  });
export const startTableCleaning = (tableNumber, data) =>
  request(`/tables/${tableNumber}/start-cleaning`, { method: "PATCH", body: JSON.stringify(data || {}) });
export const getWaiters = () => request("/users/waiters");
