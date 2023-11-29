import Image from "next/image";

export const Card = ({
  item,
  setShowModal,
  updateUserAnimeData,
  setModalContent,
}: any) => {
  return (
    <div className="flex items-center justify-center gap-4 rounded-md p-2">
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
              {item?.userData?.episodeProgressNumber}/{item.episodes || "?"}
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
            onClick={() => {
              setShowModal(true);
              setModalContent(item);
            }}
            className="absolute right-[-6px] top-[-6px] hidden h-[25px] w-[25px] rounded bg-blue-600 text-center hover:bg-blue-400 group-hover:block"
          >
            <div className="">
              <p className="">...</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
