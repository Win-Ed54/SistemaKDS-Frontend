const API_URL = import.meta.env.VITE_API_URL;

// ===============================
// FUNCIÓN BASE PARA REQUESTS
// ===============================
const request = async (endpoint, options = {}) => {

    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error en la petición");
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
};


// ===============================
// CREAR ORDEN (MESERO)
// ===============================
export const createOrder = (orderData) => {
    return request('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
};


// ===============================
// OBTENER ÓRDENES ACTIVAS (KDS)
// ===============================
export const getActiveOrders = () => {
    return request('/orders/active');
};


// ===============================
// MARCAR COMO PREPARING (COCINA)
// ===============================
export const markOrderPreparing = (orderId) => {
    return request(`/orders/${orderId}/preparing`, {
        method: 'PATCH'
    });
};


// ===============================
// MARCAR COMO READY (COCINA)
// ===============================
export const markOrderReady = (orderId) => {
    return request(`/orders/${orderId}/ready`, {
        method: 'PATCH'
    });
};


// ===============================
// FINALIZAR ORDEN (MESERO)
// ===============================
export const finishOrder = (orderId) => {
    return request(`/orders/${orderId}/finish`, {
        method: 'PATCH'
    });
};


// ===============================
// TABLAS
// ===============================
export const getTables = () => {
    return request('/tables');
};
