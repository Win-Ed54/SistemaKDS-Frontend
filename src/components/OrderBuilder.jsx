import useOrderBuilder from "../hooks/useOrderBuilder";
import { createOrder } from "../services/api.service";

const OrderBuilder = () => {
  const {
    tableId,
    waiterName,
    customerName,
    items,
    setWaiter,    // <--- Traemos el setter
    setCustomer,  // <--- Traemos el setter
    removeItem,
    clearOrder
  } = useOrderBuilder();

  const sendOrder = async () => {
    if (!tableId || items.length === 0) {
      alert("Seleccione mesa y productos");
      return;
    }

    const order = {
      tableNumber: tableId,
      waiterName: waiterName || "Mesero",
      customerName: customerName || "General",
      items,
      status: 0
    };

    try {
      await createOrder(order);
      clearOrder(); // Esto limpia los campos y el carrito
    } catch (error) {
      alert("Error al enviar la orden");
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
      <h2 className="text-xl mb-4 font-bold border-b border-gray-700 pb-2">
        Nueva Orden
      </h2>

      {/* INPUTS DE NOMBRES */}
      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="Nombre del Cliente..."
          className="w-full bg-gray-700 p-2 rounded border border-gray-600 outline-none focus:border-green-500"
          value={customerName || ""}
          onChange={(e) => setCustomer(e.target.value)}
        />
        <input
          type="text"
          placeholder="Tu nombre (Mesero)..."
          className="w-full bg-gray-700 p-2 rounded border border-gray-600 outline-none focus:border-blue-500"
          value={waiterName || ""}
          onChange={(e) => setWaiter(e.target.value)}
        />
      </div>

      <div className="space-y-2 mb-4">
        {items.length === 0 && <p className="text-gray-500 italic">Carrito vacío</p>}
        {items.map(item => (
          <div key={item.productId} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
            <span className="text-sm">{item.quantity}x {item.productName}</span>
            <button onClick={() => removeItem(item.productId)} className="text-red-400 font-bold px-2">✕</button>
          </div>
        ))}
      </div>

      <button
        onClick={sendOrder}
        disabled={items.length === 0}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          items.length === 0 ? "bg-gray-600 opacity-50" : "bg-green-600 hover:bg-green-500 shadow-lg"
        }`}
      >
        Enviar a Cocina
      </button>
    </div>
  );
};

export default OrderBuilder;
