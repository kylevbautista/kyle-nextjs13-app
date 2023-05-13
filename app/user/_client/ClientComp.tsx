"use client";
// import { serverFunction } from "./actions";
import {
  updateUserAnimeDataMutation,
  removeFromUserAnimeListMutation,
} from "../_graphql/mutations";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";

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

  console.log("swr cache", cache?.get(`/mylist/${userParam}`)?.data);

  return (
    <div className="flex flex-col items-start justify-center gap-3 border p-3">
      {data?.map((item: any, idx: any) => (
        <div
          key={idx}
          className="flex items-center justify-center gap-4 rounded-lg border p-2"
        >
          <div className="flex flex-col items-center justify-center rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-2">
            <div className="group relative">
              <img
                src={item?.coverImage?.extraLarge}
                alt="Avatar"
                className="h-[250px]"
              />
              <div className="absolute bottom-0 hidden w-full bg-[rgba(0,0,0,0.6)] p-3 group-hover:block">
                <p>{item?.title?.english || item?.title?.romaji}</p>
              </div>
              <button
                onClick={() => removeHandler(item)}
                className="absolute right-[-6px] top-[-6px] hidden h-[25px] w-[25px] rounded-full bg-red-600 hover:bg-red-400 group-hover:block"
              >
                Del
              </button>
            </div>
            <div>
              <p>Episodes Completed: {item?.userData?.episodeProgressNumber}</p>
            </div>
            <button
              id="episode-increment"
              onClick={(e) => updateUserAnimeData({ info: item, e })}
              disabled={
                !Boolean(item?.episodes) ||
                (item.episodes &&
                  item.userData.episodeProgressNumber === item.episodes)
              }
              className="rounded-md bg-slate-800 p-3 enabled:hover:bg-slate-400 disabled:bg-slate-800/50 disabled:text-white/50"
            >
              <p>Click to Increment Epiode Progress</p>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-[rgb(53,53,53)] p-2">
            <div className="max-w-[200px] p-3">
              <p>List: {item?.userData?.listType}</p>
              <p>Episode Progress: {item?.userData?.episodeProgressNumber}</p>
              <p>Added to list: {item?.userData?.startDate || "n/a"}</p>
              <p>Completed On: {item?.userData?.finishDate || "n/a"}</p>
              <p>Score: {item?.userData?.score || "n/a"}</p>
              <p>Score: {item?.status || "n/a"}</p>
              <p>Episode #: {item?.episodes || "n/a"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
