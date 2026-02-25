const API_URL = "http://localhost:5000/api"; // Tu URL de .NET

export const createOrder = async (orderData) => {
    const response = await fetch(`${API_URL}/Orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    return response.json();
};

export const getTables = () => fetch(`${API_URL}/Tables`).then(res => res.json());
