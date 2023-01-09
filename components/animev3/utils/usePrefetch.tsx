import { useEffect } from "react";
import { useRouter } from "next/navigation";

enum Season {
  WINTER,
  SPRING,
  SUMMER,
  FALL,
}

export const usePrefetch = ({ year, season, enablePrefetch, header }: any) => {
  const router = useRouter();
  useEffect(
    () => {
      // const dateObject = new Date();
      // const currentYear = dateObject.getUTCFullYear();
      const prevYear = parseInt(year) - 1;
      const nextYear = parseInt(year) + 1;

      if (enablePrefetch) {
        if (season === Season.WINTER) {
          router.prefetch(`/anime/${prevYear}/summer`);
          router.prefetch(`/anime/${prevYear}/fall`);
          router.prefetch(`/anime/${year}/spring`);
          router.prefetch(`/anime/${year}/summer`);
        }
        if (season === Season.SPRING) {
          router.prefetch(`/anime/${prevYear}/fall`);
          router.prefetch(`/anime/${year}/winter`);
          router.prefetch(`/anime/${year}/summer`);
          router.prefetch(`/anime/${year}/fall`);
        }
        if (season === Season.SUMMER) {
          router.prefetch(`/anime/${year}/winter`);
          router.prefetch(`/anime/${year}/spring`);
          router.prefetch(`/anime/${year}/fall`);
          router.prefetch(`/anime/${nextYear}/winter`);
        }
        if (season === Season.FALL) {
          router.prefetch(`/anime/${year}/spring`);
          router.prefetch(`/anime/${year}/summer`);
          router.prefetch(`/anime/${nextYear}/winter`);
          router.prefetch(`/anime/${nextYear}/spring`);
        }
      }

      header.setHeaderYear(year);
      header.setHeaderSeason(season);
    },
    /*eslint-disable */ [] /*eslint-enable */
  );
};
