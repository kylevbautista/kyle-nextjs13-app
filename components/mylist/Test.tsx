"use client";
import { ReactNode, useEffect } from "react";
import { getAniListDataByMalIdList } from "./utils/getAniListDataByMalId";
import { updateUserAnnimeList } from "./utils/updateUserList";
// import { getUserAnimeListClient } from "./utils/getUserAnimeList";
interface PageBaseProps {
  list?: any;
  shouldRefresh?: any;
  children?: ReactNode;
}

const test = async (list: any, hidden = true) => {
  try {
    // const listBetter = await getUserAnimeListClient();
    const data = await getAniListDataByMalIdList(list);
    if (data) {
      const { updateUserAnimeList: response = {} } =
        (await updateUserAnnimeList(data)) || {};
      if (response?.message && !hidden) {
        alert(response?.message);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export function Test({ list, shouldRefresh }: PageBaseProps) {
  /**
   * On every first mount and after swr is done validating and list length change,
   * Refresh/Update air dates for Anime on Watch List
   */
  useEffect(() => {
    const currentTime = Date.now();
    if (!localStorage.getItem("listRefreshTime")) {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
      console.log("kylelog setting...");
    }
    const oldTime = parseInt(
      localStorage.getItem("listRefreshTime") || `${currentTime}`
    );
    let timeDiff = 0;
    if (oldTime) {
      timeDiff = Math.floor((currentTime - oldTime) / 1000);
    }

    if (list.length && shouldRefresh && timeDiff > 60) {
      console.log("Updating Episode Air Dates...");
      // test(list);
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    }

    // console.log("kylelog localstorage time in seconds", {
    //   oldTime: oldTime,
    //   currentTime: currentTime,
    //   diff: `${timeDiff} seconds`,
    // });
  }, [list.length, shouldRefresh]);

  return (
    <>
      <button className="border p-2 rounded-lg" onClick={() => test(list)}>
        <p>Refresh Your List</p>
      </button>
    </>
  );
}
