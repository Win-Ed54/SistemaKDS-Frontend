import React from "react";
import useOrderBuilder from "../../hooks/useOrderBuilder";

const ProductList = ({ products }) => {
  const { addItem } = useOrderBuilder();

  return (
    <div className="grid grid-cols-3 gap-4">
      {products?.map((product) => {
        // VALIDACIÓN: Verificamos si el stock es 0 o menor
        const isOutOfStock = product.stock <= 0;

        return (
          <div
            key={product.id}
            // Si no hay stock, bajamos la opacidad y quitamos color para que se vea "desactivado"
            className={`bg-slate-700 p-4 rounded-lg transition-all ${
              isOutOfStock ? "opacity-50 grayscale" : "hover:bg-slate-600"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-sm leading-tight">{product.name}</h3>
              {/* Etiqueta visual de Stock */}
              <span className={`text-[10px] px-1.5 rounded font-black ${
                isOutOfStock ? "bg-red-500 text-white" : "bg-green-500/20 text-green-400"
              }`}>
                {isOutOfStock ? "AGOTADO" : `STOCK: ${product.stock}`}
              </span>
            </div>

            <p className="text-green-400 font-bold">${product.price}</p>

            <button
              onClick={() => !isOutOfStock && addItem(product)}
              disabled={isOutOfStock}
              className={`w-full mt-2 py-2 rounded font-bold text-xs uppercase transition-colors ${
                isOutOfStock
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-600"
                  : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
              }`}
            >
              {isOutOfStock ? "Sin Existencias" : "Agregar"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
