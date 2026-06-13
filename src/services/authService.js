import request from "./api.service";
import {
  getAuthValue,
  getRoleRoute,
  setAuthValue,
} from "./authStorage";
import { buildApiUrl } from "../config/runtime";
import { forceSessionReset } from "./sessionReset";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 30 * 1000;

let refreshTimeoutId = null;
let refreshInFlight = null;

const clearRefreshTimeout = () => {
  if (refreshTimeoutId) {
    window.clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

const decodeTokenPayload = (token) => {
  const payloadPart = token?.split(".")?.[1] || "";
  const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
  return JSON.parse(atob(`${normalizedPayload}${padding}`));
};

const getTokenExpirationMs = (token) => {
  try {
    const payload = decodeTokenPayload(token);
    return payload?.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const applySessionTokens = ({ token, role, refreshToken, serviceScope }) => {
  if (!token || !role || !refreshToken) {
    throw new Error("No se recibieron credenciales completas");
  }

  const normalizedRole = String(role).trim().toLowerCase();
  const normalizedServiceScope = String(serviceScope || "hybrid").trim().toLowerCase();

  setAuthValue("token", token);
  setAuthValue("role", normalizedRole);
  setAuthValue("service_scope", normalizedServiceScope);
  setAuthValue("refresh_token", refreshToken);
  setAuthValue(`${normalizedRole}_token`, token);
};

const scheduleRefresh = (token) => {
  clearRefreshTimeout();

  const expirationMs = getTokenExpirationMs(token);
  if (!expirationMs) return;

  const delay = Math.max(
    MIN_REFRESH_DELAY_MS,
    expirationMs - Date.now() - REFRESH_BUFFER_MS,
  );

  refreshTimeoutId = window.setTimeout(() => {
    void refreshSessionToken();
  }, delay);
};

export const refreshSessionToken = async () => {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getAuthValue("refresh_token");
  if (!refreshToken) {
    logout();
    throw new Error("No refresh token");
  }

  refreshInFlight = fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Refresh token invalido o expirado");
      }

      const data = await response.json();
      applySessionTokens(data);
      scheduleRefresh(data.token);
      return data;
    })
    .catch((error) => {
      logout();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

export const startAutoRefreshSession = () => {
  const token = getAuthValue("token");
  if (!token) return;
  scheduleRefresh(token);
};

export const login = async (username, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  applySessionTokens(data);
  setAuthValue("user_name", username);
  setAuthValue("must_change_password", data.requiresPasswordChange ? "true" : "false");
  startAutoRefreshSession();
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

  return { token, role: String(role).trim().toLowerCase() };
};

export { getRoleRoute as getRouteForRole };

export const requiresPasswordChange = () => getAuthValue("must_change_password") === "true";

export const clearPasswordChangeRequirement = () => {
  setAuthValue("must_change_password", "false");
};

export const changePassword = (currentPassword, newPassword) =>
  request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const logout = () => {
  clearRefreshTimeout();
  const token = getAuthValue("token");
  const refreshToken = getAuthValue("refresh_token");

  void (async () => {
    try {
      if (token && refreshToken) {
        await fetch(buildApiUrl("/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Si el logout remoto falla, igual limpiamos la sesion local.
    } finally {
      await forceSessionReset();
    }
  })();
};
