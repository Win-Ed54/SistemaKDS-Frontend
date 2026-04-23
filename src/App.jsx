import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import AdminView from "./views/AdminView";
import CashierView from "./views/CashierView";
import HostView from "./views/HostView";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";
import ViewErrorBoundary from "./components/common/ViewErrorBoundary";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import {
  onOrderCancelled,
  onOrderCreated,
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
          onOrderCreated(),
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
    </BrowserRouter>
  );
}

export default App;
