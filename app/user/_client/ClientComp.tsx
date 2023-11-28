"use client";
// import { serverFunction } from "./actions";
import { useState } from "react";
import {
  updateUserAnimeDataMutation,
  removeFromUserAnimeListMutation,
} from "../_graphql/mutations";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { useBearStore } from "@/stores/user/userStore";
import Image from "next/image";

const updateUserAnimeData = async ({ info, e }: any = {}) => {
  const userData = { ...info.userData };
  const ress = {
    userData: {},
    animeId: null,
  };
  if (e.currentTarget.id === "episode-increment") {
    userData.episodeProgressNumber = userData.episodeProgressNumber + 1;
    ress.userData = userData;
    ress.animeId = info?.id;
  }
  try {
    const res = await fetchWithTimeout("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: updateUserAnimeDataMutation,
        variables: {
          data: ress,
        },
      }),
    });

    const { data = null } = await res.json();
    console.log("graphql data", data);
    window.location.reload();
    // return data;
    // console.log("button clicked", {
    //   event: e.currentTarget.id,
    //   info,
    //   res: ress,
    // });
  } catch (err) {
    console.log(err);
  }
};

const removeFromList = async (info: any) => {
  console.log("remove from list", info);
  try {
    const res = await fetchWithTimeout("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: removeFromUserAnimeListMutation,
        variables: {
          data: info,
        },
      }),
    });
    const { data = null } = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return {};
  }
};

export const ClientComp = ({ data, userParam }: any) => {
  const { cache } = useSWRConfig();
  const { mutate } = useSWRConfig();
  const [showModal, setShowModal] = useState(false);
  // const bears = useBearStore((state: any) => state);
  const listBy = useBearStore((state: any) => state.listBy);
  const increaseBears = useBearStore((state: any) => state.increasePopulation);
  console.log("zustand", listBy);

  const removeHandler = async (info: any) => {
    const loadingToast = toast.loading("Removing From List...");
    const res = await removeFromList({ id: info.id });
    const message = res?.removeFromUserAnimeList?.message || "";

    if (res === null) {
      const removeError = toast.error(`ERROR`, {
        id: loadingToast,
      });
      setTimeout(() => {
        toast.remove(removeError);
      }, 2000);
      return;
    }

    if (message === "Successfully Removed From List") {
      const removeSuccess = toast.success(
        `Removed ${info?.title?.romaji} from your Anime List`,
        {
          id: loadingToast,
        }
      );
      setTimeout(() => {
        toast.remove(removeSuccess);
      }, 2000);
    } else if (message === "Did Not Remove") {
      const didNotRemove = toast.error(
        `Unable To Remove ${info?.title?.romaji} from List`,
        {
          id: loadingToast,
        }
      );
      setTimeout(() => {
        toast.remove(didNotRemove);
      }, 2000);
    } else {
      const loginToRemove = toast.error("Login To Remove From List", {
        id: loadingToast,
      });
      setTimeout(() => {
        toast.remove(loginToRemove);
      }, 2000);
    }
    console.log("done");

    const currentTime = Date.now();
    if (!localStorage.getItem("listRefreshTime")) {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    } else {
      localStorage.setItem("listRefreshTime", JSON.stringify(currentTime));
    }
    // router.refresh();
    if (message === "Successfully Removed From List" && cache?.get("/mylist")) {
      let placeholder = "";
      const prevData = cache?.get("/mylist")?.data;

      for (let i = 0; i < prevData.length; i++) {
        if (prevData[i]?.idMal === info?.idMal) {
          prevData.splice(i, 1);
          break;
        }
      }
      mutate("/mylist", placeholder, {
        populateCache: (mylist) => {
          console.log("asdf", mylist);
          return [...prevData];
        },
      });
    }
  };
  console.log(data[0]);

  return (
    <div className="flex flex-wrap items-start justify-center gap-3 border-l p-3">
      {/* <button onClick={increaseBears}>increase bears</button> */}
      {data?.map(
        (item: any, idx: any) =>
          (item.userData.listType === listBy.toLowerCase() ||
            listBy === "All") && (
            <div
              key={idx}
              className="flex items-center justify-center gap-4 rounded-md p-2"
            >
              <div className="flex flex-col items-center justify-center rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]">
                <div className="group relative h-[230px] w-[170px] ">
                  {/* <img
                src={item?.coverImage?.extraLarge}
                alt="Avatar"
                className="h-[210px]"
              /> */}
                  <Image src={item?.coverImage?.extraLarge} fill alt="" />
                  <div className="absolute bottom-[25px] flex h-[40px] w-full items-center justify-start bg-[rgba(0,0,0,0.6)] p-1">
                    <p className="line-clamp-2 leading-4">
                      {item?.title?.english || item?.title?.romaji}
                    </p>
                  </div>
                  <div className="absolute bottom-0 flex h-[25px] w-full items-center bg-[rgba(0,0,0,0.6)] px-1">
                    <p className="line-clamp-1 text-sm">
                      {item?.userData?.episodeProgressNumber}/
                      {item.episodes || "?"}
                    </p>

                    <button
                      id="episode-increment"
                      onClick={(e) => updateUserAnimeData({ info: item, e })}
                      disabled={
                        !Boolean(item?.episodes) ||
                        (item.episodes &&
                          item.userData.episodeProgressNumber === item.episodes)
                      }
                      className="hidden group-hover:block"
                    >
                      {item.episodes &&
                      item.userData.episodeProgressNumber === item.episodes ? (
                        <p className="ml-1">Complete</p>
                      ) : item.episodes ? (
                        <p className="ml-1">+</p>
                      ) : (
                        <p className="ml-1">{`Can't Add`}</p>
                      )}
                    </button>
                  </div>
                  <button
                    // onClick={() => removeHandler(item)}
                    onClick={() => setShowModal(true)}
                    className="absolute right-[-6px] top-[-6px] hidden h-[25px] w-[25px] rounded-full bg-red-600 hover:bg-red-400 group-hover:block"
                  >
                    Del
                  </button>
                </div>
              </div>
              {showModal && (
                <div className="fixed left-0 right-0 top-0 z-50 h-[calc(100%-1rem)] max-h-full w-full items-center justify-center overflow-y-auto overflow-x-hidden border border-green-500 md:inset-0">
                  <div className="relative max-h-full w-full max-w-2xl border p-4">
                    <div className="relative flex flex-col items-center rounded-lg bg-white shadow dark:bg-gray-700">
                      <div className="flex w-full justify-between">
                        <p>Header</p>
                        <div>
                          <button onClick={() => setShowModal(false)}>
                            Del
                          </button>
                        </div>
                      </div>
                      <div>
                        <p>Content</p>
                      </div>
                      <div>
                        <p>Footer</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
      )}
    </div>
  );
};
