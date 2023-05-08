"use client";
import { ReactNode, useEffect } from "react";
import { getAniListDataByMalIdList } from "./utils/getAniListDataByMalId";
import { updateUserAnnimeList } from "./utils/updateUserList";
// import { getUserAnimeListClient } from "./utils/getUserAnimeList";
import toast from "react-hot-toast";

interface PageBaseProps {
  list?: any;
  shouldRefresh?: any;
  children?: ReactNode;
}

const test = async (list: any, hidden = true) => {
  const loadingToast = toast.loading("Updating Episode Air Dates...");
  try {
    const dataArr = (await getAniListDataByMalIdList(list)) || [];

    if (dataArr && dataArr.length > 0) {
      const dataAggregated: any = [];
      for (let i = 0; i < dataArr?.length; i++) {
        dataAggregated.push(...dataArr[i]?.data?.page?.anime);
      }

      if (list.length == dataAggregated.length) {
        const { updateUserAnimeList: response = {} } =
          (await updateUserAnnimeList(dataAggregated)) || {};
        if (response?.message && !hidden) {
          alert(response?.message);
        }
        if (response?.message !== "Successfully Updated List") {
          console.log("err updating list");
        }
        const updateSuccess = toast.success(
          "Done Updating Epsiode Air Dates!",
          { id: loadingToast }
        );
        setTimeout(() => {
          toast.remove(updateSuccess);
        }, 2000);
        console.log("Done Updating Epsiode Air Dates!");
      } else {
        console.log("Mismatch lengths");
      }
    }
  } catch (err) {
    const updateError = toast.error("Done Updating Epsiode Air Dates!", {
      id: loadingToast,
    });
    setTimeout(() => {
      toast.remove(updateError);
    }, 2000);
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
      test(list);
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
      {/* <button className="border p-2 rounded-lg" onClick={() => test(list)}>
        <p>Refresh Your List</p>
      </button> */}
    </>
  );
}
