import useOrderBuilderStore from "../store/orderBuilderStore";

const useOrderBuilder = () => {

  const {
    tableId,
    waiterName,
    customerName,
    items,
    setTable,
    setWaiter,
    setCustomer,
    addItem,
    removeItem,
    clearOrder,
    updateItemNotes, // <--- 1. Extraemos la función del store
  } = useOrderBuilderStore();

  return {
    tableId,
    waiterName,
    customerName,
    items,
    setTable,
    setWaiter,
    setCustomer,
    addItem,
    removeItem,
    clearOrder,
    updateItemNotes, // <--- 2. La devolvemos para usarla en el componente
  };

};

export default useOrderBuilder;
