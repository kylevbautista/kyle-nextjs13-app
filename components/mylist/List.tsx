"use client";
import { ReactNode } from "react";
import Grid from "../common/Grid";
import AnimeInfoGrid from "../animev3/AnimeInfoGrid";
import { getInitialTimes } from "../anime/year/helpers";

interface PageBaseProps {
  list?: any;
  session?: any;
  children?: ReactNode;
}

export function List({ list }: PageBaseProps) {
  return (
    <>
      {list.length && (
        <Grid>
          {list?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={index}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
            />
          ))}
        </Grid>
      )}
    </>
  );
}
