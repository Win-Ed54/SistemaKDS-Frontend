import React from "react";
import useOrderBuilder from "../hooks/useOrderBuilder";

const TableSelector = ({ tables }) => {

  const { setTable } = useOrderBuilder();

  const tableList = Array.isArray(tables) ? tables : [];

  return (

    <select
      className="w-full p-2 text-black rounded"
      onChange={(e) => setTable(Number(e.target.value))}
    >

      <option value="">Seleccionar mesa</option>

      {tableList.map(table => (

        <option key={table.id} value={table.number}>
          {table.name}
        </option>

      ))}

    </select>

  );

};

export default TableSelector;
