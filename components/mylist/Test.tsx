"use client";
import { ReactNode } from "react";
import {
  getAniListDataByMalId,
  getAniListDataByMalIdList,
} from "./utils/getAniListDataByMalId";
import { updateUserAnnimeList } from "./utils/updateUserList";

interface PageBaseProps {
  list?: any;
  session?: any;
  children?: ReactNode;
}

const test = async (list: any) => {
  try {
    const data = await getAniListDataByMalIdList(list);
    console.log(data);
    if (data) {
      const { updateUserAnimeList: response = {} } =
        (await updateUserAnnimeList(data)) || {};
      if (response?.message) {
        alert(response?.message);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export function Test({ list, session, children }: PageBaseProps) {
  return (
    <>
      <button className="border p-2 rounded-lg" onClick={() => test(list)}>
        <p>Refresh Your List</p>
      </button>
    </>
  );
}
