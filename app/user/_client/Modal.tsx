import Image from "next/image";
import { useState } from "react";

export const Modal = ({
  modalContent,
  setShowModal,
  updateUserAnimeData,
}: any) => {
  const [userData, setUserData] = useState<any>(modalContent.userData);

  return (
    <div
      className="fixed inset-0 z-[200] flex h-full w-full items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[50%] w-[50%] flex-col gap-3 rounded border bg-slate-500 p-4">
        <div className="flex flex-col justify-between gap-4 p-1 sm:flex-row">
          <div className="min-w-[100px]">
            <Image
              src={modalContent?.coverImage?.extraLarge}
              width={100}
              height={50}
              alt=""
            />
          </div>
          <div className="flex items-center">
            <p className="line-clamp-2 text-4xl">
              {modalContent?.title?.english || modalContent?.title?.romaji}
            </p>
          </div>
          <div className="flex items-end justify-end">
            <button
              id="save-user-data"
              onClick={(e) =>
                updateUserAnimeData({
                  info: modalContent,
                  e,
                  modalData: userData,
                })
              }
              className="rounded bg-blue-600 p-1 hover:bg-blue-400"
            >
              <div className="">
                <p className="">Save</p>
              </div>
            </button>
          </div>
        </div>
        <div className="row grid grid-cols-1 gap-4 border p-1 sm:grid-cols-3">
          <div className="border">
            Status: {modalContent.userData.listType}
            <select
              name="selectedStatus"
              id="status"
              defaultValue={modalContent.userData.listType}
              onChange={(e) => {
                setUserData((userData: any) => ({
                  ...userData,
                  ...{ listType: e.target.value },
                }));
              }}
            >
              <option value="watching">Watching</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
              <option value="paused">Paused</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
          <div className="border">Score</div>
          <div className="border">
            Episode Progress:{" "}
            {modalContent.episodes &&
              `${modalContent.userData.episodeProgressNumber}/${modalContent.episodes}`}
            <input
              type="number"
              min={0}
              max={modalContent.episodes && modalContent.episodes}
              value={userData.episodeProgressNumber}
              onChange={(e) => {
                let parsedValue = parseInt(e.target.value);
                if (parsedValue > modalContent.episodes) {
                  parsedValue = modalContent.episodes;
                }
                setUserData((userData: any) => ({
                  ...userData,
                  ...{ episodeProgressNumber: parsedValue },
                }));
              }}
            ></input>
          </div>
          <div className="border">Start Date</div>
          <div className="border">Finish Date</div>
        </div>
        <button
          className="hover:bg-red-400h-[25px] absolute right-[-6px] top-[-6px] w-[25px] rounded bg-red-600 hover:bg-red-400"
          onClick={() => setShowModal(false)}
        >
          X
        </button>
      </div>
    </div>
  );
};
