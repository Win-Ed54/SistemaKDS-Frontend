import { BrowserRouter, Routes, Route } from "react-router-dom";
import KitchenDisplay from "./views/KitchenDisplay";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KitchenDisplay />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
