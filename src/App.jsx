import { useEffect } from "react"; // 1. Importa useEffect
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";
import AdminView from "./views/AdminView";

import RoleProtectedRoute from "./routes/RoleProtectedRoute";

// 2. Importa las funciones de tu servicio de SignalR
import { 
  startConnection, 
  onOrderCreated, 
  onReceiveOrder, 
  onOrderReady,
  onOrderPreparing,
  onOrderDelivered 
} from "./services/signalrService"; 

function App() {

  // 3. Agrega el useEffect para inicializar la conexión globalmente
  useEffect(() => {
    const initSignalR = async () => {
      try {
        // Obtenemos el token para saber si intentar la conexión
        const token = localStorage.getItem("token");
        if (!token) return;

        // Iniciamos conexión. 
        // Nota: startConnection ya maneja internamente el joinGroup si pasas el array.
        // Aquí puedes pasar los grupos generales o dejarlo vacío y que cada vista llame a joinGroup.
        await startConnection(["admin", "kitchen", "waiter"]);

        // Activamos todos los "escuchadores" de eventos
        onOrderCreated();    // <--- Esto soluciona tu advertencia de la consola
        onReceiveOrder();
        onOrderReady();
        onOrderPreparing();
        onOrderDelivered();

      } catch (error) {
        console.error("Error al inicializar SignalR:", error);
      }
    };

    initSignalR();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* REDIRECCIÓN INICIAL */}
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/kitchen"
          element={
            <RoleProtectedRoute role="kitchen">
              <KitchenDisplay />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/waiter"
          element={
            <RoleProtectedRoute role="waiter">
              <WaiterView />
            </RoleProtectedRoute>
          }
        />

        {/* NUEVA RUTA ADMIN */}
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute role="admin">
              <AdminView />
            </RoleProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;