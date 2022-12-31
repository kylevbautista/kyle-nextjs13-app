import { ReactNode } from "react";
import Grid from "../common/Grid";
import AnimeInfoGrid from "../anime/year/AnimeInfoGrid";
import { getInitialTimes, getCurrentSeasonPath } from "../anime/year/helpers";

interface PageBaseProps {
  list?: any;
  session?: any;
  children?: ReactNode;
}

export function List({ list, session, children }: PageBaseProps) {
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
