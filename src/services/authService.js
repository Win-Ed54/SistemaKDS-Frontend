import request from "./api.service";

const ROLE_ROUTES = {
  kitchen: "/cocina",
  waiter:  "/terminal",
  admin:   "/panel",
};

export const login = async (username, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!data?.token) throw new Error("No se recibió token");

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem(`${data.role}_token`, data.token);

  return data;
};

export const getSession = () => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (!token || !role) return null;

  // Verificar expiración
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
  } catch {
    logout();
    return null;
  }

  return { token, role };
};

// ✅ Devuelve la ruta amigable para el rol
export const getRouteForRole = (role) => ROLE_ROUTES[role] ?? "/login";

export const logout = () => {
  ["token", "role", "admin_token", "waiter_token", "kitchen_token"].forEach(
    (k) => localStorage.removeItem(k)
  );
};