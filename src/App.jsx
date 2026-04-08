import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import AdminView from "./views/AdminView";
import CashierView from "./views/CashierView";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import {
  onOrderCancelled,
  onOrderDelivered,
  onOrderPreparing,
  onOrderReady,
  onReceiveOrder,
  startConnection,
} from "./services/signalrService";
import { getAuthValue } from "./services/authStorage";

let signalRInitialized = false;
let signalRCleanup = [];

function App() {
  useEffect(() => {
    const init = async () => {
      const token = getAuthValue("token");
      if (!token || signalRInitialized) return;

      try {
        signalRInitialized = true;
        await startConnection();

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
      void init();
    };

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
          path="/terminal"
          element={
            <RoleProtectedRoute role="waiter">
              <WaiterView />
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
