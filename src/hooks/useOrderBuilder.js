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
  };

};

export default useOrderBuilder;
