import React, { useState } from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";
import ProductCard from "./ProductCard";
import CustomNotesModal from "./CustomNotesModal"; // ✅ Importamos el componente unificado

const ProductList = ({ products }) => {
  const { addItem, updateItemNotes, items } = useOrderBuilder();
  const [noteProduct, setNoteProduct] = useState(null);

  const handleConfirmNotes = (notes) => {
    if (noteProduct) {
      const id = noteProduct.id || noteProduct._id;
      // Verificar si ya está en el carrito para no duplicar items base
      const inCart = items?.find((i) => i.productId === id);
      if (!inCart) addItem(noteProduct);
      
      updateItemNotes(id, notes);
    }
    setNoteProduct(null);
  };

  return (
    <>
      {/* El modal unificado se encarga de todo ahora */}
      {noteProduct && (
        <CustomNotesModal
          product={noteProduct}
          currentNote={items?.find((i) => i.productId === (noteProduct.id || noteProduct._id))?.notes}
          onConfirm={handleConfirmNotes}
          onClose={() => setNoteProduct(null)}
        />
      )}

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
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
