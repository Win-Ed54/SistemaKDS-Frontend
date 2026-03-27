import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login          from "./pages/Login";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView     from "./views/WaiterView";
import AdminView      from "./views/AdminView";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import {
  startConnection,
  onReceiveOrder,
  onOrderPreparing,
  onOrderReady,
  onOrderDelivered,
  onOrderCancelled,
} from "./services/signalrService";

function App() {
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await startConnection();

        // ✅ SOLO UNA VEZ
        onReceiveOrder();
        onOrderPreparing();
        onOrderReady();
        onOrderDelivered();
        onOrderCancelled();

        console.log("✅ SignalR conectado");
      } catch (err) {
        console.error("❌ SignalR error:", err);
      }
    };

    init();
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

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
