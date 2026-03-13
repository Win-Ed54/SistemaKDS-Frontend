import React from "react";
import OrderBuilder from "./OrderBuilder";

const OrderPanel = () => {

  return (

    <div className="bg-slate-800 p-6 rounded-xl">

      <h2 className="text-xl font-semibold mb-4">
        Orden Actual
      </h2>

      <OrderBuilder />

    </div>

  );

};

export default OrderPanel;
