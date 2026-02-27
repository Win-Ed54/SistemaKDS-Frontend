import React, { useEffect, useState } from 'react';
import connection, { startConnection } from '../services/signalrService';

const KitchenDisplay = () => {
    const [orders, setOrders] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [now, setNow] = useState(new Date());

    // ---------------------------
    // 🔌 SIGNALR + CARGA INICIAL
    // ---------------------------
    useEffect(() => {

        const updateStatus = () => {
            setIsConnected(connection.state === "Connected");
        };

        const init = async () => {
            await startConnection();

            // 🔥 IMPORTANTE: unirse al grupo cocina
            await connection.invoke("JoinKitchenGroup");

            updateStatus();

            try {
                const res = await fetch("http://localhost:5162/api/orders/active");
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data);
                }
            } catch (err) {
                console.error("Error al cargar órdenes:", err);
            }
        };

        init();

        // ---------------------------
        // 📥 NUEVO PEDIDO
        // ---------------------------
        connection.on("ReceiveOrder", (newOrder) => {
            console.log("Nueva orden:", newOrder);
            setOrders(prev => [newOrder, ...prev]);
        });

        // ---------------------------
        // 🔄 CAMBIO DE ESTADO
        // ---------------------------
        connection.on("UpdateOrderStatus", (orderId, newStatus) => {

            console.log("Estado actualizado:", orderId, newStatus);

            // actualizar estado local
            setOrders(prev =>
                prev.map(o => {
                    const id = o.id || o._id;
                    if (id === orderId) {
                        return { ...o, status: newStatus };
                    }
                    return o;
                })
            );

            // si ya está lista → remover del KDS
            if (newStatus === "Ready") {
                setOrders(prev =>
                    prev.filter(o => (o.id || o._id) !== orderId)
                );
            }
        });

        // ---------------------------
        // 🔔 NOTIFICACIÓN A MESERO
        // ---------------------------
        connection.on("NotifyWaiterOrderReady", (data) => {
            console.log("Orden lista para mesero:", data);
        });

        // ---------------------------
        // 🔁 RECONEXIÓN
        // ---------------------------
        connection.onreconnected(async () => {
            updateStatus();
            await connection.invoke("JoinKitchenGroup");
        });

        connection.onreconnecting(updateStatus);
        connection.onclose(updateStatus);

        // cleanup
        return () => {
            connection.off("ReceiveOrder");
            connection.off("UpdateOrderStatus");
            connection.off("NotifyWaiterOrderReady");
        };

    }, []);

    // ---------------------------
    // ⏱ RELOJ GLOBAL
    // ---------------------------
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ---------------------------
    // 🔧 ACCIONES
    // ---------------------------

    const markAsPreparing = async (orderId) => {
        try {
            await fetch(`http://localhost:5162/api/orders/${orderId}/preparing`, {
                method: 'PATCH'
            });
        } catch (err) {
            console.error("Error preparando:", err);
        }
    };

    const markAsReady = async (orderId) => {
        try {
            await fetch(`http://localhost:5162/api/orders/${orderId}/ready`, {
                method: 'PATCH'
            });
        } catch (err) {
            console.error("Error listo:", err);
        }
    };

    // ---------------------------
    // ⏱ TIEMPO
    // ---------------------------
    const getMinutesElapsed = (createdAt) => {
        const start = new Date(createdAt);
        return Math.floor((now - start) / 60000);
    };

    // ---------------------------
    // 🎨 UI
    // ---------------------------
    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white font-sans">

            {/* HEADER */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold uppercase">KDS - Cocina</h1>

                <div className={`px-4 py-1 rounded-full border ${isConnected
                    ? 'border-green-500 text-green-500'
                    : 'border-red-500 text-red-500 animate-pulse'
                    }`}>
                    {isConnected ? "ONLINE" : "OFFLINE"}
                </div>
            </header>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {orders.length === 0 ? (
                    <div className="col-span-full text-center opacity-30 text-xl">
                        Esperando pedidos...
                    </div>
                ) : (
                    orders.map(order => {

                        const id = order.id || order._id;
                        const minutes = getMinutesElapsed(order.createdAt);
                        const isLate = minutes >= 10;

                        return (
                            <div key={id}
                                className={`bg-gray-800 rounded-xl border-2 ${isLate ? 'border-red-600' : 'border-gray-700'}`}>

                                {/* HEADER */}
                                <div className={`${isLate ? 'bg-red-600' : 'bg-blue-600'} p-3`}>
                                    <div className="flex justify-between">
                                        <h3>Mesa #{order.tableNumber}</h3>
                                        <span>{minutes}m</span>
                                    </div>

                                    <p className="text-xs">{order.customerName}</p>

                                    {/* 🔥 ESTADO */}
                                    <p className="text-xs uppercase opacity-70">
                                        {order.status}
                                    </p>
                                </div>

                                {/* ITEMS */}
                                <div className="p-3 space-y-2">
                                    {order.items.map((item, i) => (
                                        <div key={i}>
                                            <span>{item.quantity}x </span>
                                            <span>{item.productName}</span>

                                            {item.notes && (
                                                <p className="text-yellow-400 text-xs">
                                                    ⚠ {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* BOTÓN DINÁMICO */}
                                <div className="p-3">
                                    <button
                                        onClick={() =>
                                            order.status === "Pending"
                                                ? markAsPreparing(id)
                                                : markAsReady(id)
                                        }
                                        className={`w-full py-3 rounded-lg font-bold ${order.status === "Pending"
                                            ? 'bg-yellow-600'
                                            : 'bg-green-600'
                                            }`}
                                    >
                                        {order.status === "Pending"
                                            ? "Preparar"
                                            : "Listo"}
                                    </button>

                                    <p className="text-xs text-center mt-2">
                                        Mesero: {order.waiterName}
                                    </p>
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

