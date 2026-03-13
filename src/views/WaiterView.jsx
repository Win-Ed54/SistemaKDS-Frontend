import React, { useEffect, useState } from "react";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

import useSignalRConnection from "../hooks/useSignalRConnection";
import useProducts from "../hooks/useProducts";
import useTables from "../hooks/useTables";

import { onOrderReady, onOrderDelivered } from "../services/signalrService";

import TableSelector from "../components/TableSelector";
import ProductList from "../components/ProductList";
import OrderPanel from "../components/OrderPanel";

const WaiterView = () => {
  const navigate = useNavigate();
  const { isConnected } = useSignalRConnection("waiter");
  const { products } = useProducts();
  const { tables } = useTables();

  // Estados locales para la información de cabecera (Requisito: Cabecera y Detalle) 
  const [pax, setPax] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const waiterName = "Juan Pérez"; // Esto vendría de tu contexto de Auth

  useEffect(() => {
    onOrderReady((order) => {
      alert(`🔔 ¡Atención! El pedido de la Mesa ${order.tableNumber} está LISTO.`);
    });
    onOrderDelivered((orderId) => {
      console.log("Orden finalizada:", orderId);
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24 md:pb-0">
      
      {/* HEADER: Identificación del Mesero y Estado de Conexión */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 bg-slate-800 border-b border-slate-700 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-[#00FfF]">
            KDS Terminal
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase">Mesero: {waiterName}</p>
        </div>
        
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#39FF14] animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-bold uppercase ${isConnected ? "text-[#39FF14]" : "text-red-400"}`}>
              {isConnected ? "En Línea" : "Sin Red"}
            </span>
          </div>
          <button 
            onClick={handleLogout} 
            className="bg-red-600/20 hover:bg-red-600 border border-red-600 text-red-500 hover:text-white px-4 py-1 rounded-lg font-bold text-xs transition-all"
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 p-4">
        
        {/* COLUMNA IZQUIERDA: Identificación de la Mesa y Cliente */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* 1. SELECTOR DE MESA Y 2. CANTIDAD DE PERSONAS */}
          <div className="bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-6 bg-[#FFFF00]"></span>
              <h2 className="text-lg font-black uppercase tracking-widest">1. Ubicación y Personas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-end text-white">
          {/* Recuadro independiente para Seleccionar Mesa */}
            <div className="text-white font-bold border-2 border-white rounded-lg p-1 text-white font-bold flex items-center justify-between cursor-pointer">
             <TableSelector tables={tables}/>
             
            </div>
              

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Cantidad de Personas</label>
                <input 
                  type="number" 
                  min="1"
                  value={pax}
                  onChange={(e) => setPax(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-[#FFFF00] font-bold focus:outline-none focus:border-[#FFFF00]"
                />
              </div>
            </div>

            {/* 5. NOMBRE DEL CLIENTE (Opcional pero solicitado) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Cliente (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej: Familia García"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-[#00FFFF]"
              />
            </div>
          </div>

          {/* 4. MENÚ: Selección de productos */}
          <div className="bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-6 bg-[#00FFFF]"></span>
              <h2 className="text-lg font-black uppercase tracking-widest">2. Selección de Menú</h2>
            </div>
            <ProductList products={products} />
          </div>
        </div>

        {/* PANEL DE ORDEN (RESUMEN) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-4">
            {/* Aquí pasamos los datos de cabecera al panel de orden */}
            <OrderPanel metadata={{ pax, customerName, waiterName }} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default WaiterView;