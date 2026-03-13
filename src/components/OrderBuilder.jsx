import React from "react";
import useOrderBuilder from "../hooks/useOrderBuilder";
import { createOrder } from "../services/api.service";

const OrderBuilder = () => {

  const {
    tableId,
    waiterName,
    customerName,
    items,
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
      waiterName,
      customerName,
      items

    };

    await createOrder(order);

    clearOrder();

  };

  return (

    <div className="bg-gray-800 p-4 rounded">

      <h2 className="text-xl mb-4">
        Orden
      </h2>

      {items.length === 0 && (
        <p className="text-gray-400">
          No hay productos
        </p>
      )}

      {items.map(item => (

        <div
          key={item.productId}
          className="flex justify-between mb-2"
        >

          <span>
            {item.quantity}x {item.productName}
          </span>

          <button
            onClick={() => removeItem(item.productId)}
            className="text-red-400"
          >
            X
          </button>

        </div>

      ))}

      <button
        onClick={sendOrder}
        className="bg-green-600 w-full py-2 mt-4 rounded"
      >
        Enviar a Cocina
      </button>

    </div>

  );

};

export default OrderBuilder;
