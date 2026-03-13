import { create } from "zustand";

const useTableStore = create((set) => ({

  tables: [],

  setTables: (tables) =>
    set({ tables }),

}));

export default useTableStore;
