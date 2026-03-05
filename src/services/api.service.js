const API_URL = import.meta.env.VITE_API_URL; // ✅ PUERTO CORRECTO

// ===============================
//CREAR ORDEN (MESERO)
// ===============================
export const createOrder = async (orderData) => {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    if (!response.ok) {
        throw new Error("Error al crear la orden");
    }

    return response.json();
};


// ===============================
//OBTENER ÓRDENES ACTIVAS (KDS)
// ===============================
export const getActiveOrders = async () => {
    const response = await fetch(`${API_URL}/orders/active`);

    if (!response.ok) {
        throw new Error("Error al obtener órdenes");
    }

    return response.json();
};


// ===============================
//MARCAR COMO READY (COCINA)
// ===============================
export const markOrderReady = async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}/ready`, {
        method: 'PATCH'
    });

    if (!response.ok) {
        throw new Error("Error al marcar como Ready");
    }

    return response.json();
};


// ===============================
//FINALIZAR ORDEN (MESERO)
// ===============================
export const finishOrder = async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}/finish`, {
        method: 'PATCH'
    });

    if (!response.ok) {
        throw new Error("Error al finalizar la orden");
    }

    return response.json();
};


// ===============================
//TABLAS
// ===============================
export const getTables = async () => {
    const response = await fetch(`${API_URL}/tables`);

    if (!response.ok) {
        throw new Error("Error al obtener mesas");
    }

    return response.json();
};
