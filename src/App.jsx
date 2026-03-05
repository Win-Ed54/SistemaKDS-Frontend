import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import KitchenDisplay from "./views/KitchenDisplay";
import WaiterView from "./views/WaiterView";

function App() {
  return (
    <BrowserRouter>
      {/* Navegación simple para pruebas */}
      <nav className="p-4 bg-gray-800 text-white flex gap-4">
        <Link to="/kitchen">Cocina</Link>
        <Link to="/waiter">Mesero</Link>
      </nav>

      <Routes>
        <Route path="/" element={<KitchenDisplay />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/waiter" element={<WaiterView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
