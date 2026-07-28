import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { appBasePath, getCurrentAppPath } from "./config/appPaths";

import ViewErrorBoundary from "./components/common/ViewErrorBoundary";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import {
  hasSignalRToken,
  onOrderCancelled,
  onOrderDelivered,
  onOrderPreparing,
  onOrderReady,
  onReceiveOrder,
  restartConnection,
  startConnection,
  stopConnection,
} from "./services/signalrService";
import { startAutoRefreshSession } from "./services/authService";

let signalRInitialized = false;
let signalRCleanup = [];

const CHUNK_RETRY_PREFIX = "kds-chunk-retry";

/**
 * Detecta errores tipicos de despliegues SPA donde el navegador intenta abrir
 * un chunk viejo despues de una publicacion nueva.
 */
const isRecoverableChunkError = (error) => {
  const message = String(error?.message || error || "");

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Loading chunk")
  );
};

const lazyRetry = async (importer, retryKey) => {
  try {
    const module = await importer();
    sessionStorage.removeItem(`${CHUNK_RETRY_PREFIX}:${retryKey}`);
    return module;
  } catch (error) {
    if (!isRecoverableChunkError(error)) {
      throw error;
    }

    const storageKey = `${CHUNK_RETRY_PREFIX}:${retryKey}`;
    const alreadyRetried = sessionStorage.getItem(storageKey) === "1";

    if (!alreadyRetried) {
      sessionStorage.setItem(storageKey, "1");
      window.location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(storageKey);
    throw error;
  }
};

const lazyView = (importer, retryKey) => lazy(() => lazyRetry(importer, retryKey));

const Login = lazyView(() => import("./pages/Login"), "login");
const ChangePasswordPage = lazyView(() => import("./pages/ChangePassword"), "change-password");
const AdminView = lazyView(() => import("./views/AdminView"), "admin");
const CashierView = lazyView(() => import("./views/CashierView"), "cashier");
const HostView = lazyView(() => import("./views/HostView"), "host");
const KitchenDisplay = lazyView(() => import("./views/KitchenDisplay"), "kitchen");
const WaiterView = lazyView(() => import("./views/WaiterView"), "waiter");

const canScrollVertically = (element, deltaY) => {
  if (!element || element === document.body || element === document.documentElement) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  if (!["auto", "scroll", "overlay"].includes(overflowY)) return false;
  if (element.scrollHeight <= element.clientHeight + 1) return false;

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  return element.scrollTop > 0;
};

const findScrollableParent = (startElement, deltaY) => {
  let current = startElement instanceof Element ? startElement : null;

  while (current) {
    if (canScrollVertically(current, deltaY)) return current;
    current = current.parentElement;
  }

  return null;
};

const ScreenLoading = () => (
  <div className="min-h-screen bg-[#020617] text-cyan-100 flex items-center justify-center">
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 px-6 py-4 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
      Cargando KDS
    </div>
  </div>
);

function App() {
  useEffect(() => {
    // En estaciones con mouse, reenviamos la rueda al documento cuando el foco
    // cae sobre contenedores que ya no pueden seguir desplazandose.
    const hasFinePointer = window.matchMedia?.("(pointer: fine)")?.matches;
    if (!hasFinePointer) return undefined;

    const handleWheelScroll = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.deltaY === 0) {
        return;
      }

      const scrollableParent = findScrollableParent(event.target, event.deltaY);
      if (scrollableParent) return;

      const documentElement = document.scrollingElement || document.documentElement;
      const canScrollDocument =
        documentElement.scrollHeight > documentElement.clientHeight + 1 &&
        ((event.deltaY > 0 &&
          documentElement.scrollTop + documentElement.clientHeight < documentElement.scrollHeight - 1) ||
          (event.deltaY < 0 && documentElement.scrollTop > 0));

      if (!canScrollDocument) return;

      event.preventDefault();
      documentElement.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
    };

    document.addEventListener("wheel", handleWheelScroll, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheelScroll);
    };
  }, []);

  useEffect(() => {
    const init = async (forceRestart = false) => {
      const isLoginRoute = getCurrentAppPath() === "/login";
      if (!hasSignalRToken() || signalRInitialized || isLoginRoute) return;

      try {
        signalRInitialized = true;
        // Reutiliza la misma conexion global y solo la reinicia cuando cambia autenticacion.
        if (forceRestart) {
          await restartConnection();
        } else {
          await startConnection();
        }

        signalRCleanup.forEach((cleanup) => cleanup?.());
        signalRCleanup = [
          onReceiveOrder(),
          onOrderPreparing(),
          onOrderReady(),
          onOrderDelivered(),
          onOrderCancelled(),
        ];
      } catch {
        signalRInitialized = false;
      }
    };

    const handleAuthChanged = async () => {
      // Si cambian token o rol, limpiamos handlers viejos antes de negociar otra vez.
      signalRInitialized = false;
      signalRCleanup.forEach((cleanup) => cleanup?.());
      signalRCleanup = [];
      if (!hasSignalRToken()) {
        await stopConnection();
        return;
      }
      void init(true);
    };

    startAutoRefreshSession();
    void init();
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  return (
    <BrowserRouter basename={appBasePath || undefined}>
      <Suspense fallback={<ScreenLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />

          <Route
            path="/cocina"
            element={
              <RoleProtectedRoute role="kitchen">
                <KitchenDisplay />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/host"
            element={
              <RoleProtectedRoute role="host">
                <HostView />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/terminal"
            element={
              <RoleProtectedRoute role="waiter">
                <ViewErrorBoundary>
                  <WaiterView />
                </ViewErrorBoundary>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/panel"
            element={
              <RoleProtectedRoute role="admin">
                <AdminView />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/caja"
            element={
              <RoleProtectedRoute role="cashier">
                <CashierView />
              </RoleProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
