import React, { useEffect, useState } from "react";

import { createOrder, getTables, getProducts } from "../services/api.service";

const WaiterPanel = () => {
  const [tables, setTables] = useState([]);
  const [tableNumber, setTableNumber] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [waiterName, setWaiterName] = useState("Mesero 1");

  const [products, setProducts] = useState([]);

  const [cart, setCart] = useState([]);

  // =============================
  // CARGAR PRODUCTOS
  // =============================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts();

        setProducts(data);
      } catch (err) {
        console.error("Error cargando menú:", err);
      }
    };

    loadProducts();
  }, []);

  // =============================
  // CARGAR MESAS
  // =============================

  useEffect(() => {
    const loadTables = async () => {
      try {
        const data = await getTables();
        setTables(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadTables();
  }, []);

  // =============================
  // AGREGAR PRODUCTO
  // =============================

  const addProduct = (product) => {
    const exists = cart.find((i) => i.productId === product.id);

    if (exists) {
      setCart((prev) =>
        prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          notes: "",
          modifiers: [],
        },
      ]);
    }
  };

  // =============================
  // REMOVER PRODUCTO
  //==============================
  const removeProduct = (productId) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);

      if (!item) return prev;

      if (item.quantity === 1) {
        return prev.filter((i) => i.productId !== productId);
      }

      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  //==============================
  //ACTUALIZAR NOTA
  //=============================
  const updateNotes = (productId, value) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, notes: value } : item,
      ),
    );
  };

  // =============================
  // ENVIAR ORDEN
  // =============================

  const sendOrder = async () => {
    if (!tableNumber) {
      alert("Selecciona una mesa");
      return;
    }

    if (cart.length === 0) {
      alert("Agrega productos");
      return;
    }

    const order = {
      tableNumber: Number(tableNumber),
      customerName,
      waiterName,
      items: cart,
    };

    try {
      await createOrder(order);

      alert("Orden enviada a cocina");

      setCart([]);
      setCustomerName("");
    } catch (err) {
      console.error(err);
    }
  };

  // =============================
  // UI
  // =============================

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Panel Mesero</h1>

      {/* =============================
      DATOS ORDEN
      ============================= */}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <select
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          className="p-2 rounded bg-white text-black border"
        >
          <option value="">Mesa</option>

          {tables.map((t) => (
            <option key={t.number} value={t.number}>
              Mesa {t.number}
            </option>
          ))}
        </select>

        <input
          placeholder="Cliente"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="p-2 rounded bg-white text-black border"
        />

        <input
          value={waiterName}
          onChange={(e) => setWaiterName(e.target.value)}
          className="p-2 rounded bg-white text-black border"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* =============================
        PRODUCTOS
        ============================= */}

        <div>
          <h2 className="text-xl mb-4">Productos</h2>

          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-bold"
              >
                <div>{p.name}</div>

                <div className="text-sm opacity-80">${p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* =============================
        CARRITO
        ============================= */}

        <div>
          <h2 className="text-xl mb-4">Orden</h2>

          <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            {cart.length === 0 && (
              <p className="opacity-50">No hay productos</p>
            )}

            {cart.map((item, i) => (
              <div
                key={i}
                className="flex justify-between item-center border-b border-gray-700 pb-1"
              >
                <span>
                  {item.quantity}x {item.productName}
                </span>
                <button
                  onClick={() => removeProduct(item.productId)}
                  className="text-red-400 hover:text-red-600 font-bold"
                >
                  X
                </button>

                <input
                  placeholder="Nota (ej: sin cebolla)"
                  value={item.notes}
                  onChange={(e) => updateNotes(item.productId, e.target.value)}
                  className="mt-1 w-full p-1 text-sm rounded bg-gray-700"
                />
              </div>
            ))}
          </div>

          <button
            onClick={sendOrder}
            className="mt-4 w-full bg-green-600 p-4 rounded-lg font-bold"
          >
            Enviar a Cocina
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaiterPanel;
