"use client";
import { useBearStore } from "@/stores/user/userStore";

export const SideBarList = () => {
  const listBy = useBearStore((state: any) => state.listBy);
  const updateListBy = useBearStore((state: any) => state.updateListBy);

  const tailwindMap = {
    selected: "rounded-md p-1 text-start hover:bg-slate-500 bg-white/50",
    unselected: "rounded-md p-1 text-start hover:bg-slate-500",
  };

  return (
    <div id="lists">
      <p>Lists</p>
      <div id="list-filter" className="flex flex-col gap-2">
        <button
          className={
            listBy === "All"
              ? tailwindMap["selected"]
              : tailwindMap["unselected"]
          }
          onClick={() => updateListBy("All")}
        >
          <p>All</p>
        </button>
        <button
          className={
            listBy === "Watching"
              ? tailwindMap["selected"]
              : tailwindMap["unselected"]
          }
          onClick={() => updateListBy("Watching")}
        >
          <p>Watching</p>
        </button>
        <button
          className={
            listBy === "Completed"
              ? tailwindMap["selected"]
              : tailwindMap["unselected"]
          }
          onClick={() => updateListBy("Completed")}
        >
          <p>Completed</p>
        </button>
        <button
          className={
            listBy === "Paused"
              ? tailwindMap["selected"]
              : tailwindMap["unselected"]
          }
          onClick={() => updateListBy("Paused")}
        >
          <p>Paused</p>
        </button>
        <button
          className={
            listBy === "Dropped"
              ? tailwindMap["selected"]
              : tailwindMap["unselected"]
          }
          onClick={() => updateListBy("Dropped")}
        >
          <p>Dropped</p>
        </button>
      </div>
    </div>
  );
};
