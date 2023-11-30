"use client";
// import { serverFunction } from "./actions";
import { useState, useEffect } from "react";
import {
  updateUserAnimeDataMutation,
  removeFromUserAnimeListMutation,
} from "../_graphql/mutations";
import { fetchWithTimeout } from "@/components/utils/fetchWithTimeout";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { useBearStore } from "@/stores/user/userStore";
import Image from "next/image";
import { Modal } from "./Modal";
import { Card } from "./Card";
import { getByDay, getByListType } from "./helpers/sort";

const updateUserAnimeData = async ({ info, e, modalData }: any = {}) => {
  const userData = { ...info.userData };
  const ress = {
    userData: {},
    animeId: null,
  };
  if (e.currentTarget.id === "episode-increment") {
    userData.episodeProgressNumber = userData.episodeProgressNumber + 1;

    if (info.episodes && userData.episodeProgressNumber === info.episodes) {
      userData.listType = "completed";
    }
    ress.userData = userData;
    ress.animeId = info?.id;
  }
  if (e.currentTarget.id === "save-user-data") {
    if (info.episodes && modalData.episodeProgressNumber === info.episodes) {
      modalData.listType = "completed";
    }
    ress.userData = modalData;
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
  const [hydrated, setHydrated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);
  const bears = useBearStore((state: any) => state);
  const listBy = useBearStore((state: any) => state.listBy);
  const updateListByNumbers = useBearStore(
    (state: any) => state.updateListByNumbers
  );
  const filterBy = useBearStore((state: any) => state.filterBy);
  const dataByListType = getByListType({ data, filterBy });

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

  useEffect(() => {
    let watching = 0;
    let completed = 0;
    let paused = 0;
    let dropped = 0;

    for (let i = 0; i < dataByListType.all.length; i++) {
      let item = dataByListType.all[i];
      if (item.userData.listType === "watching") {
        watching += 1;
      }
      if (item.userData.listType === "completed") {
        completed += 1;
      }
      if (item.userData.listType === "paused") {
        paused += 1;
      }
      if (item.userData.listType === "dropped") {
        dropped += 1;
      }
    }

    updateListByNumbers({
      all: dataByListType.all.length,
      watching,
      completed,
      paused,
      dropped,
    });

    setHydrated(true);
  }, [data, filterBy]);

  return (
    <div className="flex flex-wrap items-start justify-start gap-3 border-l p-3">
      {listBy === "All" ? (
        <>
          <div className="w-full border-b-2">Watching</div>
          {dataByListType.watching?.map((item: any, idx: any) => (
            <Card
              hydrated
              key={item.id}
              item={item}
              setShowModal={setShowModal}
              updateUserAnimeData={updateUserAnimeData}
              setModalContent={setModalContent}
            />
          ))}
          <div className="w-full border-b-2">Completed</div>
          {dataByListType.completed?.map((item: any, idx: any) => (
            <Card
              hydrated
              key={item.id}
              item={item}
              setShowModal={setShowModal}
              updateUserAnimeData={updateUserAnimeData}
              setModalContent={setModalContent}
            />
          ))}
          <div className="w-full border-b-2">Paused</div>
          {dataByListType.paused?.map((item: any, idx: any) => (
            <Card
              hydrated
              key={item.id}
              item={item}
              setShowModal={setShowModal}
              updateUserAnimeData={updateUserAnimeData}
              setModalContent={setModalContent}
            />
          ))}
          <div className="w-full border-b-2">Dropped</div>
          {dataByListType.dropped?.map((item: any, idx: any) => (
            <Card
              hydrated
              key={item.id}
              item={item}
              setShowModal={setShowModal}
              updateUserAnimeData={updateUserAnimeData}
              setModalContent={setModalContent}
            />
          ))}
        </>
      ) : (
        dataByListType.all?.map(
          (item: any, idx: any) =>
            item.userData.listType === listBy.toLowerCase() && (
              <Card
                hydrated
                key={item.id}
                item={item}
                setShowModal={setShowModal}
                updateUserAnimeData={updateUserAnimeData}
                setModalContent={setModalContent}
              />
            )
        )
      )}
      {showModal && (
        <Modal
          modalContent={modalContent}
          setShowModal={setShowModal}
          updateUserAnimeData={updateUserAnimeData}
        />
      )}
    </div>
  );
};
