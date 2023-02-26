"use client";
import { useContext } from "react";
import { usePathname } from "next/navigation";
import { HydrationContext } from "./HydrationProvider";
import { getCurrentSeasonPath } from "../animev3/helpers";
import { LinkRouterWrapper } from "./LinkRouterWrapper";

const getCurrentYear = (shifted: Boolean = false) => {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();
  if (currentMonth === 11 && !shifted) {
    return currentYear + 1;
  }
  return currentYear;
};

export function AnimeBar() {
  const pathname = usePathname();
  const hydrated = useContext(HydrationContext);
  const values = pathname?.split("/");
  const [, anime = ""] = values || [];
  let isAnimeRoute = false;
  if (anime === "anime" || anime === "topanime") {
    isAnimeRoute = true;
  }

  return (
    <>
      <LinkRouterWrapper
        href={`/anime/${getCurrentYear(true)}/${getCurrentSeasonPath(
          null,
          true
        )}`}
        className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
      >
        <p>カイル</p>
      </LinkRouterWrapper>
      {hydrated && isAnimeRoute && (
        <LinkRouterWrapper
          href={`/topanime`}
          className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
        >
          <p>Top Anime</p>
        </LinkRouterWrapper>
      )}
    </>
  );
}
