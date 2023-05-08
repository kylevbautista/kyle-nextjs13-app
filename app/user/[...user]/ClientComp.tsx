"use client";
// import { serverFunction } from "./actions";
import { updateUserAnimeDataMutation } from "../_graphql/mutations";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";

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
    console.log(data);
    // return data;
    console.log("button clicked", {
      event: e.currentTarget.id,
      info,
      res: ress,
    });
  } catch (err) {
    console.log(err);
  }
};

export const ClientComp = ({ data, userParam }: any) => {
  console.log(data);

  return (
    <div>
      {data?.map((item: any, idx: any) => (
        <div key={idx}>
          <div>
            <p>{item?.title?.romaji || ""}</p>
          </div>
          <div>
            <p>{item?.userData?.episodeProgressNumber}</p>
          </div>
          <div>
            <p>{JSON.stringify(item?.userData || {}, null, 2)}</p>
          </div>
          <button
            id="episode-increment"
            onClick={(e) => updateUserAnimeData({ info: item, e })}
            className="bg-slate-400 rounded-md p-3"
          >
            <p>Click to Increment Epiode Progress</p>
          </button>
          {/* @ts-ignore */}
          {/* <form action={serverFunction}>
            <input
              name="episodeNumber"
              defaultValue={item?.userData?.episodeProgressNumber}
            ></input>
            <input
              name="userParam"
              defaultValue={userParam}
              type="hidden"
            ></input>
            <input name="animeId" defaultValue={item?.id} type="hidden"></input>
            <button className="bg-slate-400 rounded-md p-3" type="submit">
              <p>Click to Increment Epiode Progress</p>
            </button>
          </form> */}
        </div>
      ))}
    </div>
  );
};
