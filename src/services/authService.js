import request from "./api.service";
import {
  clearAuthStorage,
  getAuthValue,
  getRoleRoute,
  setAuthValue,
} from "./authStorage";

export const login = async (username, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!data?.token) throw new Error("No se recibio token");

  setAuthValue("token", data.token);
  setAuthValue("role", data.role);
  setAuthValue("refresh_token", data.refreshToken);
  setAuthValue(`${data.role}_token`, data.token);
  localStorage.setItem("user_name", username);
  window.dispatchEvent(new Event("auth-changed"));

  return data;
};

export const getSession = () => {
  const token = getAuthValue("token");
  const role = getAuthValue("role");
  if (!token || !role) return null;

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

export { getRoleRoute as getRouteForRole };

export const logout = () => {
  clearAuthStorage();
  localStorage.removeItem("user_name");
  window.dispatchEvent(new Event("auth-changed"));
};
