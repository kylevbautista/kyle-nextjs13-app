"use client";
// import { serverFunction } from "./actions";
import { updateUserAnimeDataMutation } from "../_graphql/mutations";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { fetchFromGraphQLServer } from "@/components/utils/graphql/utils/fetchFromGraphQLServer";

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
  try {
    const res = await fetchFromGraphQLServer({
      query: removeFromUserAnimeList,
      variables: {
        data: info,
      },
    });
    const { data = null } = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return {};
  }
};

export const ClientComp = ({ data, userParam }: any) => {
  console.log(data);
  const { cache } = useSWRConfig();
  const { mutate } = useSWRConfig();

  const removeHandler = async (info: any) => {
    const loadingToast = toast.loading("Removing From List...");
    const res = await removeFromList(info);
    const message = res.removeFromUserAnimeList?.message || "";
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

  return (
    <div className="border p-3 flex flex-col justify-center items-start gap-3">
      {data?.map((item: any, idx: any) => (
        <div
          key={idx}
          className="border flex justify-center items-center p-2 rounded-lg gap-4"
        >
          <div className="border border-[rgb(53,53,53)] flex flex-col justify-center items-center p-2 rounded-md bg-[rgb(30,30,30)]">
            <div className="group relative">
              <img
                src={item?.coverImage?.extraLarge}
                alt="Avatar"
                className="h-[250px]"
              />
              <div className="w-full p-3 hidden bg-[rgba(0,0,0,0.6)] group-hover:block absolute bottom-0">
                <p>{item?.title?.english || item?.title?.romaji}</p>
              </div>
              <button className="hidden w-[25px] h-[25px] rounded-full absolute top-[-4px] right-[-4px] bg-red-600 hover:bg-red-400 group-hover:block">
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
              className="enabled:hover:bg-slate-400 bg-slate-800 rounded-md p-3 disabled:bg-slate-800/50 disabled:text-white/50"
            >
              <p>Click to Increment Epiode Progress</p>
            </button>
          </div>

          <div className="border border-[rgb(53,53,53)] flex flex-col justify-center items-center p-2 rounded-lg">
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
