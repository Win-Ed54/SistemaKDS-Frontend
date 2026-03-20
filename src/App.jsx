import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login          from "./pages/Login";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView     from "./views/WaiterView";
import AdminView      from "./views/AdminView";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import { startConnection, onOrderCreated, onReceiveOrder,
         onOrderReady, onOrderPreparing, onOrderDelivered } from "./services/signalrService";

function App() {
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await startConnection([]);
        onOrderCreated();
        onReceiveOrder();
        onOrderReady();
        onOrderPreparing();
        onOrderDelivered();
      } catch (err) {
        console.error("SignalR init error:", err);
      }
    };
    init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Navigate to="/login" replace />} />
        <Route path="/login"  element={<Login />} />

        {/* ✅ URLs amigables — sin exponer roles técnicos */}
        <Route path="/cocina"   element={<RoleProtectedRoute role="kitchen"><KitchenDisplay /></RoleProtectedRoute>} />
        <Route path="/terminal" element={<RoleProtectedRoute role="waiter"><WaiterView /></RoleProtectedRoute>} />
        <Route path="/panel"    element={<RoleProtectedRoute role="admin"><AdminView /></RoleProtectedRoute>} />

        {/* Redirigir rutas viejas por si alguien las tiene guardadas */}
        <Route path="/kitchen" element={<Navigate to="/cocina"   replace />} />
        <Route path="/waiter"  element={<Navigate to="/terminal" replace />} />
        <Route path="/admin"   element={<Navigate to="/panel"    replace />} />

        {/* Cualquier ruta desconocida → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
