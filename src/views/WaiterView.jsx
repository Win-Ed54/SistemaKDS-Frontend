import React, { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast, Toaster } from 'react-hot-toast'; // Para alertas visuales rápidas

const WaiterView = () => {
    const [ordersReady, setOrdersReady] = useState([]);

    useEffect(() => {
        // 1. Configurar conexión al Hub que creaste
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://tu-api.com")
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => {
                // 2. Unirse al grupo de meseros (tu método en C#)
                connection.invoke("JoinWaiterGroup");
            })
            .catch(err => console.error("Error conectando:", err));

        // 3. Escuchar el evento específico de tu Hub
        connection.on("OrderReadyForPickup", (data) => {
            // Añadir a la lista de órdenes por entregar
            setOrdersReady(prev => [...prev, data]);
            // Notificación sonora/visual
            toast.success(`¡Mesa ${data.tableNumber} lista!`, { duration: 5000 });
        });

        return () => connection.stop();
    }, []);

    return (
        <div className="p-4 bg-gray-900 min-h-screen text-white">
            <Toaster position="top-right" />
            <h1 className="text-2xl font-bold mb-6">Panel de Meseros</h1>

            {/* SECCIÓN DE NOTIFICACIONES CRÍTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ordersReady.length === 0 ? (
                    <p className="text-gray-500">No hay pedidos pendientes de entrega.</p>
                ) : (
                    ordersReady.map((order, index) => (
                        <div key={index} className="bg-green-600 p-6 rounded-xl shadow-lg animate-pulse">
                            <h2 className="text-4xl font-black">MESA {order.tableNumber}</h2>
                            <p className="text-lg">Cliente: {order.customerName}</p>
                            <button 
                                onClick={() => setOrdersReady(prev => prev.filter((_, i) => i !== index))}
                                className="mt-4 bg-white text-green-700 font-bold py-2 px-4 rounded"
                            >
                                MARCAR COMO ENTREGADO
                            </button>
                        </div>
                    ))
                )}
            </div>
            
            {/* Aquí iría tu Mapa de Mesas o Botón para nueva orden */}
        </div>
    );
};

export default WaiterView;
