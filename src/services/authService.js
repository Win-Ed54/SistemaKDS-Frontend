import request from "./api.service";

// ===============================
// AUTENTICACIÓN 
// ===============================
export const login = async (username, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  if (!data?.token) throw new Error("No se recibió token");

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  // ✅ Guardar también el token específico por rol:
  localStorage.setItem(`${data.role}_token`, data.token);

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
