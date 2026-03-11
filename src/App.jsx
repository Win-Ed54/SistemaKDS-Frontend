import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";
import Login from "./pages/Login";
import { getUserRole } from "./services/authService";

const PrivateRoute = ({ children, role }) => {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  const userRole = getUserRole();

  if (userRole !== role) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/login" element={<Login />} />

        <Route
          path="/kitchen"
          element={
            <PrivateRoute role="kitchen">
              <KitchenDisplay />
            </PrivateRoute>
          }
        />

        <Route
          path="/waiter"
          element={
            <PrivateRoute role="waiter">
              <WaiterView />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
