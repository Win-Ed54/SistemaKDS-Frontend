import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ViewErrorBoundary from "./components/common/ViewErrorBoundary";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import {
  onOrderCancelled,
  onOrderDelivered,
  onOrderPreparing,
  onOrderReady,
  onReceiveOrder,
  restartConnection,
  startConnection,
} from "./services/signalrService";
import { getAuthValue } from "./services/authStorage";
import { startAutoRefreshSession } from "./services/authService";

let signalRInitialized = false;
let signalRCleanup = [];

const Login = lazy(() => import("./pages/Login"));
const AdminView = lazy(() => import("./views/AdminView"));
const CashierView = lazy(() => import("./views/CashierView"));
const HostView = lazy(() => import("./views/HostView"));
const KitchenDisplay = lazy(() => import("./views/KitchenDisplay"));
const WaiterView = lazy(() => import("./views/WaiterView"));

const ScreenLoading = () => (
  <div className="min-h-screen bg-[#020617] text-cyan-100 flex items-center justify-center">
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 px-6 py-4 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
      Cargando KDS
    </div>
  </div>
);

function App() {
  useEffect(() => {
    const init = async (forceRestart = false) => {
      const token = getAuthValue("token");
      const isLoginRoute = window.location.pathname === "/login";
      if (!token || signalRInitialized || isLoginRoute) return;

      try {
        signalRInitialized = true;
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

    const handleAuthChanged = () => {
      signalRInitialized = false;
      signalRCleanup.forEach((cleanup) => cleanup?.());
      signalRCleanup = [];
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
    <BrowserRouter>
      <Suspense fallback={<ScreenLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

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
