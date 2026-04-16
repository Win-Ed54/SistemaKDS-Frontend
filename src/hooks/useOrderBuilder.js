import useOrderBuilderStore from "../store/orderBuilderStore";

const useOrderBuilder = () => {
  const {
    tableId,
    waiterName,
    customerName,
    items,
    noteTarget,
    setTable,
    setWaiter,
    setCustomer,
    setNoteTarget,
    clearNoteTarget,
    addItem,
    addCustomItem,
    removeItem,
    decreaseItem,
    clearOrder,
    resetAfterOrder,
    updateItemNotes,
    reconcileWithAvailableStock,
  } = useOrderBuilderStore();

  return {
    tableId,
    waiterName,
    customerName,
    items,
    noteTarget,
    setTable,
    setWaiter,
    setCustomer,
    setNoteTarget,
    clearNoteTarget,
    addItem,
    addCustomItem,
    removeItem,
    decreaseItem,
    clearOrder,
    resetAfterOrder,
    updateItemNotes,
    reconcileWithAvailableStock,
  };
};

export default useOrderBuilder;
