import React, { useState, useEffect } from "react";

// Hooks - Subir 2 niveles: waiter -> components -> src
import useSignalRConnection from "../../hooks/useSignalRConnection"; 
import useOrderBuilder from "../../hooks/useOrderBuilder";

// Services - Subir 2 niveles para llegar a src/services
// Componentes locales - Misma carpeta
import ProductCard from "./ProductCard";
import CustomNotesModal from "./CustomNotesModal";

const ProductList = ({ products: initialProducts }) => {
  const [localProducts, setLocalProducts] = useState(initialProducts);
  const { connection } = useSignalRConnection(); 
  const { addItem, updateItemNotes, items } = useOrderBuilder();
  const [noteProduct, setNoteProduct] = useState(null);

  // Sincronizar estado local si las props cambian
  useEffect(() => {
    setLocalProducts(initialProducts);
  }, [initialProducts]);

  // Lógica de tiempo real (SignalR) para cumplimiento del Pendiente #5
  useEffect(() => {
    if (!connection) return;

    const handleStockUpdate = (productId, newStock) => {
      setLocalProducts(prev => prev.map(p => 
        (p.id === productId || p._id === productId) 
          ? { ...p, stock: newStock, isAvailable: newStock > 0 } 
          : p
      ));
    };

    const handleOutOfStock = (productId) => {
      setLocalProducts(prev => prev.map(p => 
        (p.id === productId || p._id === productId) 
          ? { ...p, stock: 0, isAvailable: false } 
          : p
      ));
    };

    connection.on("stockupdated", handleStockUpdate);
    connection.on("productoutofstock", handleOutOfStock);

    return () => {
      connection.off("stockupdated", handleStockUpdate);
      connection.off("productoutofstock", handleOutOfStock);
    };
  }, [connection]);

  const handleConfirmNotes = (notes) => {
    if (noteProduct) {
      const id = noteProduct.id || noteProduct._id;
      const inCart = items?.find((i) => i.productId === id);
      if (!inCart) addItem(noteProduct);
      updateItemNotes(id, notes);
    }
    setNoteProduct(null);
  };

  return (
    <>
      {noteProduct && (
        <CustomNotesModal
          product={noteProduct}
          currentNote={items?.find((i) => i.productId === (noteProduct.id || noteProduct._id))?.notes}
          onConfirm={handleConfirmNotes}
          onClose={() => setNoteProduct(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
        {localProducts.map((product) => (
          <ProductCard 
            key={product.id || product._id} 
            product={product} 
            onAdd={addItem} 
            onOpenNotes={setNoteProduct} 
          />
        ))}
      </div>
    </>
  );
};

export default ProductList;
