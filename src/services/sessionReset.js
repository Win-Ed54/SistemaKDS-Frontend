import { clearAuthStorage } from "./authStorage";
import { getAppPath } from "../config/appPaths";

let resetPromise = null;

export const forceSessionReset = async ({ redirect = true } = {}) => {
  if (resetPromise) return resetPromise;

  resetPromise = (async () => {
    clearAuthStorage();
    window.dispatchEvent(new Event("auth-changed"));

    try {
      const { stopConnection } = await import("./signalrService");
      await stopConnection();
    } catch {
      // Even if SignalR cannot stop cleanly, the session must be cleared.
    }

    if (redirect) {
      const loginPath = getAppPath("/login");
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
  })().finally(() => {
    resetPromise = null;
  });

  return resetPromise;
};
