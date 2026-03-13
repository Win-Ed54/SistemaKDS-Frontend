import React, { useEffect } from "react"; // 1. Añadimos useEffect
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

import useSignalRConnection from "../hooks/useSignalRConnection";
import useProducts from "../hooks/useProducts";
import useTables from "../hooks/useTables";

// 2. Importamos los listeners del servicio
import { onOrderReady, onOrderDelivered } from "../services/signalrService";

import TableSelector from "../components/TableSelector";
import ProductList from "../components/ProductList";
import OrderPanel from "../components/OrderPanel";

const WaiterView = () => {
  const navigate = useNavigate();

  const { isConnected } = useSignalRConnection("waiter");
  const { products } = useProducts();
  const { tables } = useTables();

  // 3. ACTIVAR LOS "OÍDOS" DE SIGNALR (Esto quita los warnings)
  useEffect(() => {
    // Escuchar cuando una orden esté lista
    onOrderReady((order) => {
      console.log("¡Alerta! Orden lista para entrega:", order);
      alert(`🔔 ¡Atención! El pedido de la Mesa ${order.tableNumber} está LISTO.`);
    });

    // Escuchar cuando una orden se entregue/borre
    onOrderDelivered((orderId) => {
      console.log("Orden finalizada en el sistema:", orderId);
    });
  }, []); // Se ejecuta una sola vez al cargar el componente

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center p-6">
        <h1 className="text-3xl font-bold">Panel de Ordenes</h1>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {/* Punto de color dinámico según la conexión */}
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? "text-green-400" : "text-red-400"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded font-bold">
            Logout
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-2 gap-6 p-6">
        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl mb-4 font-semibold">Mesas</h2>
          <TableSelector tables={tables} />
          <h2 className="text-xl mt-6 mb-4 font-semibold">Productos</h2>
          <ProductList products={products} />
        </div>
        <OrderPanel />
      </div>
    </div>
  );
};

export default WaiterView;

