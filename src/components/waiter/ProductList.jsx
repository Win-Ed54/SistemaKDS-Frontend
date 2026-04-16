import React, { useEffect, useState } from "react";
import useSignalRConnection from "../../hooks/useSignalRConnection";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import { useToast } from "../../context/ToastContext";
import ProductCard from "./ProductCard";

const ProductList = ({ products: initialProducts }) => {
  const [localProducts, setLocalProducts] = useState(initialProducts);
  const { connection } = useSignalRConnection();
  const { addItem, setNoteTarget } = useOrderBuilder();
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

  const handleOpenNotes = (product) => {
    setNoteTarget({
      productId: product.id || product._id,
      currentNotes: "",
      source: "catalog",
      product,
    });
  };

  const handleEditExistingNote = (product, notes) => {
    setNoteTarget({
      productId: product.id || product._id || product.Id,
      currentNotes: notes || "",
      source: "cart",
      product,
    });
  };

  const handleAdd = (product) => {
    const result = addItem(product);
    if (result?.ok === false && result?.message) {
      showToast(result.message, "error");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
      {localProducts.map((product) => (
        <ProductCard
          key={product.id || product._id}
          product={product}
          onAdd={handleAdd}
          onOpenNotes={handleOpenNotes}
          onEditExistingNote={handleEditExistingNote}
        />
      ))}
    </div>
  );
};

export default ProductList;
