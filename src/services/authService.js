import request from "./api.service";

// ===============================
// AUTENTICACIÓN (CORREGIDO)
// ===============================
export const login = async (username, password) => {
  // 'data' recibe directamente el objeto JSON (token, role, etc.) 
  // porque el servicio 'request' ya hace el .json() internamente.
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password
    })
  });

  // VERIFICACIÓN
  if (!data || !data.token) {
    throw new Error("Login failed: No se recibió un token válido");
  }

  // GUARDAR SESIÓN
  // Es vital usar 'token' y 'role' para que SignalR y los paneles los encuentren
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);

  return data;
};

// ===============================
// SESIÓN
// ===============================
export const getSession = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) return null;

  return { token, role };
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  // Opcional: limpiar también los tokens específicos por ruta si los usas
  localStorage.removeItem("waiter_token");
  localStorage.removeItem("kitchen_token");
};

// ===============================
// OTROS (CORREGIDOS)
// ===============================
// Usamos 'request' para heredar el token y la URL base automáticamente
export const getProducts = () => {
  return request("/products");
};

export const getTables = () => {
  return request("/tables");
};
