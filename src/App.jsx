import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";

import RoleProtectedRoute from "./routes/RoleProtectedRoute";

function App() {

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

      </Routes>

    </BrowserRouter>

  );

}

export default App;
