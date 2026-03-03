import React, { useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";

import connection, { startConnection,subscribeConnectionStatus } from "../services/signalrService";

const WaiterView = () => {
    const [ordersReady, setOrdersReady] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {

        // 🚀 Iniciar conexión y unirse al grupo de meseros
        startConnection(["waiters"]);

        subscribeConnectionStatus((status) =>{
            setIsConnected(status);
        });

        // 📡 Escuchar pedidos listos
        connection.off("NotifyWaiterOrderReady", (data) => {
            console.log("Pedido listo:", data);

            setOrdersReady(prev => [...prev, data]);

            toast.success(`¡Mesa ${data.tableNumber} lista!`, {
                duration: 5000
            });
        });

        // 🧹 Limpiar evento al desmontar
        return () => {
            connection.off("OrderReadyForPickup");
        };

    }, []);

    return (
        <div className="p-4 bg-gray-900 min-h-screen text-white">

            <Toaster position="top-right" />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Panel de Meseros</h1>

                <span className={`px-4 py-1 rounded-full text-sm font-bold ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                }`}>
                    {isConnected ? "ONLINE" : "OFFLINE"}
                </span>
            </div>

            {/* PEDIDOS LISTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ordersReady.length === 0 ? (
                    <p className="text-gray-500">
                        No hay pedidos pendientes de entrega.
                    </p>
                ) : (
                    ordersReady.map((order, index) => (
                        <div
                            key={index}
                            className="bg-green-600 p-6 rounded-xl shadow-lg animate-pulse"
                        >
                            <h2 className="text-4xl font-black">
                                MESA {order.tableNumber}
                            </h2>

                            <p className="text-lg">
                                Cliente: {order.customerName}
                            </p>

                            <button
                                onClick={() =>
                                    setOrdersReady(prev =>
                                        prev.filter((_, i) => i !== index)
                                    )
                                }
                                className="mt-4 bg-white text-green-700 font-bold py-2 px-4 rounded"
                            >
                                MARCAR COMO ENTREGADO
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WaiterView;
