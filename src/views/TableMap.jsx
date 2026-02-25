import React, { useState, useEffect } from 'react';

const TableMap = ({ hubConnection }) => {
  // Estado inicial de las mesas (esto vendría de tu DB normalmente)
  const [tables, setTables] = useState([
    { id: 1, number: "101", status: "available", currentOrder: null },
    { id: 2, number: "102", status: "available", currentOrder: null },
    { id: 3, number: "103", status: "available", currentOrder: null },
    // ... más mesas
  ]);

  useEffect(() => {
    if (!hubConnection) return;

    // Escuchar cuando una orden está lista (Punto 5 de tu flujo)
    hubConnection.on("OrderReadyForPickup", (data) => {
      setTables(prev => prev.map(t => 
        t.number === data.tableNumber.toString() 
          ? { ...t, status: "ready", orderId: data.orderId } 
          : t
      ));
    });

    // Escuchar cuando el estado cambia a "Preparando"
    hubConnection.on("UpdateOrderStatus", (data) => {
      if (data.status === "Preparing") {
        setTables(prev => prev.map(t => 
          t.orderId === data.orderId ? { ...t, status: "busy" } : t
        ));
      }
    });

  }, [hubConnection]);

  const handleTableClick = (table) => {
    if (table.status === "ready") {
      alert(`Entregando orden ${table.orderId} en mesa ${table.number}`);
      // Aquí dispararías la lógica para limpiar la mesa tras la entrega
    } else if (table.status === "available") {
      // Lógica para abrir modal de nueva orden
      console.log("Abriendo toma de pedido para mesa", table.number);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold text-white mb-4">Mapa de Salón</h2>
      <div className="grid grid-cols-3 gap-6">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => handleTableClick(table)}
            className={`h-32 rounded-2xl flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-xl
              ${table.status === 'available' ? 'bg-slate-700 text-slate-300' : ''}
              ${table.status === 'busy' ? 'bg-yellow-500 text-black animate-pulse' : ''}
              ${table.status === 'ready' ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)]' : ''}
            `}
          >
            <span className="text-sm font-medium uppercase">Mesa</span>
            <span className="text-4xl font-black">{table.number}</span>
            {table.status === 'ready' && (
              <span className="mt-2 text-[10px] bg-white text-green-700 px-2 py-0.5 rounded-full font-bold">
                ¡LISTA!
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableMap;
