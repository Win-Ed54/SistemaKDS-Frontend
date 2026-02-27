import React, { useEffect, useState, useRef } from 'react';
import connection, { startConnection } from '../services/signalrService';

const STATUS = {
    0: "Pending",
    1: "Preparing",
    2: "Ready",
    3: "Delivered",
    4: "Cancelled"
};

const KitchenDisplay = () => {

    const [orders, setOrders] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [now, setNow] = useState(new Date());

    const audioRef = useRef(null);

    // 🔊 SONIDO
    useEffect(() => {
        audioRef.current = new Audio('/notification.mp3');
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
        }
    };

    // 🔌 SIGNALR
    useEffect(() => {

        const init = async () => {
            await startConnection(["cocina"], setIsConnected);

            try {
                const res = await fetch("http://localhost:5162/api/orders/active");
                if (res.ok) {
                    const data = await res.json();

                    // 🚫 NO mostrar READY desde inicio
                    const filtered = data.filter(o => {
                        const status = STATUS[o.status] ?? o.status;
                        return status !== "Ready";
                    });

                    setOrders(filtered);
                }
            } catch (err) {
                console.error("Error al cargar órdenes:", err);
            }
        };

        init();

        // 🆕 NUEVA ORDEN
        connection.on("ReceiveOrder", (newOrder) => {

            setOrders(prev => {
                const exists = prev.some(o =>
                    (o.id || o._id) === (newOrder.id || newOrder._id)
                );

                if (exists) return prev;

                playSound();

                return [
                    { ...newOrder, isNew: true },
                    ...prev
                ];
            });

            // quitar animación
            setTimeout(() => {
                setOrders(prev =>
                    prev.map(o =>
                        (o.id || o._id) === (newOrder.id || newOrder._id)
                            ? { ...o, isNew: false }
                            : o
                    )
                );
            }, 3000);
        });

        // 🔄 UPDATE STATUS
        connection.on("UpdateOrderStatus", (orderId, newStatus) => {

            setOrders(prev =>
                prev.map(o => {
                    const id = o.id || o._id;

                    if (id === orderId) {
                        return {
                            ...o,
                            status: newStatus,
                            updated: true,
                            removing: newStatus === 2 // Ready
                        };
                    }
                    return o;
                })
            );

            // quitar highlight
            setTimeout(() => {
                setOrders(prev =>
                    prev.map(o => ({ ...o, updated: false }))
                );
            }, 1500);

            // 🧹 eliminar después de animación
            if (newStatus === 2) {
                setTimeout(() => {
                    setOrders(prev =>
                        prev.filter(o => (o.id || o._id) !== orderId)
                    );
                }, 500);
            }
        });

        return () => {
            connection.off("ReceiveOrder");
            connection.off("UpdateOrderStatus");
        };

    }, []);

    // ⏱ RELOJ
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ⏱ TIEMPO
    const getMinutesElapsed = (createdAt) => {
        const start = new Date(createdAt);
        return Math.floor((now - start) / 60000);
    };

    // 🎨 COLORES
    const getStatusColor = (status) => {
        switch (status) {
            case "Pending": return "bg-yellow-600";
            case "Preparing": return "bg-blue-600";
            case "Ready": return "bg-green-600";
            default: return "bg-gray-600";
        }
    };

    // 🔧 ACCIONES
    const markAsPreparing = async (orderId) => {
        await fetch(`http://localhost:5162/api/orders/${orderId}/preparing`, {
            method: 'PATCH'
        });
    };

    const markAsReady = async (orderId) => {
        await fetch(`http://localhost:5162/api/orders/${orderId}/ready`, {
            method: 'PATCH'
        });
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white">

            {/* HEADER */}
            <header className="flex justify-between mb-6">
                <h1 className="text-3xl font-bold">KDS - Cocina</h1>

                <div className={`px-4 py-1 rounded-full border ${
                    isConnected
                        ? 'border-green-500 text-green-500'
                        : 'border-red-500 text-red-500 animate-pulse'
                }`}>
                    {isConnected ? "ONLINE" : "OFFLINE"}
                </div>
            </header>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {orders.length === 0 && (
                    <div className="col-span-full text-center opacity-40">
                        Esperando pedidos...
                    </div>
                )}

                {orders
                    // 🚫 nunca renderizar READY
                    .filter(order => {
                        const status = STATUS[order.status] ?? order.status;
                        return status !== "Ready";
                    })
                    .map(order => {

                        const id = order.id || order._id;
                        const status = STATUS[order.status] ?? order.status;
                        const minutes = getMinutesElapsed(order.createdAt);

                        const isLate = minutes >= 10;
                        const isCritical = minutes >= 15;

                        return (
                            <div
                                key={id}
                                className={`
                                    rounded-xl border-2 bg-gray-800 transition-all duration-300
                                    ${isCritical ? 'border-red-800 animate-pulse' :
                                      isLate ? 'border-red-500' : 'border-gray-700'}
                                    ${order.isNew ? 'scale-105 ring-4 ring-green-400' : ''}
                                    ${order.updated ? 'ring-4 ring-blue-400' : ''}
                                    ${order.removing ? 'opacity-0 scale-95' : ''}
                                `}
                            >

                                {/* HEADER */}
                                <div className={`${getStatusColor(status)} p-3`}>
                                    <div className="flex justify-between">
                                        <h3>Mesa #{order.tableNumber}</h3>
                                        <span>{minutes}m</span>
                                    </div>

                                    <p className="text-xs">{order.customerName}</p>
                                    <p className="text-xs uppercase opacity-80">{status}</p>
                                </div>

                                {/* ITEMS */}
                                <div className="p-3 space-y-2">
                                    {order.items.map((item, i) => (
                                        <div key={i}>
                                            <b>{item.quantity}x</b> {item.productName}

                                            {item.notes && (
                                                <p className="text-yellow-400 text-xs">
                                                    ⚠ {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* ACTION */}
                                <div className="p-3">
                                    <button
                                        disabled={!isConnected}
                                        onClick={() => {
                                            if (status === "Pending") {
                                                markAsPreparing(id);
                                            } else if (status === "Preparing") {
                                                markAsReady(id);
                                            }
                                        }}
                                        className={`w-full py-3 rounded-lg font-bold ${
                                            status === "Pending"
                                                ? 'bg-yellow-600'
                                                : status === "Preparing"
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-600'
                                        }`}
                                    >
                                        {status === "Pending"
                                            ? "Preparar"
                                            : status === "Preparing"
                                                ? "Listo"
                                                : "Finalizado"}
                                    </button>

                                    <p className="text-xs text-center mt-2">
                                        Mesero: {order.waiterName}
                                    </p>
                                </div>

                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default KitchenDisplay;
