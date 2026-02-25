import { BrowserRouter, Routes, Route } from 'react-router-dom';
import KitchenDisplay from './views/KitchenDisplay';
import WaiterView from './views/WaiterView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cocina" element={<KitchenDisplay />} />
        <Route path="/mesero" element={<WaiterView />} />
      </Routes>
    </BrowserRouter>
  );
}
