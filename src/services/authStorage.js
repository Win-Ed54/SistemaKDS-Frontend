const AUTH_KEYS = [
  "token",
  "role",
  "refresh_token",
  "user_name",
  "admin_token",
  "waiter_token",
  "host_token",
  "kitchen_token",
  "cashier_token",
];

export const getAuthValue = (key) => {
  const sessionValue = sessionStorage.getItem(key);
  if (sessionValue) return sessionValue;

  const legacyValue = localStorage.getItem(key);
  if (legacyValue) {
    sessionStorage.setItem(key, legacyValue);
    localStorage.removeItem(key);
    return legacyValue;
  }

  return null;
};

export const setAuthValue = (key, value) => {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
};

export const clearAuthStorage = () => {
  AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

export const getRoleRoute = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const map = {
    kitchen: "/cocina",
    host: "/host",
    waiter: "/terminal",
    admin: "/panel",
    cashier: "/caja",
  };

  return map[normalizedRole] ?? "/login";
};
