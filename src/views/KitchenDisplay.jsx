import React, { useEffect, useState } from 'react';
import connection, { startConnection } from '../services/signalrService';

const KitchenDisplay = () => {
    const [orders, setOrders] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [now, setNow] = useState(new Date());

    // 1. Efecto para SignalR y Carga Inicial de la Base de Datos
    useEffect(() => {
        const updateStatus = () => setIsConnected(connection.state === "Connected");

        const init = async () => {
            await startConnection();
            updateStatus();
            
            try {
                const res = await fetch("http://localhost:5162/api/orders/active");
                if (res.ok) setOrders(await res.json());
            } catch (err) { console.error("Error al cargar órdenes iniciales:", err); }
        };

        init();

        // Escuchar nuevos pedidos en tiempo real
        connection.on("ReceiveOrder", (newOrder) => {
            console.log(">>> Nueva Orden Recibida:", newOrder);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
        });

        // Escuchar actualizaciones de estado para sincronizar múltiples pantallas
        connection.on("UpdateOrderStatus", (orderId, newStatus) => {
            if (newStatus !== "Pending" && newStatus !== "0") {
                setOrders(prevOrders => prevOrders.filter(o => (o.id || o._id) !== orderId));
            }
        });

        // SOLUCIÓN AL WARNING: Escuchador para la notificación al mesero
        connection.on("NotifyWaiterOrderReady", (data) => {
            console.log(">>> Notificación enviada al mesero para la mesa:", data.table);
            // Aquí podrías disparar un sonido de alerta si lo deseas
        });

        connection.onreconnected(async () => {
            updateStatus();
            await connection.invoke("JoinKitchenGroup");
        });

        connection.onreconnecting(updateStatus);
        connection.onclose(updateStatus);

        return () => { 
            connection.off("ReceiveOrder");
            connection.off("UpdateOrderStatus");
            connection.off("NotifyWaiterOrderReady");
        };
    }, []);

    // 2. Reloj para los contadores de tiempo (cada segundo)
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 3. FUNCIÓN PARA DESPACHAR: Actualiza MongoDB y limpia la pantalla
    const handleFinishOrder = async (orderId) => {
        try {
            const response = await fetch(`http://localhost:5162/api/orders/${orderId}/ready`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(1) 
            });

            if (response.ok) {
                setOrders(prevOrders => prevOrders.filter(o => (o.id || o._id) !== orderId));
                console.log(`>>> Orden ${orderId} despachada y actualizada en MongoDB`);
            } else {
                console.error(">>> Error del servidor:", response.status);
            }
        } catch (err) {
            console.error(">>> Error de conexión al despachar:", err);
        }
    };

    const getMinutesElapsed = (createdAt) => {
        const start = new Date(createdAt);
        return Math.floor((now - start) / 60000);
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white font-sans">
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold tracking-tighter uppercase">KDS - Panel de Cocina</h1>
                <div className={`px-4 py-1 rounded-full border transition-all duration-300 ${isConnected ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-red-500 text-red-500 bg-red-500/10 animate-pulse'}`}>
                    <span className="text-xs font-black uppercase">{isConnected ? "● ONLINE" : "○ OFFLINE"}</span>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {orders.length === 0 ? (
                    <div className="col-span-full text-center py-20 opacity-20 text-2xl font-bold uppercase tracking-widest italic">
                        Esperando nuevos pedidos...
                    </div>
                ) : (
                    orders.map(order => {
                        const minutes = getMinutesElapsed(order.createdAt);
                        const isLate = minutes >= 10;
                        const currentId = order.id || order._id;

                        return (
                            <div key={currentId} className={`bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 transition-all duration-500 ${isLate ? 'border-red-600 ring-4 ring-red-600/20' : 'border-gray-700'}`}>
                                <div className={`${isLate ? 'bg-red-600' : 'bg-blue-600'} p-4`}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-black text-2xl tracking-tighter">MESA #{order.tableNumber}</h3>
                                        <span className={`font-mono font-bold text-lg px-2 rounded ${isLate ? 'bg-white text-red-600' : 'bg-black/20'}`}>
                                            {minutes}m
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold opacity-80 uppercase mt-1 tracking-wider">{order.customerName}</p>
                                </div>

                                <div className="p-4 space-y-4 min-h-45">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="border-b border-gray-700/50 pb-2 last:border-0">
                                            <div className="flex gap-2 text-lg items-start">
                                                <span className="font-black text-blue-400">{item.quantity}x</span>
                                                <span className="font-medium text-gray-100 leading-tight">{item.productName}</span>
                                            </div>
                                            
                                            {(item.notes || (item.modifiers && item.modifiers.length > 0)) && (
                                                <div className="mt-2 bg-yellow-400/10 border-l-4 border-yellow-400 p-2 rounded-r">
                                                    {item.modifiers?.map((m, i) => (
                                                        <span key={i} className="text-[10px] font-black text-yellow-500 uppercase block">+ {m}</span>
                                                    ))}
                                                    {item.notes && <p className="text-xs font-bold text-yellow-300 italic mt-1 leading-none">⚠️ {item.notes}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="px-4 pb-4">
                                    <button 
                                        onClick={() => handleFinishOrder(currentId)} 
                                        className={`w-full py-4 rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 ${isLate ? 'bg-red-700 hover:bg-red-500 shadow-lg shadow-red-900/40 text-white' : 'bg-green-700 hover:bg-green-500 text-white'}`}
                                    >
                                        {isLate ? '¡Prioridad! Despachar' : 'Despachar'}
                                    </button>
                                    <p className="text-[10px] mt-2 text-gray-500 text-center uppercase tracking-widest">Mesero: {order.waiterName}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default KitchenDisplay;

