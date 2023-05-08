"use client";
// import { serverFunction } from "./actions";

export const ClientComp = ({ data, userParam }: any) => {
  // console.log(data);
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
          {/* <button
            onClick={modifyEpisode}
            className="bg-slate-400 rounded-md p-3"
          >
            <p>Click to Increment Epiode Progress</p>
          </button> */}
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
