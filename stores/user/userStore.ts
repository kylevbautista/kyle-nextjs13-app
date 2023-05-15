import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const useBearStore = create(
  devtools(
    (set) => ({
      bears: 0,
      listBy: "All",
      filterBy: "",
      listType: "",
      episodeProgressNumber: 0,
      startDate: "",
      finishDate: "",
      score: "",
      status: "",
      episode: 0,
      increasePopulation: () =>
        set((state: any) => ({ bears: state.bears + 1 })),
      removeAllBears: () => set({ bears: 0 }),
      updateListBy: (list: any) => set((state: any) => ({ listBy: list })),
    }),
    { name: "useBearStore" }
  )
);
