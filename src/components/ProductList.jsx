import React from "react";
import useOrderBuilder from "../hooks/useOrderBuilder";

const ProductList = ({ products }) => {

  const { addItem } = useOrderBuilder();

  return (

    <div className="grid grid-cols-3 gap-4">

      {products?.map(product => (

        <div
          key={product.id}
          className="bg-slate-700 p-4 rounded-lg"
        >

          <h3 className="font-bold">
            {product.name}
          </h3>

          <p className="text-green-400">
            ${product.price}
          </p>

          <button
            onClick={() => addItem(product)}
            className="bg-green-600 hover:bg-green-700 w-full mt-2 py-1 rounded"
          >
            Agregar
          </button>

        </div>

      ))}

    </div>

  );

};

export default ProductList;

