import React, { useEffect, useState } from "react";
import useSignalRConnection from "../../hooks/useSignalRConnection";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import { useToast } from "../../context/ToastContext";
import ProductCard from "./ProductCard";

const ProductList = ({ products: initialProducts, disabled = false }) => {
  const [localProducts, setLocalProducts] = useState(initialProducts);
  const { connection } = useSignalRConnection("waiter");
  const { addItem } = useOrderBuilder();
  const { showToast } = useToast();

  useEffect(() => {
    setLocalProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (!connection) return;

    const handleStockUpdate = (productId, newStock) => {
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === productId || p._id === productId
            ? { ...p, stock: newStock, isAvailable: newStock > 0 }
            : p,
        ),
      );
    };

    const handleOutOfStock = (productId) => {
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === productId || p._id === productId
            ? { ...p, stock: 0, isAvailable: false }
            : p,
        ),
      );
    };

    connection.on("stockupdated", handleStockUpdate);
    connection.on("productoutofstock", handleOutOfStock);

    return () => {
      connection.off("stockupdated", handleStockUpdate);
      connection.off("productoutofstock", handleOutOfStock);
    };
  }, [connection]);

  const handleAdd = (product) => {
    if (disabled) return;

    const result = addItem(product);
    if (result?.ok === false && result?.message) {
      showToast(result.message, "error");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
      {localProducts.map((product) => (
        <ProductCard
          key={product.id || product._id}
          product={product}
          onAdd={handleAdd}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default ProductList;
