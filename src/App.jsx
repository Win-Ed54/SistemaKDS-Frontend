import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";
import Login from "./pages/Login";

const PrivateRoute = ({ children }) => {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Login />;
  }

  return children;
};

function App() {

  return (
    <BrowserRouter>

      <nav className="p-4 bg-gray-800 text-white flex gap-4">
        <Link to="/kitchen">Cocina</Link>
        <Link to="/waiter">Mesero</Link>
      </nav>

      <Routes>

        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <KitchenDisplay />
            </PrivateRoute>
          }
        />

        <Route
          path="/kitchen"
          element={
            <PrivateRoute>
              <KitchenDisplay />
            </PrivateRoute>
          }
        />

        <Route
          path="/waiter"
          element={
            <PrivateRoute>
              <WaiterView />
            </PrivateRoute>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
