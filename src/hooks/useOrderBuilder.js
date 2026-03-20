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
    decreaseItem,
    clearOrder,
    resetAfterOrder,
    updateItemNotes,
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
    decreaseItem,
    clearOrder,
    resetAfterOrder,
    updateItemNotes,
  };
};

export default useOrderBuilder;