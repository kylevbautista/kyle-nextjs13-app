import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const useBearStore = create(
  devtools(
    (set) => ({
      bears: 0,
      listBy: "All",
      filterBy: {
        day: "all",
        season: "all",
        year: 0,
        status: "all",
      },
      listType: "",
      episodeProgressNumber: 0,
      startDate: "",
      finishDate: "",
      score: "",
      status: "",
      episode: 0,
      listByNumbers: {
        all: 0,
        watching: 0,
        completed: 0,
        paused: 0,
        dropped: 0,
      },
      increasePopulation: () =>
        set((state: any) => ({ bears: state.bears + 1 })),
      removeAllBears: () => set({ bears: 0 }),
      updateListBy: (list: any) => set((state: any) => ({ listBy: list })),
      updateListByNumbers: (list: any) =>
        set((state: any) => ({ listByNumbers: list })),
      updateFilterBy: (filters: {}) =>
        set((state: any) => ({ filterBy: { ...state.filterBy, ...filters } })),
    }),
    { name: "useBearStore" }
  )
);
