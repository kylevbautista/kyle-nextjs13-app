"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentSeasonPath } from "../anime/year/helpers";

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
  const values = pathname?.split("/");
  const [, anime = ""] = values || [];
  let isAnimeRoute = false;
  if (anime === "anime" || anime === "topanime") {
    isAnimeRoute = true;
  }

  return (
    <>
      <Link
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
      </Link>
      {isAnimeRoute && (
        <Link
          href={`/topanime`}
          className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
        >
          <p>Top Anime</p>
        </Link>
      )}
    </>
  );
}
